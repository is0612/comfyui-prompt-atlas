/** 画风库：一组常用的画风/光照标签。colors 只用来画瓦片底色，不参与输出 */
export interface StyleItem {
  zh: string
  en: string
  hint: string
  group: '媒材' | '画风' | '光照' | '后期'
  colors: [string, string]
}

export const STYLE_GROUPS = ['媒材', '画风', '光照', '后期'] as const

export const STYLE_LIBRARY: StyleItem[] = [
  // 媒材
  { zh: '水彩', en: 'watercolor_(medium)', hint: '湿边、纸纹、颜料晕开', group: '媒材', colors: ['#cfe6f2', '#8ec5d8'] },
  { zh: '油画', en: 'oil_painting_(medium)', hint: '厚笔触、颜料堆积', group: '媒材', colors: ['#e8d3a8', '#b08c5a'] },
  { zh: '厚涂', en: 'impasto', hint: '立体笔痕、体积感强', group: '媒材', colors: ['#f0d5c0', '#c98f6d'] },
  { zh: '素描', en: 'sketch', hint: '铅笔线、留白多', group: '媒材', colors: ['#e6e6e6', '#9d9d9d'] },
  { zh: '线稿', en: 'lineart', hint: '纯线、可后期上色', group: '媒材', colors: ['#f5f5f5', '#7a7a7a'] },
  { zh: '色铅笔', en: 'colored_pencil', hint: '颗粒感、叠色', group: '媒材', colors: ['#f6dfe3', '#c99aa4'] },
  { zh: '中国水墨', en: 'ink_wash_painting', hint: '墨色浓淡、宣纸', group: '媒材', colors: ['#efece4', '#4a4a48'] },
  { zh: '浮世绘', en: 'ukiyo-e', hint: '平涂、粗轮廓、和风', group: '媒材', colors: ['#e8ddc4', '#2f4b7c'] },
  { zh: '像素画', en: 'pixel_art', hint: '低分辨率格子', group: '媒材', colors: ['#d9f0e3', '#4e8f6f'] },
  { zh: '蜡笔', en: 'crayon', hint: '粗糙颗粒、儿童感', group: '媒材', colors: ['#fde8c8', '#d99a4e'] },

  // 画风
  { zh: '赛璐璐', en: 'cel_shading', hint: '动画平涂 + 硬阴影', group: '画风', colors: ['#dfe9ff', '#6d8fd6'] },
  { zh: '平涂', en: 'flat_color', hint: '无渐变、色块干净', group: '画风', colors: ['#e3f2e8', '#79b78f'] },
  { zh: '动画风', en: 'anime_coloring', hint: '日式 TV 动画上色', group: '画风', colors: ['#ffe6ef', '#e58aab'] },
  { zh: '厚涂写实', en: 'realistic', hint: '接近照片的材质与光', group: '画风', colors: ['#e9e2d6', '#8c7a63'] },
  { zh: 'Q 版', en: 'chibi', hint: '二三头身、大头小身', group: '画风', colors: ['#fff0d6', '#f2b463'] },
  { zh: '漫画', en: 'manga', hint: '黑白网点、分镜感', group: '画风', colors: ['#ededed', '#5c5c5c'] },
  { zh: '四格漫画', en: '4koma', hint: '分四格讲小故事', group: '画风', colors: ['#eef1f6', '#8b98b0'] },
  { zh: '吉卜力风', en: 'studio_ghibli', hint: '柔和自然、田园色', group: '画风', colors: ['#dff0d6', '#79a86a'] },
  { zh: '赛博朋克', en: 'cyberpunk', hint: '霓虹、湿地面、高反差', group: '画风', colors: ['#ff6ec7', '#2be4ea'] },
  { zh: '蒸汽波', en: 'vaporwave', hint: '粉紫渐变、网格地平线', group: '画风', colors: ['#ffb3e6', '#7b6cff'] },
  { zh: '黑暗奇幻', en: 'dark_fantasy', hint: '低明度、压迫感', group: '画风', colors: ['#4a4458', '#1d1a26'] },
  { zh: '复古风', en: 'retro_artstyle', hint: '褪色、印刷质感', group: '画风', colors: ['#f0e2c8', '#b06a4a'] },
  { zh: '3D 渲染', en: '3d', hint: '立体建模质感', group: '画风', colors: ['#dfe7f2', '#7f95b3'] },
  { zh: '海报', en: 'poster', hint: '大标题、构图强烈', group: '画风', colors: ['#ffe3d6', '#d9613f'] },
  { zh: '官方立绘', en: 'official_art', hint: '游戏官方图质感', group: '画风', colors: ['#e6e9ff', '#7b74d6'] },

  // 光照
  { zh: '逆光', en: 'backlighting', hint: '轮廓发光、脸部偏暗', group: '光照', colors: ['#ffe9c4', '#e0913f'] },
  { zh: '电影感', en: 'cinematic_lighting', hint: '强明暗对比、叙事变强', group: '光照', colors: ['#f3d9c0', '#3d3a52'] },
  { zh: '柔光', en: 'soft_lighting', hint: '阴影边界柔和、通透', group: '光照', colors: ['#fdf6ee', '#dcc6b0'] },
  { zh: '高对比', en: 'high_contrast', hint: '亮部更亮、暗部压死', group: '光照', colors: ['#ffffff', '#2b2b2b'] },
  { zh: '窗边光', en: 'window_light', hint: '单侧自然光、室内', group: '光照', colors: ['#fdf3e0', '#b9a486'] },
  { zh: '体积光', en: 'volumetric_lighting', hint: '光柱、灰尘可见', group: '光照', colors: ['#fff2cf', '#c9a86a'] },

  // 后期
  { zh: '景深', en: 'depth_of_field', hint: '背景虚化、主体突出', group: '后期', colors: ['#e8eef7', '#93a6c0'] },
  { zh: '光晕', en: 'bloom', hint: '高光溢出发光', group: '后期', colors: ['#fff6e0', '#ffd08a'] },
  { zh: '镜头光斑', en: 'lens_flare', hint: '斜向光斑、镜头感', group: '后期', colors: ['#e7f4ff', '#7fc0e8'] },
  { zh: '暗角', en: 'vignetting', hint: '四角压暗、聚焦中心', group: '后期', colors: ['#f2f2f2', '#4b4b4b'] },
  { zh: '色差', en: 'chromatic_aberration', hint: '边缘红蓝错位', group: '后期', colors: ['#ff9bb0', '#7fc9ff'] },
  { zh: '网点纸', en: 'screentone', hint: '半调圆点、漫画质感', group: '后期', colors: ['#f0f0f0', '#8a8a8a'] },
  { zh: '黑白', en: 'monochrome', hint: '整体去色', group: '后期', colors: ['#ffffff', '#000000'] },
  { zh: '灰阶', en: 'greyscale', hint: '灰阶分布、层次分明', group: '后期', colors: ['#e8e8e8', '#6f6f6f'] },
]
