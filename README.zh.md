# Codex OpenPencil

v0.3.0 支持自动下载运行环境和首次启动验证。完整 Rust 编辑器、对应 WASM、
CanvasKit、字体与模板按当前系统和 CPU 安装，无需 DSH、Rust 编译器或独立桌面端。

## 一句话安装并开始设计

把这句话发给 Codex：

> 按照 https://github.com/ZSeven-W/codex-openpencil 的 INSTALL.md 帮我安装并配置 OpenPencil，打开可编辑画布，做一个单页手机任务管理 APP。

[安装指南](INSTALL.md) 会引导 Codex 检查前置依赖、安装插件、下载并校验运行包，
再通过独立文档验证真实编辑、保存与重新打开。新插件工具若需要重连才生效，
Codex 可先通过终端画布入口在当前聊天完成设计，并明确说明当前使用的入口。

需要本地 Node.js 22+、Git 和支持插件的新版本 Codex。安装过程不需要 GitHub
账号或 API Key。支持 macOS、Windows、Linux 的 ARM64 与 x64；Linux 需要 glibc
和 fontconfig / FreeType，具体系统要求见[兼容性表](INSTALL.md#supported-runtime-builds)。

手动安装也只需：

```sh
git clone https://github.com/ZSeven-W/codex-openpencil.git
cd codex-openpencil
npm run setup
```

首次 `open_canvas` 也会自动安装缺失的运行环境。安装前校验发布包 SHA-256，
启动前校验全部运行文件的哈希、平台与版本；失败下载不会写入有效配置。
已有的有效自定义运行环境会保留，配置异常时明确报错，不自动切换。
配置保存在私有的 `~/.codex-openpencil/runtime.json`。

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
