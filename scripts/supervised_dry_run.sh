#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[supervised-dry-run] start"
echo "[supervised-dry-run] repo=$(pwd)"

echo "[supervised-dry-run] gate: autonomy preflight strict"
node scripts/autonomy_preflight.js --mode supervised --doc-strict --memory-strict

echo "[supervised-dry-run] gate: knowledge base"
node scripts/check_knowledge_base.js

echo "[supervised-dry-run] gate: doc gardener"
node scripts/doc_gardener.js

echo "[supervised-dry-run] PASS"
