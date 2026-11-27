# DESIGN-SPEC · 提示词图鉴（prompt-atlas）界面重设计

> 交付形态：Web App 界面（桌面优先，1440 基准）
> 设计依据：Refactoring UI（层级 / 间距 / 色彩 / 深度）+ 现有代码事实（`src/styles/main.css`、`src/components/*.vue`）
> 性质：**改版，保留现有信息架构**，只重做视觉系统与布局度量。

## 1. 任务摘要

**目标**：把现有的三栏出图工作台重做成「视觉噪音更低、状态更清楚、长时间盯着不累」的界面。判据不是好看，而是：能不能在 168 个角色里 3 秒内找到人、能不能一眼看出哪个角色框在收标签、能不能不误删标签。

**受众**：单人使用（作者本人），日均使用 30 分钟以上，屏幕 1440–1920 宽，键鼠为主。

**场景**：选角色 → 加标签 → 复制提示词。三个动作在一屏内闭环，不需要翻页。

**成功标准**
1. 所有承载信息的小字对比度 ≥ 4.5:1（现有辅助文字只有 3.23:1，不达标）
2. 卡片与面板**零阴影**，层次只靠 1px 描边与三级表面明度差
3. 同一屏内出现的不重复圆角/间距/字号取值，各自 ≤ 4 种

## 2. 信息架构

```
工作台（单页，三栏）
├─ 顶栏 TopBar                                    P0 · 48px
│  ├─ 品牌区（标记 + 标题 + 副标题）
│  ├─ 档位分段控件（精简 / 标准 / 复杂）           P1
│  └─ 右侧动作（负向开关 · 历史 · 说明书 · 设置）   P1
├─ 左栏 角色图鉴 Atlas                            P0 · 480px 宽
│  ├─ 游戏页签（全部 168 / 原神 49 / 星穹铁道 66 / 绝区零 53）
│  ├─ 搜索框 + 新增 + 导入
│  └─ 角色卡网格（3 列，可滚动）                    P0
├─ 中栏（上下两段）                                P0 · 自适应 ≈ 488px
│  ├─ 拼装区 Selection                            P0 · 上段，可滚动
│  │  ├─ 角色槽 × N（头像 + 名字 + 手 1/2 + 冲突提示 + 标签芯片）
│  │  └─ 全局槽（场景 / 画风）
│  └─ 词库 TagLibrary                             P1 · 下段，定高 320px
│     ├─ 分类页签 + 子类
│     └─ 标签列表（点击加入当前槽）
└─ 右栏 输出 Output                               P0 · 400px 宽
   ├─ 输出块 × 3（MOSS 中文 / WAI / Pony）
   │  └─ 块头（名称 + 说明 + 复制正向 / 负向）
   └─ 空状态（未选角色时）
```

**刻意不做**：顶部 Hero、引导轮播、统计卡片、侧面导航栏、右侧属性面板。这是工具，不是官网。

## 3. 内容清单

**顶栏**：标题「提示词图鉴」· 副标题「本地拼装 · 一键出三套」· 档位「精简 / 标准 / 复杂」· 开关「负向」「防克隆」· 按钮「历史」「说明书」「设置」

**左栏**：搜索占位「搜索角色 / 英文 tag / 特征」· 按钮「新增」「导入」· 底部计数「168 位角色 · 点卡片加入拼装」

**中栏拼装区**：标题「拼装区」· 副标「2 角色 · 6 标签」· 动作「粘贴」「权重」「画风」「清空」· 空状态「还没选角色 / 左边点角色卡，先建一个角色框」· 槽内空位「拖标签进来」· 全局槽空位「场景、画风拖到这」

**中栏词库**：标题「补充标签」· 副标「120 条」· 提示「点一下加到 甘雨」· 分类「外形 / 服装 / 动作 / 道具 / 场景 / 风格 / 自定义」

**右栏**：标题「提示词输出」· 副标「标准档」· 动作「AI 润色」「显示负向」· 三块「MOSS 中文段落 + 中文负向」「WAI Illustrious / NoobAI」「PONY score 前缀 + Pony 负向」· 空状态「选好角色，这里就出提示词 / 换档位会改标签数量，改开关会改负向」

所有文案沿用现有代码里的真实字符串，不新增占位文案。

## 4. 视觉方向

**三个形容词**：克制、扁平、可读优先。

**参考锚点**：Linear 的信息密度与描边层次；Notion 的表面分级（页面底 / 面板 / 凹槽三级明度差，不靠阴影）。

**反例（明确不做）**
- ❌ 不做渐变背景、不做 `linear-gradient` 卡片底色
- ❌ 不做玻璃拟态、不做 `backdrop-filter`
- ❌ 卡片 hover 不做 `translateY` 位移、不加投影
- ❌ 不用大圆角（>14px）做「亲和感」、不用彩色描边装饰卡片
- ❌ 不用紫色做主色铺大面积；品牌色只出现在「当前选中 / 主按钮 / 焦点环」

## 5. 设计 token

### 5.1 颜色

| token | 值 | 用途 | 对比度（白底 / 页面底） |
|---|---|---|---|
| `color-bg-page` | `#f2f1f8` | 页面底色 | — |
| `color-surface` | `#ffffff` | 面板、卡片 | — |
| `color-surface-sunken` | `#f7f6fc` | 输入框、内嵌凹槽、代码块 | — |
| `color-surface-hover` | `#f6f5fa` | 列表项 hover | — |
| `color-border` | `#e3dfee` | 分隔与容器描边 | 1.31（装饰性，不承载识别） |
| `color-border-strong` | `#cfc8e6` | hover 描边、控件边框 | 1.43 |
| `color-text-1` | `#221e35` | 标题、正文、关键数值 | **16.09 / 14.34** |
| `color-text-2` | `#5b5674` | 次要正文、标签中文名 | **6.93 / 6.18** |
| `color-text-3` | `#6b6580` | 辅助小字、英文 tag、元信息 | **5.53 / 4.93** |
| `color-text-disabled` | `#8b85a0` | 仅禁用态与装饰（≥18px 才可用于文字） | 3.52 / 3.14 |
| `color-brand` | `#6355f0` | 选中描边、主按钮底、焦点环 | 5.14 / 4.58 |
| `color-brand-hover` | `#5646e0` | 主按钮 hover | 6.27 / 5.59 |
| `color-brand-soft` | `#efecfe` | 选中卡片底色 | — |
| `color-brand-border` | `#d3ccfb` | 选中态描边 | — |
| `color-success` | `#0a6b45` | 成功提示文字 | **6.56 / 5.84** |
| `color-warning` | `#8f5510` | 警告提示文字 / toast 底（白字 6.04） | **6.04 / 5.39** |
| `color-danger` | `#a8232a` | 删除、错误 | **7.15 / 6.37** |

> ⚠️ **这是本次最重要的一处修正**：现有 `--ink-3 #918ca6` 只有 **3.23:1**，却承担了英文 tag、面板副标、卡片元信息等真实信息；`--ink-4 #b3aec4` 只有 **2.15:1**。全部替换为 `color-text-3`。`color-text-disabled` 只允许出现在禁用态和纯装饰。

**与现有变量的映射（落地时改 `main.css`）**

```
--bg           #f2f1f8  → color-bg-page
--panel        #ffffff  → color-surface
--sunken       #f7f6fc  → color-surface-sunken
--line         #e9e6f3  → color-border        #e3dfee（描边需更实一点，扁平后它承担全部层次）
--line-2       #dcd6ee  → color-border-strong #cfc8e6
--ink          #221e35  → color-text-1
--ink-2        #5b5674  → color-text-2
--ink-3        #918ca6  → color-text-3        #6b6580  ★ 修正
--ink-4        #b3aec4  → color-text-disabled #8b85a0  ★ 修正，且不再用于任何正文
--accent       #6355f0  → color-brand
--accent-ink   #4b3ad6  → color-brand-hover   #5646e0
--accent-soft  #efecfe  → color-brand-soft
--accent-line  #d3ccfb  → color-brand-border
--ok           #0f9d63  → color-success       #0a6b45  ★ 修正（原 3.49 不达标）
--warn         #b9711a  → color-warning       #8f5510  ★ 修正（原 3.86 不达标）
```

### 5.2 字体

字族：`'Inter', 'Noto Sans SC', system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif`
等宽：`'JetBrains Mono', ui-monospace, Consolas, monospace`（用于英文 tag 与提示词正文）

| token | 字号 / 行高 | 字重 | 用途 |
|---|---|---|---|
| `font-caption` | 11 / 16 | 400 | 计数、徽标、极简辅助 |
| `font-body-sm` | 12 / 18 | 400 | 英文 tag、标签芯片、区块说明 |
| `font-body` | 13 / 20 | 400 | 默认正文、卡片名、列表项 |
| `font-title` | 15 / 22 | 600 | 面板标题 |
| `font-heading` | 17 / 24 | 600 | 顶栏标题 |
| `font-mono-body` | 12 / 18 | 400 | 提示词输出正文（等宽） |

**层级不靠字号，靠字重 + 颜色**：同一 13px，标题用 600 + `text-1`，正文 400 + `text-2`，辅助 400 + `text-3`。现有代码里 9.5 / 10.5 / 11.5 / 12.5 等碎字号已全部收敛为上表五档。

**代码侧 CSS 变量映射**（`src/styles/main.css` 的 `:root`，组件里只允许引用这些变量）：

```
font-caption      → --fs-caption   11px   计数 / 徽标 / 英文 tag / 极小元信息
font-body-sm      → --fs-sm        12px   按钮 / 分类 / 芯片 / 区块说明
font-body         → --fs-body      13px   正文 / 卡片名 / 词条中文
font-title        → --fs-title     15px   面板标题
font-heading      → --fs-heading   17px   顶栏标题（预留）
font-mono-body    → --fs-sm        12px   提示词正文（配合 var(--mono)）
```

> 唯一保留的字面量是角色卡占位首字的 `30px`——它是图形化的首字，不参与文字层级。

### 5.5 控件高度（第二批补齐）

用户实测反馈「按钮偏小」，故在首批规格基础上整体上调。代码侧同样用变量，不再写死：

| token | 值 | 用途 | 首批规格值 |
|---|---|---|---|
| `--h-btn` | 34px | 主按钮 | 28 |
| `--h-btn-sm` | 30px | 小按钮（粘贴 / 权重 / 清空 / 复制正向等） | 28 |
| `--h-icon` | 34px | 图标按钮（撤销 / 重做 / 设置等） | ≥28 |
| `--h-seg` | 30px | 档位段 / 游戏页签 | 28 / 30 |
| `--h-input` | 32px | 搜索框 / 表单输入 | 32 |
| `--h-row` | 34px | 词库词条行 | 30 |
| `--h-chip` | 26px | 已选标签芯片 / 子分类 / 编辑态输入框 | 24 |
| `--hit-min` | 24px | 收藏星 / 编辑 / 移除 / 清除 / 权重加减的最小命中区 | 20 |

状态色也补齐了变量，组件里不再写死十六进制：危险色 `--danger` / `--danger-ink` / `--danger-line` / `--danger-soft` / `--danger-soft-2`，星标 `--star` / `--star-soft` / `--star-line` / `--star-ink`，极浅底 `--surface`，滚动条 `--scroll` / `--scroll-hover`，toast `--toast-bg` / `--toast-warn`。

### 5.3 间距

4 的倍数：`space-1 4` · `space-2 8` · `space-3 12` · `space-4 16` · `space-5 20` · `space-6 24` · `space-8 32`

现有取值 3 / 5 / 7 / 9 / 10 / 11 / 13 / 14 全部吸附到以上七档（±2px 视为同一档，不为对齐而微调布局）。

### 5.4 圆角 / 描边 / 阴影 / 动效

| token | 值 | 用途 |
|---|---|---|
| `radius-control` | `6px` | 按钮、输入框、芯片、页签 |
| `radius-card` | `10px` | 角色卡、输出块、槽 |
| `radius-panel` | `12px` | 三栏面板 |
| `radius-pill` | `999px` | 计数徽标、勾选圆点 |
| `border-width` | `1px` | 全部描边；选中态用 1px 加深，不用 2px 加粗 |
| `shadow-none` | 无 | 面板、卡片、列表项**一律不用阴影** |
| `shadow-overlay` | `0 8px 24px rgba(34,30,53,.10)` | 仅弹窗 / 抽屉，必须同时有 1px 描边 |
| `motion-fast` | `120ms cubic-bezier(.2,0,0,1)` | hover、颜色过渡 |
| `motion-base` | `160ms cubic-bezier(.2,0,0,1)` | 选中、展开 |
| `motion-slow` | `200ms cubic-bezier(.2,0,0,1)` | 弹窗、抽屉 |

## 6. 组件清单

| 组件 | 变体 | 状态 | 关键尺寸 | 依赖 token |
|---|---|---|---|---|
| TopBar | — | 固定 | 高 48，左右 padding 16，底部 1px 描边 | border, surface, text-1/3 |
| SegmentedControl（档位） | 3 段 | default / hover / selected / focus-visible | 高 30（`--h-seg`），段内 padding 0 10，圆角 6 | sunken 底 + 选中 surface + 描边；选中文字 600 |
| IconButton | 20 / 28 | default / hover / active / focus-visible / disabled | 命中区 34×34（`--h-icon`），卡片内小图标 ≥ 24（`--hit-min`） | hover 用 surface-hover 底，不用描边 |
| Button | primary / secondary / ghost | 同上 | 高 34（`--h-btn`）/ 30（`--h-btn-sm`），padding 0 10，圆角 6 | primary = brand 底 + 白字；secondary = surface + border；ghost 无底 |
| GameTab | — | default / hover / selected | 高 30（`--h-seg`），padding 0 10，圆角 6 | selected = surface + border + 600 字重；**不用品牌色填充**（避免三栏都在抢注意力） |
| SearchField | — | default / focus / filled | 高 32（`--h-input`），左图标 14，padding-left 30 | sunken 底 + border；focus 时 border 变 brand + 外环 |
| RoleCard | — | default / hover / selected / focus-visible | 宽 144，图 144×144（`aspect-ratio:1`），下 padding 8 | default = surface + border；hover = border-strong + 图叠加 4% 黑；selected = brand-border + brand-soft 底 + 左上角 18px 勾 |
| Panel | 3 栏通用 | — | 圆角 12，padding 12，1px 描边 | **无阴影** |
| PanelHeader | — | — | 高 32，标题 15/600，副标 12/400 text-3 | — |
| SlotBox（角色槽） | 角色 / 全局 | default / active（收标签中）/ dragover / conflict | 圆角 10，padding 8 10 | active = brand-border + brand-soft；dragover = 品牌色 1px 虚线内描边；conflict 时右侧出现 warning 文字按钮 |
| TagChip | 普通 / 带权重 / 编辑中 | default / hover / selected / focus-visible | 高 26（`--h-chip`），padding 0 8，圆角 6 | 底 = surface，描边 border；hover = border-strong；带权重时右上角 10px 数字 |
| TagRow（词库行） | — | default / hover / selected | 高 34（`--h-row`），padding 0 8，圆角 6 | hover = surface-hover；已在本槽 = brand-soft + 左侧 2px brand 竖线 |
| OutputBlock | — | default / copied | 圆角 10，padding 10，块间 12 | 正文等宽 12/18，`color-text-1`；块头分隔用 1px 线 |
| EmptyState | — | — | 居中，图标 26 + 主文 13/500 + 说明 12/text-3 | — |
| Toast | ok / warn | enter / leave | 高 34，圆角 8，底部 24 | ok = text-1 底白字；warn = warning 底白字（6.04） |
| Modal / Drawer | — | open / closing | 遮罩 `rgba(34,30,53,.28)` | 唯一允许用 `shadow-overlay` 的地方，且必须带 1px 描边 |

## 7. 布局与响应式

**栅格**：`grid-template-columns: 480px minmax(0, 1fr) 400px`，`gap: 16`，页面 padding `16`，三栏高度填满视口（`min-height: 100vh`），各栏内部独立滚动，**页面本身不滚**。

**断点与重排**

| 断点 | 布局 | 变化 |
|---|---|---|
| ≥ 1440 | 三栏 480 / 自适应 / 400 | 基准形态；卡片 3 列 |
| 1320 – 1439 | 三栏 420 / 自适应 / 360 | 卡片仍 3 列（列宽收窄到 126），输出等宽字号降到 11 |
| 1080 – 1319 | 两栏：左 420 + 右侧堆叠（中栏在上、输出在下同宽） | 拼装区与词库保持上下关系；输出块变为整宽、三块横向并排 |
| 768 – 1079 | 两栏：左 360 + 右堆叠 | 卡片 2 列；词库高度 260 |
| < 768 | 单列纵向：图鉴（定高 420 可滚动）→ 拼装区 → 词库 → 输出 | 顶栏只保留标题 + 设置；档位段控件下沉到拼装区头部 |

**触控目标**：桌面 ≥ 28×28；`< 768` 时所有可点元素命中区 ≥ 44×44（通过 padding 扩展，不放大视觉尺寸）。

**滚动**：每栏 `overflow-y: auto` + `overscroll-behavior: contain`；滚动条宽 8，滑轨透明，滑块 `#d5d0e4`，hover 时 `#c3bdda`。

## 8. 交互与动效

| 触发 | 反馈 | 时长 / 缓动 | 可打断 |
|---|---|---|---|
| 卡片 / 按钮 / 列表项 hover | 仅描边色或底色变化（**无位移、无阴影**） | 120ms / `cubic-bezier(.2,0,0,1)` | 是 |
| 卡片选中 | 描边转 brand + 底色转 brand-soft + 左上出现勾 | 160ms | 是 |
| 槽成为当前收标签目标 | 描边转 brand + 底色转 brand-soft + 右上「收标签」徽标 | 160ms | 是 |
| 标签拖到槽上方 | 槽内出现 1px 品牌色虚线描边，无缩放 | 80ms | 是 |
| 键盘聚焦 | 2px brand 外环 + 2px offset（`outline`，不占布局） | 0ms（即时） | — |
| 标签加入 / 移除 | 芯片淡入淡出 120ms，不做高度动画（避免列表跳动） | 120ms | 是 |
| 复制成功 | 按钮图标换勾 + 文案「已复制」，1400ms 后还原 | 120ms | 是 |
| Toast | 自下 8px 淡入，2200ms 后淡出 | 200ms | 是 |
| 弹窗 / 抽屉 | 遮罩淡入 + 内容上移 8px 淡入 | 200ms | 是 |
| 角色卡图片加载失败 | 直接切到首字色块，不做骨架屏闪烁 | 0ms | — |

**无动效项**：档位切换、页签切换、输出内容变化——这些是高频操作，任何过渡都会让人觉得慢。

## 9. 验收清单

**视觉**
- [x] 面板、卡片、列表项均为 0 阴影；`box-shadow` 全项目只出现在弹窗/抽屉与 toast 上
- [x] 卡片无渐变背景，`background-image` 全项目为 0
- [ ] 同屏圆角取值 ≤ 3 种（6 / 10 / 12 / 999）
- [ ] 同屏间距取值全部落在 4/8/12/16/20/24/32
- [x] 同屏字号取值收敛到 5 档（11 / 12 / 13 / 15 / 17），组件内无字面量字号
- [x] 三栏顶部基线对齐，面板内 padding 一致（12）
- [x] 颜色 / 字号 / 控件高度全部由 `:root` 变量提供，组件 scoped style 无硬编码十六进制与字号字面量

**对比度**（用取色器逐个核对，不靠肉眼）
- [ ] 正文 `#221e35` 对白底 ≥ 16:1
- [ ] 辅助小字 `#6b6580` 对白底 ≥ 5.5:1（现有 3.23:1 已修）
- [ ] 品牌色 `#6355f0` 文字对白底 ≥ 5:1；白字压品牌底 ≥ 5:1
- [ ] 警告 toast 白字底色 `#8f5510` ≥ 6:1
- [ ] 禁用/装饰色不得用于任何承载信息的文字

**交互**
- [ ] TopBar 按钮、页签、卡片、芯片、槽位都有 hover / focus-visible / active 三态
- [ ] 键盘 Tab 能依次到达：顶栏动作 → 页签 → 搜索 → 卡片 → 槽 → 芯片 → 词库 → 输出按钮
- [ ] 焦点环在页面底 `#f2f1f8` 上清晰可见（brand 对页面底 4.58:1）
- [ ] 选中卡片、当前收标签的槽、已加入当前槽的词库行，三处状态互不混淆
- [ ] hover 不引起任何布局位移（`transform` 全项目为 0）

**内容**
- [ ] 无 lorem ipsum、无「这里放一句话」类占位
- [ ] 文案与现有组件字符串一致（改版不改信息）

**可访问性**
- [ ] 所有图标按钮有 `title` 或 `aria-label`
- [ ] 图片有 `alt`，装饰性图片 `alt=""`
- [ ] `<768` 可点元素命中区 ≥ 44×44

## 10. 待确认

1. **是否需要保留「档位」分段控件的三档视觉差异**？现在三段等宽，用户高频切换；若改成下拉可省 60px 宽。影响：第 6 节 SegmentedControl。
2. **角色卡是否要恢复显示元素/游戏名**？当前只有图 + 名字（168 个角色里 3 个无图，显示首字色块）。影响：第 6 节 RoleCard 高度。
3. **词库是否需要「只看已收藏」的常驻筛选项**？现在藏在分类页签里。影响：第 2 节中栏信息架构。
4. **输出区是否要支持字号切换**（11 / 12）？等宽正文在 1920 宽屏下偏小。影响：第 5.2 节字体表。
5. **暗色模式是否纳入本次范围**？现有 token 全是浅色单套，加暗色需要第二套表面与描边。影响：第 5.1 节全部颜色。
