"""Проверяет ключевые инварианты первого доменного среза без TypeScript runtime."""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
state = (root / 'packages/domain/src/job-state.ts').read_text()
contract = (root / 'packages/contracts/src/generation.ts').read_text()
requirements = (root / 'packages/contracts/src/requirements.ts').read_text()
mock = (root / 'packages/workflow-adapters/src/mock.ts').read_text()
backend = (root / 'packages/workflow-adapters/src/backend.ts').read_text()
router = (root / 'packages/workflow-adapters/src/router.ts').read_text()
executor = (root / 'apps/worker/src/executor.ts').read_text()
sql = (root / 'packages/storage/migrations/001_init.sql').read_text()
api = (root / 'apps/api/src/http-contract.ts').read_text()
assert "running: ['succeeded', 'failed', 'cancel_requested', 'reconciling']" in state
assert 'if (!canTransition(from, to))' in state
for field in ('schemaVersion', 'shotId', 'promptRevisionId', 'modality', 'inputs', 'intent', 'output'):
    assert f'{field}:' in contract
assert 'return prior;' in mock
assert 'BACKEND_UNAVAILABLE' in mock
assert 'requiredCapabilities' in requirements and 'spec.modality' in requirements
assert 'class LlamaCppAdapter' in backend and 'class ComfyUiAdapter' in backend
assert 'workflowUrl' in backend and 'forbidden' in backend
assert 'no backend for' in router and 'capabilities.reachable' in router
for item in ('prepare', 'submit', 'poll', 'collect', 'heartbeat', 'commit', 'fail'):
    assert item in executor
for table in ('projects', 'scenes', 'shots', 'jobs', 'attempts', 'nodes', 'asset_versions'):
    assert f'create table if not exists {table}' in sql
assert 'createOrReplayJob' in api and 'commitResult' in api
print('OK: state machine, model-independent GenerationSpec and idempotent mock submit invariants present')
