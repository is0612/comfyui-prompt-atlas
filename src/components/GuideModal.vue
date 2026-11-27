<script setup lang="ts">
import { ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { ui } from '../store'

const TABS = ['概览', '流程', '开关', '技巧'] as const
const active = ref<(typeof TABS)[number]>('概览')
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.guideOpen" class="mask" @click.self="ui.guideOpen = false">
      <div class="modal">
        <div class="head">
          <div class="title">说明书</div>
          <button class="icon-btn" @click="ui.guideOpen = false"><BaseIcon name="x" /></button>
        </div>

        <div class="tabs">
          <button v-for="tab in TABS" :key="tab" :class="{ on: active === tab }" @click="active = tab">{{ tab }}</button>
        </div>

        <div class="body">
          <template v-if="active === '概览'">
            <p>这是给 ComfyUI / SD 系模型用的提示词工作台。核心只有一件事：<b>从图鉴里点角色，自动拼出三套能直接粘的提示词</b>。</p>
            <ul>
              <li><b>角色图鉴</b>：按游戏分页签，搜索框能搜名字、英文 tag、发色瞳色服装和特征，点卡片加入拼装。</li>
              <li><b>拼装区</b>：每个角色一个框，标签可以拖进框里归给某个角色；场景、画风放全局区。</li>
              <li><b>粘贴解析</b>：现成的提示词或几句中文粘进去，自动拆成角色框和标签，不用重拼。</li>
              <li><b>画风库</b>：拼装区的调色板按钮，点一张瓦片就把画风 / 光照标签放进全局。</li>
              <li><b>输出</b>：MOSS 中文段落、WAI（Illustrious 系）、PONY，正向负向各一块，单独复制。</li>
              <li><b>AI 润色</b>：把角色名和关键词扩写成逐角色的画面描述。</li>
            </ul>
            <p class="note">所有数据都在本机浏览器里，不上传任何服务器。</p>
          </template>

          <template v-else-if="active === '流程'">
            <ol>
              <li><b>粘贴复用</b>：手上有现成提示词就点拼装区的「粘贴」，粘进去自动拆解；没有这步就跳过。</li>
              <li><b>选角色</b>：左边点卡片。一张卡 = 一个角色，带自己的发色 / 瞳色 / 服装标签。</li>              <li><b>加标签</b>：中间下方「补充标签」，<b>点一下</b>进当前带「收标签」标记的框，<b>拖出去</b>可以精确放进任意角色框或全局区。</li>
              <li><b>挪标签</b>：角色框里的标签也能拖，拖到另一个角色框就是转给她，拖回全局区就是取消归属。</li>
              <li><b>选档位</b>：右上角 精简 / 标准 / 复杂，控制标签数量。</li>
              <li><b>复制</b>：右侧每块右上角单独复制正向或负向。</li>
              <li><b>AI 润色</b>：右侧「AI 润色」，自动带上当前拼装内容，一次出中文段落 + 英文标签两块。</li>
              <li><b>存历史</b>：拼得满意就存一条，下次一键回填（连标签归属一起回填）。</li>
            </ol>
            <p class="note">多角色时负向不会再防克隆，记得自己加位置词（left / right）区分，把它们拖进对应的角色框里。</p>
            <p class="note">
              图鉴里 168 个角色分两种：<b>精修</b>的带体型、服装、特征的中文描述；<b>批量导入</b>的只有发色、瞳色和英文标签，所以中文段落会短一些（英文标签一样全）。
              缺的字段把鼠标移到卡片上，点右上角的铅笔就能补，改过的会存成自己的版本，不会被数据文件覆盖。
            </p>
            <p class="note">
              同一个角色的多套官方服饰（刻晴 / 刻晴·华服、银狼 / 银狼LV.999、安比 / 银翼战士）在库里是不同的条目，列表里也分开成两张卡，选哪张就出哪套衣服的标签。
            </p>
          </template>

          <template v-else-if="active === '开关'">
            <dl>
              <dt>带上外观标签</dt>
              <dd>输出角色自带的发色、瞳色、服装英文标签。关掉就只输出角色名 tag。</dd>
              <dt>同类自动替换</dt>
              <dd>同一槽里姿态、视线、景别、视角、表情只留一个。加了「躺着」会顶掉「站立」，拖拽转移时同样生效。关掉就只警告不替换，冲突处会出现红色角标，点一下合并。</dd>
              <dt>服装互斥</dt>
              <dd>只作用于「整体装束」：和服、浴衣、旗袍、水手服、女仆装、泳装这类互相顶掉。衬衫、短裙、过膝袜、蝴蝶结这些单品可以随便叠。</dd>
              <dt>两只手限额</dt>
              <dd>一个角色框最多放两只手的动作。抱臂、双手合十、伸懒腰、比心、捧花束、拥抱占两只；挥手、托腮、撩头发、持剑、撑伞、喝茶、看书占一只。加第三个时最旧的那个会被顶掉，框头会显示「手 1/2」。<b>道具不算手</b>，剑、书、花束挂身上也不顶人。</dd>
              <dt>权重</dt>
              <dd>拼装区右上角「权重」打开后，每个标签会出现 − / + 。调到 1.2 输出 <code>(tag:1.2)</code>，回到 1.0 就不再加权。不想开模式就 <b>Alt + 点芯片</b>，一步设成 1.3，再点一次还原。MOSS 中文段落不写权重。</dd>
              <dt>改标签</dt>
              <dd>芯片<b>双击</b>就地改中文名和英文标签，Enter 保存、Esc 取消；留空表示这一项不改。改完右侧输出立刻跟着变。</dd>
              <dt>负向自适应</dt>
              <dd>正向出现 chibi 这类词时，自动剔除会打架的解剖类负向。</dd>
              <dt>单角色防克隆</dt>
              <dd>只有一个角色时追加 2girls / multiple_girls / split_screen，防止模型自己加人。</dd>
              <dt>标签密度</dt>
              <dd>精简只取第一个角色、每个框最多 4 个标签、全局 3 个；标准全保留；复杂额外加强化词。</dd>
              <dt>AI 接口</dt>
              <dd>设置里填任意 OpenAI 兼容的 /chat/completions 地址、模型和 Key，提示词模板也能改。Key 只存本机。模板里的「设定锁定」别删，删了模型会自己改发色瞳色。</dd>
            </dl>
          </template>

          <template v-else>
            <ul>
              <li><b>模型不认角色</b>：把英文 tag 改成 Danbooru 上的写法，或补几个标志性外观标签。</li>
              <li><b>画出来不像</b>：先只放角色一个 tag 试，确认模型认识，再加场景和风格。</li>
              <li><b>想要固定构图</b>：在「补充标签 → 风格 → 镜头」里挑特写 / 全身 / 俯视。</li>
              <li><b>批量补角色</b>：右下「导入」，粘 CSV 或 JSON，同英文 tag 会覆盖旧的。</li>
              <li><b>描述写不顺</b>：用 AI 润色，模板里强调「道具位置不许改」能少跑偏。</li>
              <li><b>换机器</b>：设置里导出 JSON，到新机器再导入。</li>
              <li><b>常用词翻得烦</b>：在「补充标签」行尾点 ★ 收藏，收藏的排最前；分类栏的 ★ 可以只看收藏。</li>
              <li><b>AI 改设定</b>：润色模板里带「设定锁定」，发色瞳色服装不会被改。换成自己的模板时记得保留这句。</li>
            </ul>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 75;
  display: grid;
  place-items: center;
  padding: 24px;
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  max-height: 84vh;
  border-radius: 16px;
  background: var(--panel);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
}

.title {
  font-size: 14px;
  font-weight: 600;
}

.tabs {
  display: flex;
  gap: 4px;
  padding: 0 16px 10px;
  border-bottom: 1px solid var(--line);
}

.tabs button {
  height: 26px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--ink-3);
  font-size: 12px;
}

.tabs button:hover {
  background: var(--sunken);
  color: var(--ink-2);
}

.tabs button.on {
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-weight: 500;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 18px 18px;
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.85;
}

.body p {
  margin: 0 0 10px;
}

.body ul,
.body ol {
  margin: 0 0 10px;
  padding-left: 18px;
}

.body li {
  margin-bottom: 6px;
}

.body b {
  color: var(--ink);
}

.note {
  padding: 8px 11px;
  border-radius: 9px;
  background: var(--sunken);
  color: var(--ink-3);
  font-size: 11.5px;
}

dl {
  margin: 0;
}

dt {
  margin-top: 10px;
  color: var(--ink);
  font-weight: 600;
  font-size: 12.5px;
}

dt:first-child {
  margin-top: 0;
}

dd {
  margin: 3px 0 0;
  color: var(--ink-2);
}
</style>
