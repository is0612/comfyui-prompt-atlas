<script setup lang="ts">
import BaseIcon from './BaseIcon.vue'
import { DEFAULT_AI_SYSTEM } from '../lib/ai'
import { downloadFile } from '../lib/importer'
import { allCharacters, exportCharacters, notify, resetAll, settings, ui } from '../store'

const TOGGLES = [
  { key: 'withAppearance', label: '带上外观标签', hint: '输出角色自带的发色 / 瞳色 / 服装标签' },
  { key: 'autoReplace', label: '同类自动替换', hint: '同一槽里姿态 / 视线 / 景别 / 视角 / 表情只留一个，新的挤掉旧的' },
  { key: 'outfitReplace', label: '服装互斥', hint: '和服 / 泳装 / 女仆装这类整体装束只留一套；衬衫、百褶裙、过膝袜这些单品不受影响' },
  { key: 'handBudget', label: '两只手限额', hint: '抱臂 / 捧花束 / 比心这类占两只手，挥手 / 托腮 / 持剑占一只，超了新加的顶掉最旧的' },
  { key: 'adaptiveNeg', label: '负向自适应', hint: '正向用了 chibi 等词时，剔除会打架的负向' },
  { key: 'antiClone', label: '单角色防克隆', hint: '只有一个角色时追加 2girls / multiple_girls' },
  { key: 'hideNsfw', label: '隐藏 NSFW 词条', hint: '词库里标记为 nsfw 的条目不显示' },
] as const

function exportJson() {
  downloadFile('prompt-atlas-characters.json', exportCharacters())
  notify(`已导出 ${allCharacters.value.length} 个角色`)
}

function confirmReset() {
  if (window.confirm('会清掉本地新增 / 改过的角色、自定义词条、选择和历史，确定？')) resetAll()
}

function restoreTemplate() {
  settings.aiSystem = DEFAULT_AI_SYSTEM
  notify('已恢复默认模板')
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.settingsOpen" class="mask" @click.self="ui.settingsOpen = false">
      <Transition name="slide" appear>
        <aside class="drawer">
          <div class="head">
            <div class="title">设置</div>
            <button class="icon-btn" @click="ui.settingsOpen = false"><BaseIcon name="x" /></button>
          </div>

          <div class="body">
            <div class="group">
              <div class="group-title">输出</div>
              <div v-for="item in TOGGLES" :key="item.key" class="row">
                <div class="text">
                  <div class="label">{{ item.label }}</div>
                  <div class="hint">{{ item.hint }}</div>
                </div>
                <button
                  class="switch"
                  :class="{ on: settings[item.key] }"
                  role="switch"
                  :aria-checked="settings[item.key]"
                  @click="settings[item.key] = !settings[item.key]"
                >
                  <i />
                </button>
              </div>
            </div>

            <div class="group">
              <div class="group-title">标签密度</div>
              <div class="seg full">
                <button :class="{ on: settings.density === 'lite' }" @click="settings.density = 'lite'">精简</button>
                <button :class="{ on: settings.density === 'normal' }" @click="settings.density = 'normal'">标准</button>
                <button :class="{ on: settings.density === 'rich' }" @click="settings.density = 'rich'">复杂</button>
              </div>
              <div class="hint pad">精简会只取第一个角色、每组最多 3 个标签；标准全保留；复杂额外加细节强化词。</div>
            </div>

            <div class="group">
              <div class="group-title">AI 润色接口</div>
              <label class="field">
                <span>接口地址</span>
                <input v-model="settings.aiBase" placeholder="https://api.deepseek.com/v1" spellcheck="false" />
              </label>
              <label class="field">
                <span>模型</span>
                <input v-model="settings.aiModel" placeholder="deepseek-chat" spellcheck="false" />
              </label>
              <label class="field">
                <span>API Key</span>
                <input v-model="settings.aiKey" type="password" placeholder="sk-..." spellcheck="false" />
              </label>
              <div class="field">
                <span class="field-head">
                  <span>提示词模板</span>
                  <button
                    v-if="settings.aiSystem.trim() !== DEFAULT_AI_SYSTEM.trim()"
                    type="button"
                    class="link"
                    @click="restoreTemplate"
                  >
                    恢复默认
                  </button>
                </span>
                <textarea v-model="settings.aiSystem" rows="6" spellcheck="false" />
              </div>
              <div class="hint pad">
                模板里用 <code>=====EN=====</code> 分隔中英文两块。模型要是没按格式回，润色窗口会自动再单发一次英文，也可以在那边手动点「单独要一次英文」。改动模板后英文块可能丢，点「恢复默认」回到内置版本。
              </div>
              <div class="hint pad">
                任何 OpenAI 兼容的 /chat/completions 都能用。Key 只存在本机浏览器，请求直接发给你填的地址；如果浏览器跨域被拦，换成允许 CORS 的地址或走代理。
              </div>
            </div>

            <div class="group">
              <div class="group-title">数据</div>
              <button class="btn" @click="exportJson"><BaseIcon name="download" :size="14" /> 导出角色 JSON</button>
              <div class="hint pad">导出的文件可以直接再导入回来，也方便备份或换机器。</div>
              <button class="btn danger" @click="confirmReset"><BaseIcon name="trash" :size="14" /> 清空本地数据</button>
            </div>

            <div class="group">
              <div class="group-title">存储</div>
              <div class="hint">
                角色、自定义词条、选择和历史都存在浏览器 localStorage，不上传任何服务器。清浏览器数据会一起丢掉，重要的话先导出。
              </div>
            </div>
          </div>
        </aside>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  /* ⚠️ 要压在润色弹窗（72）之上：润色里点「接口设置」是直接把它盖在上面的，
     给 65 的话抽屉会藏在弹窗背后，看着像按钮没反应 */
  z-index: 76;
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  width: 350px;
  max-width: 92vw;
  height: 100%;
  background: var(--panel);
  border-left: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px;
  border-bottom: 1px solid var(--line);
}

.title {
  font-size: 13px;
  font-weight: 600;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px;
}

.group {
  margin-bottom: 20px;
}

.group-title {
  margin-bottom: 8px;
  color: var(--ink-3);
  font-size: 10.5px;
  letter-spacing: 0.7px;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.row + .row {
  border-top: 1px dashed var(--line);
}

.text {
  flex: 1;
  min-width: 0;
}

.label {
  font-size: 12.5px;
}

.hint {
  margin-top: 2px;
  color: var(--ink-3);
  font-size: 11px;
  line-height: 1.6;
}

.hint.pad {
  margin: 8px 0 10px;
}

.switch {
  flex: none;
  position: relative;
  width: 36px;
  height: 20px;
  border: 0;
  border-radius: 99px;
  background: #dcd7ea;
  transition: background 0.18s;
}

.switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 99px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  transition: transform 0.18s;
}

.switch.on {
  background: var(--accent);
}

.switch.on i {
  transform: translateX(16px);
}

.seg.full {
  display: flex;
}

.seg.full button {
  flex: 1;
}

.btn {
  width: 100%;
  margin-bottom: 8px;
  justify-content: flex-start;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.field > span {
  color: var(--ink-3);
  font-size: 10.5px;
}

/* 标题行右侧挂一个小按钮（恢复默认），不额外占一行高度 */
.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-size: 10.5px;
  cursor: pointer;
}

.link:hover {
  text-decoration: underline;
}

.hint code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--sunken);
  color: var(--ink-2);
  font-family: var(--mono);
  font-size: 10px;
}

.field input,
.field textarea {
  width: 100%;
  padding: 6px 9px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--sunken);
  font-size: 12px;
  outline: 0;
  resize: vertical;
}

.field input {
  height: 30px;
}

.field textarea {
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.7;
}

.field input:focus,
.field textarea:focus {
  border-color: var(--accent-line);
  background: #fff;
}

.btn.danger {
  color: #b4382a;
  border-color: #f0cec8;
  background: #fdf4f2;
}

.btn.danger:hover {
  background: #fbe9e5;
}
</style>
