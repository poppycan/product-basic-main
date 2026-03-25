<script setup lang="ts">
import { MagicStick } from '@element-plus/icons-vue';
</script>

<template>
  <section class="placeholder">
    <ElResult
      title="Analysis Wizard"
      sub-title="Use this view to guide users through step-by-step analysis setup."
    >
      <template #icon>
        <ElIcon style="width: 60px; height: 60px">
          <MagicStick />
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
