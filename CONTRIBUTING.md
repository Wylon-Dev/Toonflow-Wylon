# Contributing

[简体中文](CONTRIBUTING.zh-CN.md)

Use [repository Issues](https://github.com/wylon-cloud/toonflow-wylon/issues) for bugs and feature requests. Report vulnerabilities through [GitHub private vulnerability reporting](https://github.com/wylon-cloud/toonflow-wylon/security/advisories/new). Contributions use [MIT](LICENSE); preserve [third-party notices](THIRD_PARTY_NOTICES.md).

## Development

Use Node 22.23.x, npm, Python 3.9+ and Git. From the repository root:

```sh
npm ci --ignore-scripts
npm run typecheck
npm run package
```

On Windows, confirm that `python --version` starts Python 3 rather than a Microsoft Store alias. Packaging honors `PYTHON` as an executable path: `$env:PYTHON = 'C:\Path With Spaces\Python\python.exe'` in PowerShell, or `export PYTHON=/path/to/python3` on macOS. The variable must not include arguments. Importing the provider into Toonflow requires neither Python nor Node.

Preserve provider ID `wylon`, literal metadata accepted by the host importer, native binary results and credential-free recovery records. Generation POSTs are sent once; resume accepted tasks by their saved IDs. Validate provider changes against Toonflow v2.0.10 and document affected behavior and host scope. The local `types/provider.d.ts` is a hand-authored development subset; the host injects the actual SDK when importing `wylon.ts`.

## Compatibility and versioning

See [API and naming conventions](docs/API_CONVENTIONS.md) for ownership and upstream compatibility boundaries.

Wylon-owned recovery records use schema version 2 and `task_id`. Version-1 records with `taskId` remain readable. Do not mix keys from the two schemas. Toonflow-owned names such as `apiKey`, `apiUrl`, `modelsUrl`, `mimeType`, `referenceOrder` and the terminal marker `MEDIA_TASK_FAILED` retain their exact SDK spelling. Wylon service fields and task statuses retain their upstream protocol definitions.

Follow Semantic Versioning 2.0.0: compatible features increment minor, fixes increment patch, and breaking public contracts require a major version. Release tags use `v{major}.{minor}.{patch}`, prereleases use `-alpha.N`, `-beta.N` or `-rc.N`, and release branches use `v{major}.{minor}`. New tags must identify an actual reviewed release; do not advertise assets before they exist.

## Packaging and review

The shipped file list is explicit in `scripts/package.py`. Review each added release input and verify clean extraction, typechecking and packaging. Do not include dependency trees, host settings, credentials, complete signed URLs or verification fixtures. Packaging rejects symbolic links and Windows reparse points and writes UTF-8/LF checksum files. The release archive contains the provider, build materials and user documentation.

Reports and pull requests should include host/provider versions, reproduction steps, expected/actual results, redacted evidence and whether a task was accepted. Preserve model/media limits and cancellation behavior. Avoid duplicate paid tasks while investigating. The optional reference-picker patch remains opt-in, version-guarded and reversible.
