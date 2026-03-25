# 安全策略页面 Demo

本目录为 **安全策略** 页面的参考实现与 Mock 数据，与同目录上级的 `security-policy.page-spec.md` 配套使用。

## 文件说明


| 文件                             | 说明                                           |
| ------------------------------ | -------------------------------------------- |
| `security-policy.page-spec.md` | 页面规格说明（位于上级目录 `ai/prompts/`）                 |
| `types.security-policy.ts`     | 类型定义（设备树、策略、检索条件、标签统计等）                      |
| `mock.security-policy.ts`      | Mock 数据与本地过滤逻辑（设备树、策略列表、标签统计、searchPolicies） |
| `SecurityPolicyPage.demo.vue`  | Demo 页面（左树 + 检索 + 标签统计 + 列表）                 |


## 使用方式

1. **作为实现参考**：按 `page-spec` 开发时，可对照本 demo 的布局与交互。
2. **接入到项目**：
  - 将 `SecurityPolicyPage.demo.vue` 的内容复制到 `src/pages/PolicyAnalysisSecurityPolicy.vue`（或新建页面并配置路由）。
  - 将 `types.security-policy.ts`、`mock.security-policy.ts` 复制到 `src` 下合适目录（如 `src/api/`、`src/types/`），按需改为真实 API 调用。
  - 页面头请使用项目内的 `PageHeader`、`PageContent`（`@/components`），并保留「页面说明」按钮与 `public/docs/pages/` 文档约定。

## 入口与路由

- 策略分析页头右侧入口「**安全策略**」已由 `PolicyAnalysisHeaderActions.vue` 配置，路由为 `/policy-analysis/security-policy`。
- 确保路由指向上述页面组件即可。

## Mock 与本地存储

- 常用检索使用 `localStorage`，key：`securityPolicy.commonSearches`，最多 5 条。
- 策略列表由 `searchPolicies(searchParams)` 基于本地 Mock 过滤返回，后续可替换为后端分页接口。

