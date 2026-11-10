<div align="center">

# Wylon for Toonflow

**Bring Qwen image generation and MiniMax H3 video generation into your Toonflow canvas.**

[English](README.md) · [简体中文](README.zh-CN.md)

[![Version](https://img.shields.io/badge/version-0.2.0-blue)](CHANGELOG.md)
[![Toonflow](https://img.shields.io/badge/Toonflow-2.0.10-7c3aed)](https://github.com/HBAI-Ltd/Toonflow-app/tree/v2.0.10)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/wylon-cloud/toonflow-wylon?style=flat)](https://github.com/wylon-cloud/toonflow-wylon/stargazers)
[![Last commit](https://img.shields.io/github/last-commit/wylon-cloud/toonflow-wylon)](https://github.com/wylon-cloud/toonflow-wylon/commits/main)

[Get started](#-quick-start) · [Usage guide](docs/USAGE.md) · [Wylon](https://wylon.cn) · [Issues](https://github.com/wylon-cloud/toonflow-wylon/issues)

</div>

A standalone, single-file provider for [Toonflow](https://github.com/HBAI-Ltd/Toonflow-app). Import `wylon.ts`, add your Wylon API key in the host, and generate images or videos alongside your existing canvas assets. No ComfyUI installation, npm setup or provider build is needed.

- 🎨 **Qwen images:** text-to-image with exact size controls and synchronous or asynchronous generation.
- 🎬 **H3 videos:** text, first/last frames, or mixed image/video/audio references.
- 🔊 **Sound included:** generated MP4 soundtracks stay inside the downloaded video.
- 🔄 **Task recovery:** resume an accepted generation after a waiting or download failure.

## 🧩 Choose your integration

| Package | Use it for | What you need |
| --- | --- | --- |
| **[Toonflow-Wylon](https://github.com/wylon-cloud/toonflow-wylon)** — this repository | Image and video generation in Toonflow | Toonflow **2.0.10** + `wylon.ts` |
| **[ComfyUI-Wylon](https://github.com/wylon-cloud/comfyui-wylon)** | Native Python nodes with IMAGE/VIDEO outputs and AUDIO references | ComfyUI **0.44.0** |
| **[Wylon ComfyTV workflows](https://github.com/wylon-cloud/comfyui-wylon/tree/main/comfytv-workflows)** — optional | Ready-to-import ComfyTV workflows | ComfyUI-Wylon + ComfyTV **1.13.1** on the same server |

Each integration uses your Wylon API key. The ComfyTV pack belongs to the ComfyUI project and is a separate package.

### Platforms

| Platform | Installation |
| --- | --- |
| 🪟 **Windows 10/11 x64** | Import the same `wylon.ts` into the Windows Toonflow client |
| 🍎 **macOS** | Import `wylon.ts` into the macOS Toonflow client |

## 🚀 Quick start

Host: **Toonflow 2.0.10**. You need a [Wylon](https://wylon.cn) API key and access to `https://api.wylon.cn/v1` and the HTTPS media URLs it returns. New generation tasks can incur Wylon service charges.

### 1. Download and import

Download **[`wylon.ts`](https://raw.githubusercontent.com/wylon-cloud/toonflow-wylon/main/wylon.ts)** from `main` and save it as a TypeScript file. Alternatively:

```sh
curl -fL https://raw.githubusercontent.com/wylon-cloud/toonflow-wylon/main/wylon.ts -o wylon.ts
```

On **Windows PowerShell**:

```powershell
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/wylon-cloud/toonflow-wylon/main/wylon.ts' -OutFile 'wylon.ts'
```

In Toonflow settings, use the **provider-file import** action and select `wylon.ts`. Confirm the provider ID is `wylon` and four bundled models are listed. Import the source file itself, rather than a ZIP or compiled JavaScript.

### 2. Configure credentials

Open the imported **Wylon** provider’s credentials, enter your **Wylon API Key**, and save. Toonflow manages credential storage; keep the key out of prompts, source files and exported workflows.

### 3. Make your first image

Add an image generation node, choose **Wylon → `Qwen/Qwen-Image-2.1`**, select `2048x2048`, and enter:

> A small seaside bookstore at sunrise, warm light, hand-painted illustration, no text.

Start generation once and open the resulting asset. For a first video, choose **`MiniMaxAI/MiniMax-H3`**, use a text prompt, and select **5 seconds / 768p / 16:9**. See the [usage guide](docs/USAGE.md) for reference examples and recovery.

## 🎛️ Models and limits

| Model | Supported input | Output / key constraints |
| --- | --- | --- |
| `Qwen/Qwen-Image-2512` | Text prompt | One PNG; exact model sizes or `server_default`; async/sync |
| `Qwen/Qwen-Image-2.1` | Text prompt | One PNG; exact model sizes or `server_default`; async/sync |
| `MiniMaxAI/MiniMax-H3` | Text, first frame, last frame, or both frames | 5–15 whole seconds, 768p |
| `MiniMaxAI/MiniMax-H3-Ref2VA` | Image/video references, optionally with audio | Up to **9 images + 3 video URLs + 3 audio clips**; 5–15 whole seconds, 768p |

The Qwen endpoints are **text-to-image only**: reference images, masks and ratio-only image requests are unsupported. Wylon V1 adds its service watermark. Ref2VA requires at least one image or video; audio alone is invalid.

**Reference videos must be public HTTPS URLs.** In Ref2VA settings, paste one URL per line into **Reference video URLs / 参考视频 URL（每行一个）**. Local files and binary/base64 video are unsupported, and the provider does not upload them. Images and audio can use native wired inputs. Use WAV/MP3 audio; Toonflow’s soundtrack extractor produces **M4A**, which must be converted first.

Stock Toonflow 2.0.10 supports explicit reference tags such as `<Picture 1>`, `<Video 1>` and `<Audio 1>`. Its native `{{ref N}}` / @ picker needs an [optional, version-guarded host patch](docs/USAGE.md#optional-native-reference-picker-patch). Supported ratios, exact sizes, media limits and advanced options are in the [full usage guide](docs/USAGE.md).

## 🔄 Recovery and help

If Toonflow has saved an accepted task but waiting or downloading fails, **resume that task while its result is available**. Recovery queries the existing task and does not submit another generation. Cancellation stops local waiting; it does not cancel or refund the remote task. See [recovery and troubleshooting](docs/USAGE.md#recovery-and-troubleshooting).

- **Bugs and feature requests:** [GitHub Issues](https://github.com/wylon-cloud/toonflow-wylon/issues).
- **Sensitive reports:** follow [SECURITY.md](SECURITY.md); omit credentials, complete signed URLs and private media from public reports.
- **Contributions:** read [CONTRIBUTING.md](CONTRIBUTING.md) and the [development guide](docs/USAGE.md#development-and-packaging).
- **Service documentation:** [image generation](https://portal.wylon.cn/zh/docs-generation-images.html) · [video generation](https://portal.wylon.cn/zh/docs-generation-videos.html).

## ⭐ Community

<div align="center">

**Page views** · [MoeCounter](https://github.com/journey-ad/Moe-Counter)

![Page views](https://count.getloli.com/@Wylon-Dev.Toonflow-Wylon?theme=cat-girls-yay)

![Star History](https://api.star-history.com/svg?repos=wylon-cloud/toonflow-wylon&type=Date)

</div>

## License

[MIT](LICENSE) · [Third-party notices](THIRD_PARTY_NOTICES.md)
