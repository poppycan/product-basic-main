import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { installElementPlus } from './plugins/element';
import { createI18nInstance } from './locales';
import { useAppStore } from './stores/app';
import './styles/index.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

const appStore = useAppStore(pinia);
const i18n = createI18nInstance(appStore.language);

app.use(router);
app.use(i18n);
installElementPlus(app);

app.mount('#app');
