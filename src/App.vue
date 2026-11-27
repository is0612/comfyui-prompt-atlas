<script setup lang="ts">
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

/* 图鉴封住上限，多出来的宽度给拼装和输出 */
.workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(300px, 560px) minmax(340px, 1fr) minmax(360px, 1fr);
  gap: 12px;
  padding: 12px;
}

.middle {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

/* 拼装区按内容长，最多占一半；词库吃掉剩下的高度。
   ⚠️ 这里必须 shrink:0 —— 词库内容很长，否则负空间会把拼装区一起压扁 */
.middle > :first-child {
  flex: 0 0 auto;
  min-height: 196px;
  max-height: 50%;
}

.middle > :last-child {
  flex: 1 1 auto;
  min-height: 240px;
}

@media (max-width: 1320px) {
  .workspace {
    /* 490 而不是更小：图鉴再窄一列就只放得下 2 张卡，反而更占地方 */
    grid-template-columns: minmax(280px, 490px) minmax(320px, 1fr) minmax(340px, 1fr);
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
