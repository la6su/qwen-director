# storage

Asset reader/writer, staging, content-addressed filesystem provider, проверка hashes. `FilesystemAssetStorage` хранит только относительные ключи: `staging/<attempt>/<id>.bin` атомарно перемещается в `cas/<prefix>/<sha256>` после проверки digest.

См. [архитектуру](../../docs/architecture.md) и [следующую сессию](../../docs/next-session.md).
