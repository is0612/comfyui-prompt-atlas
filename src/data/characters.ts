import type { Character } from '../types'
import { EXTRA_CHARACTERS } from './characters-extra'

/**
 * 手工精修的角色：有元素 / 武器 / 体型 / 服装 / 特征，AI 润色的 prefill 用得上。
 * 字段结构就是导入格式，你可以直接照这个填自己的表。
 * 英文 tag 按 Danbooru 习惯写，个别新角色模型可能不认，改 en / tags 即可。
 */
const CURATED: Character[] = [
  // ── 原神 ───────────────────────────────────────────
  { zh: '甘雨', en: 'ganyu_(genshin_impact)', avatar: 'ganyu_genshin_impact', game: '原神', body: '少女', hair: '蓝紫色长发', eyes: '金瞳', outfit: '黑金配色仙兽服饰', traits: '麒麟角', tags: 'blue_hair, purple_hair, long_hair, horns, gold_trim, chinese_clothes, detached_sleeves, bodysuit, yellow_eyes, hair_ornament' },
  { zh: '雷电将军', en: 'raiden_shogun', avatar: 'raiden_shogun', game: '原神', body: '成女', hair: '深紫色长发高马尾', eyes: '紫瞳', outfit: '紫色和风长裙', traits: '发饰、太刀', tags: 'purple_hair, long_hair, ponytail, purple_eyes, japanese_clothes, kimono, obi, hair_ornament' },
  { zh: '胡桃', en: 'hu_tao', avatar: 'hu_tao_genshin_impact', game: '原神', body: '少女', hair: '深棕双马尾', eyes: '梅花形红瞳', outfit: '黑色中式短衫配长帽', traits: '梅花瞳', tags: 'brown_hair, twintails, long_hair, flower-shaped_pupils, red_eyes, chinese_clothes, black_shirt, hat, shorts' },
  { zh: '钟离', en: 'zhongli_(genshin_impact)', game: '原神', body: '成男', hair: '深棕长发配橙色挑染', eyes: '金瞳', outfit: '褐色长外套配领带', traits: '挑染发尾', tags: 'brown_hair, long_hair, amber_eyes, coat, necktie, formal, streaks' },
  { zh: '芙宁娜', en: 'furina_(genshin_impact)', avatar: 'furina_genshin_impact', game: '原神', body: '少女', hair: '白蓝短发配礼帽', eyes: '异色瞳', outfit: '蓝白礼服', traits: '礼帽', tags: 'white_hair, blue_hair, short_hair, heterochromia, blue_eyes, top_hat, formal, frills' },
  { zh: '纳西妲', en: 'nahida_(genshin_impact)', avatar: 'nahida_genshin_impact', game: '原神', body: '萝莉', hair: '白绿长发配侧马尾', eyes: '绿瞳', outfit: '白色花神裙', traits: '精灵耳', tags: 'white_hair, green_hair, long_hair, side_ponytail, green_eyes, pointy_ears, white_dress, flower' },
  { zh: '八重神子', en: 'yae_miko', avatar: 'yae_miko', game: '原神', body: '成女', hair: '粉色长发', eyes: '紫瞳', outfit: '红白巫女服', traits: '狐耳', tags: 'pink_hair, long_hair, purple_eyes, fox_ears, miko, japanese_clothes, detached_sleeves' },
  { zh: '神里绫华', en: 'kamisato_ayaka', avatar: 'kamisato_ayaka', game: '原神', body: '少女', hair: '白色长发配马尾', eyes: '蓝灰瞳', outfit: '白蓝和服配甲胄', traits: '折扇', tags: 'white_hair, long_hair, ponytail, blue_eyes, japanese_clothes, hair_ornament, armor' },
  { zh: '宵宫', en: 'yoimiya_(genshin_impact)', avatar: 'yoimiya_genshin_impact', game: '原神', body: '少女', hair: '橙金色长发', eyes: '橙瞳', outfit: '红白浴衣', traits: '绷带、发饰', tags: 'blonde_hair, orange_hair, long_hair, orange_eyes, yukata, bandages, hair_ornament' },
  { zh: '可莉', en: 'klee_(genshin_impact)', avatar: 'klee_genshin_impact', game: '原神', body: '萝莉', hair: '金色双马尾', eyes: '红瞳', outfit: '红色连衣裙配小帽', traits: '精灵耳、背包', tags: 'blonde_hair, twintails, red_eyes, pointy_ears, red_dress, hat, backpack' },
  { zh: '莫娜', en: 'mona_(genshin_impact)', avatar: 'mona_genshin_impact', game: '原神', body: '少女', hair: '深紫色双马尾', eyes: '紫瞳', outfit: '深蓝紧身衣配斗篷帽', traits: '占星帽', tags: 'purple_hair, twintails, long_hair, purple_eyes, bodysuit, witch_hat, cape' },
  { zh: '北斗', en: 'beidou_(genshin_impact)', avatar: 'beidou_genshin_impact', game: '原神', body: '成女', hair: '深紫色长发', eyes: '红瞳', outfit: '红色海盗装', traits: '眼罩', tags: 'purple_hair, long_hair, red_eyes, eyepatch, pirate, red_coat, hair_ornament' },

  // ── 星穹铁道 ───────────────────────────────────────
  { zh: '希儿', en: 'seele_(honkai:_star_rail)', avatar: 'seele_honkai_star_rail', game: '星穹铁道', body: '少女', hair: '紫黑色双马尾', eyes: '紫瞳', outfit: '黑紫短外套', traits: '镰刀', tags: 'purple_hair, black_hair, twintails, purple_eyes, jacket, shorts, thighhighs' },
  { zh: '布洛妮娅', en: 'bronya_(honkai:_star_rail)', avatar: 'bronya_rand', game: '星穹铁道', body: '少女', hair: '银灰色长卷发', eyes: '蓝瞳', outfit: '银色军装外套', traits: '军装绶带', tags: 'silver_hair, long_hair, wavy_hair, blue_eyes, military_uniform, white_coat' },
  { zh: '卡芙卡', en: 'kafka_(honkai:_star_rail)', avatar: 'kafka_honkai_star_rail', game: '星穹铁道', body: '成女', hair: '酒红色长发', eyes: '紫瞳', outfit: '黑红西装', traits: '手枪、手套', tags: 'red_hair, long_hair, purple_eyes, suit, black_coat, gloves, necktie' },
  { zh: '三月七', en: 'march_7th_(honkai:_star_rail)', avatar: 'march_7th_honkai_star_rail', game: '星穹铁道', body: '少女', hair: '粉金色短发', eyes: '蓝瞳', outfit: '白蓝运动风套装', traits: '相机', tags: 'pink_hair, short_hair, blue_eyes, white_dress, jacket, camera' },
  { zh: '丹恒', en: 'dan_heng_(honkai:_star_rail)', game: '星穹铁道', body: '成男', hair: '黑色长发', eyes: '青瞳', outfit: '黑绿长外套', traits: '长枪', tags: 'black_hair, long_hair, green_eyes, coat, chinese_clothes, spear' },
  { zh: '花火', en: 'sparkle_(honkai:_star_rail)', avatar: 'sparkle_honkai_star_rail', game: '星穹铁道', body: '少女', hair: '黑红双马尾', eyes: '红瞳', outfit: '黑红马戏装', traits: '面具、小丑帽', tags: 'black_hair, twintails, red_eyes, mask, jester, red_dress, hat' },
  { zh: '流萤', en: 'firefly_(honkai:_star_rail)', avatar: 'firefly_honkai_star_rail', game: '星穹铁道', body: '少女', hair: '银白色长发', eyes: '紫瞳', outfit: '白色机械装甲', traits: '机甲', tags: 'white_hair, long_hair, purple_eyes, armor, mecha, white_dress' },
  { zh: '银狼', en: 'silver_wolf_(honkai:_star_rail)', avatar: 'silver_wolf_honkai_star_rail', game: '星穹铁道', body: '少女', hair: '银灰色短发', eyes: '红瞳', outfit: '黑黄夹克配短裤', traits: '耳机、护目镜', tags: 'silver_hair, short_hair, red_eyes, jacket, shorts, headphones' },
  { zh: '停云', en: 'tingyun_(honkai:_star_rail)', avatar: 'tingyun_honkai_star_rail', game: '星穹铁道', body: '成女', hair: '棕金色长发', eyes: '绿瞳', outfit: '黄绿旗袍', traits: '狐耳、折扇', tags: 'brown_hair, long_hair, green_eyes, fox_ears, china_dress, qipao, folding_fan' },
  { zh: '镜流', en: 'jingliu_(honkai:_star_rail)', avatar: 'jingliu_honkai_star_rail', game: '星穹铁道', body: '成女', hair: '白色长发', eyes: '红瞳', outfit: '白蓝道袍', traits: '眼罩、长剑', tags: 'white_hair, long_hair, red_eyes, blindfold, chinese_clothes, sword' },
  { zh: '黄泉', en: 'acheron_(honkai:_star_rail)', avatar: 'acheron_honkai_star_rail', game: '星穹铁道', body: '成女', hair: '紫黑色长发', eyes: '紫瞳', outfit: '黑紫和风长裙', traits: '太刀', tags: 'purple_hair, long_hair, purple_eyes, kimono, japanese_clothes, katana, red_eyes' },

  // ── 绝区零 ─────────────────────────────────────────
  { zh: '安比·德玛拉', en: 'anby_demara', avatar: 'anby_demara', game: '绝区零', body: '少女', hair: '银白色短发', eyes: '蓝瞳', outfit: '黑黄夹克配短裤', traits: '双刀', tags: 'silver_hair, short_hair, blue_eyes, jacket, shorts, headphones' },
  { zh: '妮可·德玛拉', en: 'nicole_demara', avatar: 'nicole_demara', game: '绝区零', body: '少女', hair: '黑色双马尾配粉色挑染', eyes: '粉瞳', outfit: '白粉上衣配短裤', traits: '粉色挑染', tags: 'black_hair, twintails, pink_hair, pink_eyes, crop_top, shorts' },
  { zh: '猫又', en: 'nekomata_(zenless_zone_zero)', game: '绝区零', body: '少女', hair: '黑色短发', eyes: '绿瞳', outfit: '黑红忍者装', traits: '猫耳、猫尾', tags: 'black_hair, short_hair, green_eyes, cat_ears, cat_tail, ninja, scarf' },
  { zh: '艾莲·乔', en: 'ellen_joe', avatar: 'ellen_joe', game: '绝区零', body: '少女', hair: '黑色长发配粉色挑染', eyes: '红瞳', outfit: '白蓝水手服改', traits: '鲨鱼尾', tags: 'black_hair, long_hair, red_eyes, school_uniform, serafuku, shark_tail, thighhighs' },
  { zh: '朱鸢', en: 'zhu_yuan', avatar: 'zhu_yuan', game: '绝区零', body: '成女', hair: '黑色长发', eyes: '红瞳', outfit: '白蓝警服', traits: '双枪、警帽', tags: 'black_hair, long_hair, red_eyes, police_uniform, gloves, necktie' },
  { zh: '星见雅', en: 'hoshimi_miyabi', avatar: 'hoshimi_miyabi', game: '绝区零', body: '成女', hair: '黑色长发', eyes: '紫瞳', outfit: '黑红和风装', traits: '狐耳、太刀', tags: 'black_hair, long_hair, purple_eyes, fox_ears, katana, japanese_clothes, kimono' },
  { zh: '青衣', en: 'qingyi_(zenless_zone_zero)', avatar: 'qingyi_zenless_zone_zero', game: '绝区零', body: '少女', hair: '青绿色短发', eyes: '黄瞳', outfit: '白色汉服', traits: '机械臂', tags: 'green_hair, short_hair, yellow_eyes, chinese_clothes, hanfu, mechanical_arms' },
  { zh: '简·杜', en: 'jane_doe_(zenless_zone_zero)', avatar: 'jane_doe_zenless_zone_zero', game: '绝区零', body: '成女', hair: '灰色长发', eyes: '红瞳', outfit: '黑色紧身衣', traits: '鼠耳、尾巴', tags: 'grey_hair, long_hair, red_eyes, mouse_ears, bodysuit, tail' },
  { zh: '柏妮思·怀特', en: 'burnice_white', avatar: 'burnice_white', game: '绝区零', body: '少女', hair: '金色短发', eyes: '绿瞳', outfit: '黑红火焰装', traits: '喷火器', tags: 'blonde_hair, short_hair, green_eyes, jacket, fire, shorts' },
]

/**
 * 精修版放前面：同 en 的角色以这里为准，批量导入那份只补缺口。
 * 但直接把两份接起来会出现「原神→星铁→绝区零→又回原神」的跳法，
 * 所以按游戏归拢一次。sort 是稳定的，组内保持「精修在前、批量在后、批量按中文名」。
 */
const GAME_ORDER = ['原神', '星穹铁道', '绝区零']
const RANK = new Map(GAME_ORDER.map((name, i) => [name, i]))

export const SEED_CHARACTERS: Character[] = [...CURATED, ...EXTRA_CHARACTERS].sort(
  (a, b) => (RANK.get(a.game) ?? GAME_ORDER.length) - (RANK.get(b.game) ?? GAME_ORDER.length),
)
