import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

/**
 * ESLint 9 flat config。
 *
 * 只做「静态检查」，不负责格式：类型检查交给 vue-tsc（build 的一部分），
 * 缩进、换行、属性顺序这类纯风格问题故意不开规则 —— 这个项目的组件模板
 * 偏好紧凑单行，风格规则只会刷出一屏噪音，把真问题埋掉。
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
  },

  {
    rules: {
      // 类型由 vue-tsc 负责；这里开着会和 TS 的判定打架（比如 .vue 里的编译宏）
      'no-undef': 'off',
      // 未使用变量同理，noUnusedLocals / noUnusedParameters 已经拦住了，
      // 而 ESLint 不解析类型，容易把只有类型用到的变量误报成未使用
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // App.vue 是根组件，不需要多单词
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
      // 值不值得单独开一条：catch 块留空通常是有意的兜底，但空函数体多半是漏写
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  {
    files: ['**/*.test.ts'],
    rules: {
      // 测试里允许直接改 store 状态、允许断言里用非空断言
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
)
