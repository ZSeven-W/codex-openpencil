# Codex OpenPencil

让 Codex 通过本地 Rust OpenPencil 编辑器创建、检查、预览和保存可编辑的 `.op` 设计。

首版包含完整插件包装、动态端口发现、MCP 协议桥接、连接诊断和设计技能。
设计引擎和工具实现复用 OpenPencil 主项目。

## 安装

需要本地 Node.js 22+、支持插件市场的新版 Codex，以及开启 MCP 的 Rust OpenPencil。

```sh
git clone git@github.com:ZSeven-W/codex-openpencil.git
cd codex-openpencil
codex plugin marketplace add .
codex plugin add openpencil@zseven-openpencil
npm run doctor
```

安装后重新连接插件或新建聊天，让技能和 MCP 工具载入。没有 `plugin add`
命令的桌面客户端，可以在插件目录中选择这个本地来源进行安装。

在 OpenPencil 的 Agent Settings 中开启 MCP。桥接会读取
`~/.openpencil/.op-mcp-port` 并核验实例标识，不写死本机端口，也不会自动启动
或停止编辑器。若启动聊天时编辑器未运行，请启动后重新连接插件。

可直接提出：

> 用 OpenPencil 做一个单页仪表盘，检查布局，展示 PNG 预览，并保存为项目中的新 .op 文件。

技能包含一页/多页选择、原文内容保留、脚本创建、已有节点修改、截图检查和保存后重读。
MCP 连接不重复执行超时的写操作，避免一次编辑被应用两次。

## 当前范围

- 通过原生 MCP 工具操作可编辑的矢量设计。
- 在聊天中返回原生 PNG 图片预览。
- 通过实际实例标识避免陈旧端口误连接。
- 尚未实现 DSH 的聊天内嵌交互画布和托管编辑器卡片。
- 尚未提交或上架 OpenAI 公共插件目录。

如果已有手动配置的 `mcp_servers.openpencil`，安装后可能看到两套工具。
先验证插件，再按需移除旧的手动配置；安装不会自动删除它。

## 验证

```sh
npm run check
npm test
npm run smoke -- --binary /path/to/openpencil-desktop
```

端到端验证启动独立文件服务，覆盖握手、工具发现、创建、读取、布局、lint、
PNG 渲染、保存和重新打开。输出位于忽略的 `artifacts/` 目录，不修改日常使用的画布。

完整说明见 [English README](README.md) 和 [架构说明](docs/architecture.md)。
