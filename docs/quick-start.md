# 快速上手

## 安装与启动

```bash
npm install
npm run dev
```

## 目录约定

- `src/layout`：主布局、侧边导航、顶栏等壳层组件。
- `src/pages`：业务页面与占位页面示例，可直接替换或扩展。
- `src/config`：菜单、主题、站点信息等配置数据。
- `src/stores`：Pinia 全局状态（主题、语言等）。
- `src/locales`：`vue-i18n` 字典文件。
- `src/styles`：全局样式与主题变量。
- `docs`：补充文档与流程说明。

## 常用脚本

| 指令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 打包生产资源 |
| `npm run preview` | 预览生产构建 |

## 下一步建议

- 将实际菜单与路由替换 `src/config/menu.ts` 中的占位数据。
- 根据团队规范扩展 `src/pages` 内的业务模块。
- 若需要拆分子项目，可在 `packages/` 下新建工作空间，复用当前壳层。
- 按需抽离常用组件至 `src/components`，形成内部组件库。