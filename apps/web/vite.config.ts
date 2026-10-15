import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.SITE_URL || 'http://localhost:5173').replace(/\/+$/, '');
  if (command === 'build' && !env.SITE_URL) console.warn('[seo] SITE_URL is not set — canonical/og URLs will point at localhost');
  return {
    plugins: [react(), seo(siteUrl)],
    server: { port: 5173 },
    build: { chunkSizeWarningLimit: 2000 },
  };
});
