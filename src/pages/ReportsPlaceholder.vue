<script setup lang="ts">
import { Document } from '@element-plus/icons-vue';
</script>

<template>
  <section class="placeholder">
    <ElResult title="Reports" sub-title="Plug in your reporting dashboards or data charts.">
      <template #icon>
        <ElIcon style="width: 60px; height: 60px">
          <Document />
        </ElIcon>
      </template>
    </ElResult>
  </section>
</template>

<style scoped>
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  background-color: var(--color-background-soft);
  border: 1px dashed var(--color-border);
  border-radius: 16px;
}
</style>
