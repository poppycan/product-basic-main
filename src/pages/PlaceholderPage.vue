<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Document } from '@element-plus/icons-vue';

const route = useRoute();
const title = computed(() => (route.meta?.title as string) || route.name?.toString() || '页面');
</script>

<template>
  <section class="placeholder-page">
    <ElResult :title="title" sub-title="页面内容待补充。">
      <template #icon>
        <ElIcon style="width: 60px; height: 60px">
          <Document />
        </ElIcon>
      </template>
    </ElResult>
  </section>
</template>

<style scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  background-color: var(--color-background-soft);
  border: 1px dashed var(--color-border);
  border-radius: 16px;
}
</style>
