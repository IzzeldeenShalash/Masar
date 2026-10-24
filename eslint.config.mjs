import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['.local/**', '**/node_modules/**', '**/dist*/**', '**/dist-android/**', '**/.expo/**', '**/expo-env.d.ts'] },
  js.configs.recommended,
  { files: ['packages/dev-cli/**/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly', Buffer: 'readonly', fetch: 'readonly', AbortSignal: 'readonly', setTimeout: 'readonly' } } },
  ...ts.configs.recommended,
  { files: ['**/*.{ts,tsx}'], rules: { '@typescript-eslint/no-explicit-any': 'error', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
);
