import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
     { files: ['**/*.{js,mjs,cjs,ts}'] },
     {
          languageOptions: {
               globals: globals.browser,
          },
     },
     pluginJs.configs.recommended,
     ...tseslint.configs.recommended,
     {
          ignores: ['node_modules', 'dist'],
          rules: {
               'no-unused-expressions': 'error',
               'prefer-const': 'error',
               'no-console': 'warn',
               'no-undef': 'error',
               '@typescript-eslint/no-explicit-any': 'off',
               '@typescript-eslint/no-unused-vars': [
                    'error',
                    {
                         argsIgnorePattern: '^_',
                         varsIgnorePattern: '^_',
                         ignoreRestSiblings: true,
                    },
               ],
          },
          languageOptions: {
               globals: {
                    process: 'readonly',
               },
          },
     },
];
