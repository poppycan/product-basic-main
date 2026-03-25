import pluginVue from 'eslint-plugin-vue';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import vuePrettier from '@vue/eslint-config-prettier';

export default defineConfigWithVueTs(
  {
    name: 'my-product/ignores',
    ignores: ['dist/**', 'node_modules/**']
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommendedTypeChecked,
  vuePrettier,
  {
    name: 'my-product/custom-rules',
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
);
