# LinguaDesk · 安静书桌

个人自用的英语学习 PWA。把一段英文或一段声音放上书桌，拆成摘要、词汇、句型、理解题、听写句、复述提纲与精听练习，再用间隔复习慢慢消化；也可以从话题出发生成写作题目、论点地图与反馈，真正写出一版自己的英文。项目在 D 盘，桌面有一键启动快捷方式。

没有登录、社交和支付。材料与学习记录保存在浏览器的 IndexedDB 里；需要 AI 生成时，当前文本会发送给所选 AI 服务。

## 已完成

- **应用骨架**：手机底部 5 个 Tab；桌面左侧导航 + 中间内容 + 右侧上下文栏；响应式布局。
- **安静书桌视觉系统**：深青绿 `#0F6B5E`、暖纸白 `#F7F3EA`、墨灰 `#1F2933`、琥珀 `#D98E04`、陶土红 `#C2413B`。
- **今日 / 9 个月航线**（默认首页 `/today`）：
  - 约 45–60 分钟三段式（可在「我的」调整）：到期复习 → 读或听一段 → 写或复述；完成状态来自本机的练习与写作记录。
  - 跨材料的到期队列，点击直接进入对应材料的学习台。
  - 三阶段航线（基础 / 流利 / 独立），可记录起点、查看当前月份、本周重点与进度；起点保存在本机。
  - 没有材料时会引导去材料库；没有到期卡片时不会制造假任务。
- **材料页 / 导入 2.0**：
  - 粘贴文本；上传 TXT、PDF（文字层）、DOCX；内置示例；
  - PDF 与 DOCX 在浏览器本地解析，不上传原文件；
  - **词汇成文**：一次输入 3–15 个英文词/短语，选择等级（A2–C1）、长度、体裁（短文 / 故事 / 对话 / 邮件）与场景，让 AI 写成一篇自然短文；显示目标词覆盖情况；
  - **拍张照片**：选择或拍摄一张英文照片，浏览器先压缩，再交给 DeepSeek 图像理解。可选「提取原文」（OCR，适合书页 / 菜单 / 截图）或「看图写一段」（用英文描述图片）；识别结果可编辑，存入时只保留小缩略图，可直接生成学习包；
  - **联网搜索**：用 DeepSeek Search 搜实时网页，提供新闻 / 播客 / 演讲 / 讲稿访谈 / 其他五个专门入口；可查看标题、来源、日期与摘要，把选中的结果直接存成阅读材料，或让 AI 只依据这次搜索写一篇原创英文并附上来源链接。播客、演讲优先选择带 transcript / 文字稿的页面；纯音频需要先有文字稿；
  - 生成学习包时优先调用 AI，失败或未配置时自动退回本地启发式；
  - 学习包预览（摘要 / 词汇 / 句型 / 理解 / 听写 / 复述），搜索、筛选、删除材料；联网材料的来源会显示在卡片上。
- **AI 无材料生成 / 词表整理**：
  - 材料页、学习台空白页、今日页和听力室都有独立的「AI 生成」按钮，不需要先粘贴材料；
  - **AI 生成材料**：可选主题 / 等级 / 长度 / 体裁；不填也能生成。一次返回原创短文和完整学习包（摘要、词汇、句型、理解、听写、复述），保存后直接进入阅读与复习；
  - **AI 生成听力**：生成口语风格的英文，自动拆句并用系统朗读播放，可直接做逐句精听与 Dictogloss；
  - **AI 整理词表**：支持 6–60 个零碎词/短语，能去掉编号、词性、音标和中文提示；AI 按主题分组，补中文释义、搭配和例句，标出核心词，写一篇短文，并生成完整学习包；
  - 整理结果保存在材料里（`wordPlan`），可随时回看分组，不用重新请求 AI；
  - 写作工坊保留独立的「AI 生成题目」按钮。
- **学习台**：
  - 阅读：三档字号、生词虚线下划线、点词看释义与发音、记录阅读尝试；
  - **双向词卡**：每个词汇/语块同时生成“英→中”认读卡和“中→英”产出卡；认读卡翻面看释义，产出卡看中文写英文，检查后再自评三档；两个方向独立排期，多词条目会标为「语块」；
  - 听写：浏览器语音慢速/常速朗读，逐词对齐对比，显示漏写与多写，写回复习计划；
  - 复述：原文 prompt 与提纲、60 秒计时、自评记录。
- **写作工坊**（入口：桌面左侧「工具」，手机从学习台页头进入；主 Tab 仍保持 5 个）：
  - 8 个话题类别、5 种体裁（观点短文 / 邮件 / 消息 / 故事 / 描述）、B1–C1、120–280 词目标；
  - AI 生成英文题目、中文情境和**论点地图**：中心立场、3 组论点（claim / 展开 / 例子）、反方视角、可用语块、文章结构；
  - 草稿编辑器、目标字数、保存草稿、最近写作与历史回看；
  - AI 反馈：中文摘要、2–3 个优点、2–4 处 `original → better` 修改、一个下一步练习、一版保留结构的轻改稿；
  - 修改草稿后旧反馈会标记为「对应上一版」，可再次请求反馈。
- **诊断页**：
  - 近 7 天练习次数、错误标签数与当前重点；
  - 将词汇、听写、听力、复述中累计的错误标签映射成策略卡，每张都带一个 5–8 分钟的具体练法；
  - 当前诊断焦点会自动进入「今日」航线的本周重点，并在今日航线的卡片里显示直达练习入口；
  - 记录最近练习与错误标签，全部来自本地。
- **口语陪练**：
  - 6 个真实场景（咖啡馆闲聊、工作会议、面试、酒店、房东、药店），B1–C1；
  - AI 扮演对方进行角色对话，不在对话中反复纠正；
  - 文字输入始终可用，浏览器支持时可语音输入；AI 回复可朗读；
  - 结束后给出中文反馈：2–3 个优点、2–4 处 original → better、可带走语块、下一次 Take 2 任务；
  - 完成反馈后写入本机「最近口语」，可回看对话与反馈；今日航线的输出步骤会把口语练习计入完成。
- **听力室 / Dictogloss**：
  - 导入音频（MP3 / M4A / WAV / OGG / WebM，最大 25 MB）+ 英文文本；可以选择 SRT / VTT 字幕，自动读取逐句时间轴；
  - 也可以从材料库生成听力，或只用文本 + 系统英语朗读；没有音频也能练；
  - **逐句精听**：单句循环、0.75 / 0.9 / 1.0 倍速、先听再看文本、写一句后逐词对照；
  - **Dictogloss**：按 3–5 句、约 40–70 词分组，听两遍后重建整段，再对照漏词与多写；
  - 音频只保存在本机 IndexedDB；练习记录会进入今日航线的输入阶段和诊断标签。
- **桌面一键启动**：
  - 桌面快捷方式 `LinguaDesk.lnk` → 隐藏启动本地生产服务并打开浏览器；
  - 自动复用已在运行的 LinguaDesk（含 `npm run dev`），不会重复开服务；
  - 使用固定端口 5173 与 `http://localhost:5173`，保持 IndexedDB 来源一致。
- **可选云同步（Supabase）**：
  - 不登录仍然完整本地可用；登录后把材料、学习包、复习、写作、口语、语料库和设置同步到云端；
  - 本地优先，联网 / 回到前台 / 每分钟自动同步，也可以手动「立即同步」；
  - 每条记录做 last-write-wins，删除会上传 tombstone；`syncState` 只存在本机；
  - 听力音频 blobs 不上云；文字、字幕、时间轴与练习记录会同步；
  - 云端用 `user_records` 单表 + RLS，只有账号本人能读写；
  - 免费方案：Vercel Hobby + Supabase Free。中国大陆网络可能无法访问 `supabase.co` 项目域名，此时需要 VPN 或改用香港 VPS。
- **间隔复习 / 双向 SRS**：本地 SM-2 风格调度。忘记 → 约 10 分钟后回来；模糊 → 约 1 天；记得 → 间隔逐次拉长（上限 180 天）。同一词条的认读卡与产出卡分开调度；旧学习包会在打开应用时自动补齐缺少的产出卡，不打乱已有复习进度。
- **个人语料库 / 错误微训练**：
  - 写作和口语生成反馈时，`original → better` 会自动收集进个人语料库；同一错误再次出现会累加“出现次数”；
  - 历史写作 / 口语反馈可以一键同步，重复同步不会重复计次；
  - 每条错误是一张短练卡：先看原句、按提示重写一句，再对照参考改写与差异，最后按真实掌握程度评分；
  - 微训练使用同一套间隔调度，错误会在合适的时间回来；可手动标记掌握、重新激活或移除；
  - 错误卡按写作 / 口语分类，并进入今日页和诊断策略（`表达反复出错`）。
- **本地数据层**：Dexie + IndexedDB，含 materials / packs / reviewItems / attempts / errors / writingWorks / speakingSessions / listeningClips / listeningSessions / corpusItems / settings / syncState 表。
- **PWA**：manifest、192/512 图标、Apple touch icon、Workbox 离线缓存。
- **我的 / 设置**：
  - 运行时切换 AI 供应商：自动 / DeepSeek / Anthropic；只展示服务端已配置的选项，偏好保存在本机；
  - 每日目标 30/45/60/90 分钟，今日航线会按目标重新分配复习、输入和输出时间；
  - 9 个月航线起点；
  - 一键导出/恢复全部本地数据（材料、学习包、复习、练习、写作、口语、听力记录、设置）；
  - D 盘数据位置说明与浏览器 IndexedDB 的边界。

## AI 支持哪些服务

支持两种服务端供应商，浏览器端不接触任何 Key：

- **Anthropic Claude**：`ANTHROPIC_API_KEY`、`ANTHROPIC_MODEL`（默认 `claude-sonnet-5-5`）、`ANTHROPIC_BASE_URL`
- **DeepSeek（OpenAI 兼容）**：`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`（默认 `deepseek-chat`）、`DEEPSEEK_VISION_MODEL`（默认 `deepseek-flash`，用于图像理解）、`DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com`）
- **DeepSeek Search**：使用同一个 `DEEPSEEK_API_KEY` 调用 `POST /v1/tools/search`，不需要单独配置 Key

选择方式：

- 设置 `AI_PROVIDER=anthropic` 或 `AI_PROVIDER=deepseek`。
- 不设置 `AI_PROVIDER` 时会自动检测：优先 Anthropic，其次 DeepSeek。
- 同时配置两种 Key 时，建议明确设置 `AI_PROVIDER`，避免意外选错。
- 在「我的」设置页可以运行时切换：自动 / DeepSeek / Anthropic；服务端会返回哪些供应商已经配置，未配置的选项会禁用。偏好只保存在浏览器，不包含 Key。
- 学习包预览会显示实际生成方（例如 `DeepSeek` 或 `Claude Sonnet`）。

实现方式：

- 生产环境通过 Vercel Function [`api/generate.ts`](api/generate.ts) 调用所选服务；Key 只在服务端。
- 本地开发时，[`vite.config.ts`](vite.config.ts) 挂了一个 `/api/generate` 中间件，复用同一份 [`api/_lib/ai-core.ts`](api/_lib/ai-core.ts) 与 [`api/_lib/provider.ts`](api/_lib/provider.ts)；`npm run dev` 不需要 `vercel dev`。
- 两个供应商都使用函数 / 工具调用返回结构化结果，避免解析自由文本。普通生成单次最长约 55 秒、客户端 75 秒；联网搜索 30 / 45 秒；图像理解 90 / 120 秒。
- **没有 Key 也能用**：导入、阅读、学习、复习、听力、今日航线都正常；学习包自动退回本地启发式。「词汇成文」「AI 生成材料 / 听力」「AI 整理词表」「写作工坊（出题 / 反馈）」需要 AI。
- 每次 AI 学习包最多处理正文前 20,000 字符；更长的材料请拆分导入。
- 写作反馈会把当前草稿发送给所选 AI 服务；出题只发送类别、体裁、等级与目标字数。
- AI 生成材料会把主题与设置发送给所选 AI 服务；整理词表会发送词表和可选中文提示；自动生成听力会发送主题、等级与长度。生成结果保存在本机。
- DeepSeek 适配使用 OpenAI-compatible 的 `tools` / `tool_choice` 与 `tool_calls`；默认模型 `deepseek-chat` 支持 function calling。仓库不内置任何 Key；功能链路用兼容 mock 验证过，真实 Key 需在 `.env.local` 配置。

### 联网搜索（DeepSeek Search）

- 服务端新增 [`callWebSearch`](api/_lib/provider.ts) 与 `web-search` / `search-lesson` 两个任务：
  - `web-search` 直接调用 `POST https://api.deepseek.com/v1/tools/search`，返回规范化后的 `results`（标题、URL、摘要、正文、站点、日期、权威度）；
  - `search-lesson` 先搜索 6 条结果（含正文），再把最多 5 条交给所选模型，用**与普通 AI 生成相同的工具调用**写出一课；返回体额外带 `sources`，前端存入材料的 `sources` 字段。
- 搜索与生成使用同一把 DeepSeek Key；即使 `AI_PROVIDER=anthropic`，只要配置了 `DEEPSEEK_API_KEY`，仍可「用 DeepSeek 搜索 + Claude 写课」。
- 搜索只在材料页手动触发。支持 `site:`、`lang:`、`after:` 等语法；查询里没写 `lang:` 时会自动附加 `lang:en`，优先返回英文网页（想读中文来源可自己写 `lang:zh` 覆盖）。按成功请求计费（约 ¥0.005 / 次，无结果不计费），UI 会提示。
- 前端：[`web-search-dialog.tsx`](src/components/materials/web-search-dialog.tsx) + [`web-material.ts`](src/lib/web-material.ts)。直接存入时优先用网页正文，正文太短才退回长摘要；少于 30 个英文词的结果不允许直接存入，但仍可作为写课的参考资料。

### 图像理解（deepseek-flash）

- 服务端新增 `image-text` 任务，调用 `POST /chat/completions`，`content` 使用块数组：`{"type":"text"}` + `{"type":"image_url","image_url":{"url":"data:image/jpeg;base64,…","detail":"high"}}`。
- 模型由 `DEEPSEEK_VISION_MODEL` 控制，默认 `deepseek-flash`，与文本模型 `DEEPSEEK_MODEL` 分开。
- 前端在 [`src/lib/image.ts`](src/lib/image.ts) 里先把图片缩放到最长边 1800 px、转成 JPEG，并压缩到约 3 MB 以内；原图不上传，材料里只保留 420 px 缩略图。服务端请求体上限相应提高到 4.3 MB（Vercel Function 仍有 4.5 MB 平台上限）。
- 识别模式：`extract` 原样提取英文（无文字时返回 `NO_TEXT`，UI 会提示改用「看图写一段」）；`describe` 让模型返回 `TITLE: …` + 140–220 词的描述，再由前端拆成标题和正文。
- 图像理解与联网搜索一样，需要服务端配置 `DEEPSEEK_API_KEY`；在「我的」页可以看到两项能力是否可用。
- 注意：图片会发送给 DeepSeek 做识别；不要上传含敏感个人信息的照片。

### 排查 AI 鉴权

本地运行时先执行：

```bash
npm run check:ai
```

它会读取 `.env.local`，检查 Key 是否存在、是否含空白或 `#`、是否以 `sk-` 开头，并直接请求 DeepSeek 的 `/models` 与一次极小的 `/chat/completions`，只打印状态码和已脱敏的响应。它不会打印 Key 本身。

服务端遇到鉴权或接口错误时，会把 provider、base URL、model、状态码、Key 形状（只记录布尔值和长度）以及脱敏后的响应写进 `logs/desktop.log`。复杂词表整理如果模型返回了截断/不可解析的工具参数，会自动重试一次，并记录 `[linguadesk:ai:bad-response]` / `[linguadesk:ai:retry]`。常见原因：

- 把其他服务的 Key 填进了 `DEEPSEEK_API_KEY`；DeepSeek 官方 Key 通常以 `sk-` 开头；
- Key 已删除、重置或账户无余额；
- 使用第三方代理 Key，但没有设置 `DEEPSEEK_BASE_URL`；
- 修改 `.env.local` 后没有重启服务。桌面启动方式可以先 `npm run stop` 再双击图标。

## 本地运行

需要 Node.js `^20.19` 或 `>=22.12`（本项目在 Node 26 上验证过）。

```bash
cd "D:\LinguaDesk"
npm install
cp .env.example .env.local
# 编辑 .env.local：设置 AI_PROVIDER=deepseek 或 anthropic，并填入对应 Key；
# 留空时会自动检测（优先 Anthropic，其次 DeepSeek）。
# 不填 Key 也能运行，只是没有 AI 生成。
npm run dev
```

打开 <http://localhost:5173>。根路径会进入 `/today`，从今日航线开始。

`.env.local` 不会进入 git。修改环境变量后需要重启 dev server。自托管服务端 `npm run start` 也会自动读取 `.env.local` / `.env`（已存在的环境变量优先，适合 Docker 和命令行覆盖）。

### 构建与本地 PWA 测试

```bash
npm run build      # 包含前端、API 和类型检查
npm run preview    # Service Worker 与本地 AI 中间件都会生效
```

`npm run build` 现在还会执行 `tsc -p tsconfig.api.json --noEmit`，确保 Vercel Function 的类型不漂移。

```bash
npm run icons      # 重新生成 PWA 图标（含 Windows .ico）
```

### 桌面一键启动

首次运行：

```bash
npm run shortcut
```

会在当前 Windows 桌面创建 `LinguaDesk.lnk`，图标是 `public/icons/linguadesk.ico`。之后双击即可：

1. 检查 5173 端口是否已有 LinguaDesk；有就只打开浏览器；
2. 没有就隐藏启动生产服务（`dist` + `/api/generate`），等健康检查通过后打开 <http://localhost:5173>；
3. 如果 `dist` 不存在，会先在后台运行一次 `npm run build`。

停止后台服务：

```bash
npm run stop
```

启动日志在 `logs/desktop.log`。桌面快捷方式固定使用 `localhost:5173`，这样与开发时的 IndexedDB 来源一致；不要改用 `127.0.0.1` 打开，否则浏览器会把它当成另一个站点、看不到原来的学习记录。

## 云同步（Supabase，可选）

### 1. 创建项目

1. 在 <https://supabase.com> 创建 Free 项目，区域优先 Singapore / Tokyo；
2. Authentication → Providers → Email 启用邮箱登录；
3. SQL Editor 粘贴运行 [`supabase/schema.sql`](supabase/schema.sql)；如果完整版因权限/外键报错，改用 [`supabase/schema-minimal.sql`](supabase/schema-minimal.sql)；
4. Project Settings → API 复制 **Project URL** 与 **anon / publishable key**；
5. 写入 `.env.local`：

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

URL 必须是项目根地址；即使误填 `/rest/v1/`，代码也会自动规范化。不要把 `service_role` key 放进前端或 `.env.local`。

### 2. 使用

1. 重启应用，进入「我的 → 云同步」；
2. 没有账号时点「创建账号」；如果 Supabase 开启了邮箱验证，先完成验证再登录；
3. 登录后点「立即同步」或等待自动同步；
4. 另一台设备登录同账号，拉取同一份记录。

第一次同步会把当前设备已有的数据上传；新设备会先拉取云端数据。删除会以 tombstone 传播；冲突按本地时间 last-write-wins。听力音频文件不上传，只同步文字、字幕时间轴和记录。

### 3. 部署到 Vercel

完整逐项清单见 [`docs/vercel-deploy.md`](docs/vercel-deploy.md)。

1. 把项目推到 GitHub，在 Vercel 导入，框架选 Vite；
2. 在 Vercel Project Settings → Environment Variables 配置：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`（服务端校验登录）
   - `SUPABASE_ANON_KEY`（服务端校验登录）
   - `REQUIRE_CLOUD_AUTH=1`（建议；Vercel 在检测到 Supabase 服务端变量时也会自动要求登录）
   - `AI_PROVIDER=deepseek`
   - `DEEPSEEK_API_KEY`
3. 部署后，把 Vercel 域名加入 Supabase Authentication → URL Configuration 的 Site URL / Redirect URLs；
4. 用手机打开 Vercel 域名并登录。免费 `*.vercel.app` 在中国大陆可能无法访问，必要时绑定自定义域名或使用 VPN。

**AI 登录校验**：浏览器会在 AI 请求中带上 Supabase access token；Vercel 部署在检测到 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 时默认要求登录，服务端通过 `/auth/v1/user` 验证后才调用 DeepSeek。自托管如也需要，请设置 `REQUIRE_CLOUD_AUTH=1`。未登录或 token 失效时接口返回 `AUTH_REQUIRED`，不会消耗 AI 额度。

### 4. 中国网络提醒

Supabase 项目域名（`*.supabase.co`）在中国大陆网络可能被重置，Vercel 默认域名也可能超时。如果手机流量无法打开 Supabase 项目 URL，免费方案就不适合；可以改用香港 VPS（约 ¥24–40/月）或国内云服务。

## 在中国网络环境下运行

前端本身**没有外部 CDN、Google Fonts 或第三方脚本**：字体、图标、代码都随构建产物一起提供。真正的外部请求只有 AI 生成。Vercel 在中国大陆经常无法稳定访问，因此提供了一个不依赖 Vercel 的 Node 自托管入口。

### 方式 A：Node 直接运行

```bash
npm install
npm run build
PORT=3000 npm run start
```

访问 <http://localhost:3000>。服务端会同时提供：
- `dist` 静态文件与 SPA 回退；
- `/api/generate` AI 代理；
- 默认监听 `0.0.0.0`，同一局域网可用手机访问 `http://<电脑 IP>:3000`（PWA 安装与离线缓存需要 HTTPS 或 localhost）。

### 方式 B：Docker（阿里云 / 腾讯云 / 其他中国 VPS）

```bash
docker build -t linguadesk .
docker run -d --name linguadesk -p 3000:3000 --env-file .env.local linguadesk
```

`.env.local` 里配置：
```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的 Key
```
DeepSeek 在中国大陆通常可直连；Anthropic 是否可达取决于你的网络环境。生产使用建议：

1. 用 Nginx / Caddy 反向代理到 `127.0.0.1:3000` 并配置 HTTPS。Service Worker 与 PWA 安装需要 HTTPS。
2. 域名在中国大陆解析时通常需要 ICP 备案；也可以先用服务器 IP + HTTPS 访问。
3. 如果只用纯静态托管（OSS / COS / CDN），界面可以加载，但 `/api/generate` 不存在，词汇成文与写作反馈会失败；AI 功能需要一个 Node/函数计算代理。

### Vercel（可选）

如果你能稳定访问 Vercel，原有配置仍然可用。下面保留说明：



1. 把项目推到 GitHub，在 Vercel 导入；框架选择 Vite（`vercel.json` 已有构建与回退配置）。
2. 在 Project Settings → Environment Variables 配置：
   - `AI_PROVIDER`：`deepseek` 或 `anthropic`
   - DeepSeek：`DEEPSEEK_API_KEY`（必填）、`DEEPSEEK_MODEL`（可选）
   - Anthropic：`ANTHROPIC_API_KEY`（必填）、`ANTHROPIC_MODEL`（可选）
3. 重新部署。`api/generate.ts` 的 `maxDuration` 已设为 60 秒。
4. 或在本地执行：

```bash
npx vercel
```

**AI 成本保护**：Vercel 部署在检测到 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 时默认要求登录，服务端会先验证 Supabase access token；自托管需要设置 `REQUIRE_CLOUD_AUTH=1`。创建自己的账号后在 Supabase 关闭公开注册，避免陌生人注册后使用 AI。仍在 DeepSeek / Anthropic 控制台设置用量上限。不要把 API Key 放进 `VITE_*` 变量。

## 怎么用

1. 打开首页「今日」：按航线完成复习 → 阅读 / 听力 → 输出。时长按「我的」里的每日目标分配，不是硬性计时。
2. 首次可以点「从今天开始」记录 9 个月航线的起点；进度只保存在本机。
3. 没有材料也没关系：在今日、材料或学习台点独立的「AI 生成」按钮；主题可以留空，AI 会写一页内容并直接拆成完整学习包。
4. 如果导入的是一大批零碎单词，用「AI 整理词表」：粘贴词表（可以带中文、编号、词性与音标），AI 会分组、补释义/搭配/例句、标出核心词，并写成短文与学习包。
5. 在材料页导入：粘贴、上传 TXT / PDF / DOCX，或选「词汇成文」用 3–15 个词生成短文。
6. 生成学习包；AI 会给出中文摘要、词汇、句型、理解题、听写句和复述 prompt。
7. 去学习台，按阅读 → 词汇卡 → 听写 → 复述的顺序走一遍；状态会回到今日航线。
8. 从桌面左侧「工具 → 听力室」或学习台页头的「听力室」进入听力：可以导入音频 + 文本 / SRT，也可以点「AI 生成听力」直接生成一段；先做逐句精听，再做一段 Dictogloss。
9. 从桌面左侧「工具 → 写作工坊」或学习台页头的「写作工坊」进入写作。
10. 选话题、体裁、等级和目标字数，点「AI 生成题目」；可以收起论点地图、点「去起草」直接跳到编辑器。
11. 写完后保存草稿；点「请 AI 反馈」，挑 1–2 处最关键的改动再写一版。最近的写作会留在「最近写作」里。

文件与限制：

- PDF：最多 120 页；需要文字层，扫描版 PDF 暂不支持 OCR。
- DOCX：不支持老版 `.doc`，请先另存为 `.docx` 或 PDF。
- 单文件最大 15 MB；文本最多 6 万字符。
- 听力音频单文件最大 25 MB；需要同时提供英文文本（字幕 SRT / VTT 或纯文本）。没有字幕时间轴时，音频只能从整段开头播放；没有音频时使用系统英语朗读。
- JSON 备份会保留听力文本、字幕时间轴和练习记录，但**不包含音频文件**；恢复后音频显示“未随备份恢复”，重新导入即可。
- 词汇成文一次 3–15 个词/短语，选择等级、长度与体裁；未自然用上的词会明确标出。
- AI 整理词表一次 6–60 个词/短语；超过 60 个建议先分批。AI 没有归入主题的输入词会放进「补充词」，不会静默丢掉。
- AI 自动生成材料默认可不填主题；生成结果会作为普通材料进入阅读、词汇卡、听写、复述和复习队列，来源标记为「AI 自动生成」。
- AI 生成听力没有真人音频，使用系统英语朗读；生成结果保存在听力室，可继续导入真人音频替换。
- 写作草稿目前需要手动点「保存草稿」；关闭或刷新页面时，若有未保存内容会提示。历史列表展示最近 20 篇。
- 写作出题与反馈、AI 生成材料/听力、AI 整理词表都需要 AI；没有 Key 时会显示配置提示，已有材料仍可正常学习。
- 今日航线会读取本机练习记录；阅读完成需要通过阅读页的「读完了」，听力完成以任意一次听力练习为准，写作完成以保存/反馈过的作品为准，复述完成以自评记录为准。
- 诊断会根据累计错误标签给出当前焦点与策略，并同步到今日航线的本周重点；这是第一版自适应，更深的自适应排程与月度复测会在后续接入。
- 朗读使用浏览器自带的 SpeechSynthesis，取决于系统英语语音。

## 目录

```
api/
  generate.ts          Vercel Function 入口
  _lib/ai-core.ts      任务、提示词、工具 schema、输入校验
  _lib/provider.ts     Anthropic / DeepSeek 适配与错误处理
server/
  index.ts             中国网络自托管：静态文件 + /api/generate
  load-env.ts          自托管启动时读取 .env.local / .env
supabase/
  schema.sql           user_records 表、RLS 与索引
  schema-minimal.sql   权限受限时的精简建表版本
  README.md            Supabase 配置步骤
docs/
  vercel-deploy.md     Vercel 部署、环境变量与验收清单
scripts/
  launch.mjs           桌面一键启动：健康检查、生产服务、打开浏览器
  launch.vbs           无窗口启动入口
  stop-linguadesk.mjs  停止后台服务
  check-ai.mjs         检查 .env.local 的 Key 并直接测试 DeepSeek
  create-desktop-shortcut.ps1 创建桌面快捷方式
Dockerfile             自托管容器
src/
  components/
    brand/             桌面标志
    corpus/            错误微训练卡
    layout/            AppShell、导航、底部 Tab、右栏（含听力/语料库）
    listening/         导入弹窗、AI 听力、播放器、逐句精听、Dictogloss、逐词对照
    materials/         导入弹窗、AI 生成材料、AI 词汇整理、词汇成文、材料卡片、学习包预览
    study/             阅读、词汇卡、听写、复述
    writing/           出题与论点地图、编辑器、反馈、历史
    ui/                shadcn/ui 风格的基础组件
  data/                内置示例
  lib/
    ai/
      generate.ts      AI 优先 + 本地启发式兜底
      remote.ts        浏览器端 API 调用与响应校验（含自动生成/词表/口语）
      glossary.ts      本地小词典
      local generator  提取式生成
    auto-material.ts   自动材料/词汇整理：AI 结果 → 材料 + 学习包
    cloud/             Supabase 客户端、登录、per-record 同步引擎
    corpus.ts          写作/口语反馈 → 个人语料库 / 微训练调度
    web-material.ts    联网搜索结果 → 阅读材料 / 搜索依据写课
    import-files.ts    PDF / DOCX / TXT 本地解析
    word-list.ts       3–15 词成文解析 + 6–60 词批量整理解析
    writing.ts         写作类别、体裁、等级常量
    speaking.ts        口语场景常量
    listening.ts       字幕解析、文本分句、Dictogloss 分组
    use-speech-recognition.ts 浏览器语音识别封装
    diagnostics.ts     错误标签 → 策略卡 / 诊断焦点
    backup.ts           全量导出 / 恢复本地数据
    db.ts              Dexie 数据层、尝试/错误/写作/口语/听力/设置记录
    diff.ts            听写逐词对比
    srs.ts             间隔复习调度
    speech.ts          浏览器语音与连续朗读
  pages/               今日、材料、学习台、写作工坊、口语陪练、听力室、个人语料库、诊断、我的
```

## 数据说明

- 数据库名：`linguadesk`，位于浏览器 IndexedDB；写作记录在 schema v2 的 `writingWorks`，航线起点与每日目标在 schema v3 的 `settings`，口语会话在 schema v4 的 `speakingSessions`，听力片段与听力会话在 schema v5 的 `listeningClips` / `listeningSessions`，个人语料库在 schema v6 的 `corpusItems`，云同步游标在 schema v7 的 `syncState`（只在本机，不进备份）。AI 词汇整理的分组与短文保存在材料的 `wordPlan` 字段里；联网材料的来源保存在 `sources`；双向词卡在 `reviewItems` 里用 `kind:'vocab'`（认读）和 `kind:'recall'`（中→英产出）区分，随 materials 表一起备份。
- 云同步的远端表是 `public.user_records`，按 `(user_id, table_name, record_id)` 一行一条；只允许登录用户通过 RLS 访问自己的行。音频 blob 不上传。
- 清除站点数据、换浏览器或换设备，数据都不会自动迁移；请在「我的」页定期导出 JSON 备份，保存到 D 盘（例如 `D:\LinguaDesk\backups`）。
- Web 应用无法直接指定浏览器 IndexedDB 的磁盘目录；进阶用户可以把 Edge/Chrome 的 `--user-data-dir` 指向 D 盘。项目与本机构建文件已经在 `D:\LinguaDesk`，Windows 的旧路径 `C:\Users\胡霖峰\linguadesk` 现在是指向 D 盘的 junction。
- 原文件不会被上传；使用 AI 时，会把当前要处理的文本、词表或写作草稿发送给所选 AI 服务。听力音频不会上传，AI 也不会接收音频。
- 复习调度、练习记录、错误标签、写作草稿与反馈、口语记录、听力记录、个人语料库、AI 生成材料、词表分组、航线起点全部保存在本地。
- 今日航线的完成状态只根据本机记录计算，不上报。

## 下一张 / 下一步

这一轮完成了「个人语料库 + 错误微训练」「双向 SRS + 语块」「联网新闻 / 播客 / 演讲 / 讲稿搜索」和「Supabase 云同步」。接下来建议：

1. **Vercel + Supabase 正式上线**：按 `docs/vercel-deploy.md` 配环境变量、部署并在手机验收。
2. **更完整的自适应月度复测**：按阶段调整复习量与输出任务。
3. **听力增强**：无字幕音频的可视化波形、跟读录音对比、更多内置真实场景。

统一入口仍是 5 个主 Tab；写作、口语、听力与个人语料库保留在桌面「工具」和手机学习台入口。诊断焦点现在会影响今日航线的本周重点；听力练习也会计入输入阶段。AI 生成材料与词汇整理都会直接进入现有学习板块，不需要另开一套学习法。云同步不改变本地优先：未登录、断网或 Supabase 不可达时，应用仍可完整本地使用。
