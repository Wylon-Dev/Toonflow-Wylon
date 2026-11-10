# Toonflow-Wylon usage guide

[Back to README](../README.md) · [简体中文](USAGE.zh-CN.md)

This guide covers the four models bundled with `wylon.ts` for **Toonflow 2.0.10**. Models that appear through account model refresh are not automatically supported. The adapter uses the host’s injected SDK types and tools, with no local imports, build output or Bun runtime dependency.

## Image generation

Choose `Qwen/Qwen-Image-2512` or `Qwen/Qwen-Image-2.1`, enter a text prompt, and select an exact size or `server_default`.

| Model | Exact sizes (width × height) |
| --- | --- |
| `Qwen/Qwen-Image-2512` | `1328x1328`, `1664x928`, `928x1664`, `1104x1472`, `1584x1056` |
| `Qwen/Qwen-Image-2.1` | `1536x2752`, `1696x2528`, `1792x2400`, `2048x2048`, `2400x1792`, `2528x1696`, `2752x1536` |

- `server_default` omits size from the API request. Toonflow’s generic image ratio metadata is ignored when an exact size or `server_default` is selected.
- Both models support asynchronous and synchronous generation through the model form. V1 returns one PNG with the service watermark.
- These image endpoints accept text only. Reference images, masks and ratio-only requests fail validation.
- Negative prompt is optional in either mode. Seed `-1` omits the seed; synchronous mode always omits it.

Example: choose Qwen-Image-2.1, `2048x2048`, asynchronous mode, then enter “A small seaside bookstore at sunrise, warm light, hand-painted illustration, no text.”

## Video generation

| Mode | Model and inputs | Example prompt |
| --- | --- | --- |
| Text-to-video | H3, no frames | A paper boat drifts across a quiet pond; slow camera move. |
| Frame animation | H3, dedicated first/last-frame inputs | Begin at the first frame and smoothly reveal the scene in the last frame. |
| Mixed references | Ref2VA, image/video references with optional audio | Keep the character in `<Picture 1>`, follow the motion in `<Video 1>`, and use `<Audio 1>` as an audio reference. |

Use `MiniMaxAI/MiniMax-H3` for text, first-frame, last-frame or first/last-frame generation. Dedicated frame inputs are distinct from reference arrays. Use `MiniMaxAI/MiniMax-H3-Ref2VA` for references: it requires at least one image or video and accepts up to **9 images, 3 videos and 3 audio clips**. Audio alone fails before task creation.

All video generation is asynchronous. Output is **5–15 whole seconds at 768p**. Supported API ratios are `21:9`, `16:9`, `4:3`, `1:1`, `3:4` and `9:16`. `server_default` omits the ratio. `adaptive` also omits it and is available only for H3 with at least one frame.

Toonflow 2.0.10 hardcodes its video ratio selector to `16:9`, `9:16`, `1:1`, `4:3` and `3:4`. The provider accepts `21:9` and eligible `adaptive` requests programmatically, but those choices are unavailable in that GUI.

## Reference media

### Images

SDK URL, base64 and binary image inputs are accepted, up to **30 MiB per image**. Dimensions must be **300–5760 pixels** on each side, with an aspect ratio of **0.4–2.5**.

Remote images are fetched before task creation through the host fetch tool with bounded streaming, cancellation and a 120-second timeout. The fetch rejects redirects and sends no Authorization, cookies or referrer. The host image inspector receives the fetched bytes for validation. The original verified public HTTPS URL is then submitted to Wylon; the service validates its later content and accessibility.

### Video URLs

Reference video must already have a **public HTTPS URL**. In Ref2VA settings, use **Reference video URLs / 参考视频 URL（每行一个）** (`reference_video_urls`), one URL per line. The provider performs no upload.

Do not connect a local video node: Toonflow 2.0.10 reads connected workspace videos and converts them to base64, which this provider rejects. Host local assets separately first. Binary/base64 video, local files, localhost, literal private IPs, embedded URL credentials and non-HTTPS protocols are rejected.

Manual URLs follow any programmatic SDK URL video inputs; the combined limit is three. Use `<Video 1>`, `<Video 2>` and `<Video 3>` in that submitted order. Manual URL entries do not create canvas reference-picker items. Signed URLs must remain valid when Wylon reads them; obtain a fresh URL from the source after expiry.

The service requires **MP4/MOV, up to 50 MB, 2–15 seconds per clip and at most 15 seconds total**. Remote sizes/durations, reference video dimensions/frame rate and codec suitability remain service-validated; this adapter does not download and fully decode input video.

The URL gate rejects local/private literal names, including absolute DNS names with a trailing dot. DNS resolution and network access controls remain the host’s and service’s responsibility; the gate does not prevent DNS rebinding.

### Audio

Use public HTTPS URLs or WAV/MP3 memory input, up to **15 MiB per in-memory input**. Inspectable memory WAV clips must each be **2–15 seconds**, with **at most 15 seconds total**. Compressed and remote audio sizes/durations remain service-validated; the service’s audio duration limits are also 2–15 seconds per clip and 15 seconds total.

**Toonflow’s native soundtrack extraction produces M4A. Convert it to an API-supported WAV/MP3 file before connecting it.** Ref2VA still needs an image or video alongside audio. Images and audio can use native wired inputs; videos use the URL field described above.

## Reference tags and canvas order

On stock Toonflow 2.0.10, use explicit H3 tags: `<Picture N>`, `<Video N>` and `<Audio N>`. Each type has its own numbering matching its submitted array; first/last-frame markers become 首帧/尾帧. Existing explicit tags remain unchanged.

When the host supplies top-level `referenceOrder` metadata, the provider translates Toonflow’s `{{ref N}}` markers using that canvas order, including interleaved media. Missing mappings or missing references fail before task creation. It never guesses canvas order or impersonates a built-in provider.

Stock 2.0.10 forwards `referenceOrder` only for a built-in provider allowlist, which excludes Wylon. Use explicit tags, or apply the optional patch below to enable the native @ picker for wired images/audio. Manual video URL entries still need explicit `<Video N>` tags.

The tag syntax follows the [upstream H3 documentation](https://huggingface.co/docs/diffusers/main/en/api/pipelines/minimax_h3). Wylon does not document whether audio embedded in reference videos changes standalone audio indexing. Exact conditioning and reference-index behavior remain model-dependent.

## Advanced request options

The model form exposes negative prompt, seed and **advanced JSON** (`extra_parameters`). Only allowlisted keys are accepted; unknown keys and structural overrides fail validation.

| Media | Allowed advanced keys |
| --- | --- |
| Images | `output_compression`, `background`, `quality`, `style`, `user`, `user_id`, `moderation`, `stream` (only `false`), `partial_images` (only `0`) |
| Synchronous images only | `response_format`: `url` or `b64_json` |
| Videos | `safety_identifier`, `execution_expires_after` (positive integer) |

Some compatibility fields have no effect in Wylon V1. Use non-identifying safety identifiers. Inline base64 image results are decoded into binary assets without another download, up to **50 MiB decoded**. Only the synchronous image endpoint allows JSON responses up to **96 MiB**.

## Recovery and troubleshooting

Create POST requests are sent **once**, with no automatic POST retry. After acceptance, the provider saves task ID, model and media kind before polling. Recovery data contains no credentials, prompts, media or signed URLs. Resume queries that same task; every poll verifies the returned task ID and media kind.

| Situation | Action |
| --- | --- |
| Import fails | Confirm Toonflow 2.0.10 and import source `wylon.ts`, not a ZIP or compiled JavaScript. |
| Authentication fails | Check the Wylon key and account access in the host credential UI. Never post the key in an Issue. |
| References fail validation | Check media limits; replace connected local video with the URL field. Use explicit tags on the stock host. |
| An accepted task stops waiting or downloading | Resume the saved task while its result remains available. Do not rerun generation to recover it. |
| Video exceeds the download limit | The provider enforces the supported host’s 100 MiB persistence ceiling. Recovery can retry the original task, but cannot bypass this limit. |

Polling backs off from **1 to 10 seconds**, within a **15-minute total budget** including query timeouts, GET retries and waits. Each HTTP request has at most a **120-second timeout**; polling uses the remaining budget when shorter. GET requests have at most three attempts with backoff. A result download following a timely successful query uses its own request timeout.

Failed, cancelled or expired tasks stop waiting. Successful tasks wait for the output file to become available. Downloads are bounded at **50 MiB per image / 100 MiB per video**, matching Toonflow 2.0.10’s 100 MiB persistence ceiling; oversized declared lengths are rejected before reading, and streams without a length are also bounded. MP4 audio is retained.

Cancellation interrupts local waiting; it does not cancel or refund a server task. An uncertain create response is not a reason to automatically send another POST: check existing host task information before starting a new generation.

## Credentials and transport

Set the key through the provider’s credential UI; the host owns storage. API credentials are sent only to the fixed `https://api.wylon.cn/v1` API. Result downloads reject redirects and carry no Authorization, cookies or referrer; binary assets are returned for Toonflow to persist. Keep keys out of prompts, exported workflows and the provider source. For sensitive reports, see [SECURITY.md](../SECURITY.md).

## Optional native reference-picker patch

The bundled [`toonflow-v2.0.10-reference-order.patch`](../compat/toonflow-v2.0.10-reference-order.patch) adds only `wylon` to the `prepareRequest` adapter allowlist in `apps/server/src/utils/media/generation.ts`, preserving host validation. This is an opt-in **host source change**, separate from importing the provider. Explicit native tags work without it. Packaged binary installations need a compatible upstream release or a source build.

For an explicitly chosen **v2.0.10 Git checkout**, with Python 3 and Git installed, run from this provider repository:

```sh
python3 compat/apply-reference-order-patch.py --host-root "/absolute/path/to/Toonflow-app"
```

On Windows PowerShell, use `python compat/apply-reference-order-patch.py --host-root 'C:\Projects\Toonflow-app'`. The script accepts paths containing spaces and preserves CRLF/LF line endings and the existing BOM. This requires a tagged source checkout and Git; importing the provider into a normal desktop installation does not require Python or this patch.

The script requires the `v2.0.10` tag at HEAD and the exact expected source line. It refuses ambiguous/changed source and conflicting backups; repeated runs are safe. It preserves source permissions, writes `generation.ts.wylon-reference-order.bak`, and prints paths only. Restart the host backend after applying. To undo, restore that backup over `generation.ts` and restart.

Source references: [GUI reference paths](https://github.com/HBAI-Ltd/Toonflow-app/blob/v2.0.10/packages/nodes/videoGenerationNode/src/index.vue#L242) · [server reference conversion and allowlist](https://github.com/HBAI-Ltd/Toonflow-app/blob/v2.0.10/apps/server/src/utils/media/generation.ts#L84).

## Updating and removal

Before updating, retain the previous provider file and back up your Toonflow workspace using the host’s normal procedure. Re-import the new `wylon.ts` with the same provider ID, verify models/settings, and keep saved tasks and media. Avoid updating the provider or patching host source during an active generation.

Remove the provider through the host. Manage stored credentials separately with host controls, and keep any workspace/media files you need. Restore the optional host patch’s backup before removing compatibility tooling.

## Development and packaging

Development requires **Node 22.23.x**, npm, **Python 3.9+** and Git. From the repository root:

```sh
npm ci --ignore-scripts
npm run typecheck
npm run package
```

The launcher uses `python3` on macOS and `python` on Windows; set `PYTHON` to a Python 3 executable path when needed. Runtime installation only imports `wylon.ts` and needs no separate Python or Node installation.

`types/provider.d.ts` is a hand-authored **v2.0.10 contract subset** for local development. Toonflow injects its actual SDK when importing the standalone provider. SDK-owned field names and `MEDIA_TASK_FAILED` retain their upstream spelling. New Wylon recovery records use version 2 and `task_id`; legacy version-1 `taskId` records remain supported.

`npm run package` creates `dist/Toonflow-Wylon-0.2.0.zip` and its `.sha256` checksum. Import only `wylon.ts` from the extracted folder. The archive supports development without sibling projects. Packaging uses an explicit allowlist, rejects symbolic links/Windows reparse points and scans shipped files for common credentials and signed links. Inspect archives before sharing; heuristic checks cannot identify every secret.

See [API and naming conventions](API_CONVENTIONS.md) for protocol ownership and recovery schema rules.

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution and packaging guidance, and [CHANGELOG.md](../CHANGELOG.md) for changes.
