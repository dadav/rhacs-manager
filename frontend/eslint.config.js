// Accessibility-focused ESLint config.
// Intentionally scoped to jsx-a11y only so `just lint` surfaces a11y regressions
// without pulling in the full JS/TS lint ruleset (which would be a large, unrelated diff).
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default [
  { ignores: ['dist', 'node_modules'] },
  jsxA11y.flatConfigs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: globals.browser,
    },
  },
]
