<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '@/stores/app';

const { locale } = useI18n();
const appStore = useAppStore();

watch(
  () => appStore.language,
  (lang) => {
    locale.value = lang;
  },
  { immediate: true },
);
</script>

<template>
  <RouterView />
</template>
