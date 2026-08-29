import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js'
import pluginQuasar from '@quasar/app-vite/eslint'
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginImport from 'eslint-plugin-import';
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const importOrderOptions = {
  alphabetize: {
    order: 'asc',
    caseInsensitive: true,
  },
  distinctGroup: false,
  'newlines-between': 'always',
  groups: ['external', 'builtin', 'type', 'internal', 'sibling', 'parent', 'index'],
  pathGroupsExcludedImportTypes: ['builtin'],
  pathGroups: [
    {
      pattern: '**/*.vue',
      group: 'index',
      position: 'after',
    },
    {
      pattern: '**/types',
      group: 'type',
      position: 'after',
    },
    {
      pattern: '**/types/*',
      group: 'type',
      position: 'after',
    },
    {
      pattern: '**/interface',
      group: 'type',
      position: 'after',
    },
    {
      pattern: '**/interface/*',
      group: 'type',
      position: 'after',
    },
    {
      pattern: '@pages/**',
      group: 'internal',
      position: 'after',
    },
    {
      pattern: '@modules/**',
      group: 'internal',
      position: 'after',
    },
    {
      pattern: '@services/**',
      group: 'internal',
      position: 'after',
    },
    {
      pattern: '@shared/**',
      group: 'internal',
      position: 'after',
    },
    {
      pattern: '@/**',
      group: 'internal',
    },
  ],
};


export default defineConfigWithVueTs(
  {
    /**
     * Ignore the following files.
     * Please note that pluginQuasar.configs.recommended() already ignores
     * the "node_modules" folder for you (and all other Quasar project
     * relevant folders and files).
     *
     * ESLint requires "ignores" key to be the only one in this object
     */
    // ignores: []
  },

  ...fixupConfigRules(
    compat.extends(
      'eslint:recommended',
      'plugin:import/recommended',
      'plugin:import/typescript',
      'prettier'
    )
  ),

  {
    rules: {
      'import/no-unresolved': 'off',
      'import/no-named-as-default-member': 'off',
      'import/order': ['error', importOrderOptions],
    }
  },

  pluginQuasar.configs.recommended(),
  js.configs.recommended,

  pluginVue.configs['flat/essential'],
  pluginVue.configs['flat/strongly-recommended'],

  /**
   * https://eslint.vuejs.org
   *
   * pluginVue.configs.base
   *   -> Settings and rules to enable correct ESLint parsing.
   * pluginVue.configs[ 'flat/essential']
   *   -> base, plus rules to prevent errors or unintended behavior.
   * pluginVue.configs["flat/strongly-recommended"]
   *   -> Above, plus rules to considerably improve code readability and/or dev experience.
   * pluginVue.configs["flat/recommended"]
   *   -> Above, plus rules to enforce subjective community defaults to ensure consistency.
   */
  pluginVue.configs['flat/essential'],

  {
    files: ['**/*.ts', '**/*.vue'],
    plugins: {
      import: fixupPluginRules(pluginImport)
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' }
      ],

      'vue/component-api-style': ['error', ['script-setup', 'composition']],
      'vue/no-undef-components': 'error',

      'vue/component-definition-name-casing': ['error', 'PascalCase'],
      'vue/component-options-name-casing': ['error', 'PascalCase'],
      'vue/component-name-in-template-casing': [
        'error',
        'PascalCase',
        {
          ignores: ['component', '/v-/'],
          registeredComponentsOnly: false,
        },
      ],
    }
  },
  // https://github.com/vuejs/eslint-config-typescript
  vueTsConfigs.recommendedTypeChecked,

  // Disable type-requiring rules for .vue files — type info not available
  {
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-array-delete': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unnecessary-type-constraints': 'off',
    },
  },

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      globals: {
        ...globals.browser,
        ...globals.node, // SSR, Electron, config files
        process: 'readonly', // process.env.*
        ga: 'readonly', // Google Analytics
        cordova: 'readonly',
        Capacitor: 'readonly',
        chrome: 'readonly', // BEX related
        browser: 'readonly' // BEX related
      }
    },

    // add your custom rules here
    rules: {
      'prefer-promise-reject-errors': 'off',

      // allow debugger during development only
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off'
    }
  },

  {
    files: ['src-pwa/custom-service-worker.ts'],
    languageOptions: {
      globals: {
        ...globals.serviceworker
      }
    }
  },

  prettierSkipFormatting
)
