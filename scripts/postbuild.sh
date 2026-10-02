#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# output: "standalone" doesn't copy public/ or .next/static into .next/standalone
# on its own -- that's expected of the deployer (see dockerfile for the prod equivalent).
cp -r public .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static

# Next's image optimizer needs `sharp` at runtime in self-hosted production mode, but
# standalone's own file tracing doesn't reliably create a top-level node_modules/sharp
# symlink for it (it only pulled in an unrelated older transitive copy inside .pnpm/,
# same issue the dockerfile already works around with its own separate `pnpm add sharp`
# step). Installing into a scratch dir sidesteps standalone's traced-but-incomplete
# package.json (it references a local `file:` dependency that doesn't resolve there).
if [ ! -d .next/standalone/node_modules/sharp ]; then
  sharp_version=$(node -e "console.log(require('./package.json').dependencies.sharp.replace(/^[\^~]/, ''))")
  tmp=$(mktemp -d)
  npm install --prefix "$tmp" "sharp@$sharp_version" --no-save --no-audit --no-fund > /dev/null
  cp -r "$tmp/node_modules/sharp" .next/standalone/node_modules/sharp
  [ -d "$tmp/node_modules/@img" ] && cp -r "$tmp/node_modules/@img" .next/standalone/node_modules/@img
  rm -rf "$tmp"
fi
