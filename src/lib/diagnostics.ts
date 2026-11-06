import type { ErrorTagRow } from './db'

export type DiagnosticArea =
  | 'vocab'
  | 'dictation'
  | 'listening'
  | 'retell'
  | 'writing'
  | 'corpus'

export interface DiagnosticStrategy {
  tag: string
  title: string
  area: DiagnosticArea
  summaryZh: string
  drillZh: string
  minutes: number
}

export interface DiagnosticCard extends DiagnosticStrategy {
  count: number
  lastSeenAt: number
}

export interface DiagnosticFocus extends DiagnosticCard {}

const STRATEGIES: Record<string, Omit<DiagnosticStrategy, 'tag'>> = {
  词汇记忆不稳: {
    title: '把词放回句子里',
    area: 'vocab',
    summaryZh:
      '单词不是孤立的。先回忆它出现过的句子，比盯着中文释义更容易记住。',
    drillZh: '从到期词汇卡里挑 5 张：先说出一个例句，再翻面核对。',
    minutes: 5,
  },
  听写细节: {
    title: '听写不要靠猜',
    area: 'dictation',
    summaryZh:
      '漏掉的多是功能词和词尾。慢一点，把整句听完，比反复猜更有效。',
    drillZh: '选 3 句慢速听写；检查后只改错词，再把错句完整听一遍。',
    minutes: 8,
  },
  听力辨词: {
    title: '先抓词块，再补整句',
    area: 'listening',
    summaryZh:
      '逐词听容易丢。先记住开头几个词，再往前推，整句会稳很多。',
    drillZh: '去听力室用 0.75 倍速做 2 句逐句精听；先写开头三个词，再补全句。',
    minutes: 7,
  },
  篇章听力: {
    title: '用结构记住整段',
    area: 'listening',
    summaryZh:
      '整段听写漏得多，通常不是耳朵的问题，而是没有先抓住段落骨架。',
    drillZh: '做一段 3–5 句的 Dictogloss：第一遍只记开头和转折，第二遍再补细节。',
    minutes: 10,
  },
  表达反复出错: {
    title: '把旧错误练成新句子',
    area: 'corpus',
    summaryZh:
      '同一个表达在写作或口语里反复出现，说明它还没有变成你的主动语言。',
    drillZh: '去个人语料库做 3–5 张微训练卡：先重写原句，再用参考表达造一句自己的话。',
    minutes: 6,
  },
  拼写: {
    title: '把拼写放进自己的句子',
    area: 'writing',
    summaryZh:
      '只抄写容易忘。把错词放进与你生活有关的句子里，拼写会更牢。',
    drillZh: '从听写错误里挑 5 个词，各写一句与你有关的英文。',
    minutes: 8,
  },
  复述不连贯: {
    title: '先说骨架，再补细节',
    area: 'retell',
    summaryZh:
      '卡住通常不是词不够，而是结构没想好。先占住三个位置，再填内容。',
    drillZh: '用提纲做 3 次 30 秒复述，每次只加一个新细节。',
    minutes: 6,
  },
}

export function strategyForTag(tag: string): DiagnosticStrategy | null {
  const strategy = STRATEGIES[tag]
  return strategy ? { tag, ...strategy } : null
}

function sortErrors(errors: ErrorTagRow[]): ErrorTagRow[] {
  return [...errors]
    .filter((error) => error.count > 0)
    .sort((a, b) => b.count - a.count || b.lastSeenAt - a.lastSeenAt)
}

export function deriveFocus(errors: ErrorTagRow[]): DiagnosticFocus | null {
  for (const error of sortErrors(errors)) {
    const strategy = strategyForTag(error.tag)
    if (strategy) {
      return {
        ...strategy,
        count: error.count,
        lastSeenAt: error.lastSeenAt,
      }
    }
  }
  return null
}

/**
 * One card per skill area, highest-count error first. This avoids showing
 * three nearly identical “dictation” cards when the same issue recurs.
 */
export function buildStrategyCards(errors: ErrorTagRow[]): DiagnosticCard[] {
  const byArea = new Map<DiagnosticArea, DiagnosticCard>()

  for (const error of sortErrors(errors)) {
    const strategy = strategyForTag(error.tag)
    if (!strategy) continue
    if (byArea.has(strategy.area)) continue
    byArea.set(strategy.area, {
      ...strategy,
      count: error.count,
      lastSeenAt: error.lastSeenAt,
    })
  }

  return [...byArea.values()]
}

export function practiceHref(
  area: DiagnosticArea,
  materialId?: string | null,
): string {
  if (area === 'writing') return '/writing'
  if (area === 'listening') return '/listening'
  if (area === 'corpus') return '/corpus'
  if (!materialId) return '/materials'
  return `/study?mode=${area}&material=${materialId}`
}

export function areaLabel(area: DiagnosticArea): string {
  switch (area) {
    case 'vocab':
      return '词汇'
    case 'dictation':
      return '听写'
    case 'listening':
      return '听力'
    case 'retell':
      return '复述'
    case 'writing':
      return '写作'
    case 'corpus':
      return '语料'
  }
}
