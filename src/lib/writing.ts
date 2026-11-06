import type {
  WritingCategory,
  WritingLevel,
  WritingTaskType,
} from './ai/types'

export const WRITING_CATEGORIES: Array<{
  value: WritingCategory
  label: string
}> = [
  { value: 'daily', label: '日常生活' },
  { value: 'work', label: '工作职业' },
  { value: 'technology', label: '科技' },
  { value: 'environment', label: '环境' },
  { value: 'relationships', label: '人际关系' },
  { value: 'education', label: '学习成长' },
  { value: 'health', label: '健康' },
  { value: 'culture', label: '文化旅行' },
]

export const WRITING_TASKS: Array<{
  value: WritingTaskType
  label: string
}> = [
  { value: 'opinion', label: '观点短文' },
  { value: 'email', label: '邮件' },
  { value: 'message', label: '消息 / 留言' },
  { value: 'story', label: '小故事' },
  { value: 'description', label: '描述' },
]

export const WRITING_LEVELS: Array<{
  value: WritingLevel
  label: string
}> = [
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
]

export const WRITING_TARGETS = [
  { value: 120, label: '短 · 120 词' },
  { value: 180, label: '中 · 180 词' },
  { value: 280, label: '长 · 280 词' },
]

export function writingCategoryLabel(value: WritingCategory): string {
  return (
    WRITING_CATEGORIES.find((item) => item.value === value)?.label ?? value
  )
}

export function writingTaskLabel(value: WritingTaskType): string {
  return WRITING_TASKS.find((item) => item.value === value)?.label ?? value
}
