# Security

[简体中文](SECURITY.zh-CN.md)

Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/wylon-cloud/toonflow-wylon/security/advisories/new). Include affected provider/host versions, impact, a minimal reproduction and redacted evidence. Use [repository Issues](https://github.com/wylon-cloud/toonflow-wylon/issues) for ordinary bugs and feature requests.

Version 0.2.0 targets the Toonflow v2.0.10 provider contract.

Store the Wylon API key in the host's provider credentials. This adapter sends it only to the fixed Wylon API, never to result/media hosts. Host credential encryption, access control and workspace storage are host responsibilities. Recovery records contain task ID/model/kind/version; they omit prompts, credentials and media URLs. Diagnostic redaction and archive scanning reduce exposure but do not prove that arbitrary user-provided text is safe to share.

Never post a key, full signed URL, private settings, customer media or unredacted log in an Issue. If a key is exposed, revoke/rotate it in Wylon and update host credentials. Signed URLs should be replaced at their source if exposed or expired. Preserve the accepted task ID for recovery; credential rotation does not justify creating another paid task automatically.

Share exploit-sensitive details through the private reporting form. Do not publish working credentials or customer data to demonstrate a bug.

Public HTTPS input validation rejects obvious local/literal private addresses and credentials. It does not resolve DNS or decode remote video/audio; upstream media validation and network controls remain required. The opt-in compatibility script modifies host source only on an exact tagged v2.0.10 checkout and writes a backup. Review that source change and restart the host; restore the backup to undo it.

See the [MIT License](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
