import { db } from './db'

export const BACKUP_TABLES = [
  'materials',
  'packs',
  'reviewItems',
  'attempts',
  'errors',
  'writingWorks',
  'speakingSessions',
  'listeningClips',
  'listeningSessions',
  'corpusItems',
  'settings',
] as const

type BackupTable = (typeof BACKUP_TABLES)[number]

export interface BackupFile {
  app: 'LinguaDesk'
  version: 1
  exportedAt: string
  data: Record<BackupTable, unknown[]>
}

export interface BackupSummary {
  backup: BackupFile
  counts: Record<BackupTable, number>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function todayStamp(): string {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * Audio files are large and cannot be represented faithfully in JSON. The
 * clip's text, segment timing and practice history are kept; the binary is
 * omitted and can be re-imported later.
 */
function rowForBackup(name: BackupTable, row: unknown): unknown {
  if (name !== 'listeningClips' || !isRecord(row)) return row
  const copy: Record<string, unknown> = { ...row }
  const hadAudio = copy.audioBlob !== undefined
  delete copy.audioBlob
  return {
    ...copy,
    audioOmitted: hadAudio,
  }
}

export async function createBackup(): Promise<BackupFile> {
  const data = {} as Record<BackupTable, unknown[]>

  for (const name of BACKUP_TABLES) {
    const rows = await db.table(name).toArray()
    data[name] = rows.map((row) => rowForBackup(name, row))
  }

  return {
    app: 'LinguaDesk',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  }
}

interface WritableFile {
  write(data: Blob): Promise<void>
  close(): Promise<void>
}

interface FileHandle {
  createWritable(): Promise<WritableFile>
}

type SavePicker = (options: {
  suggestedName: string
  types: Array<{
    description: string
    accept: Record<string, string[]>
  }>
}) => Promise<FileHandle>

async function downloadBackup(json: string): Promise<void> {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `linguadesk-backup-${todayStamp()}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function saveBackup(): Promise<'saved' | 'cancelled'> {
  const backup = await createBackup()
  const json = JSON.stringify(backup, null, 2)
  const picker = (
    window as unknown as { showSaveFilePicker?: SavePicker }
  ).showSaveFilePicker

  if (picker) {
    try {
      const handle = await picker({
        suggestedName: `linguadesk-backup-${todayStamp()}.json`,
        types: [
          {
            description: 'LinguaDesk backup',
            accept: { 'application/json': ['.json'] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(new Blob([json], { type: 'application/json' }))
      await writable.close()
      return 'saved'
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'AbortError' || error.name === 'NotAllowedError')
      ) {
        return 'cancelled'
      }
      throw error
    }
  }

  await downloadBackup(json)
  return 'saved'
}

export async function readBackupFile(file: File): Promise<BackupSummary> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('这不是一个有效的 JSON 备份文件。')
  }

  if (
    !isRecord(parsed) ||
    parsed.app !== 'LinguaDesk' ||
    !isRecord(parsed.data)
  ) {
    throw new Error('备份格式不匹配；请选择 LinguaDesk 导出的 JSON。')
  }

  const data = {} as Record<BackupTable, unknown[]>
  const counts = {} as Record<BackupTable, number>

  for (const name of BACKUP_TABLES) {
    const rows = Array.isArray(parsed.data[name]) ? parsed.data[name] : []
    data[name] = rows
    counts[name] = rows.length
  }

  return {
    backup: {
      app: 'LinguaDesk',
      version: 1,
      exportedAt: String(parsed.exportedAt ?? ''),
      data,
    },
    counts,
  }
}

export async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
      for (const name of BACKUP_TABLES) {
        await db.table(name).clear()
      }
      for (const name of BACKUP_TABLES) {
        const rows = backup.data[name]
        if (rows.length > 0) await db.table(name).bulkPut(rows)
      }
      // The restored snapshot must not drive tombstones against cloud data
      // using stale sync cursors from before the restore.
      await db.syncState.clear()
    },
  )
}

export function backupCountLabel(counts: Record<BackupTable, number>): string {
  return [
    `${counts.materials} 份材料`,
    `${counts.writingWorks} 篇写作`,
    `${counts.speakingSessions} 次口语`,
    `${counts.listeningClips} 段听力`,
    `${counts.corpusItems} 条语料`,
    `${counts.attempts} 次练习`,
    `${counts.errors} 个错误标签`,
  ].join(' · ')
}
