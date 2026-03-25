<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const entries = [{ label: '安全策略', path: '/policy-analysis/security-policy' }];

const activePath = computed(() => {
  const p = route.path;
  return entries.some((e) => e.path === p) ? p : '';
});

function go(path: string) {
  void router.push(path);
}
</script>

<template>
  <ElButton
    v-for="e in entries"
    :key="e.path"
    size="small"
    :type="activePath === e.path ? 'primary' : ''"
    :plain="activePath !== e.path"
    @click="go(e.path)"
  >
    {{ e.label }}
  </ElButton>
</template>

