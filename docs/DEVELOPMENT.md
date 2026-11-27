# 提示词图鉴 · 开发文档

> 面向维护者。想了解怎么用，看应用右上角的「说明书」。
> 最后核对：2026-11-27，对应 `src/` 约 6,500 行。

## 1. 这是什么

一个**纯前端、零后端**的动漫出图提示词工作台：左边挑角色，中间把标签拖进角色框，右边同时产出 MOSS（中文段落）、WAI / Illustrious（英文标签）、Pony（score 前缀）三套正负向提示词。

和「大而全的标签库」不同，它的重点是**拼装语义**：同一个角色框里姿态互斥、两只手有预算、标签可以加权。数据全部存在浏览器 localStorage。

技术栈只有三样：Vue 3（`<script setup>` + Composition API）、TypeScript（strict）、Vite。运行时依赖只有 `vue` 一个包，没有 Pinia、没有路由、没有 UI 组件库。这是有意的 —— 应用的状态可以数得过来，多一层抽象只会增加查找跳转。

## 2. 快速开始

```bash
npm install
npm run dev      # http://localhost:5273
npm run build    # vue-tsc --noEmit 做类型检查，再打包到 dist/
npm run preview  # 本地预览 dist/
```

没有测试、没有 lint 命令（见 §11）。类型检查是 `build` 的一部分，`strict` + `noUnusedLocals` + `noUnusedParameters` 全开，所以**删了东西没清干净 import 会直接构建失败**，这是件好事。

## 3. 目录结构

```
src/
├─ main.ts              入口，只做挂载
├─ App.vue              三栏骨架；所有弹窗平铺挂在根上，靠 store 里的 ui.*Open 控制
├─ types.ts             全部数据类型
├─ store.ts             单例状态 + 业务规则 + 持久化 + 提示（539 行，最大的文件）
├─ styles/main.css      CSS 变量、全局通用类（.btn / .panel / .mask …）
├─ data/                纯数据，不含逻辑
│  ├─ characters.ts       32 个精修角色 + 合并导出 SEED_CHARACTERS
│  ├─ characters-extra.ts 136 个批量导入角色（脚本生成，见 §8）
│  ├─ tags.ts             218 条通用补充标签
│  ├─ conflicts.ts        互斥组 + 手部预算词表
│  └─ styles.ts           40 条画风
├─ lib/                 纯函数，不依赖 Vue 响应式（store.ts 是唯一会改状态的地方）
│  ├─ prompt.ts           生成三套提示词
│  ├─ parse.ts            粘贴拆解
│  ├─ importer.ts         角色 JSON / CSV 导入、字段别名表
│  ├─ ai.ts               OpenAI 兼容接口、提示词模板、中英切分
│  ├─ dnd.ts              HTML5 拖拽的模块级载荷
│  ├─ clipboard.ts        复制（含 execCommand 兜底）
│  └─ icons.ts            内联 SVG path
├─ components/          见 §9
public/avatars/         170 张 160×160 webp 头像，文件名 = Character.avatar
```

`vite.config.ts` 和 `tsconfig.json` 里配了 `@` → `src` 的别名，但代码里全用的是相对路径。两种都行，挑一种坚持。

## 4. 数据模型

全部定义在 `src/types.ts`。

| 类型 | 用途 | 关键点 |
|---|---|---|
| `Character` | 图鉴里的一张卡 | `en` 是唯一键；`tags` 是逗号分隔的英文外观标签；`avatar` 对应 `public/avatars/<avatar>.webp`，留空则显示首字色块 |
| `TagItem` | 词库里的一条 | `cat` ∈ 外形/服装/动作/道具/场景/风格/自定义；`nsfw` 受「隐藏 NSFW」开关控制 |
| `SlotTag` | 放进角色框或全局区之后的一个标签 | 比 `TagItem` 少分类，多一个权重 `w` |
| `Settings` | 设置抽屉里的全部开关 + AI 接口配置 | 整个对象会存进快照 |
| `HistoryEntry` | 一条历史 | `tags` / `slots` 的元素类型是 `SlotTag \| string`，因为早期版本只存 en 字符串 |
| `Snapshot` | localStorage 里那一整份（`store.ts` 内部类型） | 见 §7 |

### 角色：种子、覆盖、隐藏

`allCharacters` 的算法是 `[...overrides, ...seeds]`，其中 `seeds` 会滤掉 `overrides` 里已有的 `en` 和 `hidden` 里的 `en`。所以：

- **编辑一个种子角色** → 不会改数据文件，而是往 `overrides` 里放一份完整副本，优先于种子
- **删除一个种子角色** → 只是记进 `hidden`，数据文件不动
- **导入同 `en` 的角色** → 覆盖 `overrides` 里那一份

`SEED_CHARACTERS = [...CURATED, ...EXTRA_CHARACTERS].sort(按游戏)`。精修版和批量版如果 `en` 相同会同时存在，所以**两份数据的 `en` 必须保持互斥**（生成脚本用归一化匹配做过去重，见 §8）。

## 5. 核心流程：从点击到输出

```
点角色卡 ──▶ selectedChars.push(en)，建一个空的 charTags[en]
点/拖标签 ──▶ toggleSlotTag(tag, slot)
               ├─ enforceExclusive  同互斥组只留一个（可关）
               ├─ enforceHands      手部预算，超了顶掉最旧的（可关）
               └─ list.push({ zh, en })
                         │
          任何变化 ──▶ outputs = buildOutputs(selectedCharItems, charTags, globalTags, settings)
                         │
             ┌───────────┼─────────────┐
           MOSS         WAI          PONY
         中文段落      英文标签    score_ 前缀 + 英文标签
```

`outputs` 是一个 `computed`，右侧面板只读它。实测从点一下标签到下一帧约 7ms。

### 互斥组（`data/conflicts.ts`）

七个语义上不能共存的维度：`pose` 姿态、`gaze` 视线、`shot` 景别、`angle` 视角、`face` 表情、`facing` 朝向、`outfit` 整体装束。道具、手势、服装单品**故意不收** —— 那些叠加是常态。

- 受「同类自动替换」开关控制；`outfit` 组额外受「服装互斥」控制
- 一个 `TagItem.en` 可以写多个 token（`sitting, seiza`），命中任一即属于该组

### 手部预算

`HAND_CAPACITY = 2`。`HAND_COST` 是一张词表：`crossed_arms`、`own_hands_together`、`hugging` 等占 2，`waving`、`holding_umbrella`、`reading` 等占 1。**道具本身不占手** —— 剑挂在脖子上不占，`holding_sword` 这个动作才占。受「两只手限额」开关控制。

### 权重

`SlotTag.w` 夹在 0.5 ~ 2.0，步进 0.1；等于 1 时删掉字段。输出成 `(tag:1.2)`；一个标签有多个 token 时各自加权。两种调法：拼装区开「权重」模式逐格点，或者**Alt + 点芯片**直接设成 1.3（再按一次还原）。

### 档位

| 档位 | 效果 |
|---|---|
| 精简 | 只取第一个角色；每个角色框最多 4 个标签、全局最多 3 个 |
| 标准 | 全保留 |
| 复杂 | 额外追加强化词（中文「电影级光照、浅景深…」，英文 `detailed, intricate_details…`） |

### 负向

每个目标一套基础负向（质量词 + 人体结构词）。「单角色防克隆」开启且只有一个角色时，追加 `2girls / multiple girls / split_screen / character_sheet`。「负向自适应」开启时，正向命中特定词就剔除会打架的负向：`chibi` → 去掉人体结构类；`from_behind` → 去掉 `looking_at_viewer`；`no_humans / scenery` → 去掉手部相关。

## 6. 粘贴拆解（`lib/parse.ts`）

把一段现成的提示词（英文 tag 串或中文描述）拆成「角色 → 标签」+ 全局标签。

1. 按 `[,，、;；\n]+` 切 token，去掉首尾的 `.` `·`
2. 剥掉权重括号：`(tag:1.2)` → `tag` + 权重
3. 丢掉噪声词：`masterpiece`、`1girl`、`score_*`、`source_*` 等
4. 每个 token 依次尝试：是不是角色（`findChar`）→ 是不是中文（`zhMatches`）→ 是不是词库里的英文（`byEn`）
5. **归属规则**：遇到角色就切换「当前角色」，之后的标签都归它；`场景` / `风格` 两个分类不管当前是谁，一律进全局

几个容易踩的地方，代码里都有注释：

- 词库的 `en` 常是多个 token，索引必须按逗号拆开逐个登记，否则粘 `sitting` 匹配不到
- 角色 `en` 常带作品后缀（`hu_tao_(genshin_impact)` vs `hu_tao`），查不到时去掉 `_(...)` 再查一次
- **中文未知词不能导入**：它会原样写进英文输出。所以未知词分两组，英文的可勾选导入，中文的只列出来

## 7. 持久化

- 键名 `prompt-atlas/v3`，250ms 防抖，`deep` 监听 9 个源
- 快照字段：`settings / overrides / hidden / customTags / selectedChars / globalTags / charTags / history / favorites`
- 启动时如果 `v3` 不存在，会尝试从 `prompt-atlas/v2` 搬 `settings / overrides / hidden / customTags`，选择状态清空
- 写入失败（配额满）只提示一次，之后静默
- **没有 schema 校验**：读出来的 JSON 直接 `as Partial<Snapshot>`（见 §11）

实测一份「6 个角色 + 15 个标签 + 5 条历史」的快照约 11KB，其中历史占 89%（每条存了三段提示词全文）。

## 8. 数据从哪来、怎么重新生成

| 数据 | 来源 | 重新生成 |
|---|---|---|
| 32 个精修角色 | 手写 | 直接改 `characters.ts` |
| 136 个批量角色 | 本机 `ComfyUI-aki-v3.2/ComfyUI/custom_nodes/Comfyui-Anima-Wardrobe-V6/presets/anima_v4_characters.json` | **生成脚本目前没有入库**，规则见下 |
| 170 张头像 | 同上插件的 `thumbs/`（README 注明是作者用 Anima 出图裁切的 160×160） | 按文件名拷进 `public/avatars/` |
| 218 条通用标签 | 手写 | 直接改 `tags.ts` |
| 40 条画风 | 手写 | 直接改 `styles.ts` |

批量角色的生成规则（照这个可以重写脚本）：

1. 只取 `work` 属于原神 / 星穹铁道 / 绝区零、且有中文名的条目
2. 跳过与精修版「归一化后同名」的条目。归一化 = 去掉 `_(...)` → 冒号、空格转下划线 → 剥掉末尾的作品 id
3. 过滤标签：去掉 `1girl` / `solo` 这类；**体型词只留第一个**（原始数据常同时有 `medium breasts` 和 `large breasts`）；过滤硬色情词，`cleavage`、`thighs` 这类外观词保留。注意原始标签是空格分隔，比对前要先转下划线
4. 发色、瞳色是英文色词，按一张小映射表转成「蓝紫发」「金瞳」
5. 元素、武器、体型、服装、特征**没有可靠来源，一律留空**，不编
6. 中文名按米哈游官网核对过一遍：原始数据里大量是称号（`sucrose` 写成「无害甜度」）、全名（`fischl` 写成「菲谢尔·冯·露弗施洛斯·那菲多特」）或梗名（`trailblazer` 写成「银河球棒侠」）
7. 同一角色的多套官方服饰在库里是独立条目，中文名撞车的补后缀（「刻晴·华服」）。**补后缀要先登记本体**（按 tag 里括号个数升序处理），否则会把本体也加上后缀

## 9. 组件清单

| 组件 | 职责 | 层级 |
|---|---|---|
| `AppHeader` | 标题、档位切换、负向开关、历史 / 设置 / 说明书入口 | 20 |
| `CharacterAtlas` | 左栏。游戏页签 + 搜索 + 角色卡网格；卡片只显示图和名字 | — |
| `SelectionPanel` | 中上。每个已选角色一个框，全局标签一个框；接收拖放 | — |
| `TagChip` | 拼装区里的一枚标签。单击删、双击改名、Alt+点加权 | — |
| `TagLibrary` | 中下。分类 / 子类 / 搜索 / 收藏筛选，点击或拖出标签 | — |
| `OutputPanel` | 右栏。三套正负向 + 逐块复制 + AI 润色入口 | — |
| `PasteDialog` | 粘贴拆解，带实时预览 | 70 |
| `StyleLibrary` | 画风库，点击加入全局 | 71 |
| `PolishDialog` | AI 润色，中英双栏 | 72 |
| `GuideModal` | 内置说明书 | 75 |
| `SettingsDrawer` | 开关、档位、AI 接口、导入导出、清空 | 76 |
| `HistoryDrawer` | 历史列表，回填 | 65 |
| `ImportDialog` | 角色 JSON / CSV 导入 | 70 |
| `CharacterEditor` | 新增 / 编辑角色 | 70 |
| `BaseIcon` / `ToastHost` | 基础件 | Toast 90 |

层级是硬编码的，没有令牌。`SettingsDrawer` 是 76 而不是 65，因为润色弹窗里的「接口设置」要把它盖在自己上面。

## 10. 约定

- **状态只在 `store.ts` 里改**。`lib/` 下全是纯函数，组件只读 store、调 store 的函数
- **注释解释「为什么」，不解释「是什么」**。这个项目里大量注释记录的是踩过的坑（flex 塌陷、`grid-auto-rows` 压扁、`evaluateOnNewDocument` 不带作用域……），删代码前先读注释
- **样式**：颜色、圆角、阴影一律用 `main.css` 里的 CSS 变量；新弹窗的遮罩要自己写 `position: fixed; inset: 0`（全局 `.mask` 现在只有背景色）
- **加 `Character` 字段要改四个地方**：`types.ts`、`importer.ts` 的 `ALIASES` + `FIELDS`、`CSV_TEMPLATE`、`CharacterEditor` 的表单。漏掉导入器会导致导出再导入时丢字段
- **隐私**：示例、测试、注释里的编号一律用 `123456789` 这类占位，不写真实号码
- UI 偏好扁平色块，不要边框堆叠和重阴影

## 11. 已知问题与优化建议

按「会不会造成损失」排序。性能**不在**清单里 —— 实测冷启动首屏约 540ms、168 张卡片 1,625 个 DOM 节点、交互 7ms，没有做虚拟滚动或拆包的必要。

### P0 · 会造成损失

**仓库从未提交过。** `git status` 显示全部文件都是未跟踪状态，`main` 分支零 commit。约 6,500 行代码和 170 张图没有任何版本保护，任何一次误删、误改都恢复不了。先提交一次，之后再考虑分支策略。

**localStorage 快照没有校验。** `readSnapshot` 把 JSON 直接断言成 `Partial<Snapshot>`。如果数据被手改、来自结构不同的旧版本、或写入到一半中断，`globalTags` 里可能出现纯字符串，渲染时 `t.zh` 是 `undefined`，整个应用白屏且每次刷新都复现（因为坏数据还在）。建议：读出来后对每个数组做一次形状检查，不合法就把原始字符串挪到 `prompt-atlas/v3.corrupt.<时间>` 再回退默认值 —— 既不崩，也不吞掉用户数据。

### P1 · 缺工程保障

**没有任何测试。** 而 `lib/` 下几乎全是纯函数，用 `node:test` 就能跑，不需要装 vitest。最值得先写的三组：

| 目标 | 一条用例能拦住的真实 bug |
|---|---|
| `importer.parseCharacters` | 导出再导入丢 `avatar`（已修） |
| `parse.parsePrompt` | 多 token 匹配不到、角色后缀认不出、场景挂到角色名下 |
| `prompt.buildOutputs` | 负向规则引用了词表里不存在的词 |

**没有 lint / format。** 类型检查够严，但没人管组件里的模板顺序、未使用的 CSS、魔法数字。`eslint` + `eslint-plugin-vue` + Prettier，半小时的事。

**生成脚本没有入库。** `characters-extra.ts` 文件头写着「由脚本生成」，但脚本只存在于当时的对话里（规则见 §8）。

### P2 · 结构

- **字段清单重复四份**（见 §10）。根因是 `Character` 的字段没有单一数据源，建议从 `ALIASES` 派生其余三处
- **`.mask` 的定位在 8 个组件里各写一遍**。第七轮为了去掉 `backdrop-filter` 把背景色挪到了全局，但定位没跟着挪。把 `position: fixed; inset: 0; display: grid; place-items: center; padding: 24px` 补回全局，8 处可以删（抽屉类两个要单独核对）
- **`.hint` 重复 5 次、`.field` 3 次、`.link` 2 次**，都可以上提到 `main.css`
- **硬编码颜色约 115 处**散落在组件里，其中不少是变量已有的色值
- **死代码**：`prompt.ts` 的 `tagsOfSlot` 导出后无人使用；`CONFLICT_RULES` 里 `from_behind` 那条要剔除的 `looking_at_viewer` 根本不在任何负向词表里，是一条不生效的规则
- **z-index 是散落的魔法数字**（20 / 65 / 70 / 71 / 72 / 75 / 76 / 90），可以收成 CSS 变量
- `store.ts` 539 行，同时负责状态、业务规则、持久化、通知。当前规模还能读，再加功能前建议按「角色 / 槽位 / 历史 / 持久化」拆成几个文件，仍然是模块单例，不需要引入 Pinia

### P3 · 体验

- **8 个弹窗都不支持 Esc 关闭**，也没有焦点管理。全项目的键盘事件处理只有两处：角色卡的回车、`TagChip` 编辑框的 Esc（无障碍属性也只有设置里的开关和角色卡用了）
- 清空搜索框时 168 张卡片全量重新挂载，约 54ms。只在清空那一瞬间出现，优先级低
- 历史记录存了三段提示词全文，占快照 89%。其实完全可以从 `tags` / `slots` 重新算出来
- 清空数据用的是原生 `window.confirm`，和其余 UI 不搭
- `saveHistory` 的 `id` 是 `Date.now()`，同一毫秒存两条会撞（边缘情况）

### 明确不建议做的

虚拟滚动、拆 chunk、引入 Pinia / 路由 / UI 组件库、接后端。当前规模下这些都是负收益。

## 12. 性能与体积基线

改完代码如果怀疑变慢，拿这组数对照（headless Edge，本地静态服务，无缓存）：

| 指标 | 数值 |
|---|---|
| JS 产物 | 215 KB（gzip 75 KB） |
| CSS 产物 | 39 KB |
| 头像目录 | 170 张，2.1 MB，全部 `loading="lazy"` |
| 冷启动到首张卡片 | 约 540ms |
| 首屏 DOM 节点 | 约 1,625（168 张卡片） |
| 点标签 → 下一帧 | p50 约 7ms |
| 搜索框每敲一键 | 3 ~ 11ms（清空时约 54ms） |
| 滚动帧间隔 | p95 约 6ms（headless 无垂直同步，只看相对值） |

一个已知的测量陷阱：headless 模式是软件渲染、有头模式没有垂直同步，两种环境下帧间隔都是常数（16.7ms / 5.6ms），**测不出合成层的卡顿**。之前「弹窗卡顿」那次就是靠排查已知成本项（全屏 `backdrop-filter`）解决的，不是靠数据。
