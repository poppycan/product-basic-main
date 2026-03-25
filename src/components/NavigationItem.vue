<script setup lang="ts">
import type { Component } from 'vue';

const props = defineProps<{
  label: string;
  icon?: Component;
  iconSrc?: string;
  active?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

function handleClick() {
  emit('click');
}
</script>

<template>
  <button
    type="button"
    class="nav-button"
    :class="{ 'nav-button--active': props.active }"
    @click="handleClick"
  >
    <ElIcon v-if="props.icon && !props.iconSrc" class="nav-button__icon">
      <component :is="props.icon" />
    </ElIcon>
    <div v-else-if="props.iconSrc" class="nav-button__icon nav-button__icon--image">
      <img :src="props.iconSrc" :alt="props.label" loading="lazy" />
    </div>
    <span class="nav-button__label">{{ props.label }}</span>
  </button>
</template>

<style scoped>

.nav-button {
  position: relative;
  border: none;
  background: transparent;
  color: rgba(220, 234, 255, 0.74);
  width: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 0 10px;
  border-radius: 20px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.nav-button::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 18px;
  width: 3px;
  height: 22px;
  border-radius: 3px;
  background: rgba(123, 190, 255, 0);
  transition:
    height 0.2s ease,
    background 0.2s ease;
}

.nav-button:hover {
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-2px);
  color: rgba(235, 244, 255, 0.88);
}

.nav-button--active {
  background: linear-gradient(145deg, rgba(86, 162, 255, 0.25) 0%, rgba(28, 78, 132, 0.2) 100%);
  color: #ffffff;
  border-radius: 0;
}

.nav-button--active::before {
  height: 52px;
  background: linear-gradient(180deg, rgba(111, 192, 255, 0.9) 0%, rgba(62, 138, 227, 0.35) 100%);
}

.nav-button__icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-button__icon--image img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.nav-button__icon :deep(svg) {
  width: 28px;
  height: 28px;
}

.nav-button__label {
  font-size: 12px;
  text-align: center;
  line-height: 1.2;
  letter-spacing: 0.02em;
  padding: 0 8px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .nav-button {
    flex-direction: row;
    gap: 12px;
    width: auto;
    padding: 8px 16px;
    border-radius: 16px;
  }

  .nav-button::before {
    display: none;
  }

  .nav-button__icon {
    width: 28px;
    height: 28px;
  }

  .nav-button__label {
    padding: 0;
    font-size: 12px;
  }
}
</style>
