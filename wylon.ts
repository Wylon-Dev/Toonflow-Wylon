/**
 * SPDX-License-Identifier: MIT
 * MIT License
 *
 * Copyright (c) 2026 Wylon-Dev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/** Standalone Toonflow v2.0.10 adapter. Types and tools are injected by the host.
 * Host-owned names (apiKey, apiUrl, modelsUrl, mimeType, referenceOrder) and
 * MEDIA_TASK_FAILED retain the exact Toonflow SDK contract. Wylon API payloads
 * and statuses retain their service-defined names; owned recovery data uses snake_case.
 */
const API_BASE_URL = 'https://api.wylon.cn/v1';
const TASKS_PATH = '/contents/generations/tasks';
const IMAGE_SIZES: Record<string, string[]> = {
  'Qwen/Qwen-Image-2512': ['1328x1328', '1664x928', '928x1664', '1104x1472', '1584x1056'],
  'Qwen/Qwen-Image-2.1': ['1536x2752', '1696x2528', '1792x2400', '2048x2048', '2400x1792', '2528x1696', '2752x1536'],
};
const H3_MODEL = 'MiniMaxAI/MiniMax-H3';
const REFERENCE_VIDEO_MODEL = 'MiniMaxAI/MiniMax-H3-Ref2VA';
const RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
const MEBIBYTE = 1024 * 1024;
type Context = ProviderContext<{ apiKey: string }>;
type ObjectData = Record<string, unknown>;
type Kind = 'image' | 'video';
type ReferenceOrder = { type: 'image' | 'video' | 'audio' | 'firstFrame' | 'lastFrame' | 'text'; index?: number }[];

const rules = [{ type: 'input', field: 'apiKey', title: 'Wylon API Key', value: '', props: { type: 'password', placeholder: 'Wylon API Key' }, validate: [{ required: true, message: 'API key is required' }] }] as const;

function object(value: unknown): ObjectData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
  return value as ObjectData;
}
function redact(ctx: Context, value: unknown): string {
  let text: string;
  try { text = ctx.tool.errorMessage(value); } catch { text = 'Wylon request failed'; }
  if (typeof text !== 'string') text = 'Wylon request failed';
  const key = String(ctx.config.apiKey || '');
  if (key) text = text.split(key).join('[REDACTED]');
  return text.replace(/data:[^\s"'<>]+/gi, '[media redacted]')
    .replace(/Bearer\s+[^\s"'<>]+/gi, 'Bearer [REDACTED]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => { try { const parsedURL = new URL(url); parsedURL.username = ''; parsedURL.password = ''; parsedURL.search = parsedURL.search ? '?redacted' : ''; parsedURL.hash = ''; return parsedURL.toString(); } catch { return '[URL redacted]'; } }).slice(0, 1800);
}
function failure(ctx: Context, value: unknown, taskID?: string, terminal = false): Error {
  const error = new Error(`${taskID ? `Wylon task ${taskID}: ` : 'Wylon: '}${redact(ctx, value)}`);
  if (terminal) Object.assign(error, { code: 'MEDIA_TASK_FAILED' });
  return error;
}
function checkAbort(ctx: Context) { ctx.signal?.throwIfAborted(); }
function remaining(deadline?: number): number {
  const milliseconds = deadline === undefined ? 120_000 : deadline - Date.now();
  if (milliseconds <= 0) throw new Error('Waiting timed out; resume this task without creating another request');
  return milliseconds;
}
async function sleep(ctx: Context, milliseconds: number, deadline?: number): Promise<void> {
  checkAbort(ctx);
  if (deadline !== undefined) milliseconds = Math.min(milliseconds, remaining(deadline));
  await new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(ctx.signal?.reason || new Error('Aborted')); };
    const timer = setTimeout(() => { ctx.signal?.removeEventListener('abort', abort); resolve(); }, milliseconds);
    ctx.signal?.addEventListener('abort', abort, { once: true });
  });
  if (deadline !== undefined) remaining(deadline);
}
function publicHTTPSURL(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Media requires a public HTTPS URL');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Media requires a public HTTPS URL'); }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const address = host.split('.').map(Number);
  const isPrivateIP = /^\d+\.\d+\.\d+\.\d+$/.test(host) && (address[0] === 0 || address[0] === 10 || address[0] === 127 || address[0] >= 224 || (address[0] === 169 && address[1] === 254) || (address[0] === 172 && address[1] >= 16 && address[1] <= 31) || (address[0] === 192 && address[1] === 168) || (address[0] === 100 && address[1] >= 64 && address[1] <= 127));
  if (url.protocol !== 'https:' || url.username || url.password || isPrivateIP || host.startsWith('[') || !host.includes('.') || /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(host)) throw new Error('Media requires a public HTTPS URL (no local addresses or credentials)');
  return value;
}
async function readBytes(response: Response, maxBytes: number, signal?: AbortSignal): Promise<Uint8Array> {
  if (signal?.aborted) { await response.body?.cancel(); signal.throwIfAborted(); }
  const length = Number(response.headers.get('content-length'));
  if (length > maxBytes) { await response.body?.cancel(); throw new Error('Media or response exceeds byte limit'); }
  if (!response.body) throw new Error('Empty response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new Error('Media or response exceeds byte limit'); }
      chunks.push(value);
    }
  } finally { signal?.removeEventListener('abort', abort); reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
async function fetchResponse(ctx: Context, url: string, init: RequestInit, get = false, deadline?: number): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    checkAbort(ctx);
    try {
      const timeout = AbortSignal.timeout(Math.min(120_000, remaining(deadline)));
      const signal = ctx.signal ? AbortSignal.any([ctx.signal, timeout]) : timeout;
      const response = await ctx.tool.fetch(url, { ...init, signal, redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (deadline !== undefined && Date.now() >= deadline) { await response.body?.cancel(); remaining(deadline); }
      if (get && attempt < 2 && [429, 500, 502, 503, 504].includes(response.status)) { await response.body?.cancel(); await sleep(ctx, 500 * 2 ** attempt, deadline); continue; }
      return response;
    } catch (error) {
      checkAbort(ctx);
      if (deadline !== undefined) remaining(deadline);
      if (!get || attempt >= 2) throw error;
      await sleep(ctx, 500 * 2 ** attempt, deadline);
    }
  }
}
async function requestAPI(ctx: Context, path: string, payload?: ObjectData, deadline?: number): Promise<ObjectData> {
  if (typeof ctx.config.apiKey !== 'string' || !ctx.config.apiKey.trim()) throw new Error('Configure a Wylon API key');
  const response = await fetchResponse(ctx, API_BASE_URL + path, { method: payload ? 'POST' : 'GET', headers: { Authorization: `Bearer ${ctx.config.apiKey}`, ...(payload ? { 'Content-Type': 'application/json' } : {}) }, ...(payload ? { body: JSON.stringify(payload) } : {}) }, !payload, deadline);
  const text = new TextDecoder().decode(await readBytes(response, path === '/images/generations' ? 96 * MEBIBYTE : MEBIBYTE));
  if (deadline !== undefined) remaining(deadline);
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw failure(ctx, `HTTP ${response.status}: invalid JSON response`); }
  if (!response.ok) throw failure(ctx, `HTTP ${response.status}: ${redact(ctx, data)}`);
  return object(data);
}
function nonempty(prompt: unknown): string {
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('A nonempty prompt is required');
  return prompt;
}
function options(other: ObjectData | undefined): ObjectData {
  const value = other || {};
  for (const key of Object.keys(value)) if (!['generation_mode', 'negative_prompt', 'seed', 'extra_parameters', 'reference_video_urls'].includes(key)) throw new Error(`Unsupported provider parameter: ${key}`);
  return value;
}
function manualVideos(parameters: ObjectData): MediaInput[] {
  const value = parameters.reference_video_urls;
  if (value === undefined || value === '') return [];
  if (typeof value !== 'string') throw new Error('reference_video_urls must be multiline text, one public HTTPS URL per line');
  if (value.length > 32768) throw new Error('Reference video URL text exceeds limit');
  const lines = value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 3) throw new Error('Ref2VA supports at most 3 videos in total');
  return lines.map(url => ({ type: 'url', url: publicHTTPSURL(url) }));
}
function optionalFields(payload: ObjectData, parameters: ObjectData, seedSupported: boolean) {
  if (parameters.negative_prompt !== undefined && parameters.negative_prompt !== '') {
    if (typeof parameters.negative_prompt !== 'string') throw new Error('negative_prompt must be text');
    payload.negative_prompt = parameters.negative_prompt;
  }
  if (parameters.seed !== undefined && parameters.seed !== -1) {
    if (!Number.isSafeInteger(parameters.seed) || (parameters.seed as number) < 0) throw new Error('seed must be -1 or a nonnegative safe integer');
    if (seedSupported) payload.seed = parameters.seed;
  }
}
function extras(parameters: ObjectData, kind: Kind, isSynchronousImage = false): ObjectData {
  const raw = parameters.extra_parameters ?? {};
  let extra: ObjectData;
  try { extra = object(typeof raw === 'string' ? JSON.parse(raw) : raw); } catch { throw new Error('Advanced parameters must be a JSON object'); }
  const allowed = kind === 'image' ? ['output_compression', 'background', 'quality', 'style', 'user', 'user_id', 'moderation', 'stream', 'partial_images', ...(isSynchronousImage ? ['response_format'] : [])] : ['safety_identifier', 'execution_expires_after'];
  for (const [key, value] of Object.entries(extra)) {
    if (!allowed.includes(key)) throw new Error(`Unsupported or protected advanced parameter: ${key}`);
    if (key === 'response_format' && !['url', 'b64_json'].includes(String(value))) throw new Error('response_format must be url or b64_json');
    else if (key === 'stream' && value !== false) throw new Error('V1 does not support streaming');
    else if (key === 'partial_images' && value !== 0) throw new Error('V1 does not support partial images');
    else if (key === 'output_compression' && (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100)) throw new Error('output_compression must be 0..100');
    else if (key === 'execution_expires_after' && (!Number.isSafeInteger(value) || (value as number) <= 0)) throw new Error('execution_expires_after must be a positive integer');
    else if (!['stream', 'partial_images', 'output_compression', 'execution_expires_after'].includes(key) && typeof value !== 'string') throw new Error(`${key} must be text`);
  }
  return extra;
}
function memory(input: MediaInput, kind: 'image' | 'audio'): Uint8Array | undefined {
  if (input.type === 'url') return;
  const limit = (kind === 'image' ? 30 : 15) * MEBIBYTE;
  if (input.type === 'binary') {
    if (!ArrayBuffer.isView(input.data) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag)!.get!.call(input.data) !== 'Uint8Array' || input.data.byteLength > limit || !input.data.byteLength) throw new Error(`${kind} input exceeds byte limit or is empty`);
    return input.data;
  }
  if (input.type !== 'base64' || typeof input.data !== 'string') throw new Error('Invalid base64 media');
  let encoded = input.data;
  if (encoded.startsWith('data:')) {
    const header = `data:${input.mimeType};base64,`;
    if (!encoded.startsWith(header)) throw new Error('Data URL MIME type does not match media MIME type');
    encoded = encoded.slice(header.length);
  }
  return decodeBase64(encoded, limit);
}
function decodeBase64(encoded: string, limit: number): Uint8Array {
  if (encoded.length > Math.ceil(limit / 3) * 4 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || !encoded) throw new Error('Invalid base64 or byte limit exceeded');
  const decoded = atob(encoded);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  if (bytes.byteLength > limit) throw new Error('Decoded base64 exceeds byte limit');
  return bytes;
}
function mediaURL(input: MediaInput, kind: 'image' | 'audio'): string {
  if (!input || typeof input !== 'object') throw new Error('Invalid media input');
  const allowed = kind === 'image' ? /^image\/(jpeg|png|webp|bmp|tiff|gif|heic|heif)$/ : /^audio\/(wav|x-wav|wave|mpeg|mp3)$/;
  if (input.type === 'url') {
    if (input.mimeType && !allowed.test(input.mimeType)) throw new Error(`Unsupported ${kind} MIME type`);
    return publicHTTPSURL(input.url);
  }
  if (!allowed.test(input.mimeType || '')) throw new Error(`Unsupported ${kind} MIME type`);
  const bytes = memory(input, kind)!;
  let binary = ''; for (let start = 0; start < bytes.length; start += 8192) binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  return `data:${input.mimeType};base64,${btoa(binary)}`;
}
async function imageURL(ctx: Context, input: MediaInput): Promise<string> {
  const url = mediaURL(input, 'image');
  let inspected = input;
  if (input.type === 'url') {
    const response = await fetchResponse(ctx, url, { method: 'GET' });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Reference image HTTP ${response.status}`); }
    const bytes = await readBytes(response, 30 * MEBIBYTE, ctx.signal);
    if (!bytes.length) throw new Error('Reference image is empty');
    inspected = { type: 'binary', data: bytes, mimeType: input.mimeType || 'image/png' };
  }
  checkAbort(ctx);
  const { width, height } = await ctx.tool.media.inspectImage(inspected);
  checkAbort(ctx);
  if (![width, height].every(dimension => Number.isFinite(dimension) && dimension >= 300 && dimension <= 5760) || width / height < 0.4 || width / height > 2.5) throw new Error('Image dimensions must be 300..5760 px and ratio 0.4..2.5');
  return url;
}
function getWAVDuration(input: MediaInput): number | undefined {
  const bytes = memory(input, 'audio');
  if (!bytes || bytes.length < 12) return;
  const text = (start: number) => new TextDecoder().decode(bytes.subarray(start, start + 4));
  if (text(0) !== 'RIFF' || text(8) !== 'WAVE') return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let rate = 0, count: number | undefined;
  for (let position = 12; position + 8 <= bytes.length;) {
    const size = view.getUint32(position + 4, true);
    if (position + 8 + size > bytes.length) throw new Error('Malformed WAV audio');
    if (text(position) === 'fmt ' && size >= 16) rate = view.getUint32(position + 16, true);
    if (text(position) === 'data') count = size;
    position += 8 + size + (size % 2);
  }
  if (rate && count !== undefined) return count / rate;
}
function mapPrompt(request: VideoRequest & { referenceOrder?: ReferenceOrder }): string {
  const prompt = nonempty(request.prompt);
  return prompt.replace(/\{\{ref\s+(\d+)\}\}/g, (_, raw: string) => {
    const entry = request.referenceOrder?.[Number(raw) - 1];
    if (!entry) throw new Error(`Reference marker ${raw} has no referenceOrder mapping`);
    if (entry.type === 'text') return `参考 ${Number(raw)}`;
    if (entry.type === 'firstFrame' && request.firstFrame) return '首帧';
    if (entry.type === 'lastFrame' && request.lastFrame) return '尾帧';
    const array = entry.type === 'image' ? request.images : entry.type === 'video' ? request.videos : entry.type === 'audio' ? request.audios : undefined;
    if (!Number.isInteger(entry.index) || (entry.index as number) < 0 || !array?.[entry.index as number]) throw new Error(`Reference marker ${raw} targets missing media`);
    const label = entry.type === 'image' ? 'Picture' : entry.type === 'video' ? 'Video' : 'Audio';
    return `<${label} ${(entry.index as number) + 1}>`;
  });
}
function taskID(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new Error('Invalid Wylon task ID');
  return value;
}
async function download(ctx: Context, result: ObjectData, kind: Kind): Promise<MediaAsset[]> {
  const data = result.data as ObjectData[] | undefined;
  const content = result.content as ObjectData | undefined;
  if (kind === 'image' && data?.[0]?.b64_json !== undefined) {
    if (typeof data[0].b64_json !== 'string') throw new Error('Invalid base64 image result');
    const bytes = decodeBase64(data[0].b64_json, 50 * MEBIBYTE);
    return [{ type: 'binary', data: bytes, mimeType: 'image/png', name: 'wylon.png', mediaType: 'image' }];
  }
  const url = kind === 'image' ? data?.[0]?.url : content?.video_url;
  if (typeof url !== 'string') throw new Error('Task succeeded without a downloadable result URL');
  const expiry = kind === 'image' ? data?.[0]?.url_expires_at : content?.video_url_expires_at;
  if (typeof expiry === 'number' && expiry * 1000 <= Date.now()) throw new Error('Result URL has expired');
  const response = await fetchResponse(ctx, publicHTTPSURL(url), { method: 'GET' }, true);
  if (!response.ok) { await response.body?.cancel(); throw new Error(`Result download HTTP ${response.status}; resume original task to retry`); }
  const bytes = await readBytes(response, (kind === 'image' ? 50 : 100) * MEBIBYTE);
  if (!bytes.length) throw new Error('Downloaded result is empty');
  return [{ type: 'binary', data: bytes, mimeType: kind === 'image' ? 'image/png' : 'video/mp4', name: kind === 'image' ? 'wylon.png' : 'wylon.mp4', mediaType: kind }];
}
async function wait(ctx: Context, id: string, kind: Kind): Promise<MediaAsset[]> {
  const deadline = Date.now() + 15 * 60_000;
  for (let attempt = 0; Date.now() < deadline; attempt++) {
    checkAbort(ctx);
    const result = await requestAPI(ctx, `${TASKS_PATH}/${encodeURIComponent(id)}?detail=true`, undefined, deadline);
    remaining(deadline);
    if (result.id !== id || result.type !== kind) throw failure(ctx, 'Task identity or media type mismatch in query response', id);
    const status = result.status;
    if (['failed', 'cancelled', 'expired'].includes(String(status)) || result.file_status === 'expired') throw failure(ctx, result.error || `Task ${status}; file ${result.file_status || 'unknown'}`, id, true);
    if (status === 'succeeded' && result.file_status === 'available') return download(ctx, result, kind);
    if (status !== 'queued' && status !== 'running' && status !== 'succeeded') throw failure(ctx, `Unknown task status: ${String(status)}`, id);
    await sleep(ctx, Math.min(1000 * 1.5 ** attempt, 10_000), deadline);
  }
  throw failure(ctx, 'Waiting timed out; resume this task without creating another request', id);
}
async function create(ctx: Context, payload: ObjectData, kind: Kind): Promise<MediaAsset[]> {
  const result = await requestAPI(ctx, TASKS_PATH, payload);
  const id = taskID(result.id);
  try { await ctx.saveTaskData?.({ version: 2, task_id: id, kind, model: String(payload.model) }); }
  catch (error) { throw failure(ctx, `Recovery data could not be saved: ${redact(ctx, error)}. Resume this task ID manually.`, id); }
  try { return await wait(ctx, id, kind); } catch (error) {
    if ((error as { code?: string }).code === 'MEDIA_TASK_FAILED') throw error;
    throw failure(ctx, error instanceof Error ? error.message : error, id);
  }
}

export default {
  id: 'wylon', label: 'Wylon', version: '0.2.0', apiUrl: 'https://api.wylon.cn/v1', modelsUrl: 'https://api.wylon.cn/v1/models', rules,
  readme: 'Qwen text-to-image and MiniMax H3/Ref2VA video generation for Toonflow 2.0.10. Set the API key in provider credentials. Video references require public HTTPS URLs; local/base64 video is unsupported. See README for limits and task recovery. / 适用于 Toonflow 2.0.10 的 Qwen 文生图与 MiniMax H3/Ref2VA 视频生成。密钥通过供应商凭据配置；参考视频仅支持公网 HTTPS URL，不支持本地/base64 视频。限制与任务恢复见 README。',
  // Toonflow statically parses this metadata; keep models as JSON literals.
  models: [
    {
      "id": "Qwen/Qwen-Image-2512",
      "label": "Qwen-Image-2512",
      "type": "image",
      "mode": [
        "text"
      ],
      "imageSizes": [
        "server_default",
        "1328x1328",
        "1664x928",
        "928x1664",
        "1104x1472",
        "1584x1056"
      ],
      "rules": [
        {
          "type": "select",
          "field": "generation_mode",
          "title": "Generation mode / 生成方式",
          "value": "async",
          "options": [
            {
              "label": "Async / 异步",
              "value": "async"
            },
            {
              "label": "Sync / 同步",
              "value": "sync"
            }
          ]
        },
        {
          "type": "input",
          "field": "negative_prompt",
          "title": "Negative prompt / 负向提示词",
          "value": "",
          "props": {
            "type": "textarea"
          }
        },
        {
          "type": "inputNumber",
          "field": "seed",
          "title": "Seed / 随机种子 (-1 = omit; sync images ignore)",
          "value": -1,
          "props": {
            "min": -1,
            "precision": 0
          }
        },
        {
          "type": "input",
          "field": "extra_parameters",
          "title": "Advanced JSON / 高级参数 JSON",
          "value": "{}",
          "props": {
            "type": "textarea"
          }
        }
      ]
    },
    {
      "id": "Qwen/Qwen-Image-2.1",
      "label": "Qwen-Image-2.1",
      "type": "image",
      "mode": [
        "text"
      ],
      "imageSizes": [
        "server_default",
        "1536x2752",
        "1696x2528",
        "1792x2400",
        "2048x2048",
        "2400x1792",
        "2528x1696",
        "2752x1536"
      ],
      "rules": [
        {
          "type": "select",
          "field": "generation_mode",
          "title": "Generation mode / 生成方式",
          "value": "async",
          "options": [
            {
              "label": "Async / 异步",
              "value": "async"
            },
            {
              "label": "Sync / 同步",
              "value": "sync"
            }
          ]
        },
        {
          "type": "input",
          "field": "negative_prompt",
          "title": "Negative prompt / 负向提示词",
          "value": "",
          "props": {
            "type": "textarea"
          }
        },
        {
          "type": "inputNumber",
          "field": "seed",
          "title": "Seed / 随机种子 (-1 = omit; sync images ignore)",
          "value": -1,
          "props": {
            "min": -1,
            "precision": 0
          }
        },
        {
          "type": "input",
          "field": "extra_parameters",
          "title": "Advanced JSON / 高级参数 JSON",
          "value": "{}",
          "props": {
            "type": "textarea"
          }
        }
      ]
    },
    {
      "id": "MiniMaxAI/MiniMax-H3",
      "label": "MiniMax H3",
      "type": "video",
      "mode": [
        "text",
        "startFrameOptional",
        "endFrameOptional",
        "startEndRequired"
      ],
      "audio": true,
      "imageRatios": [
        "21:9",
        "16:9",
        "4:3",
        "1:1",
        "3:4",
        "9:16",
        "adaptive"
      ],
      "durationResolutionMap": [
        {
          "duration": [
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15
          ],
          "resolution": [
            "768p"
          ]
        }
      ],
      "rules": [
        {
          "type": "input",
          "field": "negative_prompt",
          "title": "Negative prompt / 负向提示词",
          "value": "",
          "props": {
            "type": "textarea"
          }
        },
        {
          "type": "inputNumber",
          "field": "seed",
          "title": "Seed / 随机种子 (-1 = omit; sync images ignore)",
          "value": -1,
          "props": {
            "min": -1,
            "precision": 0
          }
        },
        {
          "type": "input",
          "field": "extra_parameters",
          "title": "Advanced JSON / 高级参数 JSON",
          "value": "{}",
          "props": {
            "type": "textarea"
          }
        }
      ]
    },
    {
      "id": "MiniMaxAI/MiniMax-H3-Ref2VA",
      "label": "MiniMax H3 Ref2VA",
      "type": "video",
      "mode": [
        [
          "imageReference:9",
          "videoReference:3",
          "audioReference:3"
        ]
      ],
      "audio": true,
      "imageRatios": [
        "21:9",
        "16:9",
        "4:3",
        "1:1",
        "3:4",
        "9:16"
      ],
      "durationResolutionMap": [
        {
          "duration": [
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15
          ],
          "resolution": [
            "768p"
          ]
        }
      ],
      "rules": [
        {
          "type": "input",
          "field": "reference_video_urls",
          "title": "Reference video URLs / 参考视频 URL（每行一个）",
          "value": "",
          "props": {
            "type": "textarea",
            "rows": 3,
            "placeholder": "Public HTTPS only · Max 3 videos total · 不连接本地视频"
          },
          "info": "Toonflow converts connected videos to local data. Paste already-hosted public HTTPS URLs here; no automatic upload. 使用 <Video 1> 等显式标签。"
        },
        {
          "type": "input",
          "field": "negative_prompt",
          "title": "Negative prompt / 负向提示词",
          "value": "",
          "props": {
            "type": "textarea"
          }
        },
        {
          "type": "inputNumber",
          "field": "seed",
          "title": "Seed / 随机种子 (-1 = omit; sync images ignore)",
          "value": -1,
          "props": {
            "min": -1,
            "precision": 0
          }
        },
        {
          "type": "input",
          "field": "extra_parameters",
          "title": "Advanced JSON / 高级参数 JSON",
          "value": "{}",
          "props": {
            "type": "textarea"
          }
        }
      ]
    }
  ],
  async generateImage(this: Context, request: ImageRequest): Promise<MediaAsset[]> {
    try {
      checkAbort(this);
      if (!Object.hasOwn(IMAGE_SIZES, request.model)) throw new Error('Unsupported image model');
      if (request.images?.length || request.mask) throw new Error('Wylon image API supports text only; reference images and masks are unsupported');
      if (request.n !== undefined && request.n !== 1) throw new Error('V1 supports exactly one image');
      // Toonflow always includes generic ratio metadata; exact size controls this API.
      if (request.ratio && !request.size) throw new Error('Use a supported exact image size; image ratio is unsupported');
      if (request.outputFormat && request.outputFormat !== 'png') throw new Error('V1 image output supports PNG only');
      if (request.size && request.size !== 'server_default' && !IMAGE_SIZES[request.model].includes(request.size)) throw new Error('Unsupported size for this image model');
      const parameters = options(request.other);
      if (parameters.reference_video_urls) throw new Error('reference_video_urls is available only for Ref2VA video');
      const mode = parameters.generation_mode ?? 'async';
      if (mode !== 'sync' && mode !== 'async') throw new Error('generation_mode must be sync or async');
      const payload: ObjectData = { ...(mode === 'async' ? { type: 'image' } : {}), model: request.model, prompt: nonempty(request.prompt), n: 1, output_format: 'png', ...(mode === 'sync' ? { response_format: 'url' } : {}), ...extras(parameters, 'image', mode === 'sync') };
      if (request.size && request.size !== 'server_default') payload.size = request.size;
      if (request.quality !== undefined) payload.quality = request.quality;
      optionalFields(payload, parameters, mode === 'async');
      return mode === 'async' ? await create(this, payload, 'image') : await download(this, await requestAPI(this, '/images/generations', payload), 'image');
    } catch (error) { if ((error as { code?: string }).code === 'MEDIA_TASK_FAILED') throw error; throw failure(this, error instanceof Error ? error.message : error); }
  },
  async generateVideo(this: Context, request: VideoRequest & { referenceOrder?: ReferenceOrder }): Promise<MediaAsset[]> {
    try {
      checkAbort(this);
      if (![H3_MODEL, REFERENCE_VIDEO_MODEL].includes(request.model)) throw new Error('Unsupported video model');
      if (request.generateAudio === false || request.watermark !== undefined) throw new Error('Wylon does not expose audio disabling or watermark control');
      const duration = request.duration ?? 5;
      if (!Number.isInteger(duration) || duration < 5 || duration > 15) throw new Error('Video duration must be an integer 5..15 seconds');
      if (request.resolution && request.resolution.toLowerCase() !== '768p') throw new Error('H3 supports 768p resolution only');
      const ratio = request.ratio ?? '16:9';
      if (ratio !== 'server_default' && !RATIOS.includes(ratio) && !(ratio === 'adaptive' && request.model === H3_MODEL && (request.firstFrame || request.lastFrame))) throw new Error('Unsupported ratio; adaptive requires H3 frames');
      const parameters = options(request.other);
      const extraVideos = manualVideos(parameters);
      if (request.model !== REFERENCE_VIDEO_MODEL && extraVideos.length) throw new Error('reference_video_urls is available only for Ref2VA');
      const images = request.images || [], videos = [...(request.videos || []), ...extraVideos], audios = request.audios || [];
      if (request.mode !== undefined) {
        if (request.model === REFERENCE_VIDEO_MODEL) {
          if (!Array.isArray(request.mode)) throw new Error('Ref2VA requires a reference mode');
          const counts = { image: images.length, video: videos.length, audio: audios.length };
          const declared: Record<string, number> = {};
          for (const mode of request.mode) {
            const match = /^(image|video|audio)Reference:(\d+)$/.exec(mode);
            if (!match || declared[match[1]] !== undefined || Number(match[2]) < 1 || Number(match[2]) > (match[1] === 'image' ? 9 : 3)) throw new Error('Invalid reference mode');
            declared[match[1]] = Number(match[2]);
          }
          for (const [kind, count] of Object.entries(counts)) if (count > (declared[kind] || 0)) throw new Error('Reference count exceeds selected mode');
        } else {
          if (typeof request.mode !== 'string' || !['text', 'startFrameOptional', 'endFrameOptional', 'startEndRequired'].includes(request.mode)) throw new Error('Unsupported H3 mode');
          if (request.mode === 'text' && (request.firstFrame || request.lastFrame)) throw new Error('Text mode cannot contain frames');
          if (request.mode === 'startEndRequired' && (!request.firstFrame || !request.lastFrame)) throw new Error('Selected mode requires both first and last frames');
        }
      }
      if (request.model === H3_MODEL && (images.length || videos.length || audios.length)) throw new Error('H3 accepts firstFrame/lastFrame only, not reference roles');
      if (request.model === REFERENCE_VIDEO_MODEL && (request.firstFrame || request.lastFrame)) throw new Error('Ref2VA cannot mix first/last frame roles with references');
      if (request.model === REFERENCE_VIDEO_MODEL && !images.length && !videos.length) throw new Error('Ref2VA requires an image or video; audio-only is unsupported');
      if (images.length > 9 || videos.length > 3 || audios.length > 3) throw new Error('Ref2VA limits are 9 images, 3 videos, 3 audios');
      const content: ObjectData[] = [{ type: 'text', text: mapPrompt({ ...request, videos }) }];
      for (const [input, role] of [[request.firstFrame, 'first_frame'], [request.lastFrame, 'last_frame']] as const) if (input) content.push({ type: 'image_url', image_url: { url: await imageURL(this, input) }, role });
      for (const input of images) content.push({ type: 'image_url', image_url: { url: await imageURL(this, input) }, role: 'reference_image' });
      for (const input of videos) {
        if (input.type !== 'url') throw new Error('Reference video must be a public HTTPS URL; local/binary/base64 video is unsupported. Remove connected video and use the reference_video_urls model field.');
        if (input.mimeType && !['video/mp4', 'video/quicktime'].includes(input.mimeType)) throw new Error('Reference video supports MP4 or MOV only');
        content.push({ type: 'video_url', video_url: { url: publicHTTPSURL(input.url) }, role: 'reference_video' });
      }
      let audioSeconds = 0;
      for (const input of audios) {
        const url = mediaURL(input, 'audio'); const seconds = getWAVDuration(input);
        if (seconds !== undefined) { if (seconds < 2 || seconds > 15) throw new Error('Reference audio duration must be 2..15 seconds'); audioSeconds += seconds; }
        content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' });
      }
      if (audioSeconds > 15) throw new Error('Total reference audio duration exceeds 15 seconds');
      if (parameters.generation_mode !== undefined) throw new Error('Video generation is always asynchronous');
      const payload: ObjectData = { type: 'video', model: request.model, content, duration, resolution: '768p', ...(ratio === 'adaptive' || ratio === 'server_default' ? {} : { ratio }), ...extras(parameters, 'video') };
      optionalFields(payload, parameters, true);
      return await create(this, payload, 'video');
    } catch (error) { if ((error as { code?: string }).code === 'MEDIA_TASK_FAILED') throw error; throw failure(this, error instanceof Error ? error.message : error); }
  },
  async resumeTask(this: Context, data: ProviderTaskData): Promise<MediaAsset[]> {
    let id: string | undefined;
    try {
      if (!data || (data.version !== 1 && data.version !== 2) || !['image', 'video'].includes(String(data.kind)) || typeof data.model !== 'string' || !(data.kind === 'image' ? Object.hasOwn(IMAGE_SIZES, data.model) : [H3_MODEL, REFERENCE_VIDEO_MODEL].includes(data.model))) throw new Error('Invalid Wylon recovery data');
      // Accept records produced by v0.1.x without guessing between conflicting keys.
      if (Object.hasOwn(data, data.version === 1 ? 'task_id' : 'taskId')) throw new Error('Invalid Wylon recovery data');
      id = taskID(data.version === 1 ? data.taskId : data.task_id);
      return await wait(this, id, data.kind as Kind);
    } catch (error) { if ((error as { code?: string }).code === 'MEDIA_TASK_FAILED') throw error; throw failure(this, error instanceof Error ? error.message : error, id); }
  },
} satisfies ProviderDefinition<typeof rules>;
