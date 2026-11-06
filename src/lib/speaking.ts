import type { SpeakingLevel } from './ai/types'

export interface SpeakingScenario {
  id: string
  title: string
  titleZh: string
  scenarioZh: string
  role: string
  userGoalZh: string
}

export const SPEAKING_LEVELS: SpeakingLevel[] = ['B1', 'B2', 'C1']

export const SPEAKING_SCENARIOS: SpeakingScenario[] = [
  {
    id: 'cafe-small-talk',
    title: 'Coffee small talk',
    titleZh: '咖啡馆闲聊',
    scenarioZh: '你在咖啡馆遇到一个刚认识的人，想自然聊几分钟。',
    role: 'a friendly acquaintance you just met at a café',
    userGoalZh: '完成 4–6 轮对话，主动追问对方一个 follow-up 问题。',
  },
  {
    id: 'work-meeting',
    title: 'Work meeting',
    titleZh: '工作会议',
    scenarioZh: '你和同事要推进一个小项目，需要说明问题并确认下一步。',
    role: 'a colleague planning a small project with you',
    userGoalZh: '说明一个问题，提出一个可行方案，并确认下一步。',
  },
  {
    id: 'job-interview',
    title: 'Job interview',
    titleZh: '求职面试',
    scenarioZh: '你正在面试一个想要的工作，面试官想了解你的实际经验。',
    role: 'a hiring manager interviewing you for a role you want',
    userGoalZh: '用 2–3 个具体例子介绍经验，并问一个关于团队的问题。',
  },
  {
    id: 'hotel-problem',
    title: 'Hotel problem',
    titleZh: '酒店问题',
    scenarioZh: '入住后房间有问题，你需要礼貌但清楚地提出请求。',
    role: 'a hotel receptionist at the front desk',
    userGoalZh: '说明问题、提出一个具体请求，并确认对方会怎么处理。',
  },
  {
    id: 'landlord-call',
    title: 'Landlord call',
    titleZh: '房东电话',
    scenarioZh: '你给房东打电话，想解决家里一个需要维修的问题。',
    role: 'your landlord on the phone',
    userGoalZh: '礼貌说明问题，约定一个上门时间，并确认联系方法。',
  },
  {
    id: 'pharmacy',
    title: 'At the pharmacy',
    titleZh: '药店咨询',
    scenarioZh: '你有点不舒服，想在药店询问合适的非处方药。',
    role: 'a helpful pharmacist behind the counter',
    userGoalZh: '描述症状，问清用法与注意事项，并确认是否需要就医。',
  },
]
