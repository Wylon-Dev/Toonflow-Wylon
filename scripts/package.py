#!/usr/bin/env python3
"""Build the independent Toonflow source ZIP (Python standard library only)."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import stat
import sys
import tempfile
import zipfile

# Explicit files only: new files need review before becoming release inputs.
FILES = (
    'wylon.ts', 'README.md', 'README.zh-CN.md', 'CHANGELOG.md', 'CHANGELOG.zh-CN.md',
    'LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/USAGE.md', 'docs/USAGE.zh-CN.md',
    'CONTRIBUTING.md', 'CONTRIBUTING.zh-CN.md', 'SECURITY.md', 'SECURITY.zh-CN.md',
    'package.json', 'package-lock.json', 'tsconfig.json', '.gitignore',
    'types/provider.d.ts', 'scripts/run-python.mjs', 'scripts/package.py',
    'docs/API_CONVENTIONS.md', 'docs/API_CONVENTIONS.zh-CN.md',
    'compat/apply-reference-order-patch.py', 'compat/toonflow-v2.0.10-reference-order.patch',
    '.github/ISSUE_TEMPLATE/bug_report.yml', '.github/ISSUE_TEMPLATE/feature_request.yml',
    '.github/ISSUE_TEMPLATE/config.yml',
)
SECRET_PATTERNS = (
    re.compile(rb'\bBearer[ \t]+[A-Za-z0-9_.~-]{20,}', re.I),
    re.compile(rb'\bsk-[A-Za-z0-9_-]{20,}'),
    re.compile(rb'(?:api[_-]?key|access[_-]?token|client[_-]?secret)["\x27]?[ \t]*[:=][ \t]*["\x27][A-Za-z0-9_./+~-]{20,}', re.I),
    re.compile(rb'https?://[^\s"\x27<>]+[?&](?:x-amz-signature|signature|sig|token|access_token)=[A-Za-z0-9_%+/.~-]{16,}', re.I),
    re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
)


def _is_link(path):
    try:
        info = path.lstat()
    except FileNotFoundError:
        return False
    # Windows junctions carry FILE_ATTRIBUTE_REPARSE_POINT without being symlinks.
    return stat.S_ISLNK(info.st_mode) or bool(getattr(info, 'st_file_attributes', 0) & 0x400)



def sanitize_contents(contents, comfy=False):
    """Remove local QA tooling and its orphan dependencies from public metadata."""
    files = dict(contents)
    metadata = json.loads(files['package.json'])
    metadata['scripts'] = {key: value for key, value in metadata['scripts'].items()
                           if key in ('build', 'typecheck', 'package')}
    if comfy:
        metadata['scripts']['typecheck'] = 'tsc -p tsconfig.json --noEmit'
    metadata['devDependencies'] = {key: value for key, value in metadata['devDependencies'].items()
                                   if key == 'typescript'}
    lock = json.loads(files['package-lock.json'])
    lock['version'] = metadata['version']
    lock['packages']['']['version'] = metadata['version']
    lock['packages']['']['devDependencies'] = metadata['devDependencies']
    # Resolve each retained dependency as Node does, including nested lock entries.
    keep = {''}
    pending = [('', name) for name in metadata['devDependencies']]
    while pending:
        parent, name = pending.pop()
        current = parent
        while True:
            candidate = (current + '/' if current else '') + 'node_modules/' + name
            if candidate in lock['packages']:
                break
            if not current:
                raise ValueError('Missing locked public dependency: ' + name)
            current = current.rsplit('/node_modules/', 1)[0] if '/node_modules/' in current else ''
        if candidate in keep:
            continue
        keep.add(candidate)
        entry = lock['packages'][candidate]
        for dependency in {**entry.get('dependencies', {}), **entry.get('optionalDependencies', {})}:
            pending.append((candidate, dependency))
    lock['packages'] = {name: value for name, value in lock['packages'].items() if name in keep}
    configuration = json.loads(files['tsconfig.json'])
    if not comfy:
        configuration['include'] = ['wylon.ts', 'types/*.d.ts']
        configuration['compilerOptions'].pop('types', None)
    for name, value in [('package.json', metadata), ('package-lock.json', lock), ('tsconfig.json', configuration)]:
        files[name] = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    return list(files.items())


def build(root, output):
    root = root.absolute()
    if _is_link(root):
        raise ValueError('Refused symlink/reparse source root')
    contents = []
    for relative in FILES:
        path = root / relative
        for part in [path, *path.parents]:
            if part == root.parent:
                break
            if _is_link(part):
                raise ValueError('Refused symlink/reparse point in release input: ' + relative)
        if not path.is_file():
            raise ValueError('Missing required release input: ' + relative)
        data = path.read_bytes()
        if any(pattern.search(data) for pattern in SECRET_PATTERNS):
            raise ValueError('Potential secret/credential/signed link in release input: ' + relative)
        if relative == 'wylon.ts' and re.search(rb'\b(?:import\s*(?:[({*"\x27]|\w)|require\s*\()', data):
            raise ValueError('Provider must remain standalone without imports or require')
        contents.append((relative, data))
    contents = sanitize_contents(contents)
    metadata = json.loads(dict(contents)['package.json'])
    version = metadata['version']
    if not isinstance(version, str) or not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-(?:alpha|beta|rc)\.(?:0|[1-9][0-9]*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?', version) or metadata.get('private') is not True:
        raise ValueError('Refused invalid release version or non-private tooling package metadata')
    # Scan and validate every byte before any output mutation.
    output.mkdir(parents=True, exist_ok=True)
    archive = output / ('Toonflow-Wylon-' + version + '.zip')
    checksum = archive.with_name(archive.name + '.sha256')
    # Complete both outputs before replacing the preceding valid release.
    with tempfile.TemporaryDirectory(prefix='.toonflow-release-', dir=output) as staging:
        staged_archive = Path(staging) / archive.name
        staged_checksum = Path(staging) / checksum.name
        with zipfile.ZipFile(staged_archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipped:
            for relative, data in sorted(contents):
                info = zipfile.ZipInfo('Toonflow-Wylon/' + relative, date_time=(1980, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                zipped.writestr(info, data, compresslevel=9)
        digest = hashlib.sha256(staged_archive.read_bytes()).hexdigest()
        staged_checksum.write_bytes((digest + '  ' + archive.name + '\n').encode('utf-8'))
        staged_archive.replace(archive)
        staged_checksum.replace(checksum)
    print(str(archive))
    print(str(len(contents)) + ' allowlisted files; SHA-256 ' + digest)
    return archive


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        build(args.root, args.output if args.output is not None else args.root / 'dist')
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
