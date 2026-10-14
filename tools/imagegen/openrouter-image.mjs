#!/usr/bin/env node
// ChatGPT Image via OpenRouter (fallback for the gpt_imagegen plugin when Codex OAuth is unavailable).
// Usage: OPENROUTER_API_KEY=... node tools/imagegen/openrouter-image.mjs <jobs.json>
// jobs.json: [{ "out": "assets/_src/x.png", "prompt": "...", "aspect": "1:1", "images": ["ref.png"] }]
import fs from 'node:fs';
import path from 'node:path';

try {
  for (const line of fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}
const MODEL = process.env.IMAGE_MODEL || 'openai/gpt-5.4-image-2';
const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) {
  console.error('OPENROUTER_API_KEY missing');
  process.exit(1);
}

const jobsFile = process.argv[2];
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));
const concurrency = Number(process.env.CONCURRENCY || 4);
const force = process.env.FORCE === '1';

async function runJob(job) {
  if (!force && fs.existsSync(job.out)) {
    console.log(`skip (exists) ${job.out}`);
    return;
  }
  const content = [{ type: 'text', text: job.prompt }];
  for (const ref of job.images || []) {
    const b64 = fs.readFileSync(ref).toString('base64');
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } });
  }
  const body = {
    model: MODEL,
    modalities: ['image', 'text'],
    messages: [{ role: 'user', content }],
  };
  if (job.aspect) body.image_config = { aspect_ratio: job.aspect };
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!url) throw new Error(`no image: ${JSON.stringify(json).slice(0, 400)}`);
      const b64 = url.split(',')[1];
      fs.mkdirSync(path.dirname(job.out), { recursive: true });
      fs.writeFileSync(job.out, Buffer.from(b64, 'base64'));
      console.log(`ok ${job.out} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
      return;
    } catch (e) {
      console.error(`fail ${job.out} attempt ${attempt}: ${e.message}`);
    }
  }
}

const queue = [...jobs];
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (queue.length) await runJob(queue.shift());
  }),
);
