/**
 * Sep22 consuming-UI journeys — the retest the independent audit withheld.
 *
 * WHY THIS FILE EXISTS. The Sep22 closure matrix left a set of findings in
 * IMPLEMENTED_RETEST_PENDING: the repair is in the source, and the auditor
 * verified it there, but the consuming screen was never driven because both
 * published previews were blank. Source verification says the code changed;
 * it does not say a client pressing the control gets the repaired outcome.
 * Each journey below walks the real screen the finding names, performs the
 * interaction the auditor said was not exercised, and asserts the REPAIRED
 * behaviour — with the variation the auditor's reason names (reload, Back,
 * locale/RTL, theme, keyboard, account state, error and retry, the clock).
 *
 * HOW A JOURNEY IS ALLOWED TO REACH A SCREEN. By pressing what a client can
 * see, from `/welcome`, the way `journey-checks.mjs` insists on. A reload is
 * a real reload: on GitHub Pages a deep route is served by `404.html`, which
 * bounces to `/?r=<route>`, and the published `index.html` carries a shim
 * that restores the route before the bundle evaluates. A raw export lacks
 * that shim, so this runner installs the same one through `addInitScript`;
 * it is a no-op on a page that already has it. A reload also ends the
 * session by design (tokens are never written down), so what a reload proves
 * is what the durable modules kept for the remembered identity.
 *
 * WHAT A FAILED CHECK MEANS. A journey that cannot reach its screen records a
 * failed check with the reason — never a skip counted as a pass. A variation
 * the auditor named that no control on the build can drive (a failing save
 * the mock has no trigger for, a scheduler no screen invokes) is recorded as
 * a BLOCKED check: it is not a pass, it is counted on its own line rather
 * than as a failure of the repaired behaviour, and the reason says what would
 * be needed to close it. The process exits non-zero when any check fails or
 * is blocked (Sep24 A20.2: blocked is not a pass).
 *
 * `JOURNEYS_OUT_JSON` / `JOURNEYS_OUT_DIR` write the record somewhere other
 * than the Sep22 folder, so a later sprint's run does not overwrite it.
 *
 * Two previews, one run. `JOURNEYS_BASE` is the shipping export and
 * `JOURNEYS_BASE_NONPROD` the QA export. A base may carry a path prefix
 * (`http://host/-oneroyal-stage1-audit/qa`); every route assertion compares
 * pathnames RELATIVE to the base. A finding that only applies to one preview
 * says so with `preview: 'qa'`; everything else runs on both.
 *
 *   JOURNEYS_BASE=http://localhost:8095/-oneroyal-stage1-audit/shipping \
 *   JOURNEYS_BASE_NONPROD=http://localhost:8095/-oneroyal-stage1-audit/qa \
 *   PLAYWRIGHT_MODULE=… CHROMIUM_PATH=… node scripts/sep22-consuming-journeys.mjs
 *
 * `JOURNEYS_ONLY=F09|F13` runs a subset while reproducing one failure; a
 * filtered run announces itself and is not evidence.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { runnerRevision } from './lib/runner-revision.mjs';

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const { chromium } = pw.chromium ? pw : pw.default;

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const OUT_JSON =
  process.env.JOURNEYS_OUT_JSON ??
  join(ROOT, 'docs', 'repair-sprint', 'sep22', 'consuming-journeys.json');
const OUT_DIR =
  process.env.JOURNEYS_OUT_DIR ??
  join(ROOT, 'docs', 'repair-sprint', 'sep22', 'consuming-journeys');

const BASES = {
  shipping: process.env.JOURNEYS_BASE ?? null,
  qa: process.env.JOURNEYS_BASE_NONPROD ?? null,
};
if (!BASES.shipping || !BASES.qa) {
  console.error(
    'Set JOURNEYS_BASE (the shipping export) and JOURNEYS_BASE_NONPROD (the QA export). ' +
      'Both previews are required: the findings apply to both.',
  );
  process.exit(2);
}
for (const key of Object.keys(BASES)) BASES[key] = BASES[key].replace(/\/+$/, '');

/**
 * EACH BASE MUST BE SERVING THE BUILD IT NAMES. A run that points the shipping
 * variable at the QA export reports the QA banner as a regression and the
 * fail-closed onboarding as broken — harness errors that read like product
 * ones. So each base states its configuration before anything runs.
 */
const EXPECTED_CONFIGURATION = { shipping: 'awaiting-approved-content', qa: 'non-production' };
const manifests = {};
for (const [preview, base] of Object.entries(BASES)) {
  try {
    const response = await fetch(`${base}/build-manifest.json`);
    if (!response.ok) throw new Error(`build-manifest.json returned ${response.status}`);
    manifests[preview] = await response.json();
  } catch (error) {
    console.error(`${preview} ${base}: cannot read build-manifest.json (${error.message})`);
    process.exit(2);
  }
  if (manifests[preview].configuration !== EXPECTED_CONFIGURATION[preview]) {
    console.error(
      `${preview} ${base} is serving the ${manifests[preview].configuration} build; ` +
        `expected ${EXPECTED_CONFIGURATION[preview]}.`,
    );
    process.exit(2);
  }
  console.log(`${preview}: ${base} — ${manifests[preview].configuration}`);
}

/**
 * The commit of the tree the runner is in, and the last commit that touched
 * what ships (see lib/runner-revision.mjs for the declared form used off-repo).
 */
const RUNNER = runnerRevision(ROOT, [
  new URL(import.meta.url).pathname,
  new URL('./lib/runner-revision.mjs', import.meta.url).pathname,
]);
const COMMIT = RUNNER.commit;
const SOURCE_REVISION = RUNNER.sourceRevision;

const VIEWPORT = { width: 393, height: 852 };
const DEFAULT_TIMEZONE = 'Asia/Beirut';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const ONLY = (process.env.JOURNEYS_ONLY ?? '').split('|').filter(Boolean);
/** `JOURNEYS_PREVIEW=qa|shipping` narrows a reproduction to one preview. */
const ONLY_PREVIEW = process.env.JOURNEYS_PREVIEW ?? null;
if (ONLY.length > 0 || ONLY_PREVIEW) {
  console.log(
    `FILTERED RUN — ${ONLY.length > 0 ? `only ${ONLY.join(', ')}` : 'every finding'}${
      ONLY_PREVIEW ? ` on ${ONLY_PREVIEW} only` : ''
    }. Not evidence.\n`,
  );
}

// A full run starts clean; a filtered reproduction only replaces its own files.
if (ONLY.length === 0 && !ONLY_PREVIEW) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

/* ---------------------------------------------------------------------------
   The route-restore shim, and how a page is opened
   ------------------------------------------------------------------------ */

/**
 * Restores a route carried in `?r=` the way the published `index.html` does,
 * so a deep link and a reload behave here as they do on Pages. Idempotent:
 * once the query is gone the published shim finds nothing to restore.
 */
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

/** The route relative to the preview's base: `/trade?tab=history`, never the prefix. */
const routeOf = (page, base) => {
  const url = new URL(page.url());
  const prefix = prefixOf(base);
  const path = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : url.pathname;
  return `${path || '/'}${url.search}`;
};

/* ---------------------------------------------------------------------------
   Interaction helpers — the copy of a control a thumb would reach
   ------------------------------------------------------------------------ */

/**
 * The topmost visible copy. A navigator keeps the screens below the current
 * one mounted, so after Back there are two copies of a control and the first
 * belongs to a screen nobody is looking at. Each visible candidate is
 * hit-tested at its own centre; the last visible copy is the fallback for a
 * control that is off-screen until scrolled to.
 */
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
/** A helper's failure names the control, so a timeout says which press failed. */
const naming = async (id, action) => {
  try {
    return await action();
  } catch (error) {
    throw new Error(`${id}: ${String(error).split('\n')[0]}`);
  }
};
const tap = async (page, id, wait = 700) => {
  const node = await onTop(page, id);
  await node.scrollIntoViewIfNeeded().catch(() => undefined);
  await naming(`tap ${id}`, () => node.click({ timeout: 15_000 }));
  await page.waitForTimeout(wait);
};
/** Presses a control that may be disabled, to show what pressing it does. */
const press = async (page, id, wait = 700) => {
  await (await onTop(page, id)).click({ force: true, timeout: 5_000 }).catch(() => undefined);
  await page.waitForTimeout(wait);
};
const fill = async (page, id, value, wait = 250) => {
  const node = await onTop(page, id);
  await naming(`fill ${id}`, () => node.fill(value, { timeout: 15_000 }));
  await page.waitForTimeout(wait);
};
const seen = async (page, id) => (await page.locator(`[data-testid="${id}"]:visible`).count()) > 0;
const mountedCount = (page, id) => page.locator(`[data-testid="${id}"]`).count();
/** Seen, allowing for a render that has not finished yet. */
const appears = async (page, id, timeout = 8000) => {
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
/** The first painted background under the middle of the viewport: the theme's canvas. */
const canvasColor = (page) =>
  page.evaluate(() => {
    let node = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)') return bg;
      node = node.parentElement;
    }
    return null;
  });
/** The header's title and subtitle together: the subtitle is the title's sibling. */
const headerWords = async (page) =>
  (
    (await (
      await onTop(page, 'screen-header-title')
    )
      .locator('xpath=..')
      .innerText()
      .catch(() => '')) ?? ''
  )
    .replace(/\s+/g, ' ')
    .trim();
const value = async (page, id) => (await onTop(page, id)).inputValue().catch(() => '');
const attr = async (page, id, name) => (await onTop(page, id)).getAttribute(name).catch(() => null);
const isDisabled = async (page, id) => {
  const node = await onTop(page, id);
  const aria = await node.getAttribute('aria-disabled').catch(() => null);
  return aria === 'true' || (await node.isDisabled().catch(() => false));
};
const selected = async (page, id) => (await attr(page, id, 'aria-selected')) === 'true';
const checked = async (page, id) => (await attr(page, id, 'aria-checked')) === 'true';
const box = async (page, id) => (await onTop(page, id)).boundingBox().catch(() => null);
const idsWithPrefix = (page, prefix) =>
  page.$$eval(`[data-testid^="${prefix}"]`, (els) => els.map((e) => e.getAttribute('data-testid')));
const back = async (page, wait = 1600) => {
  const node = await onTop(page, 'header-back');
  await naming('tap header-back', () => node.click({ timeout: 15_000 }));
  await page.waitForTimeout(wait);
};
/** Picks an option from a SearchPicker: open it, choose the option. */
const pick = async (page, id, option, wait = 500) => {
  await tap(page, id, 400);
  await tap(page, `${id}-option-${option}`, wait);
};
/** Puts a file into the app's real file input after a screen opened the chooser. */
const attachFile = async (page, name, sizeBytes, mimeType = 'image/jpeg') => {
  await page.waitForSelector('#oneroyal-file-input', { state: 'attached', timeout: 8_000 });
  await page.setInputFiles('#oneroyal-file-input', {
    name,
    mimeType,
    buffer: Buffer.alloc(sizeBytes, 1),
  });
  await page.waitForTimeout(800);
};
/**
 * Activates a control from the keyboard: focus it and press Enter. A control
 * that is a real button answers; a Text with an onPress does not, which was
 * F59's defect.
 */
const keyActivate = async (page, id, key = 'Enter', wait = 900) => {
  await (await onTop(page, id)).focus();
  await page.keyboard.press(key);
  await page.waitForTimeout(wait);
};

/* ---------------------------------------------------------------------------
   Sessions and navigation by interaction
   ------------------------------------------------------------------------ */

const dismissIntro = async (page) => {
  await page
    .getByTestId('demo-intro-dismiss')
    .last()
    .click({ timeout: 3500 })
    .catch(() => undefined);
  await page.waitForTimeout(500);
};

/** Opens the welcome screen and enters the demonstration session. */
const enterDemo = async (page, base) => {
  await page.goto(`${base}/welcome`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await tap(page, 'welcome-demo', 2400);
  await dismissIntro(page);
};

/**
 * A full reload onto a route, as a client who refreshes the browser gets it:
 * the 404 bounce, the restore shim, a fresh bundle, no session tokens, the
 * remembered identity. Returns the route that was actually restored.
 */
const reloadOnto = async (page, base, route) => {
  await page.goto(`${base}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  return routeOf(page, base);
};

const TAB_ROOT = {
  'tab-home': '/home',
  'tab-markets': '/markets',
  'tab-trade': '/trade',
  'tab-coach': '/coach',
  'tab-hub': '/hub',
};
/** Presses a primary tab; a second press pops the tab to its root. */
const toTab = async (page, base, id, wait = 1400) => {
  await page.locator(`[data-testid="${id}"]:visible`).last().click({ timeout: 15_000 });
  await page.waitForTimeout(wait);
  if (routeOf(page, base).split('?')[0] !== TAB_ROOT[id]) {
    await page.locator(`[data-testid="${id}"]:visible`).last().click({ timeout: 15_000 });
    await page.waitForTimeout(wait);
  }
};
const toHub = (page, base) => toTab(page, base, 'tab-hub');
const toTrade = (page, base) => toTab(page, base, 'tab-trade', 1800);
const toMarkets = (page, base) => toTab(page, base, 'tab-markets', 1600);
const toCoach = (page, base) => toTab(page, base, 'tab-coach', 1600);
const toFunds = async (page, base) => {
  await toHub(page, base);
  await tap(page, 'hub-funds', 1400);
};
const toSettings = async (page, base) => {
  await toHub(page, base);
  await tap(page, 'hub-app-settings', 1200);
};
const switchLanguage = async (page, base, code) => {
  await toSettings(page, base);
  await tap(page, 'settings-language', 700);
  await tap(page, `language-option-${code}`, 1600);
};

/** Signs up a fresh applicant from the welcome screen (QA build). */
const signUp = async (page, base, { corporate = false, email }) => {
  await page.goto(`${base}/welcome`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await tap(page, 'welcome-signup', 1000);
  if (corporate) await tap(page, 'signup-applicant-kind-corporate', 400);
  await fill(page, 'signup-email', email);
  await fill(page, 'signup-password', 'Passw0rdish');
  await tap(page, 'signup-submit', 2200);
};
const pickDateOfBirth = async (page, year = 1988) => {
  await tap(page, 'application-dob', 700);
  await tap(page, 'date-picker-year-toggle', 500);
  await tap(page, `date-picker-year-${year}`, 500);
  const month = String(new Date().getUTCMonth() + 1).padStart(2, '0');
  await tap(page, `date-picker-day-${year}-${month}-15`, 700);
};
/**
 * Opens and accepts every required document the screen lists, the way a
 * client would: open, then accept. The set is read from the screen (the
 * corporate application lists its own), never assumed.
 */
const acceptDocuments = async (page) => {
  const slugs = [...new Set(await idsWithPrefix(page, 'legal-open-'))].map((id) =>
    id.replace('legal-open-', ''),
  );
  for (const slug of slugs) {
    if (!(await seen(page, `legal-accept-${slug}`))) continue;
    await tap(page, `legal-open-${slug}`, 300);
    await tap(page, 'sheet-close', 250).catch(() => undefined);
    if (await seen(page, `legal-accept-${slug}`)) await tap(page, `legal-accept-${slug}`, 250);
  }
  return slugs;
};
/** Step 1 of the individual application, submitted. Leaves the client on Status. */
const completeStep1 = async (page) => {
  await fill(page, 'application-first-name', 'Amina');
  await fill(page, 'application-last-name', 'Haddad');
  await pickDateOfBirth(page);
  await tap(page, 'wizard-continue');
  await fill(page, 'application-phone', '500000000');
  await tap(page, 'wizard-continue');
  await pick(page, 'application-nationality', 'AE');
  await pick(page, 'application-country', 'AE');
  await tap(page, 'wizard-continue');
  await tap(page, 'choice-en', 800);
  await tap(page, 'wizard-continue', 800);
  await acceptDocuments(page);
  await tap(page, 'wizard-continue', 2600);
};
/** Step 2, submitted. Leaves the client on the verification screen. */
const completeStep2 = async (page) => {
  await pick(page, 'profile-country', 'AE');
  await fill(page, 'profile-address-line', '12 Marina Walk');
  await fill(page, 'profile-city', 'Dubai');
  await fill(page, 'profile-postcode', '00000');
  await tap(page, 'wizard-continue');
  await tap(page, 'choice-full-time', 500);
  await pick(page, 'profile-industry', 'it');
  await tap(page, 'wizard-continue');
  await tap(page, 'choice-25k-50k', 400);
  await tap(page, 'choice-50k-100k', 400);
  await tap(page, 'wizard-continue');
  await tap(page, 'choice-salary', 400);
  await tap(page, 'wizard-continue');
  await tap(page, 'choice-fx', 500);
  await tap(page, 'choice-3-5', 400);
  await tap(page, 'wizard-continue');
  await tap(page, 'choice-speculate', 800);
  await page.getByTestId('profile-pep').getByTestId('choice-no').click();
  await page.waitForTimeout(250);
  await page.getByTestId('profile-us-person').getByTestId('choice-no').click();
  await page.waitForTimeout(250);
  await pick(page, 'profile-tax-country', 'AE');
  await page.getByTestId('profile-has-tin').getByTestId('choice-yes').click();
  await page.waitForTimeout(250);
  await fill(page, 'profile-tin', '784198812345678');
  await tap(page, 'wizard-continue', 700);
  await tap(page, 'wizard-continue', 2600);
};
/** A fresh applicant, taken to the verification method choice. */
const freshApplicantAtVerification = async (page, base, j, email) => {
  await signUp(page, base, { email });
  await completeStep1(page);
  j.check('step 1 lands on the status screen', await seen(page, 'screen-onboarding-status'));
  await tap(page, 'onboarding-status-next', 1600);
  await completeStep2(page);
  j.check('step 2 lands on verification', await appears(page, 'screen-onboarding-verify'));
};

/**
 * Samples a control's words repeatedly while a screen settles, so a value
 * that is painted for one frame — a raw account id while the accounts query
 * is still on its way (F13) — is caught rather than missed.
 */
const sampleWords = async (page, id, ms = 1500, every = 100) => {
  const samples = new Set();
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const text = await page
      .locator(`[data-testid="${id}"]`)
      .last()
      .innerText()
      .catch(() => null);
    if (text !== null) samples.add(text.replace(/\s+/g, ' ').trim());
    await page.waitForTimeout(every);
  }
  return [...samples];
};

const RAW_ACCOUNT_ID = /\bacc-[a-z0-9-]+/i;

/* ---------------------------------------------------------------------------
   Recording
   ------------------------------------------------------------------------ */

const records = [];

const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

function recorder(finding, preview) {
  const record = {
    id: finding.id,
    title: finding.title,
    preview,
    steps: [],
    checks: [],
    screenshots: [],
    ok: true,
  };
  records.push(record);
  const j = {
    record,
    step(text) {
      record.steps.push(text);
      console.log(`     · ${text}`);
    },
    check(name, ok, detail = '') {
      const entry = { name, ok: Boolean(ok), detail: String(detail ?? '').slice(0, 240) };
      record.checks.push(entry);
      if (!entry.ok) record.ok = false;
      console.log(
        `  ${entry.ok ? 'ok  ' : 'FAIL'} ${finding.id}/${preview} · ${name}${entry.detail ? ` — ${entry.detail}` : ''}`,
      );
      return entry.ok;
    },
    /**
     * A named variation the build offers no control for. Fails, and says
     * what would close it, so it is never mistaken for a pass or for a
     * product defect.
     */
    blocked(name, reason) {
      const entry = { name, ok: false, blocked: true, detail: String(reason).slice(0, 240) };
      record.checks.push(entry);
      record.ok = false;
      console.log(`  BLKD ${finding.id}/${preview} · ${name} — ${entry.detail}`);
      return false;
    },
    async shot(page, label) {
      const file = `${finding.id}-${preview}-${slug(label)}.png`;
      await page.screenshot({ path: join(OUT_DIR, file), fullPage: false }).catch(() => undefined);
      record.screenshots.push(file);
      return file;
    },
  };
  return j;
}

/* ---------------------------------------------------------------------------
   Contexts
   ------------------------------------------------------------------------ */

/**
 * A fresh browser context for one journey. `clock` (an ISO instant) installs
 * Playwright's fake clock BEFORE the bundle evaluates, so the dataset, the
 * quote engine and every screen read the same controlled time; `timezoneId`
 * is what turns that instant into a local day.
 */
async function openContext({
  base,
  timezoneId = DEFAULT_TIMEZONE,
  locale = 'en-GB',
  colorScheme = 'dark',
  viewport = VIEWPORT,
  clock = null,
  fixture = null,
  errors,
}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    colorScheme,
    locale,
    timezoneId,
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  if (clock) await page.clock.install({ time: new Date(clock) });
  await page.addInitScript(() => {
    window.__ONEROYAL_FREEZE_MARKET = true;
  });
  /*
   * A controlled demo fixture (Sep24 A20), set before the bundle evaluates on
   * every load of this context, the way the market freeze is. The app runs it
   * as its own isolated demo client; see `adapters/mock/demo-fixtures.ts`.
   */
  if (fixture) {
    await page.addInitScript((name) => {
      window.__ONEROYAL_DEMO_FIXTURE = name;
    }, fixture);
  }
  await page.addInitScript(restoreShim, prefixOf(base));
  return { context, page };
}

/* ---------------------------------------------------------------------------
   Shared walks
   ------------------------------------------------------------------------ */

/** Hub → Prop → the 25k plan → accept the versioned rules → pay. */
const buyAChallenge = async (page, base, j) => {
  await toHub(page, base);
  await tap(page, 'hub-prop', 2000);
  await tap(page, 'prop-plan-royal-25k', 1800);
  j.check(
    'choosing a plan opens its rules',
    /^\/hub\/prop\/rules\//.test(routeOf(page, base)),
    routeOf(page, base),
  );
  await tap(page, 'prop-rules-accept', 600);
  await tap(page, 'prop-rules-continue', 2200);
  j.check('accepting the rules opens the payment step', await appears(page, 'prop-payment-amount'));
  await tap(page, 'prop-payment-confirm', 3600);
  const ready = await appears(page, 'prop-ready-account', 15_000);
  j.check('the challenge account is created', ready, routeOf(page, base));
  return ready;
};

/**
 * Opens the new-order ticket for a symbol from the Trade tab's picker.
 *
 * EVERY STEP WAITS FOR WHAT IT NEEDS, NOT FOR A FIXED TIME (Sep24 GATES-N5).
 * With fixed pauses, a slow first load let the row press land while the
 * picker was still settling, and once a side tap reviews in one (A19.2) a
 * mistimed press on the ticket is a trip to Review. So: the picker's search
 * must be up before typing, the row must be the only visible copy and hit
 * at its centre before the press, and the ticket must have mounted its
 * volume field before this returns. The row is pressed once, never retried.
 */
const openTicketFromTrade = async (page, base, symbol) => {
  await toTrade(page, base);
  await tap(page, 'trade-new-order', 600);
  await appears(page, 'trade-new-search', 10_000);
  await fill(page, 'trade-new-search', symbol, 300);
  const row = page.locator(`[data-testid="picker-row-${symbol}"]:visible`);
  await row.first().waitFor({ state: 'visible', timeout: 15_000 });
  // The filtered list has settled when exactly one copy of the row is shown.
  for (let i = 0; i < 20 && (await row.count()) !== 1; i += 1) await page.waitForTimeout(250);
  await naming(`tap picker-row-${symbol}`, async () =>
    (await onTop(page, `picker-row-${symbol}`)).click({ timeout: 15_000 }),
  );
  await appears(page, 'screen-ticket', 15_000);
  await appears(page, 'ticket-volume', 10_000);
  await page.waitForTimeout(400);
};

/*
 * From a filled-in ticket to its review (Sep24 A19.2). A ticket opened with
 * no direction reviews on ONE tap of Buy — the side is chosen, judged and
 * reviewed together; a ticket that already has its side reviews from the
 * selected side. Neither places anything.
 */
const reviewFromTicket = async (page, side = 'buy') => {
  const neutral = await seen(page, 'ticket-direction-hint');
  await tap(page, neutral ? `ticket-side-${side}` : 'ticket-continue', 2600);
};

/* ---------------------------------------------------------------------------
   The findings
   ------------------------------------------------------------------------ */

const FINDINGS = [];
const finding = (spec) => FINDINGS.push({ preview: 'both', context: {}, ...spec });

/* F09 — Demo context becomes Live in account chooser (NEW-23).
   Withheld: "No fresh consuming-UI navigation result because deployed QA
   bootstrap is blocked." The chooser's Add account must carry the SELECTED
   environment into /accounts/new. */
finding({
  id: 'F09',
  title: 'Demo context becomes Live in account chooser',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    await tap(page, 'home-see-all-accounts', 1600);
    j.check(
      'Home opens the account chooser',
      await appears(page, 'screen-accounts'),
      routeOf(page, base),
    );
    await tap(page, 'choose-account-mode-demo', 600);
    j.check('the Demo segment is selected', await selected(page, 'choose-account-mode-demo'));
    await tap(page, 'switcher-add-account', 1800);
    j.check(
      'Add account from the Demo group opens a demo draft',
      routeOf(page, base) === '/accounts/new?environment=demo',
      routeOf(page, base),
    );
    j.check('the environment control shows Demo', await selected(page, 'account-environment-demo'));
    j.check(
      'and the practice starting-balance choices are offered',
      await seen(page, 'account-demo-balance'),
    );
    await j.shot(page, 'demo-draft');

    // Back: the chooser keeps the environment the client was looking at.
    await back(page, 1400);
    j.check(
      'Back returns to the chooser',
      await seen(page, 'screen-accounts'),
      routeOf(page, base),
    );
    j.check('with Demo still selected', await selected(page, 'choose-account-mode-demo'));

    // Keyboard: on the segmented control the arrows move FOCUS and Space
    // selects (its own contract, measured); the add control answers Enter.
    await (await onTop(page, 'choose-account-mode-demo')).focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
    j.check(
      'ArrowLeft then Space selects Live from the keyboard',
      await selected(page, 'choose-account-mode-live'),
    );
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.waitForTimeout(400);
    j.check(
      'ArrowRight then Space selects Demo again',
      await selected(page, 'choose-account-mode-demo'),
    );
    await keyActivate(page, 'switcher-add-account', 'Enter', 1800);
    j.check(
      'Enter on Add account carries the keyboard-chosen Demo environment',
      routeOf(page, base) === '/accounts/new?environment=demo' &&
        (await selected(page, 'account-environment-demo')),
      routeOf(page, base),
    );

    // Account state: the Live group opens a live draft, with no practice grant.
    await back(page, 1400);
    await tap(page, 'choose-account-mode-live', 600);
    await tap(page, 'switcher-add-account', 1800);
    j.check(
      'Add account from the Live group opens a live draft',
      routeOf(page, base) === '/accounts/new?environment=live' &&
        (await selected(page, 'account-environment-live')),
      `${routeOf(page, base)} · Live selected: ${await selected(page, 'account-environment-live')} · Demo selected: ${await selected(page, 'account-environment-demo')} · new-account screens mounted: ${await mountedCount(page, 'screen-new-account')}`,
    );
    j.check('and offers no practice starting balance', !(await seen(page, 'account-demo-balance')));
    await j.shot(page, 'live-draft');
  },
});

/* F13 — Internal IDs and unformatted values leak into financial review (C06).
   Withheld: "No independent mounted complete set of these five financial
   consumers; cannot certify universal no-ID leakage" and "the account-label
   hook still falls back to raw ID while accounts are unavailable". Each of
   the five consumers is opened by interaction and its label SAMPLED while it
   settles, so a raw id painted for one frame is caught. */
finding({
  id: 'F13',
  title: 'Internal IDs and unformatted values leak into financial review',
  async run({ page, base, j }) {
    await enterDemo(page, base);

    // 1. PAMM review.
    await toHub(page, base);
    await tap(page, 'hub-strategies', 1400);
    await tap(page, 'strategies-pamm-entry', 1400);
    const managers = await idsWithPrefix(page, 'pamm-manager-str-');
    j.check('a PAMM manager is offered', managers.length > 0, managers.join(','));
    await tap(page, managers[0], 1600);
    await tap(page, 'pamm-manager-allocate', 1600);
    await tap(page, 'pamm-allocate-account-acc-classic-usd', 500).catch(() => undefined);
    await fill(page, 'pamm-allocate-amount-input', '1000');
    await tap(page, 'pamm-allocate-continue', 400);
    const pammSamples = await sampleWords(page, 'pamm-review-account');
    j.check('the PAMM review opens', await seen(page, 'screen-pamm-review'), routeOf(page, base));
    j.check(
      'the PAMM review names the account, never its id, on any frame',
      pammSamples.length > 0 &&
        pammSamples.every((s) => !RAW_ACCOUNT_ID.test(s)) &&
        pammSamples.some((s) => /Main/.test(s)),
      pammSamples.join(' | '),
    );
    await j.shot(page, 'pamm-review');

    // 2. Copy review.
    await toHub(page, base);
    await tap(page, 'hub-strategies', 1400);
    await tap(page, 'strategies-copy-entry', 1400);
    const providers = await idsWithPrefix(page, 'copy-provider-str-');
    j.check('a copy provider is offered', providers.length > 0, providers.join(','));
    await tap(page, providers[0], 1600);
    await tap(page, 'copy-provider-start', 1600);
    await tap(page, 'copy-setup-account-acc-classic-usd', 500).catch(() => undefined);
    await fill(page, 'copy-setup-amount-input', '1000');
    await tap(page, 'copy-setup-continue', 400);
    const copySamples = await sampleWords(page, 'copy-review-account');
    j.check('the Copy review opens', await seen(page, 'screen-copy-review'), routeOf(page, base));
    j.check(
      'the Copy review names the account, never its id, on any frame',
      copySamples.length > 0 &&
        copySamples.every((s) => !RAW_ACCOUNT_ID.test(s)) &&
        copySamples.some((s) => /Main/.test(s)),
      copySamples.join(' | '),
    );
    await j.shot(page, 'copy-review');

    // 3. A copied trade. The seeded allocations carry no copied trades (their
    // master trades are skipped by the copy controls), so the subscription
    // just reviewed is STARTED and its mirrored trades are what is opened.
    if (!(await checked(page, 'copy-review-consent'))) await tap(page, 'copy-review-consent', 400);
    await tap(page, 'copy-review-start', 3000);
    let trades = [];
    if (await appears(page, 'screen-copy-subscription', 10_000)) {
      trades = await idsWithPrefix(page, 'copy-trade-');
    }
    if (trades.length === 0) {
      await toHub(page, base);
      await tap(page, 'hub-strategies', 1400);
      await tap(page, 'strategies-tabs-allocations', 900);
      const allocations = await idsWithPrefix(page, 'allocation-open-');
      j.check('an allocation is listed', allocations.length > 0, allocations.join(','));
      for (const allocation of allocations) {
        await tap(page, allocation, 1800);
        trades = await idsWithPrefix(page, 'copy-trade-');
        if (trades.length > 0) break;
        await back(page, 1200);
      }
    }
    j.check(
      'the subscription lists copied trades',
      trades.length > 0,
      trades.join(',').slice(0, 120),
    );
    if (trades.length > 0) {
      await tap(page, trades[0], 1800);
      j.check(
        'a copied trade opens',
        await appears(page, 'screen-copied-trade'),
        routeOf(page, base),
      );
      const open = await words(page, 'copied-trade-open-price');
      const decimals = (text) => {
        const m = /(\d[\d,]*)\.(\d+)/.exec(text);
        return m ? m[2].length : text.replace(/[^\d]/g, '').length > 0 ? 0 : -1;
      };
      j.check(
        'the copied-trade open price is formatted at an instrument precision (1–5 decimals, not a raw float)',
        decimals(open) >= 1 && decimals(open) <= 5 && !/\d\.\d{6,}/.test(open),
        open,
      );
      const screen = await words(page, 'screen-copied-trade');
      j.check(
        'no raw account id on the copied-trade screen',
        !RAW_ACCOUNT_ID.test(screen),
        screen.slice(0, 120),
      );
      await j.shot(page, 'copied-trade');
    }

    // 4 and 5. The robot backtest ledger and the limits step.
    await toHub(page, base);
    await tap(page, 'hub-robots', 1600);
    await tap(page, 'robots-build', 1400);
    await tap(page, 'robot-route-describe', 1400);
    await fill(
      page,
      'robot-describe-input',
      'buy gold when the 9 EMA crosses the 21 EMA, stop 200 points, target 400 points, 0.1 lots',
      900,
    );
    await tap(page, 'robot-describe-create', 1800);
    j.check('the robot rules open', await appears(page, 'screen-robot-rules'), routeOf(page, base));
    await tap(page, 'robot-rules-continue', 2600);
    j.check(
      'the backtest opens',
      await appears(page, 'screen-robot-backtest', 12_000),
      routeOf(page, base),
    );
    const ledgerRows = await idsWithPrefix(page, 'robot-backtest-trade-');
    if (ledgerRows.length === 0) {
      j.check(
        'the backtest ledger lists trades to inspect',
        false,
        (await words(page, 'screen-robot-backtest')).slice(0, 160),
      );
    } else {
      const titles = [];
      for (const id of ledgerRows.slice(0, 6)) titles.push(await words(page, id));
      const prices = titles.flatMap((t) => [...t.matchAll(/(\d[\d,]*\.\d+)/g)].map((m) => m[1]));
      j.check(
        'every ledger price carries gold’s two decimals, never a raw float',
        prices.length > 0 && prices.every((p) => /\.\d{2}$/.test(p)),
        prices.slice(0, 8).join(' '),
      );
    }
    await j.shot(page, 'backtest');
    await tap(page, 'robot-backtest-continue', 1600);
    await tap(page, 'robot-demo-continue', 1600);
    j.check(
      'the destination step opens',
      await appears(page, 'screen-robot-account'),
      routeOf(page, base),
    );
    const rows = page.locator('[data-testid^="robot-account-acc"]:visible');
    j.check('an eligible ORX account is offered', (await rows.count()) > 0);
    await rows.first().click();
    await page.waitForTimeout(500);
    await tap(page, 'robot-account-continue', 400);
    const limitSamples = await sampleWords(page, 'robot-limits-account');
    j.check(
      'the limits step opens',
      await appears(page, 'screen-robot-limits'),
      routeOf(page, base),
    );
    j.check(
      'the limits step names the account, never its id, on any frame',
      limitSamples.length > 0 &&
        limitSamples.every((s) => !RAW_ACCOUNT_ID.test(s)) &&
        limitSamples.some((s) => /Main/.test(s)),
      limitSamples.join(' | '),
    );
    await j.shot(page, 'robot-limits');
  },
});

/* F16 — ORX receipt still labels credentials MetaTrader (ACCOUNT-01).
   Withheld: "receipt interaction not independently retested". The receipt is
   reached by creating accounts on each platform and in each environment. */
finding({
  id: 'F16',
  title: 'ORX receipt still labels credentials MetaTrader',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    const create = async ({ platform, nickname, demo }) => {
      if (demo) {
        await toTab(page, base, 'tab-home');
        await tap(page, 'home-see-all-accounts', 1600);
        await tap(page, 'choose-account-mode-demo', 600);
        await tap(page, 'switcher-add-account', 1800);
      } else {
        await toHub(page, base);
        await tap(page, 'hub-trading-accounts', 1600);
        await tap(page, 'accounts-add', 1800);
      }
      j.check(
        `the new-account form opens (${nickname})`,
        await appears(page, 'screen-new-account'),
        routeOf(page, base),
      );
      await tap(page, `account-platform-${platform}`, 500);
      await tap(page, 'account-type-classic', 400);
      await tap(page, 'choice-USD', 400);
      await tap(page, 'choice-200', 400);
      if (demo) await tap(page, 'choice-10000', 400);
      await fill(page, 'account-nickname', nickname);
      await tap(page, 'create-account-submit', 3200);
      const created = await appears(page, 'screen-account-created', 12_000);
      j.check(
        `the ${nickname} account is created and its receipt shown`,
        created,
        created ? routeOf(page, base) : (await words(page, 'screen-new-account')).slice(0, 160),
      );
      return created ? await words(page, 'account-created-credentials') : '';
    };

    const orx = await create({ platform: 'orx', nickname: 'Journey ORX', demo: false });
    j.check(
      'an ORX receipt labels the login as ORX',
      /ORX login/.test(orx) && !/MetaTrader login/.test(orx),
      orx.slice(0, 160),
    );
    j.check('the receipt says Live', /Live/i.test(await words(page, 'created-mode-badge')));
    await j.shot(page, 'orx-live-receipt');
    // Receipt interaction: the copy control answers and Continue leaves the form behind.
    const copies = await idsWithPrefix(page, 'created-copy-');
    j.check(
      'the receipt offers copy controls for the credentials',
      copies.length > 0,
      copies.join(','),
    );
    await tap(page, 'account-created-continue', 1800);
    j.check(
      'Continue leaves the receipt behind for the created account',
      !/\/accounts\/new/.test(routeOf(page, base)) && /^\/accounts\/acc-/.test(routeOf(page, base)),
      routeOf(page, base),
    );

    const mt4 = await create({ platform: 'mt4', nickname: 'Journey MT4', demo: false });
    j.check(
      'an MT4 receipt labels the login as MetaTrader',
      /MetaTrader login/.test(mt4) && !/ORX login/.test(mt4),
      mt4.slice(0, 160),
    );
    await j.shot(page, 'mt4-live-receipt');
    await tap(page, 'account-created-continue', 1800);

    const demoOrx = await create({ platform: 'orx', nickname: 'Journey Practice', demo: true });
    j.check(
      'a practice ORX receipt labels the login as ORX',
      /ORX login/.test(demoOrx) && !/MetaTrader login/.test(demoOrx),
      demoOrx.slice(0, 160),
    );
    j.check('and says Demo', /Demo/i.test(await words(page, 'created-mode-badge')));
    await j.shot(page, 'orx-demo-receipt');
  },
});

/* F21 — Unsaved e-wallet provider text carries across rails.
   Withheld: "Consuming rail-switch interaction remains unverified." Type into
   one rail's destination draft, provoke its error, switch rail, and read the
   draft the new rail starts with. */
finding({
  id: 'F21',
  title: 'Unsaved e-wallet provider text carries across rails',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    await toFunds(page, base);
    await tap(page, 'hub-withdraw', 2200);
    j.check(
      'withdraw opens from Funds',
      await appears(page, 'screen-withdraw'),
      routeOf(page, base),
    );
    const methods = await idsWithPrefix(page, 'withdraw-method-');
    const rail = (kind) => methods.find((m) => m.includes(kind));
    const bank = rail('bank-wire');
    const crypto = rail('crypto');
    const ewallet = rail('skrill') ?? rail('neteller') ?? rail('whish');
    j.check(
      'bank, crypto and e-wallet rails are offered',
      Boolean(bank && crypto && ewallet),
      methods.join(','),
    );
    if (!(bank && crypto && ewallet)) return;

    const toRail = async (id) => {
      // Leave an open draft, then the destination step, back to the rails.
      for (
        let i = 0;
        i < 3 && (await seen(page, 'destination-add')) === false && !(await seen(page, id));
        i += 1
      )
        await back(page, 900);
      if (!(await seen(page, id))) {
        if (await seen(page, 'destination-add')) await back(page, 900);
      }
      await tap(page, id, 1400);
      await tap(page, 'destination-add', 900);
    };

    await tap(page, bank, 1400);
    await tap(page, 'destination-add', 900);
    await fill(page, 'destination-beneficiary', 'Amina Haddad');
    await fill(page, 'destination-institution', 'Emirates NBD');
    await fill(page, 'destination-identifier', 'AE0');
    const saveRefused = await isDisabled(page, 'destination-save');
    await press(page, 'destination-save', 1200);
    const bankError = saveRefused || (await seen(page, 'destination-error'));
    j.check(
      'a short bank identifier is refused on the bank rail',
      bankError && (await seen(page, 'destination-identifier')),
      `save disabled: ${saveRefused}; error banner: ${await seen(page, 'destination-error')}`,
    );
    await j.shot(page, 'bank-draft');

    await toRail(crypto);
    j.check(
      'the crypto rail starts with no beneficiary text',
      (await value(page, 'destination-beneficiary')) === '' ||
        !(await seen(page, 'destination-beneficiary')),
    );
    const network = await value(page, 'destination-institution');
    j.check(
      'its network field is reset from the crypto method, not the bank name',
      /TRC|ERC|Tron|Ethereum/i.test(network) && !/Emirates/.test(network),
      network,
    );
    j.check(
      'its identifier is empty',
      (await value(page, 'destination-identifier')) === '',
      await value(page, 'destination-identifier'),
    );
    j.check('the bank rail’s error does not carry over', !(await seen(page, 'destination-error')));
    await fill(page, 'destination-identifier', 'TXYZ');
    await j.shot(page, 'crypto-draft');

    await toRail(ewallet);
    j.check(
      'the e-wallet rail starts with an empty provider field',
      (await value(page, 'destination-institution')) === '',
      await value(page, 'destination-institution'),
    );
    j.check(
      'and an empty identifier',
      (await value(page, 'destination-identifier')) === '',
      await value(page, 'destination-identifier'),
    );
    j.check(
      'and an empty beneficiary',
      (await value(page, 'destination-beneficiary')) === '',
      await value(page, 'destination-beneficiary'),
    );
    await fill(page, 'destination-institution', 'Skrill');
    await toRail(bank);
    j.check(
      'back on the bank rail, the e-wallet provider text is gone',
      (await value(page, 'destination-institution')) === '',
      await value(page, 'destination-institution'),
    );
    await j.shot(page, 'ewallet-then-bank');
  },
});

/* F24 — Portfolio omits account scope and uses an ambiguous equity label.
   Withheld: "Consuming performance view not independently exercised." */
finding({
  id: 'F24',
  title: 'Portfolio omits account scope and uses an ambiguous equity label',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    await toTrade(page, base);
    await tap(page, 'open-portfolio', 2000);
    j.check(
      'the portfolio opens from Trade',
      await appears(page, 'screen-portfolio'),
      routeOf(page, base),
    );
    const header = await headerWords(page);
    j.check('the header names the active account', /Main/.test(header), header);
    const caption = await words(page, 'portfolio-equity-caption');
    j.check(
      'the closed-trade chart carries an explanatory caption',
      caption.length > 20 && /closed/i.test(caption),
      caption,
    );
    await j.shot(page, 'main-performance');

    // Account state: another account, another name in the header.
    await back(page, 1400);
    await tap(page, 'trade-account', 800);
    await tap(page, 'select-account-acc-ecn-eur', 1600);
    await tap(page, 'open-portfolio', 2000);
    j.check(
      'switching accounts renames the header',
      /Crypto book/.test(await headerWords(page)),
      await headerWords(page),
    );
    await j.shot(page, 'ecn-performance');

    // Theme: the same view in the light theme keeps its scope and caption.
    const darkBackground = await canvasColor(page);
    await toSettings(page, base);
    await tap(page, 'settings-theme-light', 1200);
    await toTrade(page, base);
    await tap(page, 'open-portfolio', 2000);
    const lightBackground = await canvasColor(page);
    j.check(
      'the light theme is applied',
      lightBackground !== darkBackground,
      `${darkBackground} → ${lightBackground}`,
    );
    j.check(
      'in the light theme the header still names the account',
      /Crypto book/.test(await headerWords(page)),
    );
    j.check(
      'and the caption is still there',
      (await words(page, 'portfolio-equity-caption')).length > 20,
    );
    await j.shot(page, 'light-theme');
  },
});

/* F25 — ORX account platform details name MT4.
   Withheld: "Existing ORX screen not independently exercised." */
finding({
  id: 'F25',
  title: 'ORX account platform details name MT4',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    await toHub(page, base);
    await tap(page, 'hub-trading-accounts', 1600);
    await tap(page, 'account-card-acc-classic-usd', 1800);
    j.check(
      'the ORX account opens',
      await appears(page, 'screen-account-details'),
      routeOf(page, base),
    );
    await tap(page, 'account-tabs-platform', 900);
    const orx = await words(page, 'screen-account-details');
    j.check('the ORX account labels its login as ORX', /ORX login/.test(orx), orx.slice(0, 200));
    j.check(
      'and its server is an ORX server',
      /OneRoyal-ORX/.test(orx),
      orx.match(/OneRoyal-[A-Za-z0-9-]+/)?.[0] ?? '',
    );
    j.check('nothing on it says MT4 or MetaTrader login', !/\bMT4\b|MetaTrader login/.test(orx));
    await j.shot(page, 'orx-platform');

    await back(page, 1400);
    await tap(page, 'account-card-acc-classic-mt4', 1800);
    await tap(page, 'account-tabs-platform', 900);
    const mt4 = await words(page, 'screen-account-details');
    j.check(
      'the MT4 account labels its login as MetaTrader',
      /MetaTrader login/.test(mt4) && /\bMT4\b/.test(mt4),
      mt4.slice(0, 200),
    );
    await j.shot(page, 'mt4-platform');

    // Reload: the label is derived from the record, not from what was tapped.
    const restored = await reloadOnto(page, base, '/accounts/acc-classic-usd');
    await tap(page, 'account-tabs-platform', 900).catch(() => undefined);
    const again = await words(page, 'screen-account-details');
    j.check(
      'after a reload the ORX account still says ORX login',
      restored === '/accounts/acc-classic-usd' &&
        /ORX login/.test(again) &&
        !/MetaTrader login/.test(again),
      `${restored} · ${again.slice(0, 120)}`,
    );
  },
});

/* F33 — Chart hover readout shifts toolbar targets under the pointer.
   Withheld: "uses minHeight:20, not a fixed height; multiline/large-text
   wrapping is still unmeasured … Requires pointer/width/text-scale
   regression before closure." The toolbar's geometry is MEASURED before,
   during and after a hover, at the phone width, at 320 and at a 130% text
   scale. */
finding({
  id: 'F33',
  title: 'Chart hover readout shifts toolbar targets under the pointer',
  async run({ page, base, j, newPage }) {
    const measure = async (target, label) => {
      await enterDemo(target, base);
      await toMarkets(target, base);
      await tap(target, 'instrument-row-XAUUSD', 2400);
      j.check(
        `${label}: gold opens with a chart`,
        await appears(target, 'price-chart'),
        routeOf(target, base),
      );
      await (await onTop(target, 'price-chart')).scrollIntoViewIfNeeded().catch(() => undefined);
      await target.waitForTimeout(500);
      const before = {
        toolbar: await box(target, 'chart-toolbar'),
        chart: await box(target, 'price-chart'),
        slot: await box(target, 'chart-inspect-slot'),
      };
      const chart = before.chart;
      j.check(
        `${label}: the readout slot is reserved before any hover`,
        Boolean(before.slot) && before.slot.height >= 20,
        JSON.stringify(before.slot),
      );
      await target.mouse.move(chart.x + chart.width * 0.4, chart.y + chart.height * 0.45);
      await target.waitForTimeout(500);
      const readout = await appears(target, 'chart-inspect-readout', 3000);
      j.check(
        `${label}: hovering shows the readout`,
        readout,
        await words(target, 'chart-inspect-readout'),
      );
      const during = {
        toolbar: await box(target, 'chart-toolbar'),
        chart: await box(target, 'price-chart'),
        slot: await box(target, 'chart-inspect-slot'),
      };
      await j.shot(target, `${label}-hover`);
      const same = (a, b) => Boolean(a && b) && Math.abs(a.y - b.y) < 0.75;
      j.check(
        `${label}: the toolbar does not move under the pointer while the readout is shown`,
        same(before.toolbar, during.toolbar),
        `toolbar y ${before.toolbar?.y} → ${during.toolbar?.y}; slot height ${before.slot?.height} → ${during.slot?.height}`,
      );
      j.check(
        `${label}: nor does the chart`,
        same(before.chart, during.chart),
        `chart y ${before.chart?.y} → ${during.chart?.y}`,
      );
      await target.mouse.move(chart.x - 30, chart.y - 30);
      await target.waitForTimeout(500);
      const after = { toolbar: await box(target, 'chart-toolbar') };
      j.check(
        `${label}: leaving the chart keeps the toolbar where it was`,
        same(before.toolbar, after.toolbar),
        `toolbar y ${before.toolbar?.y} → ${after.toolbar?.y}`,
      );
    };

    await measure(page, '393');
    const narrow = await newPage({ viewport: { width: 320, height: 568 } });
    await measure(narrow.page, '320');
    await narrow.context.close();
    const scaled = await newPage({});
    await scaled.page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.style.zoom = '1.3';
      });
    });
    await measure(scaled.page, 'zoom130');
    await scaled.context.close();
  },
});

/* F36 — Triggered alert contradicts notify-once status copy.
   Withheld: "consuming alert lifecycle and confirmation not independently
   exercised." The seeded triggered alert must read Off; a created alert's
   confirmation must not outlive the alert. */
finding({
  id: 'F36',
  title: 'Triggered alert contradicts notify-once status copy',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    await toMarkets(page, base);
    await tap(page, 'open-alerts', 1800);
    j.check('alerts open from Markets', await appears(page, 'screen-alerts'), routeOf(page, base));
    await tap(page, 'alerts-tab-triggered', 900);
    const triggered = await idsWithPrefix(page, 'alert-row-');
    j.check(
      'the seeded triggered BTCUSD alert is listed under Triggered',
      triggered.includes('alert-row-alr-00003'),
      triggered.join(','),
    );
    const row = await words(page, 'alert-row-alr-00003');
    j.check(
      'it reads Off, consistent with notify-once',
      /\bOff\b/.test(row) && !/\bOn\b/.test(row),
      row,
    );
    j.check('its switch is off', !(await checked(page, 'alert-toggle-alr-00003')));
    await j.shot(page, 'triggered-off');

    await tap(page, 'alerts-tab-active', 900);
    const before = await idsWithPrefix(page, 'alert-row-');
    await tap(page, 'alerts-new', 1200);
    await fill(page, 'alert-symbol', 'BTCUSD');
    const conditions = await idsWithPrefix(page, 'alert-condition-');
    await tap(page, conditions.find((c) => c !== 'alert-condition') ?? conditions[0], 300);
    await fill(page, 'alert-threshold', '100000');
    await tap(page, 'alert-create', 2200);
    j.check(
      'creating an alert shows its confirmation',
      (await seen(page, 'alert-created')) && /BTCUSD/.test(await words(page, 'alert-created')),
      await words(page, 'alert-created'),
    );
    const after = await idsWithPrefix(page, 'alert-row-');
    const created = after.find((id) => !before.includes(id));
    j.check('the new alert is listed', Boolean(created), after.join(','));
    if (created) {
      const id = created.replace('alert-row-', '');
      await tap(page, `alert-open-${id}`, 1200);
      await tap(page, 'alert-edit-delete', 900);
      await tap(page, 'alert-delete-confirm', 2200);
      j.check('deleting it removes the row', !(await seen(page, created)));
      j.check('and clears the created confirmation', !(await seen(page, 'alert-created')));
      await j.shot(page, 'after-delete');
      // Reload: the seed's Off state and the deletion are what the ledger kept.
      await reloadOnto(page, base, '/markets/alerts');
      await tap(page, 'alerts-tab-triggered', 900).catch(() => undefined);
      j.check(
        'after a reload the triggered alert is still Off',
        (await appears(page, 'alert-row-alr-00003')) &&
          !(await checked(page, 'alert-toggle-alr-00003')),
      );
      await tap(page, 'alerts-tab-active', 900).catch(() => undefined);
      j.check('and the deleted alert has not come back', !(await seen(page, created)));
    }
  },
});

/* F37 — Calendar "This week" label does not match its date window.
   Withheld: "no independent consuming calendar/timezone matrix." The windows
   are checked against the fixture's own event instants, under a controlled
   clock, in a UTC+14 zone and in UTC, across a local midnight. */
const CALENDAR_EVENTS = [
  ['eco-00001', 1, 12],
  ['eco-00002', 2, 11],
  ['eco-00003', 0, 14],
  ['eco-00004', -1, 6],
  ['eco-00005', 3, 23],
];
/** The fixture's `atHour`: the UTC date of now+offset days, at HH:30 UTC. */
const eventInstant = (nowMs, dayOffset, hour) => {
  const d = new Date(nowMs + dayOffset * DAY);
  d.setUTCHours(hour, 30, 0, 0);
  return d.getTime();
};
const localDay = (ms, timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
const addLocalDays = (ms, days, timeZone) => {
  // Walk in 6-hour steps to the first instant whose local day is `days` on.
  const start = localDay(ms, timeZone);
  let cursor = ms;
  let seen = 0;
  let last = start;
  while (seen < days) {
    cursor += 6 * HOUR;
    const day = localDay(cursor, timeZone);
    if (day !== last) {
      seen += 1;
      last = day;
    }
  }
  return last;
};
const expectedCalendar = (bootMs, viewMs, timeZone) => {
  const today = localDay(viewMs, timeZone);
  const tomorrow = addLocalDays(viewMs, 1, timeZone);
  const weekDays = new Set([today]);
  for (let i = 1; i < 7; i += 1) weekDays.add(addLocalDays(viewMs, i, timeZone));
  const ids = (predicate) =>
    CALENDAR_EVENTS.filter(([, offset, hour]) =>
      predicate(localDay(eventInstant(bootMs, offset, hour), timeZone)),
    ).map(([id]) => id);
  return {
    today: ids((d) => d === today),
    tomorrow: ids((d) => d === tomorrow),
    week: ids((d) => weekDays.has(d)),
  };
};
const calendarJourney =
  (timeZone, clock) =>
  async ({ page, base, j }) => {
    const bootMs = new Date(clock).getTime();
    await enterDemo(page, base);
    await toMarkets(page, base);
    await tap(page, 'open-calendar', 1800);
    j.check(
      `${timeZone}: the calendar opens`,
      await appears(page, 'screen-calendar'),
      routeOf(page, base),
    );
    const tzLine = await words(page, 'calendar-timezone');
    j.check(
      `${timeZone}: the screen names the device time zone`,
      tzLine.includes(timeZone),
      tzLine,
    );
    const listed = async () =>
      (await idsWithPrefix(page, 'calendar-event-'))
        .map((id) => id.replace('calendar-event-', ''))
        .sort();
    const expected = expectedCalendar(bootMs, bootMs, timeZone);
    const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    j.check(
      `${timeZone}: Today lists exactly the events on the local calendar day`,
      same(await listed(), expected.today),
      `shown ${(await listed()).join(',')} · expected ${expected.today.join(',')}`,
    );
    await tap(page, 'calendar-window-tomorrow', 800);
    j.check(
      `${timeZone}: Tomorrow lists exactly the next local day`,
      same(await listed(), expected.tomorrow),
      `shown ${(await listed()).join(',')} · expected ${expected.tomorrow.join(',')}`,
    );
    await tap(page, 'calendar-window-week', 800);
    j.check(
      `${timeZone}: the third window is named Next 7 days, not This week`,
      (await words(page, 'calendar-window-week')) === 'Next 7 days',
      await words(page, 'calendar-window-week'),
    );
    j.check(
      `${timeZone}: and lists the seven local days from today`,
      same(await listed(), expected.week),
      `shown ${(await listed()).join(',')} · expected ${expected.week.join(',')}`,
    );
    await j.shot(page, `${slug(timeZone)}-week`);

    // Across local midnight: the same fixture instants move from Tomorrow to Today.
    await page.clock.fastForward(15 * 60 * 1000);
    await page.waitForTimeout(300);
    await back(page, 1200);
    await tap(page, 'open-calendar', 1800);
    const viewMs = bootMs + 15 * 60 * 1000;
    const later = expectedCalendar(bootMs, viewMs, timeZone);
    j.check(
      `${timeZone}: the local day rolled over the boundary`,
      localDay(viewMs, timeZone) !== localDay(bootMs, timeZone),
      `${localDay(bootMs, timeZone)} → ${localDay(viewMs, timeZone)}`,
    );
    j.check(
      `${timeZone}: after local midnight Today is recomputed on the calendar day`,
      same(await listed(), later.today),
      `shown ${(await listed()).join(',')} · expected ${later.today.join(',')}`,
    );
    await j.shot(page, `${slug(timeZone)}-after-midnight`);
  };
finding({
  id: 'F37',
  title: 'Calendar This week label does not match its date window',
  context: { timezoneId: 'Pacific/Kiritimati', clock: '2026-09-23T09:50:00Z' },
  async run(args) {
    await calendarJourney('Pacific/Kiritimati', '2026-09-23T09:50:00Z')(args);
    const utc = await args.newPage({ timezoneId: 'UTC', clock: '2026-09-23T23:50:00Z' });
    await calendarJourney('UTC', '2026-09-23T23:50:00Z')({ ...args, page: utc.page });
    await utc.context.close();
  },
});

/* F42 — Journal trade link does not identify its trade.
   Withheld: "no current end-to-end navigation execution because deployment
   is broken." The link must select the entry's account and land on History
   with the linked trade first and marked. */
finding({
  id: 'F42',
  title: 'Journal trade link does not identify its trade',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    // Account state: leave a DIFFERENT account active first.
    await toTrade(page, base);
    await tap(page, 'trade-account', 800);
    await tap(page, 'select-account-acc-ecn-eur', 1400);
    j.check(
      'the Crypto book account is active before the journal is opened',
      /Crypto book/.test(await words(page, 'trade-account')),
      await words(page, 'trade-account'),
    );
    await toCoach(page, base);
    await tap(page, 'coach-nav-journal', 1800);
    j.check(
      'the journal opens from Coach',
      await appears(page, 'screen-journal'),
      routeOf(page, base),
    );
    await tap(page, 'journal-trade-jrn-00001', 2200);
    const route = routeOf(page, base);
    const tradeId = /tradeId=([^&]+)/.exec(route)?.[1] ?? null;
    j.check(
      'the link opens Trade History and names its trade in the route',
      /^\/trade\?tab=history&tradeId=.+/.test(route),
      route,
    );
    j.check('History is the selected tab', await selected(page, 'trade-tabs-history'));
    const marked = page.locator('#trade-highlighted');
    j.check(
      'the linked trade is marked',
      (await marked.count()) === 1 &&
        (await marked.first().getAttribute('data-testid')) === `closed-trade-${tradeId}`,
      `${await marked.count()} marked · ${await marked
        .first()
        .getAttribute('data-testid')
        .catch(() => '')}`,
    );
    const rows = await idsWithPrefix(page, 'closed-trade-');
    j.check(
      'and it is the first row',
      rows[0] === `closed-trade-${tradeId}`,
      rows.slice(0, 3).join(','),
    );
    j.check(
      'the entry’s own account was selected, not the one that was active',
      /Main/.test(await words(page, 'trade-account')),
      await words(page, 'trade-account'),
    );
    await j.shot(page, 'linked-trade');
    await page.locator('[data-testid="tab-coach"]:visible').last().click({ timeout: 15_000 });
    await page.waitForTimeout(1400);
    j.check(
      'the Coach tab still holds the journal the link was pressed from',
      routeOf(page, base) === '/coach/journal' && (await seen(page, 'screen-journal')),
      routeOf(page, base),
    );
  },
});

/* F56 — Funding review and tracker contradict disconnected payment availability.
   Withheld: "Tracker rendering/loading still not independently closed." */
finding({
  id: 'F56',
  title: 'Funding review and tracker contradict disconnected payment availability',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    const deposit = async (methodPrefix, label) => {
      await toFunds(page, base);
      await tap(page, 'hub-deposit', 2000);
      j.check(
        `${label}: deposit opens from Funds`,
        await appears(page, 'screen-deposit'),
        routeOf(page, base),
      );
      const destination =
        methodPrefix.includes('crypto') && (await seen(page, 'deposit-destination-wallet-USDT'))
          ? 'deposit-destination-wallet-USDT'
          : 'deposit-destination-acc-classic-usd';
      if (await seen(page, destination)) await tap(page, destination, 1200);
      const methods = await idsWithPrefix(page, 'deposit-method-');
      const method = methods.find((m) => m.startsWith(methodPrefix));
      j.check(`${label}: the rail is offered`, Boolean(method), methods.join(','));
      if (!method) return null;
      await tap(page, method, 1200);
      await fill(page, 'deposit-amount', '100');
      if (await seen(page, 'deposit-continue')) await tap(page, 'deposit-continue', 1200);
      return method;
    };

    const crypto = await deposit('deposit-method-pm-crypto', 'crypto');
    if (crypto) {
      j.check(
        'crypto: nothing payable is shown before a network is chosen',
        await seen(page, 'deposit-address-hidden'),
      );
      j.check(
        'crypto: submit is refused until a network is chosen',
        await isDisabled(page, 'deposit-submit'),
      );
      const choices = await page
        .getByTestId('deposit-network')
        .locator('[data-testid^="choice-"]')
        .all();
      j.check(
        'crypto: the method’s networks are offered',
        choices.length > 0,
        String(choices.length),
      );
      await choices[0].click();
      await page.waitForTimeout(600);
      const chosen = await words(page, 'deposit-network-details');
      j.check(
        'crypto: the chosen network is shown',
        /TRC|ERC|Tron|Ethereum/i.test(chosen),
        chosen.slice(0, 120),
      );
      await j.shot(page, 'crypto-review');
      await tap(page, 'deposit-submit', 3000);
      j.check(
        'crypto: the intent is recorded',
        await appears(page, 'screen-deposit-done'),
        routeOf(page, base),
      );
      await tap(page, 'deposit-view-transaction', 2400);
      j.check(
        'crypto: the tracker opens',
        await appears(page, 'screen-transaction'),
        routeOf(page, base),
      );
      const txRoute = routeOf(page, base);
      const network = await words(page, 'transaction-network');
      j.check(
        'crypto: the tracker names the selected network',
        /TRC|ERC|Tron|Ethereum/i.test(network),
        network,
      );
      const next = await words(page, 'transaction-next-steps');
      j.check(
        'crypto: next steps say nothing is payable in this preview and name the network',
        /not connected in this preview/.test(next) &&
          /no deposit address/.test(next) &&
          /TRC|ERC|Tron|Ethereum/i.test(next),
        next.slice(0, 200),
      );
      j.check(
        'crypto: it does not promise a card-style settlement',
        !/time your bank needs|settle at once/.test(next),
      );
      j.check(
        'crypto: the intent is not shown as completed',
        !/Completed/.test(await words(page, 'transaction-hero')),
      );
      await j.shot(page, 'crypto-tracker');
      // Reload: the tracker is rebuilt from the durable transaction, not from the form.
      const restored = await reloadOnto(page, base, txRoute);
      const afterReload = await words(page, 'transaction-next-steps');
      j.check(
        'crypto: after a reload the tracker still says nothing is payable',
        restored === txRoute &&
          /not connected in this preview/.test(afterReload) &&
          /TRC|ERC|Tron|Ethereum/i.test(await words(page, 'transaction-network')),
        `${restored} · ${afterReload.slice(0, 120)}`,
      );
    }

    const wire = await deposit('deposit-method-pm-bank-wire', 'wire');
    if (wire) {
      await tap(page, 'deposit-submit', 3000);
      j.check(
        'wire: the intent is recorded',
        await appears(page, 'screen-deposit-done'),
        routeOf(page, base),
      );
      await tap(page, 'deposit-view-transaction', 2400);
      const next = await words(page, 'transaction-next-steps');
      j.check(
        'wire: next steps say the transfer is not connected and nothing moves',
        /Bank transfer is not connected/.test(next) && /no money moves/i.test(next),
        next.slice(0, 200),
      );
      j.check(
        'wire: the intent is not shown as completed',
        !/Completed/.test(await words(page, 'transaction-hero')),
      );
      await j.shot(page, 'wire-tracker');
    }
  },
});

/* F59 — Hub challenge progress link is broken.
   Withheld (coordinator): closure rested on typecheck and lint only. The
   progress control must be a real button that opens the purchased
   challenge's dashboard, from the pointer AND the keyboard; a reload on that
   route must hold; Back must return to the Hub. */
finding({
  id: 'F59',
  title: 'Hub challenge progress link is broken',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    if (!(await buyAChallenge(page, base, j))) return;
    await toHub(page, base);
    await tap(page, 'hub-prop', 2000);
    const links = await idsWithPrefix(page, 'prop-open-progress-');
    j.check(
      'the Hub lists the purchased challenge with a progress control',
      links.length > 0,
      links.join(','),
    );
    if (links.length === 0) return;
    const purchaseId = links[0].replace('prop-open-progress-', '');
    const role = await attr(page, links[0], 'role');
    j.check('the control is a button', role === 'button', String(role));
    await tap(page, links[0], 2200);
    const route = routeOf(page, base);
    j.check(
      'it opens the purchased challenge’s dashboard',
      route === `/hub/prop/challenge/${purchaseId}` && (await seen(page, 'screen-prop-dashboard')),
      route,
    );
    await j.shot(page, 'dashboard');
    await back(page, 1600);
    j.check(
      'Back returns to the Prop screen',
      await seen(page, 'screen-prop'),
      routeOf(page, base),
    );
    // Keyboard.
    await keyActivate(page, links[0], 'Enter', 2200);
    j.check(
      'Enter on the control opens the same dashboard',
      routeOf(page, base) === `/hub/prop/challenge/${purchaseId}` &&
        (await seen(page, 'screen-prop-dashboard')),
      routeOf(page, base),
    );
    // Reload on that route.
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2400);
    j.check(
      'a reload on the dashboard route restores it',
      routeOf(page, base) === `/hub/prop/challenge/${purchaseId}` &&
        (await appears(page, 'screen-prop-dashboard')),
      routeOf(page, base),
    );
    j.check(
      'and it still names the challenge',
      (await words(page, 'prop-dashboard-identity')).length > 0,
      await words(page, 'prop-dashboard-identity'),
    );
    await j.shot(page, 'after-reload');
    await back(page, 1600);
    j.check(
      'Back after a reload lands on the Prop screen, never Welcome',
      (await seen(page, 'screen-prop')) || routeOf(page, base) === '/hub',
      routeOf(page, base),
    );
  },
});

/* F64 — Corporate external-representative branch cannot be completed.
   Withheld: "complete consuming corporate UI journey remains root live
   work." QA only: submission needs the placeholder legal documents. */
const corporatePerson = async (page, list, index, name) => {
  await fill(page, `${list}-${index}-name`, name);
  await fill(page, `${list}-${index}-dob`, '1980-01-15');
  await pick(page, `${list}-${index}-nationality`, 'AE');
  await fill(page, `${list}-${index}-email`, `${slug(name)}@example.test`);
  await fill(page, `${list}-${index}-address`, '12 Marina Walk, Dubai');
};
finding({
  id: 'F64',
  title: 'Corporate external-representative branch cannot be completed',
  preview: 'qa',
  async run({ page, base, j }) {
    await signUp(page, base, { corporate: true, email: 'corp-f64@example.test' });
    j.check(
      'corporate sign-up opens the corporate application',
      await appears(page, 'screen-onboarding-corporate'),
      routeOf(page, base),
    );
    // Company.
    await fill(page, 'corporate-name', 'Haddad Trading FZE');
    await fill(page, 'corporate-registration', 'FZE-12345');
    await pick(page, 'corporate-incorporation-country', 'AE');
    await fill(page, 'corporate-incorporation-date', '2015-06-01');
    await pick(page, 'corporate-activity', 'it');
    j.step('company stage complete');
    await tap(page, 'wizard-continue', 900);
    // Addresses.
    await fill(page, 'corporate-street-name', 'Marina Walk');
    await fill(page, 'corporate-street-number', '12');
    await fill(page, 'corporate-city', 'Dubai');
    await pick(page, 'corporate-country', 'AE');
    if (!(await checked(page, 'corporate-same-address')))
      await tap(page, 'corporate-same-address', 400);
    j.step('addresses stage complete');
    await tap(page, 'wizard-continue', 900);
    // Financials.
    await page.getByTestId('corporate-net-worth').getByTestId('choice-50k-100k').click();
    await page.getByTestId('corporate-income').getByTestId('choice-50k-100k').click();
    await page.getByTestId('corporate-fund-source').getByTestId('choice-business-income').click();
    await fill(page, 'corporate-assets', '250000');
    await fill(page, 'corporate-liabilities', '50000');
    await fill(page, 'corporate-previous-year', '20000');
    j.step('financials stage complete');
    await tap(page, 'wizard-continue', 900);
    // Structure: one UBO, one director, and a representative who is neither.
    await tap(page, 'ubos-add', 800);
    await corporatePerson(page, 'ubos', 0, 'Rania Haddad');
    await tap(page, 'corporate-person-done', 700);
    await tap(page, 'directors-add', 800);
    await corporatePerson(page, 'directors', 0, 'Omar Haddad');
    await tap(page, 'corporate-person-done', 700);
    await page.getByTestId('corporate-representative-is-owner').getByTestId('choice-no').click();
    await page.waitForTimeout(500);
    j.check(
      'answering No renders the representative branch',
      await seen(page, 'corporate-representative'),
    );
    j.check('with an Add control', await seen(page, 'representative-add'));
    await tap(page, 'representative-add', 900);
    j.check('adding opens the person editor', await seen(page, 'corporate-person-sheet'));
    j.check(
      'Done is refused while the representative is incomplete',
      await isDisabled(page, 'corporate-person-done'),
    );
    await fill(page, 'representative-0-name', 'Layla Haddad');
    await fill(page, 'representative-0-dob', '1985-03-02');
    await pick(page, 'representative-0-nationality', 'AE');
    await fill(page, 'representative-0-address', '4 Palm Street, Dubai');
    j.check(
      'Done is still refused without an email',
      await isDisabled(page, 'corporate-person-done'),
    );
    await fill(page, 'representative-0-email', 'layla@example.test');
    j.check(
      'Done is offered once name, date of birth, nationality, email and address are present',
      !(await isDisabled(page, 'corporate-person-done')),
    );
    await tap(page, 'corporate-person-done', 800);
    const summary = await words(page, 'representative-0');
    j.check(
      'the representative summary shows the person as complete',
      /Layla Haddad/.test(summary) && !/incomplete|needs/i.test(summary),
      summary,
    );
    await j.shot(page, 'representative');
    // Remove, then add again: the editor's Remove control is part of the branch.
    await tap(page, 'representative-0', 900);
    await tap(page, 'representative-0-remove', 800);
    j.check('removing the representative offers Add again', await seen(page, 'representative-add'));
    await tap(page, 'representative-add', 900);
    await corporatePerson(page, 'representative', 0, 'Layla Haddad');
    await tap(page, 'corporate-person-done', 800);
    j.check(
      'the re-added representative reads complete',
      /Complete/.test(await words(page, 'representative-0')) &&
        !(await seen(page, 'corporate-person-sheet')),
      `${await words(page, 'representative-0')} · sheet open: ${await seen(page, 'corporate-person-sheet')}`,
    );
    j.check(
      'Continue is offered on the structure stage',
      !(await isDisabled(page, 'wizard-continue')),
      `ubos: ${await words(page, 'ubos-0').catch(() => '')} · directors: ${await words(page, 'directors-0').catch(() => '')}`,
    );
    j.step('structure stage complete');
    await tap(page, 'wizard-continue', 900);
    // General.
    await page.getByTestId('corporate-pep').getByTestId('choice-no').click();
    await page.getByTestId('corporate-us-person').getByTestId('choice-no').click();
    await pick(page, 'corporate-tax-country', 'AE');
    await page.getByTestId('corporate-has-tin').getByTestId('choice-yes').click();
    await page.waitForTimeout(300);
    await fill(page, 'corporate-tin', '784198812345678');
    j.step('general stage complete');
    j.check(
      'Continue is offered on the general stage',
      !(await isDisabled(page, 'wizard-continue')),
      await words(page, 'screen-onboarding-corporate').then((t) => t.slice(0, 200)),
    );
    await tap(page, 'wizard-continue', 900);
    // Account.
    await page.getByTestId('corporate-platform').getByTestId('choice-MT5').click();
    await page.getByTestId('corporate-account-type').getByTestId('choice-classic').click();
    await page.getByTestId('corporate-currency').getByTestId('choice-USD').click();
    await page.getByTestId('corporate-language').getByTestId('choice-en').click();
    await acceptDocuments(page);
    if (!(await checked(page, 'corporate-consent'))) await tap(page, 'corporate-consent', 400);
    j.step('account stage complete');
    j.check(
      'Continue is offered on the account stage',
      !(await isDisabled(page, 'wizard-continue')),
      await words(page, 'screen-onboarding-corporate').then((t) => t.slice(-240)),
    );
    await tap(page, 'wizard-continue', 1200);
    // Review.
    const structure = await words(page, 'corporate-review-structure');
    j.check(
      'the review marks the structure stage complete',
      /Complete/.test(structure) && !/Needs|action/i.test(structure),
      structure,
    );
    if (!(await checked(page, 'corporate-review-confirm')))
      await tap(page, 'corporate-review-confirm', 400);
    j.check(
      'once confirmed, nothing is reported incomplete',
      !(await seen(page, 'corporate-review-incomplete')),
    );
    await j.shot(page, 'review');
    await tap(page, 'wizard-continue', 3600);
    j.check(
      'the corporate application submits',
      await appears(page, 'screen-onboarding-status', 12_000),
      `${routeOf(page, base)} · ${(await words(page, 'corporate-submit-error').catch(() => '')).slice(0, 120)}`,
    );
    await j.shot(page, 'submitted');
  },
});

/* F72 — Challenge consent omits configured conditions and payout timing.
   Withheld (coordinator): closure rested on typecheck and lint only. Both
   the rules-before-consent screen and the bought challenge's rules must
   render the same programme version's conditions and payout timing, in
   English and in an RTL locale. */
const readTerms = async (page, prefix) => ({
  weekend: await words(page, `${prefix}-weekend`),
  news: await words(page, `${prefix}-news`),
  advisors: await words(page, `${prefix}-advisors`),
  copy: await words(page, `${prefix}-copy`),
  share: await words(page, `${prefix}-share`),
  first: await words(page, `${prefix}-first-payout`),
  interval: await words(page, `${prefix}-interval`),
});
finding({
  id: 'F72',
  title: 'Challenge consent omits configured conditions and payout timing',
  async run({ page, base, j, newPage }) {
    await enterDemo(page, base);
    await toHub(page, base);
    await tap(page, 'hub-prop', 2000);
    await tap(page, 'prop-plan-royal-25k', 1800);
    j.check(
      'the plan opens its versioned rules before consent',
      await appears(page, 'screen-prop-rules'),
      routeOf(page, base),
    );
    const consent = await readTerms(page, 'prop-rules-terms');
    const version = await words(page, 'prop-rules-version');
    j.check(
      'the consent screen names the programme version',
      /prop-2026\.09\.1/.test(version),
      version,
    );
    j.check(
      'it states weekend holding is not allowed',
      /Not allowed/.test(consent.weekend),
      consent.weekend,
    );
    j.check(
      'news trading allowed',
      /(^|[^t] )Allowed/.test(consent.news) && !/Not allowed/.test(consent.news),
      consent.news,
    );
    j.check(
      'expert advisers and copy trading not allowed',
      /Not allowed/.test(consent.advisors) && /Not allowed/.test(consent.copy),
      `${consent.advisors} · ${consent.copy}`,
    );
    j.check('the profit share is stated', /80%/.test(consent.share), consent.share);
    j.check(
      'the first payout timing is stated in trading days',
      /14/.test(consent.first),
      consent.first,
    );
    j.check(
      'the payout interval is stated in calendar days',
      /14 days/.test(consent.interval),
      consent.interval,
    );
    await j.shot(page, 'consent-terms');

    await tap(page, 'prop-rules-accept', 600);
    await tap(page, 'prop-rules-continue', 2200);
    await tap(page, 'prop-payment-confirm', 3600);
    const ready = await appears(page, 'prop-ready-account', 15_000);
    j.check('the challenge is bought', ready, routeOf(page, base));
    if (ready) {
      await tap(page, 'prop-ready-rules', 2000).catch(() => undefined);
      if (!(await seen(page, 'prop-activity-terms-weekend'))) {
        await toHub(page, base);
        await tap(page, 'hub-prop', 2000);
        const links = await idsWithPrefix(page, 'prop-open-progress-');
        if (links[0]) await tap(page, links[0], 2200);
        await tap(page, 'prop-dashboard-rules', 2000);
      }
      j.check(
        'the bought challenge’s rules open',
        await appears(page, 'prop-activity-terms-weekend'),
        routeOf(page, base),
      );
      const bought = await readTerms(page, 'prop-activity-terms');
      j.check(
        'the bought rules render the same conditions as the consent screen',
        JSON.stringify(bought) === JSON.stringify(consent),
        JSON.stringify(bought).slice(0, 200),
      );
      j.check(
        'and the same programme version',
        /prop-2026\.09\.1/.test(await words(page, 'screen-prop-activity')),
      );
      await j.shot(page, 'bought-terms');
    }

    // RTL: the same terms in Arabic, on the consent screen.
    const ar = await newPage({});
    await enterDemo(ar.page, base);
    await switchLanguage(ar.page, base, 'ar');
    j.check(
      'Arabic is applied to the document',
      /^ar/.test(await ar.page.evaluate(() => document.documentElement.lang)),
    );
    await toHub(ar.page, base);
    await tap(ar.page, 'hub-prop', 2000);
    await tap(ar.page, 'prop-plan-royal-25k', 1800);
    const arabic = await readTerms(ar.page, 'prop-rules-terms');
    j.check(
      'Arabic consent names weekend holding as not allowed',
      /غير مسموح/.test(arabic.weekend) && /الاحتفاظ/.test(arabic.weekend),
      arabic.weekend,
    );
    j.check(
      'Arabic consent keeps the configured figures',
      /80/.test(arabic.share) && /14/.test(arabic.first) && /14/.test(arabic.interval),
      `${arabic.share} · ${arabic.first} · ${arabic.interval}`,
    );
    await j.shot(ar.page, 'consent-terms-ar');
    await ar.context.close();
  },
});

/* F74 — Verification method change races with Continue.
   Withheld: "rapid choices and live failed-save recovery not independently
   completed." Sep24 A07 adds the failed save itself, from both starting
   points the audit names: a first choice (no method yet) and a change from a
   method already saved.

   THE FAULT FIXTURE is the device store refusing writes — the same one
   `journey-checks.mjs` uses for S15-10 — installed on the Storage prototype
   for the length of the failing step and removed again. The method save now
   awaits its journal write, so a refused write is a refused save; nothing in
   the app is switched into a test mode, and a client's store failing is
   exactly this.

   BOTH PREVIEWS. The QA preview walks every variation. The shipping preview
   publishes no approved legal content, so its application fails closed at
   the declarations step and no APPLICANT can reach the method choice through
   the flow; the shipping run asserts that consuming path — refused before any
   method could be saved — rather than skipping it.

   THE ADDRESS ITSELF IS GUARDED TOO (Sep24 identity-managed fix-up,
   REV-IDM-3). The Verify route had no guard, so typing it reached the method
   choice, and the seeded verified client could change method and un-verify
   themselves. Only an applicant at the verification step stays on it now;
   the shipping run types the address as the blocked applicant and as the
   seeded verified client and expects the status screen with no method choice
   (the command refuses a change after verification in any case). */
const breakTheDeviceStore = (page) =>
  page.evaluate(() => {
    const proto = Object.getPrototypeOf(window.localStorage);
    if (!window.__ONEROYAL_REAL_SET_ITEM) window.__ONEROYAL_REAL_SET_ITEM = proto.setItem;
    proto.setItem = function refuse() {
      throw new DOMException('the device store is full', 'QuotaExceededError');
    };
  });
const mendTheDeviceStore = (page) =>
  page.evaluate(() => {
    Object.getPrototypeOf(window.localStorage).setItem = window.__ONEROYAL_REAL_SET_ITEM;
  });
const documentsShown = async (page) => {
  const shown = [];
  for (const kind of ['identity', 'selfie', 'proof-of-address'])
    if (await seen(page, `verify-document-${kind}`)) shown.push(kind);
  return shown.join(',');
};
/**
 * A save the store refuses, then a retry it still refuses, then one it takes.
 * Leaves the client on the method stage with `choice` saved.
 */
const failedSaveThenRetry = async (page, j, label, choice, other) => {
  await breakTheDeviceStore(page);
  await tap(page, `choice-${choice}`, 2500);
  j.check(
    `${label}: a refused save shows the error banner`,
    await seen(page, 'verify-method-error'),
  );
  j.check(
    `${label}: the unsaved choice stays selected`,
    (await checked(page, `choice-${choice}`)) && !(await checked(page, `choice-${other}`)),
  );
  j.check(`${label}: Continue is refused`, await isDisabled(page, 'wizard-continue'));
  await j.shot(page, `${label}-save-refused`);
  await tap(page, 'verify-method-error-action', 2500);
  j.check(
    `${label}: Retry while the store still refuses keeps the banner and Continue refused`,
    (await seen(page, 'verify-method-error')) && (await isDisabled(page, 'wizard-continue')),
  );
  j.check(
    `${label}: nothing advanced past the method stage`,
    (await documentsShown(page)) === '' && !(await seen(page, 'verify-handoff')),
    await documentsShown(page),
  );
  await mendTheDeviceStore(page);
  await tap(page, 'verify-method-error-action', 2500);
  j.check(
    `${label}: Retry once the store accepts clears the banner`,
    !(await seen(page, 'verify-method-error')),
  );
  j.check(
    `${label}: the retried choice is the one selected`,
    (await checked(page, `choice-${choice}`)) && !(await checked(page, `choice-${other}`)),
  );
  j.check(`${label}: and Continue is offered`, !(await isDisabled(page, 'wizard-continue')));
  await j.shot(page, `${label}-retry-saved`);
};
finding({
  id: 'F74',
  title: 'Verification method change races with Continue',
  preview: 'both',
  async run({ page, base, preview, j, newPage }) {
    if (preview === 'shipping') {
      await signUp(page, base, { email: 'f74-shipping@example.test' });
      await fill(page, 'application-first-name', 'Amina');
      await fill(page, 'application-last-name', 'Haddad');
      await pickDateOfBirth(page);
      await tap(page, 'wizard-continue');
      await fill(page, 'application-phone', '500000000');
      await tap(page, 'wizard-continue');
      await pick(page, 'application-nationality', 'AE');
      await pick(page, 'application-country', 'AE');
      await tap(page, 'wizard-continue');
      await tap(page, 'choice-en', 800);
      await tap(page, 'wizard-continue', 800);
      j.check(
        'shipping: the application is on hold for approved documents',
        await seen(page, 'document-consent-blocked'),
        routeOf(page, base),
      );
      const submitDisabled = await page
        .getByTestId('wizard-continue')
        .last()
        .isDisabled()
        .catch(() => true);
      j.check('shipping: the application cannot be submitted', submitDisabled);
      j.check(
        'shipping: no method choice is reachable, so no method save can be made or fail',
        !(await seen(page, 'screen-onboarding-verify')) && !(await seen(page, 'choice-smart')),
        routeOf(page, base),
      );
      await j.shot(page, 'shipping-fails-closed-before-verification');

      // Typing the address: the blocked applicant is sent to their status.
      const applicantRoute = await reloadOnto(page, base, '/onboarding/verify');
      j.check(
        'shipping: the Verify address typed by the blocked applicant offers no method choice',
        !(await seen(page, 'choice-smart')) && !(await seen(page, 'choice-classic')),
        applicantRoute,
      );
      j.check(
        'shipping: and lands on the application status',
        await appears(page, 'screen-onboarding-status', 8000),
        routeOf(page, base),
      );
      await j.shot(page, 'shipping-applicant-typed-verify');

      // And by the seeded verified client, who must not be able to un-verify.
      const seeded = await newPage({});
      await enterDemo(seeded.page, base);
      const seededRoute = await reloadOnto(seeded.page, base, '/onboarding/verify');
      j.check(
        'shipping: the Verify address typed by the verified client offers no method choice',
        !(await seen(seeded.page, 'choice-smart')) && !(await seen(seeded.page, 'choice-classic')),
        seededRoute,
      );
      j.check(
        'shipping: and lands on the status screen, still verified',
        (await appears(seeded.page, 'screen-onboarding-status', 8000)) &&
          /verified/i.test(await words(seeded.page, 'status-outcome')),
        routeOf(seeded.page, base),
      );
      await j.shot(seeded.page, 'shipping-verified-client-typed-verify');
      return;
    }

    // Prior method: rapid choices first, which leave Classic saved.
    await freshApplicantAtVerification(page, base, j, 'f74@example.test');
    await (await onTop(page, 'choice-smart')).click();
    await (await onTop(page, 'choice-classic')).click();
    const disabledDuringSave = await isDisabled(page, 'wizard-continue');
    j.check('Continue is refused while the choice is being saved', disabledDuringSave);
    await page.waitForTimeout(2500);
    j.check(
      'the last choice wins once the save settles',
      (await checked(page, 'choice-classic')) && !(await checked(page, 'choice-smart')),
    );
    j.check('and Continue is offered again', !(await isDisabled(page, 'wizard-continue')));
    await j.shot(page, 'after-rapid-choice');
    await tap(page, 'wizard-continue', 1200);
    j.check(
      'the documents asked for are the classic set, the method that was saved',
      (await documentsShown(page)) === 'identity,proof-of-address',
      await documentsShown(page),
    );
    // Back: the stage before Continue still shows the saved choice.
    await back(page, 1200);
    j.check(
      'Back shows the saved method, not the earlier tap',
      (await checked(page, 'choice-classic')) && !(await checked(page, 'choice-smart')),
    );
    await j.shot(page, 'back-to-method');

    // A change from the saved Classic to Smart that the store refuses.
    await failedSaveThenRetry(page, j, 'prior-method', 'smart', 'classic');
    await tap(page, 'wizard-continue', 1200);
    j.check(
      'prior-method: Continue follows the newly saved method (the Smart handoff)',
      (await seen(page, 'verify-handoff')) && (await documentsShown(page)) === '',
      await documentsShown(page),
    );
    await j.shot(page, 'prior-method-continued');

    // Initial null: a first choice the store refuses, on a second applicant.
    const second = await newPage({});
    await freshApplicantAtVerification(second.page, base, j, 'f74-first@example.test');
    j.check(
      'initial-null: no method is selected yet and Continue is refused',
      !(await checked(second.page, 'choice-smart')) &&
        !(await checked(second.page, 'choice-classic')) &&
        (await isDisabled(second.page, 'wizard-continue')),
    );
    await failedSaveThenRetry(second.page, j, 'initial-null', 'classic', 'smart');
    await tap(second.page, 'wizard-continue', 1200);
    j.check(
      'initial-null: Continue follows the newly saved method (the classic documents)',
      (await documentsShown(second.page)) === 'identity,proof-of-address',
      await documentsShown(second.page),
    );
    await j.shot(second.page, 'initial-null-continued');
  },
});

/* F75 — Late document-upload cancellation falsely promises nothing was sent.
   Withheld: "live upload timing remains root work." QA only. */
finding({
  id: 'F75',
  title: 'Late document-upload cancellation falsely promises nothing was sent',
  preview: 'qa',
  async run({ page, base, j }) {
    await freshApplicantAtVerification(page, base, j, 'f75@example.test');
    await tap(page, 'choice-smart', 1200);
    await tap(page, 'wizard-continue', 900);
    await tap(page, 'verify-upload-instead', 900);
    const startUpload = async () => {
      await tap(page, 'verify-upload-identity', 800);
      await tap(page, 'verify-choose-file', 800);
      await attachFile(page, 'identity.jpg', 200 * 1024);
      await (await onTop(page, 'verify-upload-confirm')).click();
    };
    // Early cancel: before the document is handed over.
    await startUpload();
    await page.waitForTimeout(250);
    await (await onTop(page, 'verify-cancel-upload'))
      .click({ timeout: 3000 })
      .catch(() => undefined);
    await page.waitForTimeout(800);
    const early = await words(page, 'verify-cancelled');
    j.check('an early cancel says nothing was sent', /Nothing was sent/.test(early), early);
    j.check('and the document is not received', !(await seen(page, 'verify-received-identity')));
    await j.shot(page, 'early-cancel');
    // Late cancel: after the bar reaches the point of no return.
    await startUpload();
    const committed = await appears(page, 'verify-progress-committed', 6000);
    j.check('the progress sheet reaches the point of no return', committed);
    await (await onTop(page, 'verify-cancel-upload'))
      .click({ force: true, timeout: 2000 })
      .catch(() => undefined);
    await page.waitForTimeout(600);
    const tooLate = await seen(page, 'verify-cancel-too-late');
    j.check(
      'a late cancel does not promise nothing was sent',
      tooLate && !(await seen(page, 'verify-cancelled')),
      tooLate ? await words(page, 'verify-cancel-too-late') : 'no too-late banner',
    );
    j.check(
      'the document is nonetheless received',
      await appears(page, 'verify-received-identity', 10_000),
    );
    await j.shot(page, 'late-cancel');
  },
});

/* F132 — Demo starting-balance choices show USD for selected EUR/GBP accounts.
   Withheld: "No independent mounted currency-switch receipt/choice test." */
finding({
  id: 'F132',
  title: 'Demo starting-balance choices show USD for selected EUR/GBP accounts',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    await toTab(page, base, 'tab-home');
    await tap(page, 'home-see-all-accounts', 1600);
    await tap(page, 'choose-account-mode-demo', 600);
    await tap(page, 'switcher-add-account', 1800);
    const labels = async () =>
      page.getByTestId('account-demo-balance').locator('[data-testid^="choice-"]').allInnerTexts();
    const usd = await labels();
    j.check(
      'with USD selected the grants are priced in dollars',
      usd.length > 0 && usd.every((l) => /^\$/.test(l.trim())),
      usd.join(' '),
    );
    await tap(page, 'choice-EUR', 500);
    const eur = await labels();
    j.check(
      'choosing EUR reprices every grant in euros',
      eur.length > 0 && eur.every((l) => /^€/.test(l.trim())),
      eur.join(' '),
    );
    await tap(page, 'choice-GBP', 500);
    const gbp = await labels();
    j.check(
      'choosing GBP reprices every grant in pounds',
      gbp.length > 0 && gbp.every((l) => /^£/.test(l.trim())),
      gbp.join(' '),
    );
    await j.shot(page, 'gbp-choices');
    // Keyboard: the currency is chosen with Enter on the focused choice.
    await keyActivate(page, 'choice-EUR', 'Enter', 500);
    j.check(
      'Enter on the EUR choice reprices the grants',
      (await labels()).every((l) => /^€/.test(l.trim())),
      (await labels()).join(' '),
    );
    // The receipt: the account created carries the chosen currency and grant.
    await tap(page, 'account-platform-orx', 400).catch(() => undefined);
    await tap(page, 'account-type-classic', 400);
    await tap(page, 'choice-200', 400);
    await tap(page, 'choice-10000', 400);
    await fill(page, 'account-nickname', 'Euro practice');
    await tap(page, 'create-account-submit', 3200);
    j.check(
      'the EUR practice account is created',
      await appears(page, 'screen-account-created', 12_000),
      routeOf(page, base),
    );
    const receipt = await words(page, 'account-created');
    j.check(
      'the receipt names the account as EUR, not USD',
      /EUR/.test(receipt) && !/USD|\$/.test(receipt),
      receipt.slice(0, 200),
    );
    await j.shot(page, 'eur-receipt');
    await tap(page, 'account-created-continue', 2200);
    const equity = await words(page, 'account-equity');
    j.check(
      'the created account carries the grant in euros',
      /€10,000/.test(equity) && !/\$/.test(equity),
      equity,
    );
  },
});

/* F133 — Unconfirmed market-order recovery can retain the wrong ledger tab.
   Withheld: "Candidate tests are string-source assertions plus standalone
   store transitions, not actual consuming navigation." Trade is left on
   History first, so the recovery has a wrong tab to retain. */
finding({
  id: 'F133',
  title: 'Unconfirmed market-order recovery can retain the wrong ledger tab',
  async run({ page, base, j, newPage }) {
    // The fixture-driven variation runs first, in its own context, so a
    // failure in the recovery walk below cannot leave it unexecuted.
    const lowMargin = async () => {
      /*
       * THE HOME MARGIN WARNING (Sep24 A20). No seeded account is at or below
       * its margin-call level and no order can consume more margin than the
       * free-margin check allows, so the warning is reached through the
       * `low-margin` demo fixture: a separate, isolated demo client whose
       * position-holding accounts start halfway between stop-out and margin
       * call. A controlled demo state, not a natural margin call; the checks
       * say so. Trade is left on History first, so Review positions has a
       * wrong tab to retain.
       */
      const { page: low } = await newPage({ fixture: 'low-margin' });
      j.step('low-margin demo fixture: an isolated fixture client, not the demo visitor');
      await enterDemo(low, base);
      await toTrade(low, base);
      await tap(low, 'trade-tabs-history', 700);
      j.check(
        'low-margin fixture: Trade is left on History',
        await selected(low, 'trade-tabs-history'),
      );
      await toTab(low, base, 'tab-home');
      const warned = await appears(low, 'home-margin-warning', 10_000);
      const warning = await words(low, 'home-margin-warning');
      j.check(
        'low-margin fixture: Home shows the margin warning with Review positions',
        warned &&
          /margin level is low/i.test(warning) &&
          (await seen(low, 'home-margin-warning-action')),
        warning.slice(0, 160),
      );
      if (!warned) return;
      await j.shot(low, 'low-margin-warning');
      await tap(low, 'home-margin-warning-action', 1800);
      j.check(
        'low-margin fixture: the Home margin warning’s Review positions lands on Trade',
        /^\/trade/.test(routeOf(low, base)) && (await seen(low, 'screen-trade')),
        routeOf(low, base),
      );
      j.check(
        'low-margin fixture: on Positions, not the History it remembered',
        (await selected(low, 'trade-tabs-positions')) &&
          !(await selected(low, 'trade-tabs-history')),
        `history selected: ${await selected(low, 'trade-tabs-history')}`,
      );
      j.check(
        'low-margin fixture: the positions carrying the margin are listed',
        (await idsWithPrefix(low, 'position-row-')).length > 0,
        (await idsWithPrefix(low, 'position-row-')).join(','),
      );
      await j.shot(low, 'low-margin-review-positions');
    };
    await lowMargin();
    await enterDemo(page, base);
    const recover = async ({ pending }) => {
      await toTrade(page, base);
      await tap(page, 'trade-tabs-history', 700);
      j.check(
        `${pending ? 'pending' : 'market'}: Trade is left on History`,
        await selected(page, 'trade-tabs-history'),
      );
      await openTicketFromTrade(page, base, 'BTCUSD');
      j.check(
        `${pending ? 'pending' : 'market'}: the ticket opens`,
        await appears(page, 'screen-ticket'),
        routeOf(page, base),
      );
      if (pending) {
        await tap(page, 'ticket-order-type-row', 800);
        await tap(page, 'ticket-order-type-limit', 800);
        await fill(page, 'ticket-limit-price', '1000', 800);
      }
      await fill(page, 'ticket-volume', '0.13', 1600);
      await reviewFromTicket(page);
      j.check(
        `${pending ? 'pending' : 'market'}: the ticket advances to review`,
        await appears(page, 'screen-review'),
        routeOf(page, base),
      );
      await tap(page, 'review-submit', 3600);
      const unconfirmed = await appears(page, 'screen-order-unconfirmed', 10_000);
      j.check(
        `${pending ? 'pending' : 'market'}: the outcome is reported as unconfirmed`,
        unconfirmed,
        routeOf(page, base),
      );
      if (!unconfirmed) return;
      await j.shot(page, `${pending ? 'pending' : 'market'}-unconfirmed`);
      await tap(page, 'review-unconfirmed-check', 2600);
      j.check(
        `${pending ? 'pending' : 'market'}: Check lands on the Trade workspace`,
        /^\/trade/.test(routeOf(page, base)) && (await seen(page, 'screen-trade')),
        routeOf(page, base),
      );
      const tab = pending ? 'trade-tabs-orders' : 'trade-tabs-positions';
      j.check(
        `${pending ? 'pending' : 'market'}: on ${pending ? 'Orders' : 'Positions'}, not the History it remembered`,
        await selected(page, tab),
        `history selected: ${await selected(page, 'trade-tabs-history')}`,
      );
      await j.shot(page, `${pending ? 'pending' : 'market'}-landing`);
    };
    await recover({ pending: false });
    await recover({ pending: true });
  },
});

/* F137 — Cancelling account-password verification retains the unsent password.
   Withheld: "not actual live password input replay; root live confirmation
   required." */
finding({
  id: 'F137',
  title: 'Cancelling account-password verification retains the unsent password',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    await toHub(page, base);
    await tap(page, 'hub-trading-accounts', 1600);
    await tap(page, 'account-card-acc-classic-usd', 1800);
    await tap(page, 'account-tabs-platform', 900);
    j.check('the password actions are offered', await seen(page, 'account-password-change'));
    await tap(page, 'account-password-change', 900);
    j.check('the step-up sheet opens', await seen(page, 'sheet-password-step-up'));
    j.check(
      'confirm is refused with nothing typed',
      await isDisabled(page, 'account-password-confirm'),
    );
    await fill(page, 'account-password-stepup-field', 'Passw0rdish');
    j.check(
      'confirm is offered once a password is typed',
      !(await isDisabled(page, 'account-password-confirm')),
    );
    await j.shot(page, 'typed');
    await tap(page, 'sheet-close', 900);
    await tap(page, 'account-password-change', 900);
    j.check(
      'reopening after Close shows an empty field',
      (await value(page, 'account-password-stepup-field')) === '',
      await value(page, 'account-password-stepup-field'),
    );
    j.check('and confirm is refused again', await isDisabled(page, 'account-password-confirm'));
    // Keyboard: type, dismiss with Escape, reopen.
    await (await onTop(page, 'account-password-stepup-field')).focus();
    await page.keyboard.type('Passw0rdish');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    const sheetGone = !(await seen(page, 'sheet-password-step-up'));
    if (!sheetGone) await tap(page, 'sheet-close', 700);
    await tap(page, 'account-password-change', 900);
    j.check(
      `reopening after ${sheetGone ? 'Escape' : 'Close'} shows an empty field again`,
      (await value(page, 'account-password-stepup-field')) === '',
    );
    // Confirm sends once and dismisses; the field is empty afterwards.
    await fill(page, 'account-password-stepup-field', 'Passw0rdish');
    await tap(page, 'account-password-confirm', 1800);
    j.check(
      'confirming sends the request',
      await appears(page, 'account-password-sent'),
      await words(page, 'account-password-sent'),
    );
    j.check('and closes the sheet', !(await seen(page, 'sheet-password-step-up')));
    await tap(page, 'account-password-change', 900);
    j.check(
      'the sent password is not retained for the next request',
      (await value(page, 'account-password-stepup-field')) === '',
    );
    await j.shot(page, 'after-send');
  },
});

/* F140 — Wallet Today section includes a transaction labelled Yesterday.
   Withheld: "No independent consuming Today/Yesterday boundary and DST
   test." Four clocks: just after local midnight, just before it, the same
   instant in UTC, and the night the clocks go back in London. */
const historyBlocks = async (page) => {
  const text = await (await onTop(page, 'screen-wallet-history')).innerText();
  const rows = text.split('\n').map((l) => l.trim());
  const todayAt = rows.indexOf('Today');
  const earlierAt = rows.indexOf('Earlier');
  const isRow = (l) => /·/.test(l) && /(Deposit|Withdrawal|Transfer)/.test(l);
  const today =
    todayAt >= 0
      ? rows.slice(todayAt + 1, earlierAt >= 0 ? earlierAt : undefined).filter(isRow)
      : [];
  const earlier = earlierAt >= 0 ? rows.slice(earlierAt + 1).filter(isRow) : [];
  const ids = await idsWithPrefix(page, 'transaction-row-');
  return {
    today,
    earlier,
    todayIds: ids.slice(0, today.length),
    earlierIds: ids.slice(today.length),
  };
};
const historyJourney =
  (label, { expectToday = [], expectEarlier = [] }) =>
  async ({ page, base, j }) => {
    await enterDemo(page, base);
    await toFunds(page, base);
    await tap(page, 'hub-history', 2000);
    j.check(
      `${label}: the wallet history opens`,
      await appears(page, 'screen-wallet-history'),
      routeOf(page, base),
    );
    const blocks = await historyBlocks(page);
    j.check(
      `${label}: no row under Today is labelled Yesterday`,
      blocks.today.every((l) => !/Yesterday/.test(l)),
      blocks.today.join(' | ').slice(0, 200),
    );
    j.check(
      `${label}: every row under Today is labelled Today`,
      blocks.today.length > 0 && blocks.today.every((l) => /Today,/.test(l)),
      blocks.today.join(' | ').slice(0, 200),
    );
    j.check(
      `${label}: no row under Earlier is labelled Today`,
      blocks.earlier.every((l) => !/Today,/.test(l)),
      blocks.earlier.join(' | ').slice(0, 200),
    );
    for (const id of expectToday)
      j.check(
        `${label}: ${id} is under Today`,
        blocks.todayIds.includes(`transaction-row-${id}`),
        `today: ${blocks.todayIds.join(',')}`,
      );
    for (const id of expectEarlier)
      j.check(
        `${label}: ${id} is under Earlier`,
        blocks.earlierIds.includes(`transaction-row-${id}`),
        `earlier: ${blocks.earlierIds.join(',')}`,
      );
    await j.shot(page, label);
  };
finding({
  id: 'F140',
  title: 'Wallet Today section includes a transaction labelled Yesterday',
  // 00:30 in Beirut: the 40-minute-old crypto deposit is yesterday's.
  context: { timezoneId: 'Asia/Beirut', clock: '2026-09-22T21:30:00Z' },
  async run(args) {
    await historyJourney('beirut-00-30', {
      expectToday: ['txn-00007'],
      expectEarlier: ['txn-00006', 'txn-00002'],
    })(args);
    // 23:30 in Beirut: the 22-hour-old wire deposit is still today's.
    const late = await args.newPage({ timezoneId: 'Asia/Beirut', clock: '2026-09-22T20:30:00Z' });
    await historyJourney('beirut-23-30', { expectToday: ['txn-00002', 'txn-00006', 'txn-00007'] })({
      ...args,
      page: late.page,
    });
    await late.context.close();
    // The same instant in UTC: 21:30, so the crypto deposit is today's there.
    const utc = await args.newPage({ timezoneId: 'UTC', clock: '2026-09-22T21:30:00Z' });
    await historyJourney('utc-21-30', {
      expectToday: ['txn-00006', 'txn-00007'],
      expectEarlier: ['txn-00002'],
    })({ ...args, page: utc.page });
    await utc.context.close();
    // The night London leaves summer time (25 October 2026, 01:00 UTC): a
    // 25-hour day, read at 02:30 GMT.
    const dst = await args.newPage({ timezoneId: 'Europe/London', clock: '2026-10-25T02:30:00Z' });
    await historyJourney('london-dst-fallback', {
      expectToday: ['txn-00006', 'txn-00007'],
      expectEarlier: ['txn-00002'],
    })({ ...args, page: dst.page });
    await dst.context.close();
  },
});

/* F141 — Order ticket repeats closed-market notices and retains distracting
   context banners. Withheld: "No rendered count/layout regression;
   publication blocker prevents live check." A Saturday clock closes gold. */
finding({
  id: 'F141',
  title: 'Order ticket repeats closed-market notices and retains distracting context banners',
  context: { clock: '2026-09-26T12:00:00Z' },
  async run({ page, base, j }) {
    await enterDemo(page, base);
    await toMarkets(page, base);
    await tap(page, 'instrument-row-XAUUSD', 2400);
    j.check(
      'on a Saturday gold is shown closed',
      /closed/i.test(await words(page, 'instrument-market-state')),
      await words(page, 'instrument-market-state'),
    );
    await tap(page, 'instrument-new-order', 2400);
    j.check('the ticket opens', await appears(page, 'screen-ticket'), routeOf(page, base));
    // Buy on a closed market is refused for that side: the one tap chooses
    // it and keeps the client on the ticket with the reason (A19.2).
    if (await seen(page, 'ticket-direction-hint')) await tap(page, 'ticket-side-buy', 1600);
    j.check(
      'a refused Buy stays on the ticket instead of opening review',
      (await appears(page, 'screen-ticket')) && !/^\/trade\/review/.test(routeOf(page, base)),
      routeOf(page, base),
    );
    const closedBanners = await mountedCount(page, 'ticket-blocking-MARKET_CLOSED');
    j.check(
      'no blocking banner repeats the closed market',
      closedBanners === 0,
      `${closedBanners} banner(s)`,
    );
    const context = await words(page, 'ticket-context');
    j.check(
      'the closed market is said once, as a status beside the instrument',
      /closed/i.test(context),
      context.slice(0, 120),
    );
    const reason = await words(page, 'ticket-continue-reason');
    j.check('and once more as the reason Continue is refused', /closed/i.test(reason), reason);
    const alerts = await page
      .locator('[data-testid="screen-ticket"] [role="alert"]')
      .allInnerTexts();
    j.check(
      'no alert banner on the ticket mentions the closed market',
      alerts.every((t) => !/closed/i.test(t)),
      alerts.map((t) => t.slice(0, 40)).join(' | '),
    );
    await j.shot(page, 'closed-gold-ticket');

    /*
     * Sep24 A19.1 / A19.3: NO "you already hold this" reminder. This journey
     * used to REQUIRE the concentration line on a held symbol's ticket — the
     * opposite of the owner's instruction to remove it. It now requires its
     * absence, on the ticket and on the review, and the one-tap review that
     * replaced the second tap on the chosen side (A19.2).
     */
    const noReminder = async (where) => {
      const testId =
        where === 'review' ? 'review-guardrail-concentration' : 'guardrail-concentration';
      const screen = where === 'review' ? 'screen-review' : 'screen-ticket';
      const count = await page.locator(`[data-testid="${testId}"]:visible`).count();
      const text = await words(page, screen);
      return { ok: count === 0 && !/already hold/i.test(text), detail: `${count} line(s)` };
    };
    await back(page, 1200);
    await toTrade(page, base);
    const positions = await idsWithPrefix(page, 'position-row-');
    const symbol =
      positions.length > 0
        ? (await words(page, positions[0])).match(/\b[A-Z]{3,}[A-Z0-9]*\b/)?.[0]
        : null;
    j.check(
      'the active account holds a position to trade against',
      Boolean(symbol),
      positions.join(','),
    );
    if (symbol) {
      await openTicketFromTrade(page, base, symbol);
      const held = await noReminder('ticket');
      j.check(
        `the existing ${symbol} position is NOT restated on its ticket`,
        held.ok,
        held.detail,
      );
      await j.shot(page, 'no-concentration-line');
    }

    // One tap on Buy, on an always-open product, opens its review and
    // places nothing; then again once the product is held.
    await openTicketFromTrade(page, base, 'BTCUSD');
    j.check('a BTCUSD ticket opens with no direction', await seen(page, 'ticket-direction-hint'));
    await fill(page, 'ticket-volume', '0.01', 1600);
    await tap(page, 'ticket-side-buy', 2600);
    j.check(
      'one tap on Buy opens the buy review, without a second tap',
      (await appears(page, 'screen-review')) && /side=buy/.test(routeOf(page, base)),
      routeOf(page, base),
    );
    j.check(
      'and places nothing: no receipt',
      !(await seen(page, 'screen-order-placed')),
      routeOf(page, base),
    );
    await tap(page, 'review-submit', 3600);
    j.check('the order is placed from review', await appears(page, 'screen-order-placed', 10_000));
    await tap(page, 'review-return', 3200);
    await openTicketFromTrade(page, base, 'BTCUSD');
    const heldTicket = await noReminder('ticket');
    j.check(
      'with BTCUSD now held, its ticket carries no reminder',
      heldTicket.ok,
      heldTicket.detail,
    );
    await fill(page, 'ticket-volume', '0.01', 1600);
    await tap(page, 'ticket-side-buy', 2600);
    j.check('one tap on Buy opens the review again', await appears(page, 'screen-review'));
    const heldReview = await noReminder('review');
    j.check('and the review carries no reminder either', heldReview.ok, heldReview.detail);
    await j.shot(page, 'held-symbol-review-no-reminder');
  },
});

/* F142 — Portfolio RTL endpoint captions oppose plotted chronology.
   Withheld: "Arabic rendered alignment still not independently measured." */
finding({
  id: 'F142',
  title: 'Portfolio RTL endpoint captions oppose plotted chronology',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    const endpoints = async () => {
      const children = page
        .locator('[data-testid="portfolio-endpoints"]:visible')
        .last()
        .locator(':scope > *');
      const count = await children.count();
      const out = [];
      for (let i = 0; i < count; i += 1)
        out.push({
          text: (await children.nth(i).innerText()).replace(/\s+/g, ' '),
          box: await children.nth(i).boundingBox(),
        });
      return out;
    };
    await toTrade(page, base);
    await tap(page, 'open-portfolio', 2000);
    const en = await endpoints();
    j.check(
      'English: Start sits under the left endpoint and Latest under the right',
      en.length === 2 &&
        /Start/.test(en[0].text) &&
        /Latest/.test(en[1].text) &&
        en[0].box.x < en[1].box.x,
      JSON.stringify(en.map((e) => [e.text.slice(0, 20), Math.round(e.box?.x ?? -1)])),
    );
    await switchLanguage(page, base, 'ar');
    j.check(
      'Arabic is applied to the document',
      /^ar/.test(await page.evaluate(() => document.documentElement.lang)),
    );
    const home = await box(page, 'tab-home');
    const hub = await box(page, 'tab-hub');
    j.check(
      'the layout is mirrored: Home is now on the right of the Hub',
      Boolean(home && hub) && home.x > hub.x,
      `home ${home?.x} hub ${hub?.x}`,
    );
    await toTrade(page, base);
    await tap(page, 'open-portfolio', 2000);
    const ar = await endpoints();
    j.check(
      'Arabic: the start caption still sits under the left endpoint',
      ar.length === 2 && /البداية/.test(ar[0].text) && ar[0].box.x < ar[1].box.x,
      JSON.stringify(ar.map((e) => [e.text.slice(0, 20), Math.round(e.box?.x ?? -1)])),
    );
    j.check(
      'Arabic: and the latest caption under the right one',
      ar.length === 2 && /الأحدث/.test(ar[1].text),
      ar[1]?.text ?? '',
    );
    const frame = await box(page, 'portfolio-chart-frame');
    j.check(
      'the captions span the plot they annotate',
      Boolean(frame) &&
        ar.length === 2 &&
        ar[0].box.x >= frame.x - 2 &&
        ar[1].box.x + ar[1].box.width <= frame.x + frame.width + 2,
      JSON.stringify({ frame: frame && [Math.round(frame.x), Math.round(frame.width)] }),
    );
    await j.shot(page, 'arabic-portfolio');
  },
});

/* F147 — Closed position lookup loses continuity with its resulting trade.
   Withheld: "Closed-detail mounted navigation and failed trade-query
   handling remain unverified." */
finding({
  id: 'F147',
  title: 'Closed position lookup loses continuity with its resulting trade',
  async run({ page, base, j, newPage }) {
    await enterDemo(page, base);
    await toTrade(page, base);
    const positions = await idsWithPrefix(page, 'position-row-');
    j.check('an open position is available to close', positions.length > 0, positions.join(','));
    if (positions.length === 0) return;
    const positionId = positions[0].replace('position-row-', '');
    await tap(page, positions[0], 2000);
    j.check(
      'the position opens',
      routeOf(page, base) === `/trade/position/${positionId}`,
      routeOf(page, base),
    );
    const hero = await words(page, 'position-hero');
    const symbol = hero.match(/\b[A-Z]{3,}[A-Z0-9]*\b/)?.[0] ?? '';
    await tap(page, 'position-close', 1400);
    await tap(page, 'close-confirm', 3200);
    j.check(
      'closing lands on Trade with History showing',
      /^\/trade/.test(routeOf(page, base)) && (await selected(page, 'trade-tabs-history')),
      routeOf(page, base),
    );
    const rows = await idsWithPrefix(page, 'closed-trade-');
    const newest = rows[0] ?? '';
    const tradeId = newest.replace('closed-trade-', '');
    j.check(
      'the close produced a trade with its own id, distinct from the position',
      tradeId.length > 0 && tradeId !== positionId,
      `${positionId} → ${tradeId}`,
    );
    j.check(
      'the newest history row is that trade and names the symbol',
      new RegExp(symbol).test(await words(page, newest)),
      await words(page, newest),
    );
    await tap(page, newest, 2000);
    j.check(
      'the row opens the closed trade’s own record',
      routeOf(page, base) === `/trade/position/${tradeId}` &&
        (await appears(page, 'screen-position-closed')),
      routeOf(page, base),
    );
    const closed = await words(page, 'screen-position-closed');
    j.check(
      'the record names the symbol and how it was closed',
      new RegExp(symbol).test(closed) &&
        /closed it|manual/i.test(await words(page, 'closed-trade-close-reason')),
      await words(page, 'closed-trade-close-reason'),
    );
    await j.shot(page, 'closed-record');
    // Lineage: the position's own route resolves to the trade it became.
    const restored = await reloadOnto(page, base, `/trade/position/${positionId}`);
    j.check(
      'the closed position’s route resolves to its resulting trade',
      restored === `/trade/position/${positionId}` &&
        (await appears(page, 'screen-position-closed', 10_000)) &&
        new RegExp(symbol).test(await words(page, 'screen-position-closed')),
      `${restored} · ${(await words(page, 'screen-position-closed')).slice(0, 80)}`,
    );
    await j.shot(page, 'lineage');
    await back(page, 1400);
    j.check(
      'Back from the record does not land on Welcome',
      !/welcome/.test(routeOf(page, base)),
      routeOf(page, base),
    );
    /*
     * A FAILED TRADE QUERY, AND ITS RETRY (Sep24 A20). The trade history is
     * read from memory, so it never fails on its own. The
     * `trade-query-retry` demo fixture — an isolated demo client — fails the
     * first trade-history read of each page load and passes every later one.
     * A controlled fault of the demo adapter, not a provider outage; the
     * checks say so.
     */
    const { page: fx } = await newPage({ fixture: 'trade-query-retry' });
    j.step('trade-query-retry demo fixture: an isolated fixture client, not the demo visitor');
    await enterDemo(fx, base);
    await toTrade(fx, base);
    await tap(fx, 'trade-tabs-history', 1400);
    const failed = await appears(fx, 'error-state', 8000);
    j.check(
      'trade-query fixture: the failed history read shows an error with Try again',
      failed && (await seen(fx, 'error-state-action')),
      (await words(fx, 'error-state')).slice(0, 160),
    );
    await j.shot(fx, 'history-read-failed');
    await tap(fx, 'error-state-action', 2400);
    const listed = await idsWithPrefix(fx, 'closed-trade-');
    j.check(
      'trade-query fixture: Try again reads the history and lists the closed trades',
      !(await seen(fx, 'error-state')) && listed.length > 0,
      `${listed.length} rows`,
    );
    await tap(fx, 'trade-tabs-positions', 900);
    const open = await idsWithPrefix(fx, 'position-row-');
    j.check('trade-query fixture: an open position is available to close', open.length > 0);
    if (open.length === 0) return;
    const closedId = open[0].replace('position-row-', '');
    await tap(fx, open[0], 2000);
    const closedSymbol =
      (await words(fx, 'position-hero')).match(/\b[A-Z]{3,}[A-Z0-9]*\b/)?.[0] ?? '';
    // An empty symbol would match any record: the lineage check needs one (REV-GT-8).
    j.check(
      'trade-query fixture: the position to close names its symbol',
      closedSymbol.length > 0,
      closedSymbol || 'no symbol read from the position',
    );
    await tap(fx, 'position-close', 1400);
    await tap(fx, 'close-confirm', 3200);
    const resulting = ((await idsWithPrefix(fx, 'closed-trade-'))[0] ?? '').replace(
      'closed-trade-',
      '',
    );
    j.check(
      'trade-query fixture: the close produced its own trade',
      resulting.length > 0 && resulting !== closedId,
      `${closedId} → ${resulting}`,
    );
    // A reload is a fresh page load, whose first trade read the fixture fails:
    // the closed position's own route meets the failed query.
    const reloadedAt = await reloadOnto(fx, base, `/trade/position/${closedId}`);
    const unreadable = await appears(fx, 'screen-position-unreadable', 10_000);
    j.check(
      'trade-query fixture: a failed trade query shows the unreadable state with a retry',
      reloadedAt === `/trade/position/${closedId}` &&
        unreadable &&
        (await seen(fx, 'position-read-retry-action')) &&
        !(await seen(fx, 'screen-position-not-found')),
      `${reloadedAt} · unreadable ${unreadable}`,
    );
    await j.shot(fx, 'trade-query-unreadable');
    await tap(fx, 'position-read-retry-action', 2600);
    const record = await appears(fx, 'screen-position-closed', 10_000);
    /*
     * THE resulting trade, not any closed record (REV-GT-8): the screen names
     * the record it resolved (`closed-record-<trade id>`), and that must be
     * the trade the close produced, reached from the POSITION's route.
     */
    const shownRecords = (await idsWithPrefix(fx, 'closed-record-')).map((id) =>
      id.replace('closed-record-', ''),
    );
    j.check(
      'trade-query fixture: Try again shows the resulting closed trade by lineage',
      record &&
        closedSymbol.length > 0 &&
        resulting.length > 0 &&
        shownRecords.length === 1 &&
        shownRecords[0] === resulting &&
        routeOf(fx, base) === `/trade/position/${closedId}` &&
        new RegExp(`\\b${closedSymbol}\\b`).test(await words(fx, 'screen-position-closed')),
      `route ${routeOf(fx, base)} · record ${shownRecords.join(',') || 'none'} (expected ${resulting || 'none'}) · ${closedSymbol} · ${(await words(fx, 'screen-position-closed')).slice(0, 60)}`,
    );
    await j.shot(fx, 'trade-query-retried');
  },
});

/* F144 — Robot catalogue search restricts testable selection to five fixtures.
   Product decision (23 September): the client chooses any instrument. What
   the engine can TEST is what has a price series and a cost; in the demo
   that is every instrument the demo prices. An instrument without data is
   chosen like any other and says, beside the choice, that it cannot be
   tested yet — Continue waits for data rather than replaying invented
   prices. */
finding({
  id: 'F144',
  title: 'Robot catalogue search restricts testable selection to five fixtures',
  async run({ page, base, j }) {
    await enterDemo(page, base);
    await toHub(page, base);
    await tap(page, 'hub-robots', 1600);
    await tap(page, 'robots-build', 1400);
    await tap(page, 'robot-route-describe', 1400);
    await fill(
      page,
      'robot-describe-input',
      'buy gold when the 9 EMA crosses the 21 EMA, stop 300 points, target 600 points, 0.1 lots',
      900,
    );
    await tap(page, 'robot-describe-create', 1800);
    j.check('the robot rules open', await appears(page, 'screen-robot-rules'), routeOf(page, base));
    const count = await words(page, 'robot-rules-instrument-count');
    const testable = Number((count.match(/(\d+) of/) ?? [])[1] ?? 0);
    j.check(
      'more than the five fixtures can be tested, and any instrument can be built on',
      testable >= 18 && /any of them/.test(count),
      count,
    );

    // An instrument with no demo data: found, chosen, and honest about it.
    await fill(page, 'robot-rules-instrument-search', 'EURGBP', 900);
    j.check(
      'a catalogue instrument without test data is listed',
      await seen(page, 'robot-rules-instrument-unsupported-EURGBP'),
    );
    await tap(page, 'robot-rules-instrument-unsupported-EURGBP', 1600);
    j.check(
      'it can be chosen: the notice beside the choice names it',
      (await appears(page, 'robot-rules-instrument-untested', 6000)) &&
        /EURGBP/.test(await words(page, 'robot-rules-instrument-untested')),
      await words(page, 'robot-rules-instrument-untested'),
    );
    j.check(
      'Continue waits for data instead of testing invented prices',
      await isDisabled(page, 'robot-rules-continue'),
    );
    const problems = await words(page, 'screen-robot-rules');
    j.check(
      'the rule list gives the reason in words',
      /no price history or trading costs/i.test(problems),
      problems.slice(0, 200),
    );
    await j.shot(page, 'untested-instrument-chosen');

    // Keyboard: the same row answers Enter.
    await fill(page, 'robot-rules-instrument-search', 'AUDCAD', 900);
    await keyActivate(page, 'robot-rules-instrument-unsupported-AUDCAD', 'Enter', 1600);
    j.check(
      'Enter on an untested instrument chooses it',
      /AUDCAD/.test(await words(page, 'robot-rules-instrument-untested')),
      await words(page, 'robot-rules-instrument-untested'),
    );

    // An instrument the five fixtures never covered, now testable.
    await fill(page, 'robot-rules-instrument-search', 'US500', 900);
    await tap(page, 'robot-rules-instrument-US500', 1800);
    j.check(
      'choosing a testable instrument clears the notice',
      !(await seen(page, 'robot-rules-instrument-untested')),
    );
    j.check('and Continue is available', !(await isDisabled(page, 'robot-rules-continue')));
    await tap(page, 'robot-rules-continue', 2600);
    j.check(
      'the backtest opens for US500',
      (await appears(page, 'screen-robot-backtest', 12_000)) &&
        /US500/.test(await words(page, 'screen-robot-backtest')),
      (await words(page, 'screen-robot-backtest')).slice(0, 200),
    );
    await j.shot(page, 'us500-backtest');
  },
});

/* ---------------------------------------------------------------------------
   The run
   ------------------------------------------------------------------------ */

const buildIdentity = {};
const engine = `${browser.browserType().name()} ${browser.version()}`;
const ranAt = new Date().toISOString();

for (const spec of FINDINGS) {
  if (ONLY.length > 0 && !ONLY.includes(spec.id)) continue;
  const previews = (spec.preview === 'both' ? ['shipping', 'qa'] : [spec.preview]).filter(
    (preview) => ONLY_PREVIEW === null || preview === ONLY_PREVIEW,
  );
  for (const preview of previews) {
    const base = BASES[preview];
    const j = recorder(spec, preview);
    const errors = [];
    console.log(`\n${spec.id} · ${spec.title} · ${preview}`);
    const opened = [];
    const newPage = async (overrides) => {
      const extra = await openContext({ base, errors, ...spec.context, ...overrides });
      opened.push(extra);
      return extra;
    };
    const main = await openContext({ base, errors, ...spec.context });
    opened.push(main);
    try {
      if (!buildIdentity[preview]) {
        await main.page.goto(`${base}/welcome`, { waitUntil: 'networkidle' });
        await main.page.waitForTimeout(600);
        buildIdentity[preview] = await words(main.page, 'welcome-build-identity');
      }
      await spec.run({ page: main.page, base, preview, j, newPage });
    } catch (error) {
      j.check('the journey ran to completion', false, String(error).split('\n')[0]);
      await j.shot(main.page, 'failure').catch(() => undefined);
    }
    if (j.record.screenshots.length === 0) await j.shot(main.page, 'final').catch(() => undefined);
    j.check(
      'no uncaught page error during the journey',
      errors.length === 0,
      [...new Set(errors)].slice(0, 2).join(' | '),
    );
    for (const { context } of opened) await context.close().catch(() => undefined);
  }
}

await browser.close();

/* ---------------------------------------------------------------------------
   The record
   ------------------------------------------------------------------------ */

const allChecks = records.flatMap((r) => r.checks);
const totals = {
  findings: new Set(records.map((r) => r.id)).size,
  runs: records.length,
  checks: allChecks.length,
  // A blocked variation is reported on its own line, never folded into failed:
  // the verifier and the closure matrix read the two counts separately.
  failed: allChecks.filter((c) => !c.ok && !c.blocked).length,
  blocked: allChecks.filter((c) => c.blocked).length,
};
const payload = {
  ranAt,
  commit: COMMIT,
  sourceRevision: SOURCE_REVISION,
  revisionDeclaration: RUNNER.revisionDeclaration,
  bases: BASES,
  buildIdentity: { qa: buildIdentity.qa ?? null, shipping: buildIdentity.shipping ?? null },
  builds: {
    qa: {
      sourceRevision: manifests.qa.sourceRevision,
      treeRevision: manifests.qa.treeRevision,
      configuration: manifests.qa.configuration,
      scopeClean: manifests.qa.scopeClean ?? null,
    },
    shipping: {
      sourceRevision: manifests.shipping.sourceRevision,
      treeRevision: manifests.shipping.treeRevision,
      configuration: manifests.shipping.configuration,
      scopeClean: manifests.shipping.scopeClean ?? null,
    },
  },
  // Every journey and the previews it runs on, filtered or not, so a closure
  // can require each of them in the record (REV-GT-6).
  specs: FINDINGS.map((spec) => ({
    id: spec.id,
    previews: spec.preview === 'both' ? ['shipping', 'qa'] : [spec.preview],
  })),
  engine,
  viewport: VIEWPORT,
  timezone: DEFAULT_TIMEZONE,
  filtered: ONLY.length > 0 || ONLY_PREVIEW ? { findings: ONLY, preview: ONLY_PREVIEW } : null,
  findings: records,
  totals,
};
mkdirSync(dirname(OUT_JSON), { recursive: true });
writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);

const failedLines = records.flatMap((r) =>
  r.checks
    .filter((c) => !c.ok)
    .map(
      (c) =>
        `- ${r.id} (${r.preview}) ${c.blocked ? 'BLOCKED' : 'FAILED'}: ${c.name}${c.detail ? ` — ${c.detail}` : ''}`,
    ),
);
const index = [
  '# Sep22 consuming-UI journeys',
  '',
  `Run at ${ranAt} on commit \`${COMMIT}\` (source revision \`${SOURCE_REVISION}\`), ${engine}, ${VIEWPORT.width}×${VIEWPORT.height}, ${DEFAULT_TIMEZONE} unless a journey sets its own clock and zone.`,
  '',
  `- Shipping: \`${BASES.shipping}\` — ${buildIdentity.shipping ?? 'identity not read'}`,
  `- QA: \`${BASES.qa}\` — ${buildIdentity.qa ?? 'identity not read'}`,
  '',
  'A BLOCKED check is a variation the auditor named that no control on the build can drive; it is counted on its own, never as a pass and never as a failure of the repaired behaviour, and its detail says what would close it.',
  '',
  '| Finding | Preview | Checks passed | Failed | Blocked | Screenshot |',
  '|---|---|---:|---:|---:|---|',
  ...records.map((r) => {
    const passed = r.checks.filter((c) => c.ok).length;
    const failed = r.checks.filter((c) => !c.ok && !c.blocked).length;
    const blocked = r.checks.filter((c) => c.blocked).length;
    const shot = r.screenshots[0] ? `[${r.screenshots[0]}](./${r.screenshots[0]})` : '—';
    return `| ${r.id} — ${r.title} | ${r.preview} | ${passed} | ${failed} | ${blocked} | ${shot} |`;
  }),
  '',
  `Totals: ${totals.findings} findings, ${totals.runs} runs, ${totals.checks} checks, ${totals.failed} failed, ${totals.blocked} blocked.`,
  '',
  '## Failed and blocked checks',
  '',
  ...(failedLines.length > 0 ? failedLines : ['(none)']),
  '',
];
writeFileSync(join(OUT_DIR, 'INDEX.md'), `${index.join('\n')}\n`);

console.log(
  `\n${totals.findings} findings, ${totals.runs} runs, ${totals.checks} checks, ${totals.failed} failed (${totals.blocked} blocked); written to ${OUT_JSON}`,
);
// A blocked variation is not a pass either (Sep24 A20.2): the run exits
// non-zero while any check is failed OR blocked.
process.exitCode = totals.failed > 0 || totals.blocked > 0 ? 1 : 0;
if (totals.blocked > 0)
  console.log(
    `${totals.blocked} blocked variation(s) are listed in INDEX.md; they are not closed.`,
  );
