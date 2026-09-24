#!/usr/bin/env node
/**
 * Proves a published preview actually starts, from the address a client uses.
 *
 * WHY. On 21 September both previews were published from exports built for
 * the origin root. Their index pages loaded, their build identity was printed
 * in the site index, the publish register recorded a bundle hash — and the
 * app was a blank page, because the script tag asked the host for
 * `/_expo/...` and got a 404. Nothing in the pipeline had fetched the page
 * the way a browser does. This script does exactly that, against either the
 * live site or a local copy served under the same path prefix:
 *
 *   1. every resource the index references answers 200 and lives under the
 *      preview's own path;
 *   2. the served entry bundle is hashed and compared with the export
 *      manifest (a recomputed digest, not the manifest's own claim);
 *   3. in a real browser: the app renders its build identity, a direct deep
 *      link and a reload of it come back to the same screen through the
 *      404 → `?r=` restore, and Back works — with zero failed requests.
 *
 *   node scripts/verify-deployed-previews.mjs --site <dir> --prefix /<repo>   (local copy)
 *   node scripts/verify-deployed-previews.mjs --url https://host/<repo>        (live)
 *
 * SEP24 (A21.2). Three more things a live verification has to prove, because
 * a served bundle agreeing with the served manifest only proves the host is
 * self-consistent, not that it is serving THIS build:
 *
 *   --expect-revision <sha>   the manifest's source revision and the identity
 *                             the app displays are the declared final revision;
 *   --local-shipping <dir>    every local resource the served index references
 *   --local-qa <dir>          is byte-identical (size and sha256) to the same
 *                             file in the local build of that preview;
 *   --out <file>              where the record is written.
 *
 * A host that cannot be reached is BLOCKED, never passed: the record says
 * `status: "blocked"` with the exact error, and the process exits 3. That
 * holds at EVERY stage — the index, the manifest, each referenced file and
 * the browser's navigations — and the record is always written, whatever
 * goes wrong (REV-GT-7). A run without --expect-revision and both --local-*
 * flags compared nothing that makes it about THIS build: it is recorded as
 * `status: "incomplete"` and exits 4, never "passed".
 *
 * Results: docs/registers/deployed-previews-verification.json (or --out), one
 * row per preview and check. A failed check exits 1.
 */
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import {
  EXIT_CODES,
  missingComparisons,
  verificationStatus,
} from './deployed-verification-status.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const arg = (name) => {
  const at = process.argv.indexOf(name);
  return at === -1 ? null : process.argv[at + 1];
};
const site = arg('--site');
const prefixArg = arg('--prefix');
const liveUrl = arg('--url');
const expectRevision = arg('--expect-revision');
const localBuild = { shipping: arg('--local-shipping'), qa: arg('--local-qa') };
const outArg = arg('--out');
if (!liveUrl && !(site && prefixArg)) {
  console.error(
    'usage: verify-deployed-previews.mjs --site <dir> --prefix /<repo> | --url https://host/<repo>',
  );
  process.exit(2);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

/**
 * A GitHub-Pages-shaped server for a local site copy: the site is mounted
 * under the prefix, a directory serves its index.html, and any path that is
 * not a file answers 404 with the site's 404.html — which is what makes the
 * deep-link reload path real rather than a friendlier fallback.
 */
function serve(dir, prefix) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const pathname = decodeURIComponent(url.pathname);
      const send = (status, file) => {
        const body = readFileSync(file);
        res.writeHead(status, {
          'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
        });
        res.end(body);
      };
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not under the site prefix');
        return;
      }
      const rel = normalize(pathname.slice(prefix.length) || '/').replace(/^(\.\.[/\\])+/, '');
      let file = join(dir, rel);
      const kind = (path) => {
        try {
          const info = statSync(path);
          return info.isDirectory() ? 'dir' : info.isFile() ? 'file' : 'none';
        } catch {
          return 'none';
        }
      };
      if (kind(file) === 'dir') file = join(file, 'index.html');
      if (kind(file) === 'file') return send(200, file);
      const notFound = join(dir, '404.html');
      if (existsSync(notFound)) return send(404, notFound);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');
const results = [];
const record = (preview, check, ok, detail) => {
  results.push({ preview, check, ok, detail });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${preview} · ${check}${detail ? ` — ${detail}` : ''}`);
};
/** Exact errors of a host that could not be reached. Any one makes the run BLOCKED. */
const blocked = [];
const describeError = (error) => {
  const cause = error?.cause;
  return [
    String(error?.message ?? error),
    cause ? `cause: ${cause.code ?? ''} ${cause.message ?? cause}`.trim() : null,
  ]
    .filter(Boolean)
    .join(' — ');
};

let server = null;
let origin;
let prefix;
if (liveUrl) {
  const url = new URL(liveUrl);
  origin = url.origin;
  prefix = url.pathname.replace(/\/+$/, '');
} else {
  prefix = `/${prefixArg.replace(/^\/+|\/+$/g, '')}`;
  server = await serve(site, prefix);
  origin = `http://127.0.0.1:${server.address().port}`;
}

/** A host that could not be reached; the run is BLOCKED, not failed. */
class Unreachable extends Error {
  constructor(url, error) {
    super(error);
    this.url = url;
  }
}
/** Records one unreachable stage: BLOCKED with the exact error. */
const recordBlocked = (preview, url, error) => {
  const detail = `${url} could not be fetched: ${error}`;
  blocked.push({ preview, url, error });
  results.push({ preview, check: 'host reachable', ok: false, blocked: true, detail });
  console.log(`BLKD ${preview} · host reachable — ${detail}`);
};

const fetchOk = async (path) => {
  const url = `${origin}${path}`;
  let response;
  let body;
  try {
    response = await fetch(url, { redirect: 'manual' });
    body = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    // Any network failure, at any stage, is unreachable — never a crash.
    throw new Unreachable(url, describeError(error));
  }
  /*
   * An egress proxy's refusal is not the site's answer: it names itself with
   * `x-deny-reason` (or is a 407). Reported as unreachable, so the run is
   * BLOCKED with the proxy's exact words rather than failing checks as if
   * the site had answered 403.
   */
  const denied = response.headers.get('x-deny-reason');
  if (denied || response.status === 407)
    throw new Unreachable(
      url,
      `egress refused (${response.status}${denied ? `, x-deny-reason: ${denied}` : ''}): ${body.toString('utf8').trim()}`,
    );
  return { status: response.status, body };
};

async function verifyPreview(preview) {
  const base = `${prefix}/${preview}`;
  const index = await fetchOk(`${base}/`);
  record(preview, 'index answers 200', index.status === 200, `status ${index.status}`);
  const html = index.body.toString('utf8');
  const manifestResponse = await fetchOk(`${base}/build-manifest.json`);
  let manifest = null;
  if (manifestResponse.status === 200) {
    try {
      manifest = JSON.parse(manifestResponse.body.toString('utf8'));
    } catch {
      manifest = null;
    }
  }
  record(preview, 'build manifest served', manifest !== null, `status ${manifestResponse.status}`);
  if (manifest) {
    record(
      preview,
      'manifest base path is the published path',
      manifest.basePath === base,
      `manifest ${manifest.basePath}, published ${base}`,
    );
    if (expectRevision)
      record(
        preview,
        'manifest names the declared final revision',
        manifest.sourceRevision === expectRevision,
        `manifest ${manifest.sourceRevision}, declared ${expectRevision}`,
      );
  } else if (expectRevision) {
    record(preview, 'manifest names the declared final revision', false, 'no manifest served');
  }
  const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  const local = references.filter((ref) => ref.startsWith('/') && !ref.startsWith('//'));
  const outside = local.filter((ref) => !ref.startsWith(`${base}/`));
  record(
    preview,
    'every local reference is under the preview path',
    outside.length === 0,
    outside.join(', ') || `${local.length} references`,
  );
  let allServed = true;
  const served = [];
  for (const ref of local) {
    const path = ref.split(/[?#]/)[0];
    const response = await fetchOk(path);
    served.push({
      path,
      status: response.status,
      bytes: response.body.length,
      sha256: sha256(response.body),
    });
    if (response.status !== 200) allServed = false;
  }
  record(
    preview,
    'every referenced resource answers 200',
    allServed,
    served.map((s) => `${s.status} ${s.path}`).join('; '),
  );
  /*
   * THE SERVED BYTES ARE THE LOCAL BUILD'S BYTES (Sep24 A21.2). Each local
   * reference is looked up at the same relative path in the local export and
   * compared by size and sha256; the JS entry bundle must be among them.
   */
  if (localBuild[preview]) {
    const compared = served.map((s) => {
      const file = join(localBuild[preview], s.path.slice(base.length + 1));
      const localBytes = existsSync(file) ? readFileSync(file) : null;
      return {
        ...s,
        localBytes: localBytes?.length ?? null,
        localSha256: localBytes ? sha256(localBytes) : null,
      };
    });
    const mismatched = compared.filter(
      (c) => c.localSha256 === null || c.localSha256 !== c.sha256 || c.localBytes !== c.bytes,
    );
    const js = compared.filter((c) => c.path.endsWith('.js'));
    record(
      preview,
      'served bytes equal the local build (size and sha256 of every referenced file)',
      compared.length > 0 && js.length > 0 && mismatched.length === 0,
      mismatched.length
        ? mismatched
            .map(
              (c) =>
                `${c.path}: served ${c.bytes} B ${c.sha256.slice(0, 16)}, local ${c.localBytes ?? 'absent'} B ${c.localSha256?.slice(0, 16) ?? ''}`,
            )
            .join('; ')
        : js.map((c) => `${c.path} ${c.bytes} B ${c.sha256}`).join('; '),
    );
    results.at(-1).files = compared;
  }
  if (manifest?.bundle?.path) {
    const bundle = served.find((s) => s.path === `${base}/${manifest.bundle.path}`) ?? null;
    record(
      preview,
      'served entry bundle hashes as the manifest says',
      bundle !== null && bundle.sha256 === manifest.bundle.sha256,
      bundle
        ? `served ${bundle.sha256.slice(0, 16)}, manifest ${manifest.bundle.sha256.slice(0, 16)}`
        : 'bundle not among the index references',
    );
  }

  // The browser part: does the application start, and do links and reloads work?
  const playwrightModule = process.env.PLAYWRIGHT_MODULE ?? 'playwright';
  let playwright = null;
  try {
    const loaded = await import(playwrightModule);
    playwright = loaded.chromium ? loaded : loaded.default;
    if (!playwright?.chromium) throw new Error('no chromium export');
  } catch {
    record(preview, 'browser checks', false, `playwright not available (${playwrightModule})`);
  }
  let browser = null;
  if (playwright) {
    try {
      browser = await playwright.chromium.launch({
        executablePath: process.env.CHROMIUM_PATH || undefined,
        headless: true,
      });
    } catch (error) {
      record(preview, 'browser checks', false, `browser did not start: ${describeError(error)}`);
    }
  }
  if (browser) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const failed = [];
    const unreachable = [];
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText ?? '';
      // A connection that could not be made is the host unreachable, not the
      // site's answer; an aborted request stays a failure as before.
      if (/net::ERR_/.test(reason) && !/ERR_ABORTED/.test(reason))
        unreachable.push({ url: request.url(), error: reason });
      else failed.push(`failed ${request.url()}`);
    });
    const restores = [];
    page.on('response', (response) => {
      if (response.status() < 400) return;
      // A route reload on GitHub Pages IS a 404: the host serves 404.html,
      // which sends the browser back to the preview with ?r=. That document
      // 404 is the mechanism working, so it is counted, not failed.
      const isRouteRestore =
        response.status() === 404 &&
        response.request().resourceType() === 'document' &&
        new URL(response.url()).pathname.startsWith(`${base}/`);
      if (isRouteRestore) restores.push(new URL(response.url()).pathname);
      else failed.push(`${response.status()} ${response.url()}`);
    });
    const identity = manifest ? `${manifest.sourceRevision.slice(0, 7)}` : null;
    const waitIdentity = async () => {
      const line = page.locator('[data-testid="welcome-build-identity"]');
      await line.first().waitFor({ state: 'attached', timeout: 30000 });
      return (await line.first().innerText()).trim();
    };
    try {
      await page.goto(`${origin}${base}/`, { waitUntil: 'load' });
      const text = await waitIdentity();
      record(
        preview,
        'app renders its build identity at the root',
        identity !== null && text.includes(identity),
        text,
      );
      if (expectRevision)
        record(
          preview,
          'the displayed identity is the declared final revision',
          text.includes(expectRevision.slice(0, 7)),
          `displayed "${text}", declared ${expectRevision.slice(0, 7)}`,
        );
      const rootPath = new URL(page.url()).pathname;
      record(
        preview,
        'root URL stays under the preview path',
        rootPath.startsWith(`${base}/`),
        rootPath,
      );

      // Direct deep link: not a file on the host → 404.html → ?r= → restored.
      await page.goto(`${origin}${base}/login`, { waitUntil: 'load' });
      await waitIdentity().catch(() => '');
      await page.waitForTimeout(1500);
      const deep = new URL(page.url());
      record(
        preview,
        'deep link restores to its route',
        deep.pathname === `${base}/login` && !deep.search.includes('r='),
        `${deep.pathname}${deep.search}`,
      );

      await page.reload({ waitUntil: 'load' });
      await page.waitForTimeout(1500);
      const reloaded = new URL(page.url());
      record(
        preview,
        'reload of a deep link comes back to the same route',
        reloaded.pathname === `${base}/login`,
        `${reloaded.pathname}${reloaded.search}`,
      );

      await page.goBack({ waitUntil: 'load' }).catch(() => null);
      await page.waitForTimeout(800);
      const back = new URL(page.url()).pathname;
      record(preview, 'Back stays inside the preview', back.startsWith(`${base}`), back);
    } catch (error) {
      const message = String(error.message ?? error);
      const net = message.match(/net::ERR_[A-Z_]+/);
      if (net && net[0] !== 'net::ERR_ABORTED')
        unreachable.push({ url: `${origin}${base}/`, error: message.split('\n')[0] });
      else record(preview, 'browser journey', false, message.slice(0, 200));
    }
    for (const u of unreachable) recordBlocked(preview, u.url, u.error);
    record(
      preview,
      'no failed resource requests during the journey',
      failed.filter((f) => !/favicon/.test(f)).length === 0,
      failed.slice(0, 5).join('; ') ||
        `none; ${restores.length} route reload(s) restored through 404.html`,
    );
    await browser.close();
  }
}

for (const preview of ['shipping', 'qa']) {
  try {
    await verifyPreview(preview);
  } catch (error) {
    // Unreachable is not a result about the site: BLOCKED, with the exact
    // error. Anything else is a failure of the run — recorded, not a crash.
    if (error instanceof Unreachable) recordBlocked(preview, error.url, error.message);
    else
      record(preview, 'verification ran to completion', false, describeError(error).slice(0, 300));
  }
}

if (server) server.close();
const out = outArg ?? join(ROOT, 'docs/registers/deployed-previews-verification.json');
const failedCount = results.filter((r) => !r.ok && !r.blocked).length;
const missing = missingComparisons({ expectRevision, localBuild });
const summary = {
  kind: 'oneroyal.deployed-previews-verification',
  // blocked: a host could not be reached — never a pass, never a product failure.
  // incomplete: no revision/byte comparison was asked for — never a pass either.
  status: verificationStatus({ failed: failedCount, blocked: blocked.length, missing }),
  missingComparisons: missing,
  blocked,
  expectRevision: expectRevision ?? null,
  localBuild,
  verifiedAt: new Date().toISOString(),
  target:
    liveUrl ??
    `${site} served locally under ${prefix} (GitHub-Pages-shaped: directory index, 404.html for non-files)`,
  live: Boolean(liveUrl),
  checks: results.length,
  failed: failedCount,
  results,
};
writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`);
console.log(
  `${summary.checks} checks, ${summary.failed} failed, ${blocked.length} blocked (${summary.status}) → ${out}`,
);
if (missing.length)
  console.log(`incomplete: not compared without ${missing.join(', ')} — not a pass`);
process.exit(EXIT_CODES[summary.status]);
