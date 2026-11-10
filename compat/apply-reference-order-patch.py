#!/usr/bin/env python3
"""Opt-in source compatibility fix for an explicitly named Toonflow v2.0.10 checkout."""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import tempfile

TARGET = Path('apps/server/src/utils/media/generation.ts')
ORIGINAL = b'  const referenceOrder = mediaType === "video" && ["toonflow", "apiMart", "metaso", "compshare"].includes(request.providerId) ? request.referenceOrder : undefined;'
PATCHED = b'  const referenceOrder = mediaType === "video" && ["toonflow", "apiMart", "metaso", "compshare", "wylon"].includes(request.providerId) ? request.referenceOrder : undefined;'


def apply(host_root):
    root = Path(host_root).expanduser().resolve(strict=True)
    tags = subprocess.run(['git', '-C', str(root), 'tag', '--points-at', 'HEAD'], capture_output=True, text=True, check=True).stdout.splitlines()
    if 'v2.0.10' not in tags:
        raise ValueError('Refused: expected a git checkout tagged v2.0.10 at HEAD')
    target = root / TARGET
    if target.is_symlink():
        raise ValueError('Refused: source must not be a symlink')
    target.resolve(strict=True).relative_to(root)
    content = target.read_bytes()
    if content.count(PATCHED) == 1 and content.count(ORIGINAL) == 0:
        print('Already patched: ' + str(target))
        return
    if content.count(ORIGINAL) != 1 or content.count(PATCHED) != 0:
        raise ValueError('Refused: expected exactly one unmodified compatibility line in ' + str(target))
    backup = target.with_name(target.name + '.wylon-reference-order.bak')
    if backup.exists() or backup.is_symlink():
        if backup.is_symlink() or backup.read_bytes() != content:
            raise ValueError('Refused: existing backup differs: ' + str(backup))
    else:
        with backup.open('xb') as file:
            file.write(content)
            file.flush()
            os.fsync(file.fileno())
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='wb', dir=target.parent, prefix='.wylon-reference-order-', delete=False) as file:
            temporary = Path(file.name)
            file.write(content.replace(ORIGINAL, PATCHED, 1))
            file.flush()
            os.fsync(file.fileno())
        os.chmod(temporary, target.stat().st_mode)
        if target.read_bytes() != content:
            raise ValueError('Refused: source changed during patch: ' + str(target))
        os.replace(temporary, target)
        temporary = None
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
    print('Patched: ' + str(target))
    print('Backup: ' + str(backup))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host-root', required=True, help='Explicit path to the Toonflow v2.0.10 git source checkout')
    args = parser.parse_args()
    try:
        apply(args.host_root)
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
