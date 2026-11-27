<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { allCharacters, games, notify, removeCharacter, saveCharacter, ui } from '../store'
import type { Character } from '../types'

/**
 * 新建角色的空表单。键集合是「除 avatar 外的全部字段」——
 * 给 Character 加字段却忘了补这里，编译会报错。
 * avatar 不在里面，是因为它只能来自数据文件或导入（界面上没有选图入口），
 * 新建的角色默认显示首字色块。
 */
const BLANK: Record<Exclude<keyof Required<Character>, 'avatar'>, string> = {
  zh: '',
  en: '',
  game: '',
  body: '',
  hair: '',
  eyes: '',
  outfit: '',
  traits: '',
  tags: '',
  note: '',
}

const blank = (): Character => ({ ...BLANK, game: games.value[0] ?? '' })

const form = ref<Character>(blank())
const isEdit = computed(() => Boolean(ui.editing))

watch(
  () => ui.editorOpen,
  (open) => {
    if (!open) return
    form.value = ui.editing ? { ...ui.editing } : blank()
  },
)

function submit() {
  const zh = form.value.zh.trim()
  const en = form.value.en.trim()
  if (!zh || !en) {
    notify('中文名和英文 tag 是必填的', 'warn')
    return
  }
  const clash = allCharacters.value.some((c) => c.en === en && c.en !== ui.editing?.en)
  if (clash) {
    notify('这个英文 tag 已经被占用了', 'warn')
    return
  }
  saveCharacter({ ...form.value, zh, en, game: form.value.game.trim() || '未分类' })
  ui.editorOpen = false
}

function remove() {
  if (!ui.editing) return
  removeCharacter(ui.editing.en)
  ui.editorOpen = false
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.editorOpen" class="mask" @click.self="ui.editorOpen = false">
      <div class="modal">
        <div class="head">
          <div class="title">
            {{ isEdit ? '编辑角色' : '新增角色' }}
            <small>{{ isEdit ? form.en : '填完就进图鉴，存在本机' }}</small>
          </div>
          <button class="icon-btn" @click="ui.editorOpen = false"><BaseIcon name="x" /></button>
        </div>

        <div class="body">
          <div class="grid">
            <label class="field">
              <span>中文名 *</span>
              <input v-model="form.zh" placeholder="甘雨" />
            </label>
            <label class="field">
              <span>英文 tag *</span>
              <input v-model="form.en" placeholder="ganyu_(genshin_impact)" spellcheck="false" />
            </label>
            <label class="field">
              <span>游戏 / 作品</span>
              <input v-model="form.game" list="game-list" placeholder="原神" />
              <datalist id="game-list">
                <option v-for="name in games" :key="name" :value="name" />
              </datalist>
            </label>
            <label class="field">
              <span>体型</span>
              <input v-model="form.body" placeholder="少女" />
            </label>
            <label class="field">
              <span>发型发色</span>
              <input v-model="form.hair" placeholder="蓝紫色长发" />
            </label>
            <label class="field">
              <span>瞳色</span>
              <input v-model="form.eyes" placeholder="金瞳" />
            </label>
          </div>

          <label class="field">
            <span>默认服装</span>
            <input v-model="form.outfit" placeholder="黑金配色仙兽服饰" />
          </label>
          <label class="field">
            <span>标志性特征</span>
            <input v-model="form.traits" placeholder="麒麟角" />
          </label>
          <label class="field">
            <span>英文外观标签（逗号分隔）</span>
            <textarea v-model="form.tags" rows="3" spellcheck="false" placeholder="blue_hair, long_hair, horns, yellow_eyes" />
          </label>
          <label class="field">
            <span>备注</span>
            <input v-model="form.note" placeholder="可选" />
          </label>
        </div>

        <div class="foot">
          <button v-if="isEdit" class="btn danger" @click="remove"><BaseIcon name="trash" :size="13" /> 移除</button>
          <span class="spacer" />
          <button class="btn" @click="ui.editorOpen = false">取消</button>
          <button class="btn primary" @click="submit">保存</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 24px;
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(620px, 100%);
  max-height: 88vh;
  border-radius: 16px;
  background: var(--panel);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

.title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: var(--fs-title);
  font-weight: 600;
}

.title small {
  font-size: var(--fs-caption);
  font-weight: 400;
  color: var(--ink-3);
  font-family: var(--mono);
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field > span {
  color: var(--ink-3);
  font-size: var(--fs-caption);
}

.field input,
.field textarea {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--sunken);
  font-size: var(--fs-sm);
  outline: 0;
  resize: vertical;
}

.field input {
  height: 32px;
}

.field textarea {
  font-family: var(--mono);
  font-size: var(--fs-sm);
  line-height: 1.7;
}

.field input:focus,
.field textarea:focus {
  border-color: var(--accent-line);
  background: var(--panel);
}

.foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.spacer {
  flex: 1;
}

.btn.danger {
  color: var(--danger);
  border-color: var(--danger-line);
  background: var(--danger-soft);
}

.btn.danger:hover {
  background: var(--danger-soft-2);
}
</style>
