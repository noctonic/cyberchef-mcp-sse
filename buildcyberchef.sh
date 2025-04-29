#!/usr/bin/env sh
set -e
# Remove any existing clone for idempotent builds
rm -rf CyberChef
git clone --depth 1 https://github.com/gchq/CyberChef
cd CyberChef
npm ci --ignore-scripts
npm run postinstall
npm run node
# Provide TypeScript declarations for CyberChef Node module
# For ESM .mjs import, generate both index.mjs.d.ts and index.d.ts
echo 'export function bake(input: string, recipe: any[]): { value: string };' > src/node/index.mjs.d.ts
echo 'export function bake(input: string, recipe: any[]): { value: string };' > src/node/index.d.ts
echo "1"
cd ..
