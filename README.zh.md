<p align="center">
  <img src="./plugins/openpencil/assets/icon.png" alt="OpenPencil" width="120" />
</p>

<h1 align="center">Codex OpenPencil</h1>

<p align="center">
  <strong>OpenPencil 的 Codex 插件 —— 在对话中创建、检查并修改可编辑的 <code>.op</code> 设计。</strong><br />
  <sub>一句话安装 &bull; 交互式画布 &bull; 选区提示词修改 &bull; 原生 Rust 引擎</sub>
</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README.zh.md"><b>简体中文</b></a>
</p>

<p align="center">
  <a href="https://github.com/ZSeven-W/codex-openpencil/releases/latest"><img src="https://img.shields.io/github/v/release/ZSeven-W/codex-openpencil?color=cfb537" alt="Release" /></a>
  <a href="https://github.com/ZSeven-W/codex-openpencil/actions/workflows/check.yml"><img src="https://img.shields.io/github/actions/workflow/status/ZSeven-W/codex-openpencil/check.yml?label=CI" alt="CI" /></a>
  <a href="./INSTALL.md"><img src="https://img.shields.io/badge/Node.js-22%2B-43853d?logo=node.js&amp;logoColor=white" alt="Node.js 22+" /></a>
  <a href="https://github.com/ZSeven-W/codex-openpencil/stargazers"><img src="https://img.shields.io/github/stars/ZSeven-W/codex-openpencil?style=flat&amp;color=cfb537" alt="Stars" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/ZSeven-W/codex-openpencil?color=64748b" alt="License" /></a>
  <a href="https://discord.gg/h9Fmyy6pVh"><img src="https://img.shields.io/badge/Discord-Join%20chat-5865F2?logo=discord&amp;logoColor=white" alt="Discord" /></a>
</p>

<p align="center">
  <a href="#一句话安装并开始设计">快速开始</a> · <a href="#为什么选择-codex-openpencil">功能特性</a> · <a href="#设计示例">设计示例</a> · <a href="./INSTALL.md">安装指南</a> · <a href="./docs/validation.md">验证记录</a>
</p>

<br />

<p align="center">
  <img src="./docs/images/fieldnotes-dashboard.png" alt="FIELDNOTES —— 用 Codex OpenPencil 创建的可编辑运营数据看板" width="100%" />
</p>
<p align="center"><sub>FIELDNOTES 桌面数据看板 —— 从可编辑 <code>.op</code> 文档原生渲染，已在设计实测中保存并重新打开。</sub></p>

## 一句话安装并开始设计

把这句话发给 Codex：

```text
按照 https://github.com/ZSeven-W/codex-openpencil 的 INSTALL.md 帮我安装并配置 OpenPencil，打开可编辑画布，做一个单页手机任务管理 APP。
```

[INSTALL.md](./INSTALL.md) 会引导 Codex 检查依赖、安装插件、验证运行环境、打开画布，并完成第一份设计。安装过程按系统和 CPU 下载完整 Rust 编辑器、对应 WASM、CanvasKit、字体与模板，先验证真实编辑、保存和重新打开，再注册插件。

需要 **Node.js 22+、Git 和支持插件的新版本本地 Codex**。安装本插件不需要 GitHub 账号、API Key、DSH、Rust 编译器、独立 OpenPencil 桌面端，也不需要安装 npm 依赖。

也可以手动安装：

```sh
git clone https://github.com/ZSeven-W/codex-openpencil.git
cd codex-openpencil
npm run setup
```

请保留这个仓库目录。安装脚本将其注册为本地插件市场，安装 `openpencil@zseven-openpencil`。新插件可能需要重新连接或新建聊天才能加载工具；[终端画布入口](./INSTALL.md#instructions-for-the-installing-agent) 可让 Codex 在安装时的聊天中直接完成第一份设计。

安装还会通过 Codex 的真实插件加载器检查工具，并私下记录当前 Node 可执行文件路径，解决桌面端 PATH 与终端不同导致的启动失败。可运行 `npm run host-check` 诊断加载状态；它不会新建聊天或修改设计。

| 平台 | 运行包 | 系统要求 |
| --- | --- | --- |
| macOS | Apple Silicon、Intel | 基于 macOS 15 原生 runner 构建 |
| Windows | ARM64、x64 | 对应架构的 Microsoft Visual C++ v14 运行库 |
| Linux | ARM64、x64 | glibc、fontconfig 和 FreeType；ARM64 为 Ubuntu 24.04+，x64 为 22.04+ |

完整要求见[兼容性表与依赖说明](./INSTALL.md#supported-runtime-builds)。六种系统与 CPU 组合均通过空配置安装和原生编辑、保存、重开验证；[验证记录](./docs/validation.md) 分别说明应用安装、系统依赖和宿主内嵌 UI 的验证范围。

## 为什么选择 Codex OpenPencil

Codex OpenPencil 将 Codex 连接到本地 Rust [OpenPencil](https://github.com/ZSeven-W/openpencil) 引擎，生成带有真实图层、文字、形状与布局的可编辑矢量文档。

<table>
<tr>
<td width="50%" valign="top">

### 🎨 提示词 → 画布

描述一个数据看板、手机页面或品牌落地页，Codex 通过原生设计节点创建和修改内容，检查布局、渲染预览，再保存成稿。

</td>
<td width="50%" valign="top">

### ✏️ 交互式编辑

选择图层、平移缩放、编辑文字、绘制形状与撤销操作。鼠标操作和 Codex 工具在同一个托管 Rust 编辑器中修改同一份文档。

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🎯 选中 → 修改

选中一个或多个元素，再描述修改要求。请求固定提交时的页面和节点 ID，即使后续更换选区，修改目标仍是原来的元素及其子节点。

</td>
<td width="50%" valign="top">

### 📦 自动安装运行环境

按需下载 macOS、Windows 或 Linux 的 ARM64 / x64 运行包，使用前验证压缩包和全部文件哈希，保留已有的有效自定义运行环境。

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 💾 可编辑文件与恢复

保存为可迁移的 `.op` 文件，随时重新打开。每个聊天拥有独立画布和恢复草稿，源文件冲突检查与另存为保护已有文件。

</td>
<td width="50%" valign="top">

### 🌗 跟随工作区外观

面板和编辑器跟随宿主的深浅主题，切换时无需重新加载文档。手机设计使用 Rust 引擎提供的标准状态栏。

</td>
</tr>
</table>

## 在 Codex 中设计

### 1. 打开画布

安装并完成必要的重连后，提出：

> 打开这个聊天的 OpenPencil 交互画布，为一个小型设计工作室做单页数据看板。

`open_canvas` 启动独立的托管 Rust 编辑器。Codex 验证连接后，按内置 `openpencil-design` 工作流创建、检查、预览并保存设计。另一份文档使用另一个聊天；打开已有 `.op` 文件时，会先复制到当前独立会话。

### 2. 选中元素，用提示词修改

在画布中选择卡片或标题，然后告诉 Codex：

> 把选中的卡片改成深绿色，标题放大，其他元素保持原样。

在画布中选中元素，然后直接在当前 Codex 聊天描述修改。Codex 通过 `canvas_selection` 读取当前页面和选中节点，将修改限定在这些子树内。无需复制请求或元素 ID。

支持直接发送消息的宿主还会显示折叠的**在画布内提要求**快捷入口，展开后点击**修改选中内容**提交。请求固定提交时的选区，分别显示已提交、正在修改、已完成；完成必须由 Codex 检查预览、保存当前设计后报告。空选区或失效选区会阻止提交，发送失败保留输入内容。

### 3. 预览、保存与重开

> 检查布局，给我看预览，把这份设计保存成项目里的 .op 文件。

设计工作流检查原生布局和实际渲染的 PNG，保存后读取结果验证。面板的**保存**按钮先同步尚未写入的浏览器修改；源文件被外部改动时停止覆盖，**另存为**拒绝覆盖已有目标。恢复草稿保留在 `~/.codex-openpencil/sessions/`。

## 设计示例

以下单页示例均通过原生 OpenPencil 工具创建并经过视觉检查。数据看板和品牌落地页来自三个案例的设计实测，手机任务页来自 v0.3.0 首次使用测试；均已保存并重新打开，展示图片是可编辑文档的原生渲染结果。

<table>
<tr>
<td width="72%" align="center" valign="top">
  <img src="./docs/images/form-field-landing.png" alt="FORM &amp; FIELD —— 设计工作室单页品牌落地页" width="100%" />
  <br /><strong>FORM &amp; FIELD</strong><br /><sub>品牌落地页 · 编辑式排版与矢量图形</sub>
</td>
<td width="28%" align="center" valign="top">
  <img src="./docs/images/task-app.png" alt="带原生状态栏、专注卡片、任务列表和添加按钮的手机任务 APP" width="100%" />
  <br /><strong>A little less busy.</strong><br /><sub>手机任务页 · 原生状态栏与可编辑任务卡片</sub>
</td>
</tr>
</table>

## 进阶配置

<details>
<summary><strong>运行环境配置与更新</strong></summary>

首次使用 `open_canvas` 也会自动安装缺失的运行环境。私有配置保存在 `~/.codex-openpencil/runtime.json`，下载的二进制与本机路径独立于插件包。下载失败不会激活不完整的运行环境，已有配置异常时会明确报错。

如需选择自定义完整运行环境：

```sh
npm run configure-runtime -- /absolute/path/to/runtime
```

更新前检查仓库本地改动，拉取发布的更新后再次运行 `npm run setup`，然后重新连接插件。有效的自定义环境会保留，托管环境升级中断时也保留之前的配置。详见[修复与更新说明](./INSTALL.md#repair-update-and-manual-runtime)。

</details>

<details>
<summary><strong>连接已有桌面编辑器</strong></summary>

在 Rust OpenPencil 的 Agent Settings 中开启 MCP，再运行：

```sh
npm run doctor
# 显式检查一个独立端点：
npm run doctor -- --port 3100
```

尚未打开托管画布时，桥接读取 `~/.openpencil/.op-mcp-port`，核验服务身份和实例令牌后转发到本地 `/mcp`，拒绝过期记录、无关服务和旧 REST 端点。打开托管画布后，所有原生工具统一指向自有 Rust 服务，包括受保护的 `save_document`。失败的写操作不会自动重试。

桌面编辑器离线时仍可发现画布控制工具；启动编辑器后重新连接可刷新原生工具列表。可用 `OPENPENCIL_MCP_PORT` 或 `--port PORT` 指定本地端口。已有的直接 MCP 配置可能显示重复工具，安装不会删除其他设置。

</details>

<details>
<summary><strong>宿主兼容性与当前限制</strong></summary>

`open_canvas` 提供 MCP Apps 资源和 Codex 聊天入口。不支持 MCP Apps UI 的宿主可打开返回的本地 `panelUrl`。地址临时有效；插件关闭后仅停止自己的 Rust 服务，恢复草稿继续保留。

MCP Apps 使用宿主初始主题和实时主题通知；独立面板使用 `prefers-color-scheme`，Codex 内置浏览器会传入当前应用主题。

原生资源加载、浏览器交互、Codex 内嵌 UI 呈现和自动 `ui/message` 后续消息投递分别验证。真实宿主内嵌呈现与自动消息投递仍待验证，独立面板默认在当前 Codex 聊天描述修改。详见[验证证据与剩余检查](./docs/validation.md)。

插件通过公开 GitHub 仓库和 Releases 分发，尚未提交或上架 OpenAI 公共插件目录。

</details>

## 开发与验证

```sh
npm run check
npm test
# 原生功能或运行环境变更还需执行相关独立验证：
npm run smoke -- --binary /path/to/openpencil-desktop
npm run canvas-smoke
npm run selection-smoke -- --runtime /absolute/path/to/runtime --output /absolute/evidence-dir
npm run mobile-smoke -- --runtime /absolute/path/to/runtime --output /absolute/evidence-dir
# 保持独立画布开启，供交互验证：
npm run canvas-smoke -- --hold
```

验证使用独立文档和 Rust 服务，输出保存在忽略的 `artifacts/` 目录，仅关闭自己的进程。CI 在 Linux、macOS、Windows 上使用 Node.js 22/24 检查打包与协议行为；原生验证需要完整的兼容运行环境。

```text
codex-openpencil/
├── .agents/plugins/          本地插件市场注册
├── plugins/openpencil/      可分发的 Codex 插件
│   ├── plugin.json          插件身份、品牌与能力
│   ├── mcp.json             无运行依赖的 Node.js stdio 桥接
│   ├── scripts/             运行环境安装、会话与画布路由
│   ├── ui/                  MCP Apps 包装与交互画布面板
│   └── skills/              安装诊断与设计工作流
├── scripts/                 安装、打包与原生验证脚本
├── tests/                   协议、选区、主题与安装回归
├── docs/                    架构、验证记录与设计预览
└── INSTALL.md               面向 Agent 的一句话安装指南
```

修改插件后运行 `codex plugin add openpencil@zseven-openpencil` 重新安装，再重新连接以刷新缓存。进程归属、持久化与 UI 协议见[架构说明](./docs/architecture.md)。

## 生态

Codex OpenPencil 是 **[OpenPencil](https://github.com/ZSeven-W/openpencil)** 的 Codex 集成，属于 **[ZSeven-W](https://github.com/ZSeven-W)** AI 工具家族。

| 项目 | 用途 |
| --- | --- |
| **[OpenPencil](https://github.com/ZSeven-W/openpencil)** | 本插件使用的 Rust 矢量设计引擎，提供可编辑文档、布局、渲染和原生 MCP 工具。 |
| **[DSH OpenPencil](https://github.com/ZSeven-W/dsh-openpencil)** | 兄弟 DeepSeek Harness 集成，在 DSH 内提供精确预览、交互画布与托管编辑器。 |
| **[agent-rs](https://github.com/ZSeven-W/agent-rs)** | 异步 Rust Agent 运行时，支持模型提供商、工具执行、权限和 MCP。 |
| **[jian](https://github.com/ZSeven-W/jian)** | OpenPencil 使用的 GPU-Skia Rust UI 框架。 |
| **[Zode](https://github.com/ZSeven-W/zode)** | 面向终端的开源 AI 编程助手。 |
| **[noema](https://github.com/ZSeven-W/noema)** | 本地优先、以可检查文件保存的 Agent 记忆系统。 |
| **[openpencil-skill](https://github.com/ZSeven-W/openpencil-skill)** | 教 Agent 使用 `op` CLI 设计的配套技能。 |

## 参与贡献

欢迎贡献！创建分支，运行 `npm run check` 和 `npm test`，使用 [Conventional Commits](https://www.conventionalcommits.org/) 提交，并向 `main` 发起 PR。运行环境变更还需要相关原生验证。Rust 引擎改动请提交到 [OpenPencil](https://github.com/ZSeven-W/openpencil)；本仓库负责 Codex 插件打包、桥接、画布集成与工作流。

## 社区

**[加入 Discord](https://discord.gg/h9Fmyy6pVh)** —— 提问、分享设计、提出功能建议。

## 许可证

[MIT](./LICENSE) —— Copyright (c) 2026 ZSeven-W。第三方归属见 [NOTICE](./NOTICE)。这是独立维护的 OpenPencil 集成，并非 OpenAI 官方开发的插件。
