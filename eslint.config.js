const js = require('@eslint/js');
const globals = require('globals');
const config = require('eslint/config');
const prettierPlugin = require('eslint-plugin-prettier');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = config.defineConfig([
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', '.vscode/**'],
  },

  js.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': ['warn'],
    },
  },

  eslintConfigPrettier,
]);
