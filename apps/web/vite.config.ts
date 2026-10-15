import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * SEO: absolute URLs (canonical, og:image, JSON-LD) need the public origin.
 * Set SITE_URL (e.g. SITE_URL=https://example.com pnpm build); robots.txt and
 * sitemap.xml are emitted at build time from the same value.
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
      return e.isDirectory() ? walk(p) : e.name.startsWith('.') ? [] : [p];
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
  const siteUrl = (env.SITE_URL || 'http://localhost:5173').replace(/\/+$/, '');
  if (command === 'build' && !env.SITE_URL) console.warn('[seo] SITE_URL is not set — canonical/og URLs will point at localhost');
  return {
    plugins: [react(), seo(siteUrl), assetList()],
    server: { port: 5173 },
    build: { chunkSizeWarningLimit: 2000 },
  };
});
