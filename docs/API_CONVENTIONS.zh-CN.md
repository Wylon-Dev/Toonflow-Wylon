# API 与命名规范

[English](API_CONVENTIONS.md)

本包是适用于 Toonflow v2.0.10 的独立供应商，不提供自建 HTTP 服务。它通过 Toonflow 注入的 SDK 与工具访问 `https://api.wylon.cn/v1` 的 Wylon V1。导入 `wylon.ts` 无须构建或依赖相邻仓库。

## 所有权与兼容边界

保持 Wylon 上游 endpoint 路径、JSON 字段、模型 ID 与任务状态原样，包括服务协议定义的 `cancelled`。Toonflow SDK 字段必须保持精确拼写，包括 `apiKey`、`apiUrl`、`modelsUrl`、`mimeType`、`referenceOrder` 与 `saveTaskData`。宿主终止标记 `MEDIA_TASK_FAILED` 为 SDK 契约要求，必须保留。不得为套用本地规范而重命名第三方协议成员。

新建 Wylon 自有恢复记录使用 schema version 2、`task_id` 以及 `kind`、`model`。供应商继续读取使用 `taskId` 的 version 1 记录；各版本只接受对应格式，混用字段或未知版本在访问网络前拒绝。恢复仅查询已接单任务，不新建生成任务。

## 自有命名与后续接口

自有名称与英语文案使用标准美式英语拼写，例如 `canceled`。自有 JSON 字段使用 `snake_case`，集合字段使用复数名词。CamelCase 中首字母缩写保持大写，例如 `taskID`、`imageURL`、`publicHTTPSURL`；snake_case 中使用小写，例如 `task_id`。

本仓库遵循 Semantic Versioning 2.0.0，发布规则见[贡献指南](../CONTRIBUTING.zh-CN.md#兼容与版本)。保留已发布契约，修改持久化记录前审阅兼容性。本适配器不引入数据库、Kafka Topic 或对象存储 Bucket，不为套用无关命名规则而新增基础设施。
