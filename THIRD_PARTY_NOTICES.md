# Third-party notices / 第三方声明

Original Wylon provider code, tooling and documentation use the [MIT License](LICENSE), copyright © 2026 Wylon-Dev. Third-party material retains its original rights and terms.

Wylon 原创提供方代码、工具和文档采用 [MIT 许可证](LICENSE)，版权 © 2026 Wylon-Dev。第三方内容保留原有权利和条款。

## Toonflow v2.0.10

The optional `compat/toonflow-v2.0.10-reference-order.patch` and the original/patched context in `compat/apply-reference-order-patch.py` reproduce a small portion of Toonflow v2.0.10's `apps/server/src/utils/media/generation.ts`. The change adds `wylon` to the provider allowlist; no complete host implementation is bundled. The applicable upstream copyright and MIT permission notice are retained below. [Original license](https://github.com/HBAI-Ltd/Toonflow-app/blob/v2.0.10/LICENSE).

可选补丁及应用脚本中的原始/修改后上下文含有 Toonflow v2.0.10 上述源文件的小段内容，变更为在供应商白名单中加入 `wylon`，不捆绑完整宿主实现。下方保留适用的上游版权与完整 MIT 许可声明。

```text
MIT License

Copyright (c) 2026 HBAI-Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The local `types/provider.d.ts` is a hand-authored contract subset. The official SDK declaration is supplied by Toonflow at runtime and is not bundled. Node development dependencies and other host components retain their own licenses. Wylon/API service terms, model and generated-content rights, and trademarks are outside this MIT grant.

本地类型文件为自行编写的契约子集；真实 SDK 声明由 Toonflow 运行时提供，不随包附带。Node 开发依赖和其他宿主组件保留自身许可。MIT 授权不代替 Wylon/API 服务条款，也不授予模型、生成内容或商标权利。
