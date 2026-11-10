<div align="center">

# Wylon for Toonflow

**在 Toonflow 画布中使用 Qwen 图片生成与 MiniMax H3 视频生成。**

[English](README.md) · [简体中文](README.zh-CN.md)

[![版本](https://img.shields.io/badge/version-0.2.0-blue)](CHANGELOG.zh-CN.md)
[![Toonflow](https://img.shields.io/badge/Toonflow-2.0.10-7c3aed)](https://github.com/HBAI-Ltd/Toonflow-app/tree/v2.0.10)
[![MIT 许可证](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/wylon-cloud/toonflow-wylon?style=flat)](https://github.com/wylon-cloud/toonflow-wylon/stargazers)
[![最近提交](https://img.shields.io/github/last-commit/wylon-cloud/toonflow-wylon)](https://github.com/wylon-cloud/toonflow-wylon/commits/main)

[快速开始](#-快速开始) · [使用指南](docs/USAGE.zh-CN.md) · [Wylon](https://wylon.cn) · [问题反馈](https://github.com/wylon-cloud/toonflow-wylon/issues)

</div>

为 [Toonflow](https://github.com/HBAI-Ltd/Toonflow-app) 提供的独立单文件供应商。导入 `wylon.ts`，在宿主中配置 Wylon API Key，即可结合现有画布素材生成图片和视频。无需安装 ComfyUI、配置 npm 或构建供应商。

- 🎨 **Qwen 图片：**支持精确尺寸，以及同步或异步文生图。
- 🎬 **H3 视频：**支持文本、首尾帧，以及图片、视频、音频混合参考。
- 🔊 **保留音轨：**下载的 MP4 保留生成视频的原生音轨。
- 🔄 **任务恢复：**等待或下载失败后，可继续恢复已接单的任务。

## 🧩 选择适合你的集成

| 项目 | 适用场景 | 所需环境 |
| --- | --- | --- |
| **[Toonflow-Wylon](https://github.com/wylon-cloud/toonflow-wylon)**（本仓库） | 在 Toonflow 中生成图片和视频 | Toonflow **2.0.10** + `wylon.ts` |
| **[ComfyUI-Wylon](https://github.com/wylon-cloud/comfyui-wylon)** | 原生 Python 节点，提供 IMAGE/VIDEO 输出与 AUDIO 参考 | ComfyUI **0.44.0** |
| **[Wylon ComfyTV 工作流](https://github.com/wylon-cloud/comfyui-wylon/tree/main/comfytv-workflows)**（可选） | 直接导入使用的 ComfyTV 工作流 | 同一服务器上的 ComfyUI-Wylon + ComfyTV **1.13.1** |

各集成均使用你的 Wylon API Key。ComfyTV 工作流属于 ComfyUI 项目，单独打包。

### 支持平台

| 平台 | 安装方式 |
| --- | --- |
| 🪟 **Windows 10/11 x64** | 在 Windows Toonflow 客户端导入相同的 `wylon.ts` |
| 🍎 **macOS** | 在 macOS Toonflow 客户端导入 `wylon.ts` |

## 🚀 快速开始

宿主：**Toonflow 2.0.10**。需要 [Wylon](https://wylon.cn) API Key，并能访问 `https://api.wylon.cn/v1` 及其返回的 HTTPS 媒体地址。新建生成任务可能产生 Wylon 服务费用。

### 1. 下载并导入

从 `main` 下载 **[`wylon.ts`](https://raw.githubusercontent.com/wylon-cloud/toonflow-wylon/main/wylon.ts)**，保存为 TypeScript 文件。也可执行：

```sh
curl -fL https://raw.githubusercontent.com/wylon-cloud/toonflow-wylon/main/wylon.ts -o wylon.ts
```

**Windows PowerShell** 使用：

```powershell
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/wylon-cloud/toonflow-wylon/main/wylon.ts' -OutFile 'wylon.ts'
```

打开 Toonflow 设置，通过**供应商文件导入**功能选择 `wylon.ts`。确认供应商 ID 为 `wylon`，并显示四个内置模型。请选择源码文件本身，不要选择 ZIP 或编译后的 JavaScript。

### 2. 配置密钥

打开导入的 **Wylon** 供应商凭据设置，填写 **Wylon API Key** 并保存。凭据由 Toonflow 管理存储；不要将密钥写入提示词、源码或导出的工作流。

### 3. 生成第一张图片

添加图片生成节点，选择 **Wylon → `Qwen/Qwen-Image-2.1`**，尺寸设为 `2048x2048`，输入：

> 日出时分的海边小书店，温暖光线，手绘插画，无文字。

启动一次生成并打开生成资源。首次生成视频可选择 **`MiniMaxAI/MiniMax-H3`**，输入文本提示词，设置为 **5 秒 / 768p / 16:9**。参考素材示例与任务恢复见[使用指南](docs/USAGE.zh-CN.md)。

## 🎛️ 模型与限制

| 模型 | 支持的输入 | 输出及主要限制 |
| --- | --- | --- |
| `Qwen/Qwen-Image-2512` | 文本提示词 | 一张 PNG；模型对应精确尺寸或 `server_default`；异步/同步 |
| `Qwen/Qwen-Image-2.1` | 文本提示词 | 一张 PNG；模型对应精确尺寸或 `server_default`；异步/同步 |
| `MiniMaxAI/MiniMax-H3` | 文本、首帧、尾帧或首尾帧 | 整数 5–15 秒，768p |
| `MiniMaxAI/MiniMax-H3-Ref2VA` | 图片/视频参考，可搭配音频 | 最多 **9 张图片 + 3 个视频 URL + 3 段音频**；整数 5–15 秒，768p |

Qwen 接口**仅支持文生图**，不支持参考图片、蒙版或仅宽高比请求；Wylon V1 会添加服务端水印。Ref2VA 必须至少包含一张图片或一段视频，不接受纯音频请求。

**参考视频必须是公网 HTTPS URL。** 在 Ref2VA 设置的 **Reference video URLs / 参考视频 URL（每行一个）** 中逐行粘贴地址。不支持本地文件、binary/base64 视频，也不会自动上传。图片和音频可连接原生输入节点。音频使用 WAV/MP3；Toonflow 提取音轨默认得到 **M4A**，需要先转换格式。

原版 Toonflow 2.0.10 可使用 `<Picture 1>`、`<Video 1>`、`<Audio 1>` 等显式参考标签。原生 `{{ref N}}` / @ 选择器需要[可选的版本校验宿主补丁](docs/USAGE.zh-CN.md#可选原生引用选择器补丁)。完整尺寸、比例、媒体限制及高级参数见[使用指南](docs/USAGE.zh-CN.md)。

## 🔄 恢复与帮助

Toonflow 已保存接单任务，但等待或下载失败时，**应在结果有效期内恢复原任务**。恢复只查询已有任务，不会重新提交生成。取消只停止本地等待，不代表取消云端任务或退款。详见[恢复与故障排除](docs/USAGE.zh-CN.md#恢复与故障排除)。

- **问题与功能建议：**[GitHub Issues](https://github.com/wylon-cloud/toonflow-wylon/issues)。
- **敏感报告：**参阅 [SECURITY.zh-CN.md](SECURITY.zh-CN.md)；公开报告中请勿附加密钥、完整签名 URL 或私密媒体。
- **参与贡献：**参阅[贡献指南](CONTRIBUTING.zh-CN.md)及[开发说明](docs/USAGE.zh-CN.md#开发与打包)。
- **服务文档：**[图片生成](https://portal.wylon.cn/zh/docs-generation-images.html) · [视频生成](https://portal.wylon.cn/zh/docs-generation-videos.html)。

## ⭐ 社区

<div align="center">

**访问计数** · [MoeCounter](https://github.com/journey-ad/Moe-Counter)

![访问计数](https://count.getloli.com/@Wylon-Dev.Toonflow-Wylon?theme=cat-girls-yay)

![Star History](https://api.star-history.com/svg?repos=wylon-cloud/toonflow-wylon&type=Date)

</div>

## 许可证

[MIT](LICENSE) · [第三方声明](THIRD_PARTY_NOTICES.md)
