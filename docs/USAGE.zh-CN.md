# Toonflow-Wylon 使用指南

[返回 README](../README.zh-CN.md) · [English](USAGE.md)

本指南介绍用于 **Toonflow 2.0.10** 的 `wylon.ts` 内置四个模型。账户刷新列表中出现的其他模型不会自动获得支持。适配器使用宿主注入的 SDK 类型及工具，无本地导入、构建产物或 Bun 运行时依赖。

## 图片生成

选择 `Qwen/Qwen-Image-2512` 或 `Qwen/Qwen-Image-2.1`，输入文本提示词，选择精确尺寸或 `server_default`。

| 模型 | 精确尺寸（宽 × 高） |
| --- | --- |
| `Qwen/Qwen-Image-2512` | `1328x1328`、`1664x928`、`928x1664`、`1104x1472`、`1584x1056` |
| `Qwen/Qwen-Image-2.1` | `1536x2752`、`1696x2528`、`1792x2400`、`2048x2048`、`2400x1792`、`2528x1696`、`2752x1536` |

- `server_default` 表示省略 API 请求中的尺寸。选择精确尺寸或 `server_default` 后，忽略 Toonflow 附带的通用图片比例元数据。
- 两个模型均可在表单中选择异步或同步生成。V1 返回一张 PNG，并带有服务端水印。
- 这些图片接口仅接受文本。参考图片、蒙版和仅宽高比请求会校验失败。
- 两种模式均可使用负向提示词。种子 `-1` 表示省略；同步模式始终不发送种子。

示例：选择 Qwen-Image-2.1、`2048x2048`、异步模式，输入“日出时分的海边小书店，温暖光线，手绘插画，无文字”。

## 视频生成

| 模式 | 模型及输入 | 提示词示例 |
| --- | --- | --- |
| 文生视频 | H3，无帧输入 | 一只纸船漂过平静池塘，镜头缓慢移动。 |
| 帧动画 | H3，专用首帧/尾帧输入 | 从首帧开始，平滑展现尾帧中的场景。 |
| 混合参考 | Ref2VA，图片/视频参考，可附加音频 | 保持 `<Picture 1>` 的角色，参考 `<Video 1>` 的运动，以 `<Audio 1>` 作为音频参考。 |

`MiniMaxAI/MiniMax-H3` 支持文本、首帧、尾帧或首尾帧生成。专用帧输入与参考数组不可互换。`MiniMaxAI/MiniMax-H3-Ref2VA` 用于参考生成，必须至少包含一张图片或一段视频，最多 **9 张图片、3 段视频、3 段音频**。纯音频请求会在创建任务前失败。

视频均采用异步生成，输出为 **整数 5–15 秒、768p**。API 支持 `21:9`、`16:9`、`4:3`、`1:1`、`3:4`、`9:16`。`server_default` 省略比例；`adaptive` 同样省略比例，仅用于至少有一帧输入的 H3。

Toonflow 2.0.10 的视频比例菜单固定为 `16:9`、`9:16`、`1:1`、`4:3`、`3:4`。适配器接受程序传入的 `21:9` 和符合条件的 `adaptive`，但此图形界面无法选择这两项。

## 参考媒体

### 图片

支持 SDK URL、base64 和 binary 图片输入，**每张最大 30 MiB**。每边尺寸须为 **300–5760 像素**，宽高比为 **0.4–2.5**。

远程图片在创建任务前通过宿主 fetch 工具限量流式读取，可取消，超时为 120 秒。请求拒绝重定向，不携带 Authorization、Cookie 或 Referrer。宿主图片检查器接收已读取字节进行校验，再向 Wylon 提交原始已验证公网 HTTPS URL；后续内容及可访问性仍由服务端验证。

### 视频 URL

参考视频必须已有**公网 HTTPS URL**。在 Ref2VA 设置中使用 **Reference video URLs / 参考视频 URL（每行一个）**（`reference_video_urls`），每行一条。适配器不会上传文件。

不要连接本地视频节点：Toonflow 2.0.10 会读取工作区视频并转成 base64，适配器会拒绝此输入。本地素材需先自行托管。不支持 binary/base64 视频、本地文件、localhost、字面私有 IP、带用户名密码的 URL 或非 HTTPS 协议。

手动 URL 排在程序传入的 SDK URL 视频之后，合计最多三段。按提交顺序使用 `<Video 1>`、`<Video 2>`、`<Video 3>`。手动 URL 不会创建画布参考选择项。签名 URL 必须在 Wylon 读取时仍有效；过期后应从来源获取新地址。

服务端要求为 **MP4/MOV、最大 50 MB、单段 2–15 秒、总时长最多 15 秒**。远程文件大小/时长、参考视频尺寸/帧率及编码适配性由服务端验证；适配器不会下载并完整解码输入视频。

URL 校验拒绝本地名称及字面私有地址，包括末尾带点的绝对 DNS 名称。域名解析及网络访问控制由宿主与服务端负责；此校验不能防止 DNS 重绑定。

### 音频

支持公网 HTTPS URL 或 WAV/MP3 内存输入，**每个内存输入最大 15 MiB**。可解析的内存 WAV 须为**单段 2–15 秒、总时长最多 15 秒**。压缩音频及远程音频的大小/时长由服务端验证；服务端音频时长限制同样为单段 2–15 秒、总计最多 15 秒。

**Toonflow 原生音轨提取输出 M4A，连接前须先转换为 API 支持的 WAV/MP3。** Ref2VA 仍需同时提供图片或视频。图片和音频可连接原生输入；视频使用上述 URL 字段。

## 参考标签与画布顺序

原版 Toonflow 2.0.10 使用显式 H3 标签：`<Picture N>`、`<Video N>`、`<Audio N>`。各类素材独立编号，对应实际提交数组；首尾帧标记转换为“首帧/尾帧”。已有显式标签保持原样。

当宿主提供顶层 `referenceOrder` 元数据时，适配器会按画布顺序转换 Toonflow 的 `{{ref N}}`，支持不同媒体交错排列。缺少映射或素材时，在创建任务前失败；适配器不会猜测画布顺序或冒用内置供应商 ID。

原版 2.0.10 只对内置供应商白名单转发 `referenceOrder`，不包含 Wylon。因此请使用显式标签，或应用下方可选补丁，让连接的图片/音频可使用原生 @ 选择器。手动视频 URL 仍需显式 `<Video N>` 标签。

标签语法依据 [H3 上游文档](https://huggingface.co/docs/diffusers/main/en/api/pipelines/minimax_h3)。Wylon 未说明参考视频内嵌音频是否影响独立音频编号。具体参考效果及编号组合行为仍由模型决定。

## 高级请求参数

模型表单提供负向提示词、种子及**高级 JSON**（`extra_parameters`）。仅允许白名单字段；未知字段及结构性覆盖会校验失败。

| 媒体 | 允许的高级字段 |
| --- | --- |
| 图片 | `output_compression`、`background`、`quality`、`style`、`user`、`user_id`、`moderation`、`stream`（仅 `false`）、`partial_images`（仅 `0`） |
| 仅同步图片 | `response_format`：`url` 或 `b64_json` |
| 视频 | `safety_identifier`、`execution_expires_after`（正整数） |

部分兼容字段在 Wylon V1 不生效。安全标识不要包含直接身份信息。内联 base64 图片结果直接解码为二进制资源，无须再次下载，**解码后上限 50 MiB**。仅同步图片接口允许最大 **96 MiB** 的 JSON 响应。

## 恢复与故障排除

创建 POST **只发送一次**，不会自动重试 POST。接单后先保存任务 ID、模型及媒体类型，再开始轮询。恢复数据不含密钥、提示词、媒体或签名 URL。恢复仅查询原任务；每次轮询都检查响应任务 ID 和媒体类型。

| 情况 | 处理方法 |
| --- | --- |
| 导入失败 | 确认 Toonflow 2.0.10，并导入源码 `wylon.ts`，不要选择 ZIP 或编译后的 JavaScript。 |
| 鉴权失败 | 在宿主凭据界面检查 Wylon 密钥及账户权限，切勿把密钥贴到 Issue。 |
| 参考素材校验失败 | 检查媒体限制；将连接的本地视频改为 URL 字段；原版宿主使用显式标签。 |
| 已接单任务停止等待或下载 | 在结果有效期内恢复已保存任务，不要重新生成来恢复结果。 |
| 视频超过下载上限 | 适配器执行受支持宿主的 100 MiB 持久化上限。恢复可重试原任务，但无法绕过此限制。 |

轮询间隔从 **1 秒退避至 10 秒**，总预算为 **15 分钟**，包括查询超时、GET 重试及等待。每次 HTTP 请求最长超时 **120 秒**；剩余轮询预算更短时，以剩余时间为限。GET 最多尝试三次并退避。及时成功查询后的结果下载使用独立的请求超时。

失败、取消或过期任务会停止等待；成功任务仍需等待结果文件可用。下载上限为**图片 50 MiB / 视频 100 MiB**，与 Toonflow 2.0.10 的 100 MiB 持久化上限一致。声明长度超限时读取前拒绝；没有长度信息的流式响应同样限量。MP4 音轨保留。

取消只中断本地等待，不取消云端任务或退款。创建响应不明确时，不应自动再次发送 POST；先检查宿主已有任务信息，再决定是否创建新生成。

## 凭据与网络传输

通过供应商凭据界面配置密钥，由宿主管理存储。API 鉴权只发往固定的 `https://api.wylon.cn/v1`。结果下载拒绝重定向，不携带 Authorization、Cookie 或 Referrer；二进制资源由 Toonflow 保存。密钥不要写入提示词、导出工作流或供应商源码。敏感报告参阅 [SECURITY.zh-CN.md](../SECURITY.zh-CN.md)。

## 可选原生引用选择器补丁

附带的 [`toonflow-v2.0.10-reference-order.patch`](../compat/toonflow-v2.0.10-reference-order.patch) 仅在 `apps/server/src/utils/media/generation.ts` 的 `prepareRequest` 白名单中添加 `wylon`，保留宿主校验。这是独立于供应商导入的可选**宿主源码修改**。显式原生标签无需补丁即可使用；打包二进制安装需要兼容的上游版本或源码构建。

仅对明确选定的 **v2.0.10 Git 源码目录**，安装 Python 3 与 Git 后，在本供应商仓库中执行：

```sh
python3 compat/apply-reference-order-patch.py --host-root "/absolute/path/to/Toonflow-app"
```

Windows PowerShell 使用 `python compat/apply-reference-order-patch.py --host-root 'C:\Projects\Toonflow-app'`。脚本支持含空格路径，并保留 CRLF/LF 换行和已有 BOM。该步骤需要带标签的源码检出与 Git；普通桌面安装导入供应商不需要 Python 或此补丁。

脚本要求 HEAD 上有 `v2.0.10` 标签，且源码行与预期完全一致；源码有歧义/变化或备份冲突时拒绝修改，重复执行安全。它保留源码权限，写入 `generation.ts.wylon-reference-order.bak`，只打印路径。应用后重启宿主后端。撤销时使用备份覆盖 `generation.ts` 并重启。

源码依据：[GUI 引用路径](https://github.com/HBAI-Ltd/Toonflow-app/blob/v2.0.10/packages/nodes/videoGenerationNode/src/index.vue#L242) · [后端引用转换与白名单](https://github.com/HBAI-Ltd/Toonflow-app/blob/v2.0.10/apps/server/src/utils/media/generation.ts#L84)。

## 更新与卸载

更新前保留旧版供应商文件，并按 Toonflow 正常流程备份工作区。以相同供应商 ID 重新导入新版 `wylon.ts`，核对模型及设置，保留已保存任务和媒体。生成进行中避免更新供应商或修改宿主源码。

通过宿主删除供应商。凭据使用宿主管理功能单独处理，保留仍需使用的工作区及媒体文件。删除兼容工具前，先用备份撤销可选宿主补丁。

## 开发与打包

开发需要 **Node 22.23.x**、npm、**Python 3.9+** 与 Git。在仓库根目录执行：

```sh
npm ci --ignore-scripts
npm run typecheck
npm run package
```

启动器在 macOS 使用 `python3`、Windows 使用 `python`，可用 `PYTHON` 指定 Python 3 可执行文件路径。普通安装仅导入 `wylon.ts`，无须单独安装 Python 或 Node。

`types/provider.d.ts` 是用于本地开发的手写 **v2.0.10 契约子集**，实际导入单文件供应商时由 Toonflow 注入真实 SDK。宿主字段及 `MEDIA_TASK_FAILED` 保持上游拼写。新 Wylon 恢复记录使用 version 2 与 `task_id`，旧版 version 1 的 `taskId` 继续兼容。

`npm run package` 生成 `dist/Toonflow-Wylon-0.2.0.zip` 及 `.sha256` 校验文件。解压后仅需导入 `wylon.ts`，源码包可独立开发，无须相邻项目。打包使用明确白名单，拒绝符号链接/Windows reparse point，并扫描常见凭据和签名链接；启发式检查无法识别全部秘密，分享前仍需审阅归档。

自有字段、上游协议及恢复格式规则见 [API 与命名规范](API_CONVENTIONS.zh-CN.md)。

贡献及打包说明见[贡献指南](../CONTRIBUTING.zh-CN.md)，版本变更见[更新记录](../CHANGELOG.zh-CN.md)。
