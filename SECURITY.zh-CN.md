# 安全说明

[English](SECURITY.md)

安全漏洞请通过 [GitHub 私密漏洞报告](https://github.com/wylon-cloud/toonflow-wylon/security/advisories/new) 提交，包含受影响的供应商/宿主版本、影响、最小复现步骤及脱敏证据。普通缺陷和功能建议使用[仓库 Issues](https://github.com/wylon-cloud/toonflow-wylon/issues)。

版本 0.2.0 面向 Toonflow v2.0.10 供应商契约。

将 Wylon API Key 存在宿主供应商凭据中。适配器只向固定 Wylon API 发送密钥，不向结果/媒体地址发送。凭据加密、访问控制及工作区存储由宿主负责。恢复记录仅含任务 ID/模型/类型/版本，不含提示词、凭据及媒体 URL。诊断脱敏和归档扫描降低泄露风险，但不能保证任意用户文本可安全分享。

不要在 Issue 中贴密钥、完整签名 URL、私密设置、客户媒体或未脱敏日志。密钥泄露后在 Wylon 撤销/轮换，并更新宿主凭据。签名 URL 泄露或过期时从来源更换。保留已接单任务 ID 用于恢复；轮换密钥不应自动重新创建付费任务。

敏感利用细节请通过私密报告表单提交，不要公开真实凭据或客户数据来证明问题。

公网 HTTPS 输入检查会拒绝明显的本地地址、字面私有 IP 和带凭据地址；不会解析 DNS，也不解码远程视频/音频，仍依赖上游媒体验证及网络控制。可选兼容脚本只修改具有精确 v2.0.10 标签的源码宿主并保存备份；审查修改并重启，撤销时恢复备份。

参见 [MIT 许可证](LICENSE)及[第三方声明](THIRD_PARTY_NOTICES.md)。
