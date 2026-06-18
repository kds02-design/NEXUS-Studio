import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // 빈 catch 는 try 의 의도적 swallow 패턴 — 허용한다.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // catch (e) 처럼 잡았지만 안 쓰는 파라미터는 허용. `_`-prefix 변수도 의도적 미사용으로 본다.
      'no-unused-vars': ['error', { caughtErrors: 'none', argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  // 서버/빌드 측 Node 파일 — 백엔드 프록시(api/), vite 설정. Node 글로벌(process 등) 허용.
  {
    files: ['api/**/*.js', 'vite.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
])
