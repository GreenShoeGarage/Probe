#!/usr/bin/env python3
"""Create the portable PROBE release without QA pages, evidence or tool binaries."""
import argparse, hashlib, pathlib, zipfile
root=pathlib.Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);args=parser.parse_args()
output=pathlib.Path(args.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
files=sorted([*root.glob('*.md'),root/'package.json',*root.joinpath('dist').glob('*'),*root.joinpath('companion').glob('*'),*root.joinpath('tests').glob('*.test.js'),root/'tests/nmap-fixture.mjs',root/'tests/debug-fixture.mjs',root/'scripts/package.py',*root.joinpath('validation').glob('*.json')])
files=[p for p in files if p.is_file() and p.suffix in {'.md','.json','.js','.mjs','.py','.css','.html','.svg','.webmanifest'}]
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
    for p in files:archive.write(p,p.relative_to(root))
print(f'{output.name}: {len(files)} files, {output.stat().st_size} bytes, SHA-256 {hashlib.sha256(output.read_bytes()).hexdigest()}')
