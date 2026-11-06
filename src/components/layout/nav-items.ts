import {
  Activity,
  BookOpenText,
  LibraryBig,
  Sunrise,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  zh: string
  en: string
  icon: LucideIcon
  blurb: string
  comingTitle: string
  coming: string[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/today',
    zh: '今日',
    en: 'Today',
    icon: Sunrise,
    blurb: '每天打开书桌先看到的地方：到期复习、正在读的材料，以及一段不被打断的时间。',
    comingTitle: '今日页，正在布置。',
    coming: ['到期复习队列', '今日材料与专注计时', '连续的安静学习记录'],
  },
  {
    to: '/materials',
    zh: '材料',
    en: 'Library',
    icon: LibraryBig,
    blurb: '把一段英文放上书桌。导入、拆分、复习，都从这里开始。',
    comingTitle: '材料库',
    coming: [],
  },
  {
    to: '/study',
    zh: '学习',
    en: 'Study',
    icon: BookOpenText,
    blurb: '在一份材料里慢下来：阅读、翻词汇卡、做听写，再去听力室或开口复述。',
    comingTitle: '学习台，还未展开。',
    coming: ['阅读模式与生词标记', '词汇卡与间隔复习', '听写、复述与当日小结'],
  },
  {
    to: '/diagnostics',
    zh: '诊断',
    en: 'Insight',
    icon: Activity,
    blurb: '不从分数判断你，而从错误里找线索，再给出一张能执行的策略卡。',
    comingTitle: '诊断页，正在收集线索。',
    coming: ['错误标签分布', '针对性的策略卡', '一段时间的趋势与回顾'],
  },
  {
    to: '/me',
    zh: '我的',
    en: 'Me',
    icon: UserRound,
    blurb: '关于节奏与数据的小设置。没有账号，没有排行榜。',
    comingTitle: '这里留给你的偏好。',
    coming: ['每日目标与学习节奏', '数据导出与本地备份', '安装到桌面与主题设置'],
  },
]

export function findNavItem(pathname: string): NavItem {
  return (
    NAV_ITEMS.find(
      (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
    ) ?? NAV_ITEMS[1]
  )
}
