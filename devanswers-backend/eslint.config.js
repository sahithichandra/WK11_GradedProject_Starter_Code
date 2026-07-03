import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Allow intentionally-unused caught errors (`catch (_e)`) and
      // capitalized/underscore-prefixed placeholders.
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^[A-Z_]',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Vitest tests reassign members of a vi.mock()'d service namespace, which
    // is writable at runtime; no-import-assign is a false positive here.
    files: ['tests/**/*.js'],
    rules: {
      'no-import-assign': 'off',
    },
  },
];
