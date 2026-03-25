<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import TopNav from './TopNav.vue';
import SideNav from './SideNav.vue';

const route = useRoute();
const showSideNav = computed(() => route.meta?.showSideNav !== false);
</script>

<template>
  <div class="app-layout">
    <TopNav />
    <div class="app-layout__body">
      <SideNav v-if="showSideNav" />
      <main class="app-layout__content">
        <div class="app-layout__view">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  background-color: var(--color-background);
  color: var(--color-text);
  overflow: hidden;
}

.app-layout__body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.app-layout__content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  padding: 12px;
  background-color: var(--color-surface);
  display: flex;
  flex-direction: column;
}

.app-layout__view {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

@media (max-width: 900px) {
  .app-layout__content {
    padding: 10px;
  }
}
</style>
