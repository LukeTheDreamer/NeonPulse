import { promises as fs } from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const REPO_ROOT = new URL('..', import.meta.url);
const distDir = new URL('../dist/', import.meta.url);

async function rmDist() {
  await fs.rm(distDir, { recursive: true, force: true });
}

async function ensureDist() {
  await fs.mkdir(distDir, { recursive: true });
}

async function copyIntoDist(relativePath) {
  const src = new URL(`../${relativePath}`, import.meta.url);
  const dest = new URL(`../dist/${relativePath}`, import.meta.url);

  await fs.mkdir(path.dirname(dest.pathname), { recursive: true });
  await fs.cp(src, dest, { recursive: true });
}

async function main() {
  // Static-only build: copy the site assets into a clean publish directory
  // so deploys do not include dev dependencies (e.g. node_modules).
  await rmDist();
  await ensureDist();

  await copyIntoDist('index.html');
  await copyIntoDist('css');
  await copyIntoDist('js');

  // JSX-in-.js sources: transpile for the browser at build time so runtime
  // does not depend on Babel.
  const jsRoot = new URL('../js/', import.meta.url);
  const jsEntryPoints = [];

  async function walk(dirUrl) {
    const entries = await fs.readdir(dirUrl, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(new URL(`./${entry.name}/`, dirUrl));
        continue;
      }
      const entryUrl = new URL(`./${entry.name}`, dirUrl);
      if (entry.isFile() && entry.name.endsWith('.js')) {
        jsEntryPoints.push(entryUrl.pathname);
      }
    }
  }

  await walk(jsRoot);

  if (jsEntryPoints.length) {
    await esbuild.build({
      entryPoints: jsEntryPoints,
      outdir: new URL('../dist/', import.meta.url).pathname,
      outbase: new URL('..', import.meta.url).pathname,
      bundle: false,
      platform: 'browser',
      format: 'iife',
      target: ['es2018'],
      loader: { '.js': 'jsx' },
      minify: true,
      legalComments: 'none',
    });
  }
}

await main();
