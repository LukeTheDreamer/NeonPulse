import { promises as fs } from 'node:fs';
import path from 'node:path';

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
}

await main();

