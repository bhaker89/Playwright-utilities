#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="${ROOT_DIR}/config/.env.local"
ENV_EXAMPLE="${ROOT_DIR}/config/.env.example"

echo "==> Bootstrap: Playwright-Automation"

if [ ! -f "${ENV_LOCAL}" ]; then
  if [ -f "${ENV_EXAMPLE}" ]; then
    cp "${ENV_EXAMPLE}" "${ENV_LOCAL}"
    echo "✅ Created config/.env.local from config/.env.example"
  else
    echo "❌ Missing config/.env.example (needed to create config/.env.local)"
    exit 1
  fi
else
  echo "✅ config/.env.local already exists"
fi

echo "==> Installing npm dependencies"
npm install

echo "==> Installing Playwright browsers"
npx playwright install

echo "✅ Bootstrap complete"
echo "Next: npm test"