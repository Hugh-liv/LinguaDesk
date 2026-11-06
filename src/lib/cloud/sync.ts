import { db } from '../db'
import { formatCloudError, isCloudConfigured, supabase } from './supabase'

interface SyncTableSpec {
  name: string
  key: string
  time: (row: Record<string, unknown>) => number
  sanitize?: (row: Record<string, unknown>) => Record<string, unknown>
}

interface CloudRecord {
  table_name: string
  record_id: string
  payload: unknown
  updated_at: number
  deleted: boolean
}

const TABLES: SyncTableSpec[] = [
  {
    name: 'materials',
    key: 'id',
    time: (row) => numeric(row.updatedAt) || numeric(row.createdAt),
  },
  {
    name: 'packs',
    key: 'materialId',
    time: (row) => numeric(row.updatedAt) || numeric(row.createdAt),
  },
  {
    name: 'reviewItems',
    key: 'id',
    time: (row) => numeric(row.updatedAt) || numeric(row.createdAt),
  },
  {
    name: 'attempts',
    key: 'id',
    time: (row) => numeric(row.createdAt),
  },
  {
    name: 'errors',
    key: 'id',
    time: (row) => numeric(row.updatedAt) || numeric(row.lastSeenAt),
  },
  {
    name: 'writingWorks',
    key: 'id',
    time: (row) => numeric(row.updatedAt),
  },
  {
    name: 'speakingSessions',
    key: 'id',
    time: (row) => numeric(row.updatedAt),
  },
  {
    name: 'listeningClips',
    key: 'id',
    time: (row) => numeric(row.updatedAt),
    sanitize: (row) => {
      const copy = { ...row }
      const hadAudio = copy.audioBlob !== undefined
      delete copy.audioBlob
      if (hadAudio) copy.audioOmitted = true
      return copy
    },
  },
  {
    name: 'listeningSessions',
    key: 'id',
    time: (row) => numeric(row.updatedAt),
  },
  {
    name: 'corpusItems',
    key: 'id',
    time: (row) => numeric(row.updatedAt),
  },
  {
    name: 'settings',
    key: 'key',
    time: (row) => numeric(row.updatedAt),
  },
]

const BATCH_SIZE = 120
let syncing = false
let syncQueued = false

function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

async function readState(key: string): Promise<string | null> {
  return (await db.syncState.get(key))?.value ?? null
}

async function writeState(key: string, value: string): Promise<void> {
  await db.syncState.put({ key, value, updatedAt: Date.now() })
}

async function loadLocalRows(
  spec: SyncTableSpec,
): Promise<Map<string, Record<string, unknown>>> {
  const rows = (await db.table(spec.name).toArray()) as Record<
    string,
    unknown
  >[]
  return new Map(
    rows.flatMap((row) => {
      const id = row[spec.key]
      if (typeof id !== 'string' && typeof id !== 'number') return []
      return [[String(id), row] as const]
    }),
  )
}

async function pushBatch(
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  if (!supabase || rows.length === 0) return
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const { error } = await supabase
      .from('user_records')
      .upsert(rows.slice(index, index + BATCH_SIZE), {
        onConflict: 'user_id,table_name,record_id',
      })
    if (error) throw new Error(formatCloudError(error))
  }
}

export interface CloudSyncResult {
  pulled: number
  pushed: number
  deleted: number
  syncedAt: number
}

async function fetchAllCloudRows(userId: string): Promise<CloudRecord[]> {
  if (!supabase) return []
  const pageSize = 1000
  const rows: CloudRecord[] = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('user_records')
      .select('table_name,record_id,payload,updated_at,deleted')
      .eq('user_id', userId)
      .order('table_name', { ascending: true })
      .order('record_id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(formatCloudError(error))
    const page = (data ?? []) as CloudRecord[]
    rows.push(...page)
    if (page.length < pageSize) break
    from += page.length
  }

  return rows
}

export async function syncNow(): Promise<CloudSyncResult> {
  if (!isCloudConfigured || !supabase) {
    throw new Error('云端还没有配置。')
  }
  if (syncing) {
    syncQueued = true
    throw new Error('正在同步，请稍候。')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('请先登录云端账号。')

  syncing = true
  const userId = session.user.id
  let pulled = 0
  let pushed = 0
  let deleted = 0

  try {
    const remoteRows = await fetchAllCloudRows(userId)

    for (const spec of TABLES) {
      const local = await loadLocalRows(spec)
      const remoteForTable = remoteRows.filter(
        (row) => row.table_name === spec.name,
      )
      const stateKey = `ids:${userId}:${spec.name}`
      const previous = JSON.parse(
        (await readState(stateKey)) ?? '[]',
      ) as string[]
      const previousSet = new Set(previous)

      for (const remote of remoteForTable) {
        const localRow = local.get(String(remote.record_id))
        const localTime = localRow ? spec.time(localRow) : 0
        const remoteTime = numeric(remote.updated_at)

        if (remote.deleted) {
          if (localRow && remoteTime >= localTime) {
            await db.table(spec.name).delete(remote.record_id)
            local.delete(String(remote.record_id))
            deleted += 1
          }
          continue
        }

        const payload = asRecord(remote.payload)
        if (!payload) continue
        // The row was synced before but is absent locally: the user deleted it
        // on this device. Do not resurrect it from the cloud; the missing-ID
        // pass below will upload a tombstone.
        if (!localRow && previousSet.has(String(remote.record_id))) {
          continue
        }
        if (localRow && localTime >= remoteTime) continue
        const row = { ...payload, [spec.key]: remote.record_id }
        await db.table(spec.name).put(row)
        local.set(String(remote.record_id), row)
        pulled += 1
      }

      const currentIds = [...local.keys()]
      const currentSet = new Set(currentIds)
      const missing = previous.filter((id) => !currentSet.has(id))
      const now = Date.now()
      const cloudRows: Array<Record<string, unknown>> = []

      for (const [recordId, row] of local) {
        cloudRows.push({
          user_id: userId,
          table_name: spec.name,
          record_id: recordId,
          payload: spec.sanitize ? spec.sanitize(row) : row,
          updated_at: spec.time(row),
          deleted: false,
        })
      }
      for (const recordId of missing) {
        cloudRows.push({
          user_id: userId,
          table_name: spec.name,
          record_id: recordId,
          payload: {},
          updated_at: now,
          deleted: true,
        })
        deleted += 1
      }

      await pushBatch(cloudRows)
      pushed += cloudRows.length
      await writeState(stateKey, JSON.stringify(currentIds))
    }

    const syncedAt = Date.now()
    await writeState(`last:${userId}`, String(syncedAt))
    window.dispatchEvent(
      new CustomEvent('linguadesk:cloud-sync', {
        detail: { syncedAt, pulled, pushed, deleted },
      }),
    )
    return { pulled, pushed, deleted, syncedAt }
  } finally {
    syncing = false
    if (syncQueued) {
      syncQueued = false
      window.setTimeout(() => {
        void syncNow().catch(() => undefined)
      }, 3000)
    }
  }
}

export async function getLastCloudSync(): Promise<number | null> {
  if (!supabase) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null
  const value = await readState(`last:${session.user.id}`)
  return value ? Number(value) || null : null
}

export function startCloudSync(): () => void {
  if (!isCloudConfigured || !supabase) return () => undefined

  let disposed = false
  let timer: number | undefined

  const run = () => {
    if (disposed) return
    void syncNow().catch(() => undefined)
  }

  const schedule = () => {
    if (disposed) return
    window.clearTimeout(timer)
    timer = window.setTimeout(run, 5000)
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) schedule()
  })

  void supabase.auth.getSession().then(({ data }) => {
    if (data.session) run()
  })

  window.addEventListener('online', schedule)
  const onVisibility = () => {
    if (document.visibilityState === 'visible') schedule()
  }
  document.addEventListener('visibilitychange', onVisibility)
  const interval = window.setInterval(run, 60_000)

  return () => {
    disposed = true
    window.clearTimeout(timer)
    window.clearInterval(interval)
    window.removeEventListener('online', schedule)
    document.removeEventListener('visibilitychange', onVisibility)
    subscription.unsubscribe()
  }
}
