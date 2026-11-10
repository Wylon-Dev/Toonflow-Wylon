# 贡献指南

[English](CONTRIBUTING.md)

通过[仓库 Issues](https://github.com/wylon-cloud/toonflow-wylon/issues) 反馈缺陷和功能建议。安全漏洞请使用 [GitHub 私密漏洞报告](https://github.com/wylon-cloud/toonflow-wylon/security/advisories/new)。贡献采用 [MIT](LICENSE)，须保留[第三方声明](THIRD_PARTY_NOTICES.md)。

## 开发

使用 Node 22.23.x、npm、Python 3.9+ 与 Git，在仓库根目录执行：

```sh
npm ci --ignore-scripts
npm run typecheck
npm run package
```

Windows 须确认 `python --version` 启动 Python 3，而非 Microsoft Store 别名。打包支持通过 `PYTHON` 指定可执行文件路径：PowerShell 使用 `$env:PYTHON = 'C:\Path With Spaces\Python\python.exe'`，macOS 使用 `export PYTHON=/path/to/python3`；变量值不得包含参数。普通 Toonflow 导入不需要安装 Python 或 Node。

保持供应商 ID `wylon`、宿主导入器接受的字面量元数据、原生二进制结果及不含凭据的恢复记录。生成 POST 只发送一次，已接单任务通过保存的 ID 恢复。供应商改动需基于 Toonflow v2.0.10 验证，并说明行为及宿主范围。`types/provider.d.ts` 为手写开发契约子集，实际导入 `wylon.ts` 时由宿主注入真实 SDK。

## 兼容与版本

自有命名与上游兼容边界见 [API 与命名规范](docs/API_CONVENTIONS.zh-CN.md)。

Wylon 自有恢复记录使用 schema version 2 与 `task_id`，继续读取 version 1 的 `taskId`，不得混用两种格式。`apiKey`、`apiUrl`、`modelsUrl`、`mimeType`、`referenceOrder` 及终止标识 `MEDIA_TASK_FAILED` 等 Toonflow 字段保持 SDK 原样；Wylon 服务字段和任务状态保持上游协议定义。

遵循 Semantic Versioning 2.0.0：兼容新增功能递增 minor，修复递增 patch，破坏公开契约须递增 major。Release tag 为 `v{major}.{minor}.{patch}`，预发布仅使用 `-alpha.N`、`-beta.N` 或 `-rc.N`，release branch 为 `v{major}.{minor}`。标签须对应实际审阅的发布，不得提前宣传尚不存在的下载资产。

## 打包与审阅

`scripts/package.py` 明确列出分发文件。新增文件须审查收录范围，并验证干净解压、类型检查及打包。不得收录依赖树、宿主设置、凭据、完整签名 URL 或验证夹具。打包拒绝符号链接及 Windows reparse point，校验文件采用 UTF-8/LF。分发包包含供应商、构建材料与使用文档。

问题报告及提交说明应包含宿主/供应商版本、复现步骤、预期/实际结果、脱敏证据以及任务是否接单。保持模型/媒体限制与取消语义；排查时避免重复付费任务。可选引用选择器补丁须继续保持主动选择、版本保护且可撤销。
