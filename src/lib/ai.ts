export const DEFAULT_AI_BASE = 'https://api.deepseek.com/v1'
export const DEFAULT_AI_MODEL = 'deepseek-chat'

/** 中英分隔行，模型按这个格式回，前端据此切成两块 */
export const EN_MARK = '=====EN====='

export const DEFAULT_AI_SYSTEM = [
  '你是动漫插画的画面描述助手。用户给角色名和几个关键词，你要同时输出中文段落和英文标签。',
  '【设定锁定】输入里写明的发型发色、瞳色、服装、身材是角色的原设定：必须原样保留，不许替换、不许新增配饰、不许改色；多个角色之间也不许互换设定。',
  '输出格式（严格遵守）：',
  `1) 先输出中文：每个角色一行「角色名：100-160 字连贯段落」，写足发型发色、瞳色、表情、服装、姿势、动作、道具与环境光线；最后一行「场景：地点、光线、氛围」。`,
  `2) 然后单独一行，只写 ${EN_MARK}`,
  '3) 再输出英文：每个角色一行「Name: tag1, tag2, tag3」，用 Danbooru 风格的小写下划线标签，从人物特征一路写到姿势、道具、环境；最后一行「scene: tag1, tag2」。中文里写到的每一项，英文里都要有对应的标签。',
  '要求：',
  '- 角色数量与名字必须与输入完全一致，不要增删或改名；',
  '- 用户点名的道具、服装、动作必须原样出现，不要省略或改位置；',
  '- 只有输入里没写服装时才补一套符合场景的，写了就一个字都不要改；',
  '- 只输出正文，不要编号、不要解释、不要分镜。',
].join('\n')

/** 历史默认模板，命中就自动升级到新版；用户自己改过的不动 */
const LEGACY_AI_SYSTEM_ZH = [
  '你是动漫插画的画面描述助手。用户给角色名和几个关键词，你扩写成逐角色的画面描写。',
  '输出格式（严格遵守）：',
  '每个角色一行「角色名：100-160 字连贯段落」，写足发型发色、瞳色、表情、服装、姿势、动作、道具与环境光线。',
  '最后一行「场景：地点、光线、氛围」。',
  '要求：',
  '- 角色数量与名字必须与输入完全一致，不要增删或改名；',
  '- 用户点名的道具、服装、动作必须原样出现，不要省略或改位置；',
  '- 服装没写时补一套符合场景的，写了就不要改；',
  '- 只输出正文，不要编号、不要解释、不要分镜。',
].join('\n')

const LEGACY_AI_SYSTEM_BILINGUAL = [
  '你是动漫插画的画面描述助手。用户给角色名和几个关键词，你要同时输出中文段落和英文标签。',
  '输出格式（严格遵守）：',
  `1) 先输出中文：每个角色一行「角色名：100-160 字连贯段落」，写足发型发色、瞳色、表情、服装、姿势、动作、道具与环境光线；最后一行「场景：地点、光线、氛围」。`,
  `2) 然后单独一行，只写 ${EN_MARK}`,
  '3) 再输出英文：每个角色一行「Name: tag1, tag2, tag3」，用 Danbooru 风格的小写下划线标签，从人物特征一路写到姿势、道具、环境；最后一行「scene: tag1, tag2」。中文里写到的每一项，英文里都要有对应的标签。',
  '要求：',
  '- 角色数量与名字必须与输入完全一致，不要增删或改名；',
  '- 用户点名的道具、服装、动作必须原样出现，不要省略或改位置；',
  '- 服装没写时补一套符合场景的，写了就不要改；',
  '- 只输出正文，不要编号、不要解释、不要分镜。',
].join('\n')

export const LEGACY_AI_SYSTEMS = [LEGACY_AI_SYSTEM_ZH, LEGACY_AI_SYSTEM_BILINGUAL]

export interface PolishResult {
  zh: string
  en: string
}

/** 中英分隔的几种写法，模型不一定老老实实按模板来 */
const SEPARATORS: RegExp[] = [
  /^[ \t]*={2,}[ \t]*EN[ \t]*={2,}[ \t]*$/im,
  /^[ \t]*【英文】[ \t]*$/m,
  /^[ \t]*(?:英文|English|EN)[ \t]*[:：][ \t]*$/im,
]

function cleanBlock(text: string) {
  return text.replace(/^[ \t]*【(?:中文|中文段落|Chinese)】[ \t]*$/gim, '').trim()
}

/** 把模型返回切成一中一英；没给分隔行就整段当中文 */
export function splitPolish(raw: string): PolishResult {
  for (const re of SEPARATORS) {
    const match = re.exec(raw)
    if (match) {
      return {
        zh: cleanBlock(raw.slice(0, match.index)),
        en: cleanBlock(raw.slice(match.index + match[0].length)),
      }
    }
  }
  // 兼容「英文：tag1, tag2」写在同一行的
  const inline = /^[ \t]*【?(?:英文|English)[ \t]*[:：][ \t]*(\S.*)$/im.exec(raw)
  if (inline) {
    return { zh: cleanBlock(raw.slice(0, inline.index)), en: inline[1].trim() }
  }
  return { zh: cleanBlock(raw), en: '' }
}

export interface AiConfig {
  base: string
  model: string
  key: string
  system: string
}

/** 中文段落里模型经常把英文块吃掉，这时候单独要一次英文 */
export const EN_ONLY_SYSTEM = [
  '你是 Danbooru 标签助手。用户给角色名和关键词，你只输出英文标签。',
  '输出格式：每个角色一行「name: tag1, tag2, tag3」，最后一行「scene: tag1, tag2」。',
  '要求：',
  '- 用小写下划线标签，质量词放最前；',
  '- 输入里写明的发型发色、瞳色、服装、道具、动作都要有对应标签，不许改设定；',
  '- 只输出这些行，不要中文、不要解释、不要编号。',
].join('\n')

async function chat(config: AiConfig, system: string, input: string, signal?: AbortSignal, temperature = 0.8) {
  if (!config.key.trim()) throw new Error('还没填 API Key，去设置里填一下')
  if (!input.trim()) throw new Error('先把想画的内容写几句')

  const endpoint = `${config.base.trim().replace(/\/+$/, '')}/chat/completions`
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.key.trim()}`,
      },
      body: JSON.stringify({
        model: config.model.trim() || DEFAULT_AI_MODEL,
        temperature,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: input },
        ],
      }),
      signal,
    })
  } catch {
    throw new Error(`连不上 ${endpoint}。可能是接口被浏览器跨域拦住，换成支持 CORS 的地址或走代理`)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`接口返回 ${response.status}${detail ? `：${detail.slice(0, 160)}` : ''}`)
  }

  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('接口没返回内容')
  return text
}

export function polish(config: AiConfig, input: string, signal?: AbortSignal): Promise<string> {
  return chat(config, config.system, input, signal)
}

/** 不管模板怎么写的，都只要英文标签 */
export function polishEnglish(config: AiConfig, input: string, signal?: AbortSignal): Promise<string> {
  return chat(config, EN_ONLY_SYSTEM, input, signal, 0.4)
}
