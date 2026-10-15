import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_URL } from '../../packages/shared/src/constants';
import { MAP_CATALOG } from '../../packages/shared/src/maps/catalog';

/**
 * public/ files that are dev/tooling-only (never fetched by the game): kept out of dist and
 * out of the precache list. Paths are relative to public/, '/'-separated.
 * - assets/manifests: asset registry for tools/ (runtime keys live in packages/shared)
 * - assets/common/layout, maps/x/x-stations.json: tools/layout-gen output (Tiled/reference; the game builds the tilemap in code)
 * - brand/logo.svg, brand/logo-emblem*: tools/brand sources (the page uses logo.webp/png + icons)
 * - maps not yet released: everything except the home-screen card art (meta/home-bg, meta/thumb)
 */
const LOCKED_MAPS = MAP_CATALOG.filter((m) => !m.available).map((m) => m.slug);
const DEV_ONLY = [
  /(^|\/)\./,
  /^assets\/manifests\//,
  /^assets\/common\/layout\//,
  /^assets\/maps\/[^/]+\/[^/]+-stations\.json$/,
  /^brand\/(logo\.svg|logo-emblem)/,
  ...LOCKED_MAPS.map((slug) => new RegExp(`^assets/maps/${slug}/(?!meta/(home-bg|thumb)\\.webp$)`)),
];
const isDevOnly = (rel: string) => DEV_ONLY.some((re) => re.test(rel));

/** Vite copies all of public/ verbatim; drop the dev-only files from the output afterwards. */
function pruneDevFiles(): Plugin {
  let outDir = '';
  return {
    name: 'prune-dev-files',
    apply: 'build',
    configResolved: (c) => void (outDir = path.resolve(c.root, c.build.outDir)),
    closeBundle() {
      const walk = (dir: string): string[] =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
      let n = 0;
      for (const p of walk(outDir)) {
        if (!isDevOnly(path.relative(outDir, p).split(path.sep).join('/'))) continue;
        fs.rmSync(p);
        n++;
      }
      // remove directories left empty
      const prune = (dir: string): boolean => {
        const empty = fs.readdirSync(dir, { withFileTypes: true }).every((e) => e.isDirectory() && prune(path.join(dir, e.name)));
        if (empty && dir !== outDir) fs.rmdirSync(dir);
        return empty;
      };
      prune(outDir);
      this.info(`removed ${n} dev-only file(s) from ${path.relative(process.cwd(), outDir)}`);
    },
  };
}

/**
 * SEO: absolute URLs (canonical, og:image, JSON-LD) need the public origin.
 * Builds default to GAME_URL (shared constants); override with SITE_URL. robots.txt
 * and sitemap.xml are emitted at build time from the same value.
 */
function seo(siteUrl: string): Plugin {
  return {
    name: 'seo',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n` });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `  <url><loc>${siteUrl}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`,
      });
    },
  };
}

/**
 * `virtual:asset-list`: every file under public/assets (as `/assets/...` URLs) plus a
 * version hash of paths+sizes+mtimes — the loading screen precaches the list, and the
 * hash names the Cache Storage bucket so any asset change invalidates the old cache.
 */
function assetList(): Plugin {
  const ID = 'virtual:asset-list';
  const root = fileURLToPath(new URL('./public', import.meta.url));
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : isDevOnly(path.relative(root, p).split(path.sep).join('/')) ? [] : [p];
    });
  return {
    name: 'asset-list',
    resolveId: (id) => (id === ID ? '\0' + ID : undefined),
    load(id) {
      if (id !== '\0' + ID) return;
      const hash = crypto.createHash('sha1');
      const files = walk(path.join(root, 'assets'))
        .sort()
        .map((p) => {
          const st = fs.statSync(p);
          const url = '/' + path.relative(root, p).split(path.sep).join('/');
          hash.update(`${url}:${st.size}:${st.mtimeMs}\n`);
          return { url, size: st.size };
        });
      return `export const version = ${JSON.stringify(hash.digest('hex').slice(0, 12))};\nexport const files = ${JSON.stringify(files)};`;
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.SITE_URL || (command === 'build' ? GAME_URL : 'http://localhost:5173')).replace(/\/+$/, '');
  return {
    plugins: [react(), seo(siteUrl), assetList(), pruneDevFiles()],
    server: { port: 5173 },
    build: { chunkSizeWarningLimit: 2000 },
  };
});
