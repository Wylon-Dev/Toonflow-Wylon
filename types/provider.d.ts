// Hand-authored subset of Toonflow v2.0.10 type contracts for local development.
// Property names retain the upstream SDK contract, including apiKey, apiUrl, modelsUrl,
// mimeType and referenceOrder; Wylon-owned recovery record keys use snake_case.
type MediaInput = { type: 'url'; url: string; mimeType?: string; name?: string } | { type: 'base64'; data: string; mimeType: string; name?: string } | { type: 'binary'; data: Uint8Array; mimeType: string; name?: string };
type VideoMode = 'singleImage' | 'startEndRequired' | 'endFrameOptional' | 'startFrameOptional' | 'text' | (`${'video' | 'image' | 'audio'}Reference:${number}`)[];
type ImageMode = 'text' | 'singleImage' | 'multiReference';
type MediaAsset = MediaInput & { mediaType: 'image' | 'video' | 'audio' };
type ProviderTaskValue = null | boolean | number | string | ProviderTaskValue[] | { [key: string]: ProviderTaskValue };
type ProviderTaskData = { [key: string]: ProviderTaskValue };
interface ProviderContext<T = Record<string, unknown>> {
 config: T; signal?: AbortSignal; saveTaskData?: (data: ProviderTaskData) => Promise<void>;
 tool: { fetch: typeof globalThis.fetch; errorMessage(value: unknown): string; media: { inspectImage(input: MediaInput): Promise<{width: number; height: number; format: string}> } };
}
interface ImageRequest {
 model: string; prompt: string; other?: Record<string, unknown>; images?: MediaInput[]; mask?: MediaInput; n?: number; ratio?: string; size?: string; quality?: string; outputFormat?: string;
}
interface VideoRequest {
 model: string; prompt: string; other?: Record<string, unknown>; mode?: VideoMode; images?: MediaInput[]; videos?: MediaInput[]; audios?: MediaInput[]; firstFrame?: MediaInput; lastFrame?: MediaInput; duration?: number; ratio?: string; resolution?: string; generateAudio?: boolean; watermark?: boolean;
}
interface ProviderDefinition<T extends readonly {field: string; value: unknown}[]> {
 id: string; label: string; version?: string; apiUrl?: string; modelsUrl?: string; readme?: string; rules: T;
 models: { id: string; label: string; type: 'image' | 'video'; mode?: (ImageMode | VideoMode)[]; audio?: boolean | 'optional'; imageSizes?: string[]; imageRatios?: string[]; durationResolutionMap?: {duration: number[]; resolution: string[]}[]; rules?: readonly {field: string; value: unknown; [key: string]: unknown}[] }[];
 generateImage?: (this: ProviderContext<{apiKey: string}>, request: ImageRequest) => Promise<MediaAsset[]>;
 generateVideo?: (this: ProviderContext<{apiKey: string}>, request: VideoRequest) => Promise<MediaAsset[]>;
 resumeTask?: (this: ProviderContext<{apiKey: string}>, data: ProviderTaskData) => Promise<MediaAsset[]>;
}
