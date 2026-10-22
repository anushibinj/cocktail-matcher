import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/', 'dist-ssr/', 'node_modules/', 'public/', 'coverage/']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      // Type-aware rules that are cheap and catch real hazards.
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      // tsc already reports unused locals/parameters (noUnusedLocals/noUnusedParameters).
      '@typescript-eslint/no-unused-vars': 'off'
    }
  },
  {
    files: ['*.config.{js,ts}'],
    languageOptions: {
      globals: globals.node
    }
  }
);
