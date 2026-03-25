import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import MainLayout from '@/layout/MainLayout.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    meta: { showSideNav: true },
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/pages/Home.vue'),
        meta: { title: 'home', showSideNav: true },
      },
      {
        path: 'policy-ledger',
        name: 'policy-ledger',
        component: () => import('@/pages/PlaceholderPage.vue'),
        meta: { title: 'policyLedger', showSideNav: true },
      },
      {
        path: 'policy-analysis',
        name: 'policy-analysis',
        component: () => import('@/pages/PolicyAnalysis.vue'),
        meta: { title: 'policyAnalysis', showSideNav: true },
        children: [
          {
            path: '',
            redirect: '/policy-analysis/security-policy',
          },
          {
            path: 'security-policy',
            name: 'policy-analysis-security-policy',
            component: () => import('@/pages/PolicyAnalysisSecurityPolicy.vue'),
            meta: { title: 'securityPolicy', showSideNav: true },
          },
          {
            path: 'optimize-log',
            name: 'policy-analysis-optimize-log',
            component: () => import('@/pages/PlaceholderPage.vue'),
            meta: { title: 'optimizeLog', showSideNav: true },
          },
          {
            path: 'firewall-device-management',
            name: 'policy-analysis-firewall-device-management',
            component: () => import('@/pages/PlaceholderPage.vue'),
            meta: { title: 'firewallDeviceManagement', showSideNav: true },
          },
        ],
      },
      {
        path: 'analysis',
        name: 'analysis',
        component: () => import('@/pages/AnalysisPlaceholder.vue'),
        meta: { title: 'analysis', showSideNav: true },
      },
      {
        path: 'analysis/wizard',
        name: 'analysis-wizard',
        component: () => import('@/pages/AnalysisWizard.vue'),
        meta: { title: 'analysisWizard', showSideNav: true },
      },
      {
        path: 'analysis/config',
        name: 'analysis-config',
        component: () => import('@/pages/AnalysisConfig.vue'),
        meta: { title: 'analysisConfig', showSideNav: true },
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/pages/ReportsPlaceholder.vue'),
        meta: { title: 'reports', showSideNav: true },
      },
      {
        path: 'reports/templates',
        name: 'reports-templates',
        component: () => import('@/pages/ReportsTemplates.vue'),
        meta: { title: 'reportsTemplates', showSideNav: true },
      },
      {
        path: 'reports/automation',
        name: 'reports-automation',
        component: () => import('@/pages/ReportsAutomation.vue'),
        meta: { title: 'reportsAutomation', showSideNav: true },
      },
      {
        path: 'policy-change',
        name: 'policy-change',
        component: () => import('@/pages/PolicyChange.vue'),
        meta: { title: 'policyChange', showSideNav: true },
      },
      {
        path: 'policy-change/open',
        name: 'policy-change-open',
        component: () => import('@/pages/PolicyChangeOpen.vue'),
        meta: { title: 'policyChangeOpen', showSideNav: true },
      },
      {
        path: 'policy-change/modify',
        name: 'policy-change-modify',
        component: () => import('@/pages/PolicyChangeModify.vue'),
        meta: { title: 'policyChangeModify', showSideNav: true },
      },
      {
        path: 'policy-change/edit',
        name: 'policy-change-edit',
        component: () => import('@/pages/PolicyChangeEdit.vue'),
        meta: { title: 'policyChangeEdit', showSideNav: true },
      },
      {
        path: 'policy-change/recycle',
        name: 'policy-change-recycle',
        component: () => import('@/pages/PolicyChangeRecycle.vue'),
        meta: { title: 'policyChangeRecycle', showSideNav: true },
      },
      {
        path: 'demo',
        name: 'demo',
        component: () => import('@/pages/Demo.vue'),
        meta: { title: 'demo', showSideNav: true },
      },
      {
        path: 'device-management',
        name: 'device-management',
        component: () => import('@/pages/PlaceholderPage.vue'),
        meta: { title: 'deviceManagement', showSideNav: true },
      },
      {
        path: 'tag-manage',
        name: 'tag-manage',
        component: () => import('@/pages/PlaceholderPage.vue'),
        meta: { title: 'tagManage', showSideNav: true },
      },
      {
        path: 'hit-analysis',
        name: 'hit-analysis',
        component: () => import('@/pages/PlaceholderPage.vue'),
        meta: { title: 'hitAnalysis', showSideNav: true },
      },
      {
        path: 'path-analysis',
        name: 'path-analysis',
        component: () => import('@/pages/PlaceholderPage.vue'),
        meta: { title: 'pathAnalysis', showSideNav: true },
      },
      {
        path: 'work-order',
        name: 'work-order',
        component: () => import('@/pages/PlaceholderPage.vue'),
        meta: { title: 'workOrder', showSideNav: true },
      },
      {
        path: 'nat-policy',
        name: 'nat-policy',
        component: () => import('@/pages/PlaceholderPage.vue'),
        meta: { title: 'natPolicy', showSideNav: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
