<template>
  <div class="page-content">
    <slot />
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.page-content {
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, rgba(148, 163, 184, 0.28));
  border-radius: 8px;
  box-sizing: border-box;
  overflow: auto;
}

@media (max-width: 760px) {
  .page-content {
    padding: 10px;
  }
}
</style>
