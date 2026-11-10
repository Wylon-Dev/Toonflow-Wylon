# API and naming conventions

[简体中文](API_CONVENTIONS.zh-CN.md)

This package is a standalone Toonflow v2.0.10 provider. It does not expose its own HTTP service. It uses Wylon V1 at `https://api.wylon.cn/v1` through Toonflow's injected SDK and tools. Importing `wylon.ts` requires no build or adjacent repository.

## Ownership and compatibility

Preserve upstream Wylon endpoint paths, JSON fields, model IDs and task statuses, including the service-defined `cancelled` spelling. Preserve Toonflow SDK fields exactly, including `apiKey`, `apiUrl`, `modelsUrl`, `mimeType`, `referenceOrder` and `saveTaskData`. The host terminal marker `MEDIA_TASK_FAILED` is required by the SDK and must remain unchanged. Do not rename third-party protocol members to apply local conventions.

New Wylon-owned recovery records use schema version 2 and `task_id`, together with `kind` and `model`. The provider continues to read version-1 records with `taskId`. Each record must use the keys appropriate to its declared schema; mixed keys and unknown versions are rejected before network access. Recovery queries the accepted task without creating another generation.

## Owned names and future interfaces

Use standard US English spelling for owned names and prose, including `canceled`. Owned JSON fields use `snake_case`; collection keys use plural nouns. Keep acronyms uppercase within CamelCase names, such as `taskID`, `imageURL` and `publicHTTPSURL`, and lowercase in snake_case names, such as `task_id`.

The repository follows Semantic Versioning 2.0.0 and the release conventions in [CONTRIBUTING.md](../CONTRIBUTING.md#compatibility-and-versioning). Preserve published contracts and review compatibility before changing persisted records. This adapter introduces no database, Kafka topic or object-storage bucket; do not add infrastructure solely to apply unrelated naming rules.
