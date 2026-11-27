#!/usr/bin/env python3
"""从 Anima-Wardrobe 插件的数据生成 src/data/characters-extra.ts，并补齐角色头像。

数据源（都是别人机器上的本地插件，不在本仓库里）：
    <presets>/anima_v4_characters.json   角色主库，2432 条
    <thumbs>/<thumb>.webp                160×160 角色缩略图

用法：
    python tools/build_characters.py --check      # 只对比，不写文件（改规则后先跑这个）
    python tools/build_characters.py             # 生成 + 补头像
    python tools/build_characters.py --presets <路径> --thumbs <路径>

设计要点：
1. 只取原神 / 星穹铁道 / 绝区零三个作品、且有中文名的条目。
2. 和 characters.ts 里手工精修的角色去重，比较前先「归一化」：
   去掉 _(...) → 冒号、空格转下划线 → 剥掉末尾的作品 id。
3. 只填能确定的部分。元素 / 武器 / 体型 / 服装 / 特征没有可靠来源，留空不编。
4. 同一个角色的多套官方服饰在库里是独立条目，中文名撞车的补「·华服」这类后缀；
   补后缀必须让「本体」先登记，否则本体也会被加上后缀。
5. 原始标签用空格分隔（`medium breasts`），比对前必须先转下划线，否则黑名单永远不命中。

注意：这个脚本会覆盖 characters-extra.ts。手工修正请改脚本里的 NAME_FIX / 常量，
或者右键卡片编辑（走 override，不会被覆盖）。
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_TS = os.path.join(ROOT, 'src', 'data', 'characters-extra.ts')
CURATED_TS = os.path.join(ROOT, 'src', 'data', 'characters.ts')
AVATAR_DIR = os.path.join(ROOT, 'public', 'avatars')

# 本机默认路径（秋叶整合包 + K2 插件里的超集缩略图）
DEFAULT_PRESETS = r'D:/AI/ComfyUI-aki-v3.2/ComfyUI/custom_nodes/Comfyui-Anima-Wardrobe-V6/presets'
DEFAULT_THUMBS = r'D:/AI/ComfyUI-aki-v3.2/ComfyUI/custom_nodes/Comfyui-K2-Editorial/thumbs/anima'

GAMES = [('genshin impact', '原神'), ('honkai: star rail', '星穹铁道'), ('zenless zone zero', '绝区零')]
GAME_NAMES = dict(GAMES)

# ── 中文名修正 ───────────────────────────────────────────────
# 库里的中文名大量是称号（sucrose = 无害甜度）、全名（fischl = 27 字全名）
# 或梗名（trailblazer = 银河球棒侠），按米哈游官网的角色名统一。
# 键是原样的 tag，值是要显示的名字；值撞车时后面还会补「·形态」后缀。
NAME_FIX = {
    # 原神 · 全名压成常用名
    'lisa_(genshin_impact)': '丽莎',
    'eula_(genshin_impact)': '优菈',
    'navia_(genshin_impact)': '娜维娅',
    'lynette_(genshin_impact)': '琳妮特',
    'jean_(genshin_impact)': '琴',
    'fischl_(genshin_impact)': '菲谢尔',
    'diona_(genshin_impact)': '迪奥娜',
    'lumine_(genshin_impact)': '荧',
    # 原神 · 称号换成角色名
    'sucrose_(genshin_impact)': '砂糖',
    'yanfei_(genshin_impact)': '烟绯',
    'noelle_(genshin_impact)': '诺艾尔',
    'faruzan_(genshin_impact)': '珐露珊',
    'kirara_(genshin_impact)': '绮良良',
    'dehya_(genshin_impact)': '迪希雅',
    'layla_(genshin_impact)': '莱依拉',
    'nilou_(genshin_impact)': '妮露',
    'collei_(genshin_impact)': '柯莱',
    'paimon_(genshin_impact)': '派蒙',
    'amber_(genshin_impact)': '安柏',
    'chiori_(genshin_impact)': '千织',
    'sigewinne_(genshin_impact)': '希格雯',
    'xianyun_(genshin_impact)': '闲云',
    # 星穹铁道
    'topaz_(honkai:_star_rail)': '托帕',
    'feixiao_(honkai:_star_rail)': '飞霄',
    'black_swan_(honkai:_star_rail)': '黑天鹅',
    'guinaifen_(honkai:_star_rail)': '桂乃芬',
    'pela_(honkai:_star_rail)': '佩拉',
    'serval_landau': '希露瓦',
    'lynx_landau': '玲可',
    'sushang_(honkai:_star_rail)': '素裳',
    'trailblazer_(honkai:_star_rail)': '穹',
    'stelle_(honkai:_star_rail)': '星',
    'hyacine_(honkai:_star_rail)': '风堇',
    'cipher_(honkai:_star_rail)': '赛飞儿',
    'hysilens_(honkai:_star_rail)': '海瑟音',
    'the_dahlia_(honkai:_star_rail)': '大丽花',
    'yao_guang_(honkai:_star_rail)': '爻光',
    'himeko_(honkai:_star_rail)': '姬子',
    # 绝区零
    'nekomiya_mana': '猫宫又奈',          # 原来写作「猫又」，和真正的猫又撞车
    'ye_shunguang': '叶瞬光',
    'ye_shunguang_(enlightened_state)': '叶瞬光',
    'sunna_(zenless_zone_zero)': '千夏',  # 原来写作「千夏蕾米尔」
    'orphie_magnusson': '奥菲丝',
    "sigrid_de_l'azur": '希格莉德·德拉叙尔',
    'luciana_de_montefio': '露西亚娜',
    # 库里把同一个角色写成不同的字，先统一才能认出是同一人的两套形态
    'aria_(human)_(zenless_zone_zero)': '爱芮',   # 原写作「爱苪」
    'aria_(robot)_(zenless_zone_zero)': '爱芮',
}

# 形态后缀：括号里的英文 → 可读中文。不在表里的退回括号原文
SUFFIX = {
    'opulent_splendor': '华服',
    'demiurge': '造物主',
    'puppet': '人偶',
    'human': '人形',
    'robot': '机器人',
    'enlightened_state': '明心镜',
    'silver_soldier': '银翼战士',
    'summeretto': '晴歌',
    'nova': '启行',
    'philia093': '往昔的涟漪',
}

# 不是角色：怪物 / 素材生物 / 种族 / 玩偶
DROP_TAGS = {
    'hilichurl_(genshin_impact)',
    'crystalfly_(genshin_impact)',
    'aranara_(genshin_impact)',
    'dodoco_(genshin_impact)',
    'guoba_(genshin_impact)',
}

# characters.ts 里已经有同一个人（头像也指过去了），别再来一张
EXTRA_EXCLUDE = {'bronya_rand'}

# 标签清洗
DROP_LABELS = {'1girl', '1boy', '2girls', 'multiple girls', 'solo'}
BODY_LABELS = {'flat_chest', 'small_breasts', 'medium_breasts', 'large_breasts', 'huge_breasts'}
HARD_LABELS = re.compile(r'(nude|nipples?|penis|cum|sex|masturbation|bondage|ahegao|paizuri|rape|pregnan)')

# 英文色词 → 中文
COLOR = {
    'blonde': '金', 'white': '白', 'black': '黑', 'pink': '粉', 'blue': '蓝', 'brown': '棕',
    'green': '绿', 'purple': '紫', 'silver': '银', 'red': '红', 'orange': '橙', 'aqua': '青',
    'grey': '灰', 'gray': '灰', 'yellow': '黄', 'light blue': '浅蓝', 'gradient': '渐变',
    'heterochromia': '异色', 'multicolored': '多彩',
}


def color_zh(value: str | None, suffix: str) -> str:
    """'blue purple' + '发' → '蓝紫发'"""
    if not value:
        return ''
    value = value.strip()
    if value in COLOR:
        return COLOR[value] + suffix
    return ''.join(COLOR.get(word, word) for word in value.split()) + suffix


def clean_labels(char: dict) -> str:
    out: list[str] = []
    seen: set[str] = set()
    has_body = False
    for label in char.get('tags') or []:
        # 原始标签是空格分隔，先转下划线再比对，否则黑名单永远不命中
        key = label.replace(' ', '_')
        if label in DROP_LABELS or HARD_LABELS.search(label):
            continue
        # ⚠️ 这里必须用 key（下划线）比对，用 label 会永远匹配不上
        if key in BODY_LABELS:
            if has_body:
                continue       # 体型只能有一个，medium + large 同时进提示词会互相打架
            has_body = True
        if key in seen:
            continue
        seen.add(key)
        out.append(key)
    return ', '.join(out)


def build_works(works: list[dict]) -> list[str]:
    return sorted([w['id'] for w in works], key=len, reverse=True)


def normalize(tag: str, works: list[str]) -> str:
    """归一化：去掉 _(...) → 冒号空格转下划线 → 剥掉末尾的作品 id"""
    text = tag.replace('_(', '_').replace(')', '').replace(':', '_').replace(' ', '_')
    for work in works:
        if text.endswith('_' + work):
            return text[: -(len(work) + 1)]
    return text


def base_name(tag: str) -> str:
    """去掉所有括号段，用来判断两个条目是不是同一个角色的不同形态"""
    return re.sub(r'\s+', ' ', re.sub(r'\([^)]*\)', '', tag).replace('_', ' ').strip())


def variant_suffix(tag: str) -> str:
    for seg in re.findall(r'\(([^)]*)\)', tag):
        key = seg.replace(' ', '_')
        if key in SUFFIX:
            return SUFFIX[key]
    return ''


def read_curated() -> list[tuple[str, str]]:
    """characters.ts 里手工精修的角色（zh, en）"""
    text = open(CURATED_TS, encoding='utf-8').read()
    return [(m.group(1), m.group(2)) for m in re.finditer(r"\{ zh: '([^']+)', en: '([^']+)'", text)]


def quote(text: str) -> str:
    return text.replace('\\', '\\\\').replace("'", "\\'")


def render(rows: list[dict]) -> str:
    lines = [
        "import type { Character } from '../types'",
        '',
        '/*',
        ' * 批量导入的角色（原神 / 星穹铁道 / 绝区零），由 Comfyui-Anima-Wardrobe-V6 的',
        ' * presets/anima_v4_characters.json 生成。只填能确定的部分：',
        ' * 中文名、danbooru tag、游戏、发色、瞳色、外观标签、缩略图。',
        ' * 元素 / 武器 / 体型 / 服装 / 特征没有可靠来源，留空不编。',
        ' *',
        ' * 同一角色的多套官方服饰在库里就是独立条目（刻晴 / 刻晴·华服、安比·德玛拉·银翼战士），',
        ' * 中文名撞车的会补「·华服」这类后缀，列表里才分得清是哪一套。',
        ' * 想补字段就点卡片右上角的铅笔编辑，改过的会存成 override，不会被这份文件覆盖。',
        ' *',
        ' * ⚠️ 这份文件由 tools/build_characters.py 生成，别手改：',
        ' *    python tools/build_characters.py --check   # 先看会不会覆盖',
        ' */',
        'export const EXTRA_CHARACTERS: Character[] = [',
    ]
    current = None
    for row in rows:
        if row['work'] != current:
            current = row['work']
            if current != GAMES[0][0]:
                lines.append('')
            lines.append(f"  // ── {GAME_NAMES[current]} ──")
        lines.append(
            "  { zh: '%s', en: '%s', avatar: '%s', game: '%s', hair: '%s', eyes: '%s', tags: '%s' },"
            % (
                quote(row['zh']), quote(row['en']), quote(row['avatar']), quote(row['game']),
                quote(row['hair']), quote(row['eyes']), quote(row['tags']),
            )
        )
    lines.append(']')
    return '\n'.join(lines) + '\n'


def main() -> int:
    parser = argparse.ArgumentParser(description='生成 characters-extra.ts 并补齐头像')
    parser.add_argument('--presets', default=DEFAULT_PRESETS, help='Anima-Wardrobe 的 presets 目录')
    parser.add_argument('--thumbs', default=DEFAULT_THUMBS, help='角色缩略图目录（webp）')
    parser.add_argument('--check', action='store_true', help='只对比，不写任何文件')
    args = parser.parse_args()

    source = os.path.join(args.presets, 'anima_v4_characters.json')
    if not os.path.isfile(source):
        print(f'找不到角色库：{source}', file=sys.stderr)
        print('用 --presets 指定 Comfyui-Anima-Wardrobe-V6/presets 的路径', file=sys.stderr)
        return 1
    if not os.path.isdir(args.thumbs):
        print(f'找不到缩略图目录：{args.thumbs}', file=sys.stderr)
        print('用 --thumbs 指定 thumbs 目录', file=sys.stderr)
        return 1

    data = json.load(open(source, encoding='utf-8'))
    works = build_works(data['works'])
    curated = read_curated()
    curated_norm = {normalize(en, works) for _, en in curated}

    # 本体优先：括号少的先登记中文名，否则可能先把变体占掉「本体名」
    candidates = [c for c in data['characters'] if c['work'] in GAME_NAMES and c.get('zh')]
    candidates.sort(key=lambda c: (len(re.findall(r'\(', c['tag'])), -c.get('pop', 0)))

    used: dict[str, set[str]] = collections.defaultdict(set)
    for zh, en in curated:
        used[base_name(en)].add(zh)

    final_zh: dict[str, str] = {}
    skipped = {'curated': 0, 'dropped': 0, 'excluded': 0}
    for char in candidates:
        tag = char['tag']
        if tag in DROP_TAGS:
            skipped['dropped'] += 1
            continue
        if tag in EXTRA_EXCLUDE:
            skipped['excluded'] += 1
            continue
        if normalize(tag, works) in curated_norm:
            skipped['curated'] += 1
            continue
        zh = NAME_FIX.get(tag, char['zh'])
        key = base_name(tag)
        if zh in used[key]:
            suffix = variant_suffix(tag)
            if suffix:
                zh = f'{zh}·{suffix}'
        used[key].add(zh)
        final_zh[tag] = zh

    rows = []
    missing_avatar = []
    for char in candidates:
        tag = char['tag']
        if tag not in final_zh:
            continue
        thumb = char.get('thumb') or ''
        if not os.path.isfile(os.path.join(args.thumbs, thumb + '.webp')):
            missing_avatar.append((tag, thumb))
        rows.append({
            'zh': final_zh[tag],
            'en': tag,
            'avatar': thumb,
            'game': GAME_NAMES[char['work']],
            'hair': color_zh(char.get('hair'), '发'),
            'eyes': color_zh(char.get('eyes'), '瞳'),
            'tags': clean_labels(char),
            'work': char['work'],
        })

    order = {work: i for i, (work, _) in enumerate(GAMES)}
    rows.sort(key=lambda r: (order[r['work']], r['zh']))

    content = render(rows)
    old = open(OUT_TS, encoding='utf-8').read() if os.path.isfile(OUT_TS) else ''

    counts = collections.Counter(r['game'] for r in rows)
    print(f'角色库：{len(data["characters"])} 条 → 新增 {len(rows)} 条（' +
          '、'.join(f'{name} {counts[name]}' for _, name in GAMES) + '）')
    print('跳过：' + '、'.join(f'{k} {v}' for k, v in skipped.items() if v))
    if missing_avatar:
        print(f'⚠️ 有 {len(missing_avatar)} 个角色没有缩略图，卡片会显示首字色块：')
        for tag, thumb in missing_avatar:
            print(f'   {tag} → {thumb}.webp')

    if content == old:
        print('characters-extra.ts 无需改动')
    elif args.check:
        old_lines, new_lines = old.splitlines(), content.splitlines()
        diff = [i for i in range(max(len(old_lines), len(new_lines)))
                if old_lines[i:i + 1] != new_lines[i:i + 1]]
        print(f'⚠️ 会改写 characters-extra.ts（{len(diff)} 行不同，第一处在第 {diff[0] + 1} 行）')
        for i in diff[:6]:
            print(f'   旧: {old_lines[i] if i < len(old_lines) else "(无)"}')
            print(f'   新: {new_lines[i] if i < len(new_lines) else "(无)"}')
    else:
        open(OUT_TS, 'w', encoding='utf-8', newline='\n').write(content)
        print('已写入 src/data/characters-extra.ts')

    if args.check:
        print('（--check 模式，未写任何文件）')
        return 0

    os.makedirs(AVATAR_DIR, exist_ok=True)
    copied = 0
    for row in rows:
        if not row['avatar']:
            continue
        src = os.path.join(args.thumbs, row['avatar'] + '.webp')
        dst = os.path.join(AVATAR_DIR, row['avatar'] + '.webp')
        if os.path.isfile(src) and not os.path.isfile(dst):
            shutil.copyfile(src, dst)
            copied += 1
    total = len(os.listdir(AVATAR_DIR))
    print(f'头像：新拷 {copied} 张，目录里共 {total} 张')
    return 0


if __name__ == '__main__':
    sys.exit(main())
