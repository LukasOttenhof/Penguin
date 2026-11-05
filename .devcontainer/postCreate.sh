#!/usr/bin/env bash
set -euo pipefail

sudo corepack enable
sudo corepack prepare pnpm@11.10.0 --activate
pnpm install

pnpm --filter aida-instrumentation run build

cd apps/extension
npx --yes @vscode/vsce package --allow-missing-repository --skip-license -o aida-instrumentation.vsix
