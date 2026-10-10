"""Локальная проверка документации и каркаса без сторонних пакетов."""
from pathlib import Path
import json
import re
import sys
from urllib.parse import unquote

root = Path(__file__).resolve().parents[1]
required = [
    'README.md', 'AGENTS.md', 'docs/architecture.md', 'docs/product-brief.md',
    'docs/roadmap.md', 'docs/decision-records/ADR-001-architecture.md',
    'docs/operations.md', 'docs/workflow-adapter-contract.md',
    'docs/next-session.md', 'package.json', '.env.example', '.gitignore',
    'docker-compose.dev.yml',
]
errors = []
for name in required:
    if not (root / name).is_file() or not (root / name).stat().st_size:
        errors.append(f'Отсутствует или пуст: {name}')
links = 0
markdown = sorted(root.glob('*.md')) + sorted(root.glob('docs/**/*.md'))
markdown += sorted(root.glob('apps/*/README.md')) + sorted(root.glob('packages/*/README.md'))
for path in markdown:
    body = re.sub(r'```.*?```', '', path.read_text(), flags=re.S)
    for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)', body):
        target = target.strip('<>')
        if re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target) or target.startswith('#'):
            continue
        relative = unquote(target.split('#', 1)[0])
        links += 1
        if not (path.parent / relative).exists():
            errors.append(f'{path.relative_to(root)}: битая ссылка {target}')
try:
    manifest = json.loads((root / 'package.json').read_text())
    assert manifest['private'] is True
    assert manifest['workspaces'] == ['apps/*', 'packages/*']
    children = sorted(root.glob('apps/*/package.json')) + sorted(root.glob('packages/*/package.json'))
    assert len(children) == 8
    names = set()
    for path in [root / 'package.json', *children]:
        data = json.loads(path.read_text())
        assert data['private'] is True
        assert data['name'] not in names
        names.add(data['name'])
        for dep, version in data.get('dependencies', {}).items():
            if path != root / 'package.json' and path.parent.name != 'web':
                assert (dep.startswith('@qwendirector/') and version == '0.0.0') or dep == 'pg'
        if path != root / 'package.json' and path.parent.name != 'web':
            assert not data.get('devDependencies')
except (OSError, ValueError, KeyError, AssertionError) as exc:
    errors.append(f'Ошибка workspace manifests: {exc}')
if errors:
    print('\n'.join(errors), file=sys.stderr)
    sys.exit(1)
print(f'OK: {len(required)} обязательных файлов, {len(markdown)} Markdown-документов, '
      f'{links} локальных ссылок, 8 workspace-пакетов. Установки и сервисы не требуются.')
