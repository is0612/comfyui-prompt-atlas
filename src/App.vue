<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { redo, ui, undo } from './store'
import AppHeader from './components/AppHeader.vue'
import CharacterAtlas from './components/CharacterAtlas.vue'
import CharacterEditor from './components/CharacterEditor.vue'
import GuideModal from './components/GuideModal.vue'
import HistoryDrawer from './components/HistoryDrawer.vue'
import ImportDialog from './components/ImportDialog.vue'
import OutputPanel from './components/OutputPanel.vue'
import PasteDialog from './components/PasteDialog.vue'
import PolishDialog from './components/PolishDialog.vue'
import SelectionPanel from './components/SelectionPanel.vue'
import SettingsDrawer from './components/SettingsDrawer.vue'
import StyleLibrary from './components/StyleLibrary.vue'
import TagLibrary from './components/TagLibrary.vue'
import ToastHost from './components/ToastHost.vue'

/** 在输入框里按快捷键应该走浏览器默认行为（撤销文字、退格等），别抢 */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

/** 按层级从高到低关最上面那一层 */
const LAYERS = ['settingsOpen', 'guideOpen', 'polishOpen', 'styleOpen', 'editorOpen', 'importOpen', 'pasteOpen', 'historyOpen'] as const

function closeTopLayer() {
  for (const key of LAYERS) {
    if (ui[key]) {
      ui[key] = false
      return
    }
  }
}

function onKeydown(event: KeyboardEvent) {
  const mod = event.ctrlKey || event.metaKey

  if (mod && event.key.toLowerCase() === 'z') {
    if (isTyping(event.target)) return
    event.preventDefault()
    if (event.shiftKey) redo()
    else undo()
    return
  }

  // 输入框里的 Esc 归控件自己（比如标签就地改名），不要顺手把弹窗关了
  if (event.key === 'Escape') {
    if (isTyping(event.target)) return
    closeTopLayer()
    return
  }

  // 斜杠聚焦角色搜索，和大多数工具的习惯一致
  if (event.key === '/' && !isTyping(event.target)) {
    const input = document.querySelector<HTMLInputElement>('.atlas input:not([type])')
    if (input) {
      event.preventDefault()
      input.focus()
      input.select()
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="app">
    <AppHeader />
    <main class="workspace">
      <CharacterAtlas />
      <div class="middle">
        <SelectionPanel />
        <TagLibrary />
      </div>
      <OutputPanel />
    </main>
    <ImportDialog />
    <CharacterEditor />
    <PolishDialog />
    <PasteDialog />
    <StyleLibrary />
    <SettingsDrawer />
    <HistoryDrawer />
    <GuideModal />
    <ToastHost />
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 图鉴封住上限，多出来的宽度给拼装和输出。
   左栏下限 480：低于这个宽度三列卡片就挤不下 144 的图 */
.workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(480px, 540px) minmax(0, 1fr) minmax(360px, 400px);
  gap: 16px;
  padding: 16px;
}

.middle {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

/* 拼装区按内容长，最多占 42%；词库吃掉剩下的高度。
   ⚠️ 这里必须 shrink:0 —— 词库内容很长，否则负空间会把拼装区一起压扁。
   上限从 50% 收到 42%：拼装区改成一格一行之后本来就矮，多出来的高度留给词库 */
.middle > :first-child {
  flex: 0 0 auto;
  max-height: 42%;
}

.middle > :last-child {
  flex: 1 1 auto;
  min-height: 240px;
}

@media (max-width: 1320px) {
  .workspace {
    /* 460 而不是更窄：图鉴再窄一列就只放得下 2 张卡，反而更占地方 */
    grid-template-columns: minmax(440px, 460px) minmax(300px, 1fr) minmax(320px, 360px);
    gap: 12px;
    padding: 12px;
  }
}

@media (max-width: 1120px) {
  .app {
    height: auto;
    min-height: 100%;
  }

  .workspace {
    grid-template-columns: minmax(0, 1fr);
    min-height: auto;
  }

  /* 单列时页高不再受限，面板要给定高度才会内部滚动，否则会把 32 张卡全铺开 */
  .workspace > :deep(.atlas) {
    height: 520px;
  }

  .middle > :first-child,
  .middle > :last-child {
    flex: none;
    max-height: none;
  }

  .middle > :first-child {
    height: 300px;
  }

  .middle > :last-child {
    height: 460px;
  }

  .workspace > :deep(.panel:last-child) {
    min-height: 360px;
  }
}
</style>
