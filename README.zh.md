# Codex OpenPencil

v0.2.0 已加入真实可编辑画布，复用完整 Rust OpenPencil 编辑器。
交互操作与 Codex 的 MCP 修改使用同一份文档，支持图层、选择、文字与形状编辑、
平移缩放、保存和恢复草稿。

## 安装与启动

需要本地 Node.js 22+、支持插件市场的新版 Codex，以及完整 Rust 编辑器运行包。

```sh
git clone git@github.com:ZSeven-W/codex-openpencil.git
cd codex-openpencil
codex plugin marketplace add .
codex plugin add openpencil@zseven-openpencil
npm run configure-runtime -- /absolute/path/to/runtime
```

运行包须包含 `openpencil-runtime.json`、Rust Web 服务、对应版本的可编辑 WASM
和 CanvasKit。可以复用 DSH 插件的完整运行包，无需启动 DSH；只读 Web SDK 不能
代替编辑器。配置写入本机私有的 `~/.codex-openpencil/runtime.json`，不打包绝对
路径。启动前校验全部文件哈希、平台和版本，不自动下载运行包。

安装或更新后重新连接插件或新建聊天，然后提出：

> 打开这个聊天的 OpenPencil 交互画布。

`open_canvas` 提供 MCP Apps UI 资源和 Codex 聊天入口。不支持 MCP Apps 的客户端
可打开返回的本地 `panelUrl`。每个聊天拥有独立 Rust 服务与一份文档；插件关闭后
服务退出。恢复草稿保留在 `~/.codex-openpencil/sessions/`，可在新聊天重新打开。

保存前同步浏览器修改，源文件被外部改动时停止保存；另存为不覆盖已有文件。
打开已有文件时先复制到独立会话，所有后续原生工具统一指向托管画布。

## 选中元素后用提示词修改

在画布中选择一个或多个元素，再在 Codex 聊天中提出修改要求，例如：

> 把选中的卡片改成深色，标题放大，其他元素保持原样。

插件通过 `canvas_selection` 读取选中元素，修改范围限定为这些元素及其子节点。
也可使用画布底部的修改输入框：支持消息桥接的宿主显示“发送给 Codex”；
独立浏览器显示“复制修改请求”，复制后粘贴到当前 Codex 聊天发送。
请求固定提交时的文件、页面和元素 ID，后续切换选区不会换目标；
未选中、选区变化或同步未完成时停止提交，发送失败时保留提示词。

## 连接已有桌面编辑器

在 Rust OpenPencil 的 Agent Settings 中开启 MCP，运行 `npm run doctor`。
尚未打开托管画布时，桥接读取 `~/.openpencil/.op-mcp-port` 并核验实例标识；
打开后改为连接自有 Rust 服务。写操作超时不会自动重试。

如果已有手动配置的 `mcp_servers.openpencil`，可能看到两套工具；先验证插件，
再按需移除旧配置。安装不会自动删除其他配置。

## 验证

```sh
npm run check
npm test
npm run smoke -- --binary /path/to/openpencil-desktop
npm run canvas-smoke
npm run selection-smoke -- --runtime /absolute/path/to/runtime --output /absolute/evidence-dir
npm run canvas-smoke -- --hold
```

验证使用独立文档，不修改日常画布。浏览器实际编辑与保存、Codex 原生资源加载、
桌面宿主内嵌 UI 呈现分别记录，见[验证记录](docs/validation.md)。
尚未提交或上架 OpenAI 公共插件目录。

完整说明见 [English README](README.md) 和[架构说明](docs/architecture.md)。
