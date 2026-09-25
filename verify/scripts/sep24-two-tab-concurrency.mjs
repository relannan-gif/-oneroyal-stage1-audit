/**
 * Sep24 services fix-up — two real browser tabs over one localStorage.
 *
 * WHY THIS FILE EXISTS. The independent review reproduced two lost updates
 * that only exist when two tabs of the web preview share one origin
 * (REV-SVC-1, REV-SVC-2): a theme chosen in one tab was put back by a stale
 * account/privacy write from the other, and both tabs were handed the same
 * support reference, one ticket's opening message ending up under the
 * other's subject. The unit tests drive the production stores and adapters
 * as two module registries over one storage map; this runner drives the
 * BUILT preview in Chromium, where `navigator.locks` and localStorage are the
 * browser's own.
 *
 * WHAT IT DOES. One browser context (one origin, one localStorage, one lock
 * manager), two pages, both in the demonstration session:
 *
 *   1. preferences — tab A chooses Light while tab B switches privacy mode on,
 *      at the same moment; then tab A presses Dark, Light, Dark in one burst
 *      while tab B switches reduce motion on. Both tabs reload: each must
 *      show Dark, privacy on and reduce motion on, and the stored record must
 *      say so too;
 *   2. support — both tabs send a new request at the same moment, then each
 *      replies on its own ticket. The two tickets must have different ids
 *      and references. Both tabs reload: each must list both requests, and
 *      each thread must open with its own first message and carry its own
 *      reply and not the other tab's.
 *
 * A check that cannot reach its screen fails with the reason; nothing is
 * skipped. The process exits 1 when any check fails.
 *
 *   node scripts/sep24-two-tab-concurrency.mjs <base-url> [<base-url> …]
 *
 * e.g. `node scripts/sep24-two-tab-concurrency.mjs \
 *   http://localhost:8095/-oneroyal-stage1-audit/shipping \
 *   http://localhost:8095/-oneroyal-stage1-audit/qa`
 *
 * `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` as for the other journey runners
 * (defaults: the sprint's playwright-core and /opt/pw-browsers chromium).
 * `TWO_TAB_OUT_JSON` writes the record to a file as well as stdout.
 *
 * THE RECORD IS A JOURNEYS RECORD TOO (Sep24 final gate `two-tab`). Besides
 * `bases`, it carries what `journey-evidence.mjs` needs to accept it as a
 * full run: the runner's source revision, each served build's manifest
 * (which preview a base is comes from its `build-manifest.json`), the spec
 * (`two-tab` runs on shipping AND qa), `filtered` (non-null when a preview
 * was not given) and one findings row per preview.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { runnerRevision } from './lib/runner-revision.mjs';

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const { chromium } = pw.chromium ? pw : pw.default;

const BASES = process.argv
  .slice(2)
  .concat(process.env.TWO_TAB_BASE ? [process.env.TWO_TAB_BASE] : [])
  .map((b) => b.replace(/\/+$/, ''));
if (BASES.length === 0) {
  console.error('usage: node scripts/sep24-two-tab-concurrency.mjs <base-url> [<base-url> …]');
  process.exit(2);
}

const VIEWPORT = { width: 393, height: 852 };
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

/* ---------------------------------------------------------------------------
   The same interaction helpers the journey runners use
   ------------------------------------------------------------------------ */

/** Restores a route carried in `?r=` the way the published `index.html` does. */
const restoreShim = (prefix) => {
  try {
    const r = new URLSearchParams(location.search).get('r');
    if (!r) return;
    const route = r.charAt(0) === '/' ? r : `/${r}`;
    history.replaceState(null, '', prefix + route);
  } catch {
    /* a sandboxed frame refuses history writes; the preview still opens */
  }
};
const prefixOf = (base) => new URL(base).pathname.replace(/\/+$/, '');
const routeOf = (page, base) => {
  const url = new URL(page.url());
  const prefix = prefixOf(base);
  const path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
  return `${path || '/'}${url.search}`;
};
/** The topmost visible copy of a control (a navigator keeps screens below mounted). */
const onTop = async (page, id) => {
  const loc = page.locator(`[data-testid="${id}"]:visible`);
  const count = await loc.count();
  for (let index = count - 1; index >= 0; index -= 1) {
    const hit = await loc
      .nth(index)
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const cx = Math.min(Math.max(r.x + r.width / 2, 1), window.innerWidth - 1);
        const cy = Math.min(Math.max(r.y + r.height / 2, 1), window.innerHeight - 1);
        const at = document.elementFromPoint(cx, cy);
        return at !== null && (at === el || el.contains(at) || at.contains(el));
      })
      .catch(() => false);
    if (hit) return loc.nth(index);
  }
  return loc.last();
};
const naming = async (id, action) => {
  try {
    return await action();
  } catch (error) {
    throw new Error(`${id}: ${String(error).split('\n')[0]}`);
  }
};
/*
 * ONE PAGE IS IN FRONT AT A TIME. Chromium stops painting a background page,
 * so a step that looks at or presses through a page brings it to the front
 * first. The concurrent presses below do not: they fire the control's click
 * in both pages from script at once (`pressNow`), which a background page
 * handles like any other event — the writes race exactly as two tabs' do.
 */
const front = async (page) => {
  await page.bringToFront();
  await page.waitForTimeout(400);
  // Entering the demo in the OTHER tab re-arms the synthetic-data
  // explanation, and the storage event brings it up here too.
  const intro = page.locator('[data-testid="demo-intro-dismiss"]:visible');
  for (let round = 0; round < 3 && (await intro.count()) > 0; round += 1) {
    await intro
      .last()
      .click({ timeout: 3500 })
      .catch(() => undefined);
    await page.waitForTimeout(600);
  }
};
const pressNow = (page, id) =>
  page.evaluate((testId) => {
    const nodes = [...document.querySelectorAll(`[data-testid="${testId}"]`)];
    const node = nodes[nodes.length - 1];
    if (!node) throw new Error(`no ${testId} on the page`);
    node.click();
  }, id);
const tap = async (page, id, wait = 700) => {
  await front(page);
  let node = await onTop(page, id);
  await node.scrollIntoViewIfNeeded().catch(() => undefined);
  // Once more after clearing the explanation, if it came up over the control.
  const pressed = await node
    .click({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (!pressed) {
    await front(page);
    node = await onTop(page, id);
    await naming(`tap ${id}`, () => node.click({ timeout: 15_000 }));
  }
  await page.waitForTimeout(wait);
};
const fill = async (page, id, value, wait = 250) => {
  await front(page);
  const node = await onTop(page, id);
  await naming(`fill ${id}`, () => node.fill(value, { timeout: 15_000 }));
  await page.waitForTimeout(wait);
};
const appears = async (page, id, timeout = 8000) => {
  await front(page);
  try {
    await page
      .locator(`[data-testid="${id}"]:visible`)
      .first()
      .waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
};
const words = async (page, id) =>
  ((await (await onTop(page, id)).innerText().catch(() => '')) ?? '').replace(/\s+/g, ' ').trim();
/** Whether a toggle or segment reads as on/selected to assistive technology. */
const isOn = async (page, id) => {
  await front(page);
  return (await onTop(page, id)).evaluate((el) => {
    const node = el.closest('[aria-checked],[aria-selected],[aria-pressed]') ?? el;
    const pick = (n) =>
      n.getAttribute('aria-checked') ??
      n.getAttribute('aria-selected') ??
      n.getAttribute('aria-pressed');
    const own = pick(node);
    if (own !== null) return own === 'true';
    const inner = el.querySelector('[aria-checked],[aria-selected],[aria-pressed]');
    return inner ? pick(inner) === 'true' : null;
  });
};

const dismissIntro = async (page) => {
  await page
    .getByTestId('demo-intro-dismiss')
    .last()
    .click({ timeout: 3500 })
    .catch(() => undefined);
  await page.waitForTimeout(500);
};
/** Welcome → demonstration session, as a client enters it. */
const enterDemo = async (page, base) => {
  await page.goto(`${base}/welcome`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await tap(page, 'welcome-demo', 2400);
  await dismissIntro(page);
};
const toHub = async (page, base) => {
  await tap(page, 'tab-hub', 1400);
  if (routeOf(page, base).split('?')[0] !== '/hub') await tap(page, 'tab-hub', 1400);
};
const toSettings = async (page, base) => {
  await toHub(page, base);
  await tap(page, 'hub-app-settings', 1200);
};
const toSupport = async (page, base) => {
  await toHub(page, base);
  await tap(page, 'hub-account', 1200);
  await tap(page, 'hub-support', 1500);
};
/** The stored preference record, as the browser holds it. */
const storedPreferences = (page) =>
  page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null && key.endsWith('oneroyal.preferences')) {
        try {
          return JSON.parse(localStorage.getItem(key) ?? 'null')?.state ?? null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

/* ---------------------------------------------------------------------------
   The run
   ------------------------------------------------------------------------ */

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const RUNNER = runnerRevision(ROOT, [
  new URL(import.meta.url).pathname,
  new URL('./lib/runner-revision.mjs', import.meta.url).pathname,
]);
/** Which preview a base serves, from its own build manifest. */
const PREVIEW_OF = { 'awaiting-approved-content': 'shipping', 'non-production': 'qa' };

const record = {
  runner: 'sep24-two-tab-concurrency',
  startedAt: new Date().toISOString(),
  commit: RUNNER.commit,
  sourceRevision: RUNNER.sourceRevision,
  revisionDeclaration: RUNNER.revisionDeclaration,
  bases: [],
};
let failed = 0;

for (const base of BASES) {
  const result = { base, preview: null, build: null, checks: [], errors: [] };
  record.bases.push(result);
  try {
    const response = await fetch(`${base}/build-manifest.json`);
    if (!response.ok) throw new Error(`build-manifest.json returned ${response.status}`);
    const m = await response.json();
    result.preview = PREVIEW_OF[m.configuration] ?? null;
    result.build = {
      sourceRevision: m.sourceRevision,
      treeRevision: m.treeRevision,
      configuration: m.configuration,
      scopeClean: m.scopeClean ?? null,
    };
  } catch (error) {
    result.errors.push(`manifest: ${String(error).slice(0, 200)}`);
  }
  const check = (name, ok, detail = null) => {
    result.checks.push({ name, ok: Boolean(ok), detail });
    if (!ok) failed += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${name}${detail === null ? '' : `  — ${JSON.stringify(detail)}`}`,
    );
  };
  console.log(`\n== ${base}`);
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'en-GB',
    timezoneId: 'Asia/Beirut',
  });
  await context.addInitScript(() => {
    window.__ONEROYAL_FREEZE_MARKET = true;
  });
  await context.addInitScript(restoreShim, prefixOf(base));
  const a = await context.newPage();
  const b = await context.newPage();
  for (const [name, page] of [
    ['A', a],
    ['B', b],
  ]) {
    page.on('pageerror', (e) => result.errors.push(`${name}: ${String(e).slice(0, 200)}`));
  }

  let step = 'enter the demonstration session in both tabs';
  try {
    await enterDemo(a, base);
    await enterDemo(b, base);
    const locks = await a.evaluate(() => ({
      secureContext: window.isSecureContext,
      webLocks: typeof navigator.locks?.request === 'function',
    }));
    result.environment = locks;
    console.log(`web locks in the page: ${JSON.stringify(locks)}`);

    /* 1. Preferences --------------------------------------------------- */
    step = 'open Settings in both tabs';
    await toSettings(a, base);
    await toSettings(b, base);
    check(
      'both tabs reach Settings',
      (await appears(a, 'settings-theme')) && (await appears(b, 'settings-privacy')),
    );
    // Round 1: Light in A and privacy on in B, pressed together.
    step = 'round 1: Light in A, privacy in B';
    const privacyBefore = await isOn(b, 'settings-privacy');
    await Promise.all([
      pressNow(a, 'settings-theme-light'),
      privacyBefore ? Promise.resolve() : pressNow(b, 'settings-privacy'),
    ]);
    await Promise.all([a.waitForTimeout(1200), b.waitForTimeout(1200)]);
    // Round 2: Dark, Light, Dark in one burst in A while B turns reduce motion on.
    step = 'round 2: Dark, Light, Dark in A, reduce motion in B';
    const motionBefore = await isOn(b, 'settings-reduce-motion');
    await Promise.all([
      a.evaluate(() => {
        const press = (id) => {
          const nodes = [...document.querySelectorAll(`[data-testid="${id}"]`)];
          nodes[nodes.length - 1]?.click();
        };
        press('settings-theme-dark');
        press('settings-theme-light');
        press('settings-theme-dark');
      }),
      motionBefore ? Promise.resolve() : pressNow(b, 'settings-reduce-motion'),
    ]);
    await Promise.all([a.waitForTimeout(1500), b.waitForTimeout(1500)]);
    // Each live tab, before any reload: A's screen must still say Dark — the
    // last thing pressed there — even though B's writes re-hydrated it while
    // A's own burst was still being written.
    result.beforeReload = {
      aDark: await isOn(a, 'settings-theme-dark'),
      bPrivacy: await isOn(b, 'settings-privacy'),
      bReduceMotion: await isOn(b, 'settings-reduce-motion'),
    };
    check(
      'before any reload: tab A shows Dark, tab B shows its privacy and reduce-motion choices',
      result.beforeReload.aDark === true &&
        result.beforeReload.bPrivacy === true &&
        result.beforeReload.bReduceMotion === true,
      result.beforeReload,
    );
    const storedBeforeReload = await storedPreferences(a);
    check(
      'stored: Dark (A), privacy on (B), reduce motion on (B)',
      storedBeforeReload?.theme === 'dark' &&
        storedBeforeReload?.privacyMode === true &&
        storedBeforeReload?.reduceMotion === true,
      storedBeforeReload,
    );
    for (const [name, page] of [
      ['A', a],
      ['B', b],
    ]) {
      step = `reload tab ${name} and open Settings`;
      await enterDemo(page, base);
      await toSettings(page, base);
      const seen = {
        dark: await isOn(page, 'settings-theme-dark'),
        privacy: await isOn(page, 'settings-privacy'),
        reduceMotion: await isOn(page, 'settings-reduce-motion'),
        stored: await storedPreferences(page),
      };
      check(
        `after reload tab ${name} shows Dark, privacy on and reduce motion on`,
        seen.dark === true &&
          seen.privacy === true &&
          seen.reduceMotion === true &&
          seen.stored?.theme === 'dark' &&
          seen.stored?.privacyMode === true &&
          seen.stored?.reduceMotion === true,
        seen,
      );
    }

    /* 2. Support ------------------------------------------------------- */
    const stamp = Date.now().toString(36);
    const request = {
      A: { subject: `Two-tab A ${stamp}`, body: `Opening from tab A ${stamp} — please check.` },
      B: { subject: `Two-tab B ${stamp}`, body: `Opening from tab B ${stamp} — please check.` },
    };
    step = 'open Help and support in both tabs and write the requests';
    await toSupport(a, base);
    await toSupport(b, base);
    for (const [name, page] of [
      ['A', a],
      ['B', b],
    ]) {
      await tap(page, 'support-new-ticket', 900);
      await fill(page, 'support-subject', request[name].subject);
      await fill(page, 'support-body', request[name].body);
    }
    // Sent at the same moment.
    step = 'send both requests';
    await Promise.all([pressNow(a, 'support-send'), pressNow(b, 'support-send')]);
    const threadOf = async (page) => {
      await page
        .waitForURL((url) => /\/hub\/support\/[^/?]+/.test(url.pathname), { timeout: 20_000 })
        .catch(() => undefined);
      const match = /\/hub\/support\/([^/?]+)/.exec(routeOf(page, base));
      return match ? decodeURIComponent(match[1]) : null;
    };
    const [idA, idB] = await Promise.all([threadOf(a), threadOf(b)]);
    check('both requests were sent and opened their threads', idA !== null && idB !== null, {
      idA,
      idB,
      failureA: (await appears(a, 'support-send-failed', 300))
        ? await words(a, 'support-send-failed')
        : null,
      failureB: (await appears(b, 'support-send-failed', 300))
        ? await words(b, 'support-send-failed')
        : null,
    });
    check('the two requests have different ids', idA !== null && idB !== null && idA !== idB, {
      idA,
      idB,
    });
    // Each tab replies on its own ticket, at the same moment.
    step = 'reply in both threads';
    for (const [name, page] of [
      ['A', a],
      ['B', b],
    ]) {
      await appears(page, 'support-reply', 8000);
      await fill(page, 'support-reply', `Reply from tab ${name} ${stamp}`);
    }
    await Promise.all([pressNow(a, 'support-reply-send'), pressNow(b, 'support-reply-send')]);
    await Promise.all([a.waitForTimeout(2500), b.waitForTimeout(2500)]);

    for (const [name, page] of [
      ['A', a],
      ['B', b],
    ]) {
      step = `reload tab ${name} and open Help and support`;
      await enterDemo(page, base);
      await toSupport(page, base);
      const listed = {
        A: idA !== null && (await appears(page, `ticket-${idA}`, 6000)),
        B: idB !== null && (await appears(page, `ticket-${idB}`, 6000)),
      };
      check(
        `after reload tab ${name} lists both requests`,
        idA !== idB && listed.A && listed.B,
        listed,
      );
      for (const [owner, id] of [
        ['A', idA],
        ['B', idB],
      ]) {
        if (id === null) continue;
        const other = owner === 'A' ? 'B' : 'A';
        step = `tab ${name}: open ${owner}'s ticket`;
        const row = await words(page, `ticket-${id}`);
        await tap(page, `ticket-${id}`, 1800);
        const thread = await words(page, 'screen-support-thread');
        const opening = thread.indexOf(request[owner].body);
        check(
          `after reload tab ${name}: ${owner}'s ticket keeps its subject, first message and reply, and nothing of ${other}'s`,
          row.includes(request[owner].subject) &&
            opening >= 0 &&
            thread.indexOf(request[other].body) < 0 &&
            thread.includes(`Reply from tab ${owner} ${stamp}`) &&
            !thread.includes(`Reply from tab ${other} ${stamp}`),
          { row: row.slice(0, 120), thread: thread.slice(0, 400) },
        );
        await page.goBack().catch(() => undefined);
        await page.waitForTimeout(1200);
        if (!(await appears(page, `ticket-${id}`, 1500))) await toSupport(page, base);
      }
    }
  } catch (error) {
    check('the run reached every check', false, `${step}: ${String(error).split('\n')[0]}`);
    if (process.env.TWO_TAB_SHOTS) {
      await a.screenshot({ path: `${process.env.TWO_TAB_SHOTS}/tab-a.png` }).catch(() => undefined);
      await b.screenshot({ path: `${process.env.TWO_TAB_SHOTS}/tab-b.png` }).catch(() => undefined);
    }
  }
  check('no uncaught page errors', result.errors.length === 0, result.errors.slice(0, 5));
  await context.close();
}

await browser.close();
record.finishedAt = new Date().toISOString();
record.failed = failed;
// The journeys-record fields (see the header): one spec on both previews.
const PREVIEWS = ['shipping', 'qa'];
const byPreview = Object.fromEntries(
  record.bases.filter((b) => b.preview).map((b) => [b.preview, b]),
);
const missing = PREVIEWS.filter((p) => !byPreview[p]);
record.filtered =
  missing.length > 0 ? { findings: [], preview: PREVIEWS.find((p) => byPreview[p]) ?? null } : null;
record.builds = Object.fromEntries(Object.entries(byPreview).map(([p, b]) => [p, b.build]));
record.specs = [{ id: 'two-tab', previews: PREVIEWS }];
record.findings = record.bases.map((b) => ({
  id: 'two-tab',
  title: 'Two tabs over one localStorage: preferences and support references',
  preview: b.preview ?? b.base,
  checks: b.checks.map((c) => ({
    name: c.name,
    ok: c.ok,
    detail: c.detail === null ? '' : JSON.stringify(c.detail).slice(0, 300),
  })),
  ok: b.checks.every((c) => c.ok),
}));
record.viewport = VIEWPORT;
record.timezone = 'Asia/Beirut';
record.locale = 'en-GB';
if (process.env.TWO_TAB_OUT_JSON) {
  mkdirSync(dirname(process.env.TWO_TAB_OUT_JSON), { recursive: true });
  writeFileSync(process.env.TWO_TAB_OUT_JSON, `${JSON.stringify(record, null, 2)}\n`);
}
console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : `${failed} CHECK(S) FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
