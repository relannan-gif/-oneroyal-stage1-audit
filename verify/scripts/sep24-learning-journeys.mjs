/**
 * Sep24 learning journeys — A12, A13, A14 and A15.3 driven on the built app.
 *
 * WHY THIS FILE EXISTS. The Sep24 review bound the learning repairs (failed
 * durable writes, immediate practice feedback, durable formal sittings, the
 * editorial-approval notice) to unit and component tests only: no consuming
 * journey drove them on a served preview, and the Sep22 learning journeys
 * carry no filtered/specs/builds fields, so they could not be evidence. Each
 * journey below walks the screens a learner uses, on BOTH previews, and
 * records what they show:
 *
 *   A13-practice   single-choice practice is marked and explained on
 *                  selection, with no Check, in lesson practice, the
 *                  objective review (the lesson's "Practise this
 *                  objective"), the due review (the learn home's "Review
 *                  what's due" sitting, the same sitting again by deep link,
 *                  and a due row's lesson) and a retaken practice set;
 *                  multi-select and typed answers keep their Check;
 *   A13-formal     a chapter checkpoint and a course exam show no key, no
 *                  correctness and no hint until the sitting completes, then
 *                  every card shows what it withheld;
 *   A14-sitting    a checkpoint sitting started, partly answered, left,
 *                  re-opened (remount) and reloaded is the SAME sitting with
 *                  the same committed answers and no key; finishing gives the
 *                  result; Retake opens a new sitting; no practice surface
 *                  shows a question of the open sitting (A13.2 leak rule),
 *                  with a positive control once the first sitting is finished;
 *   A12-failed-write  the device store refuses the write of the LAST
 *                  checkpoint answer (and of a lesson answer): Retry is
 *                  offered, no result, no completed sitting, no attempt, no
 *                  locked card; once the store takes writes again, Retry
 *                  commits the answer exactly once;
 *   A15.3-provisional the "Awaiting editorial approval" notice on the exam
 *                  result, the progress screen, the learn home and the
 *                  certificate, with a control before anything is marked;
 *   A13-desktop / A13-rtl  the practice/formal difference again at a desktop
 *                  width and in Arabic (right to left).
 *
 * HOW A SCREEN IS REACHED. By pressing what a learner can see, from
 * `/welcome` into the demonstration session: the objective drill from the
 * lesson's "Practise this objective", the review sitting from the learn
 * home's "Review what's due" (Sep24 learn-entry, A13.1). One DEEP LINK is
 * kept on purpose — the review sitting's URL loaded again, a real page load
 * through the Pages 404 bounce, which must resume the sitting the button
 * opened — and the checks made there say so. A14's leak check reloads the
 * lesson page by its URL, then presses the lesson's button.
 *
 * WHAT IS READ BESIDES THE SCREEN. Two things, each labelled in its check's
 * detail: the learning record the app wrote to the device
 * (`oneroyal.learning.v1.<build>.<client>` in localStorage — the sitting's id,
 * its committed answers, the attempts), and the `item` a rendered question
 * card was given (its id, kind and objective, from the card's React props),
 * which is how a practice surface is compared with an open sitting.
 *
 * THE FAULT. A12 uses the same injection as journey-checks S15-10 and the
 * F74 consuming journey: `Storage.prototype.setItem` throws
 * `QuotaExceededError` while the fault is on, which is what a full or blocked
 * localStorage does, and the real method is put back to prove the recovery.
 *
 * WHAT A FAILED CHECK MEANS. A journey that cannot reach its screen records a
 * failed check with the reason; a variation no control on the build can drive
 * is BLOCKED, which is not a pass. The process exits non-zero when any check
 * failed or is blocked.
 *
 *   JOURNEYS_BASE=http://localhost:8095/-oneroyal-stage1-audit/shipping \
 *   JOURNEYS_BASE_NONPROD=http://localhost:8095/-oneroyal-stage1-audit/qa \
 *   JOURNEYS_OUT_JSON=… JOURNEYS_OUT_DIR=… \
 *   PLAYWRIGHT_MODULE=… CHROMIUM_PATH=… node scripts/sep24-learning-journeys.mjs
 *
 * `JOURNEYS_ONLY=A12-failed-write|A14-sitting` and `JOURNEYS_PREVIEW=qa`
 * narrow a reproduction; such a run says FILTERED in its record and is never
 * evidence (the final pipeline runs with both unset).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { runnerRevision } from './lib/runner-revision.mjs';

const loaded = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const playwright = loaded.chromium ? loaded : loaded.default;
const { chromium } = playwright;

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const OUT_JSON =
  process.env.JOURNEYS_OUT_JSON ??
  join(ROOT, 'docs/repair-sprint/sep24/lanes/journeys-results/learning-journeys.json');
const OUT_DIR =
  process.env.JOURNEYS_OUT_DIR ??
  join(ROOT, 'docs/repair-sprint/sep24/lanes/journeys-results/learning-journeys');

const BASES = {
  shipping: process.env.JOURNEYS_BASE ?? null,
  qa: process.env.JOURNEYS_BASE_NONPROD ?? null,
};
if (!BASES.shipping || !BASES.qa) {
  console.error(
    'Set JOURNEYS_BASE (the shipping export) and JOURNEYS_BASE_NONPROD (the QA export). ' +
      'Both previews are required.',
  );
  process.exit(2);
}
for (const key of Object.keys(BASES)) BASES[key] = BASES[key].replace(/\/+$/, '');

/* Each base must be serving the build it names (as in sep22-consuming-journeys). */
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
  // the copy and content the checks read, declared too when run off-repo
  join(ROOT, 'apps/mobile/src/i18n/translations/_en.reference.json'),
  join(ROOT, 'apps/mobile/src/i18n/translations/ar.json'),
  join(ROOT, 'packages/test-fixtures/src/learning/content.generated.ts'),
]);
const COMMIT = RUNNER.commit;
const SOURCE_REVISION = RUNNER.sourceRevision;

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };
const TZ = 'Asia/Beirut';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** 10:00 on 24 September 2026 in Beirut (UTC+3): the controlled start of the clocked journeys. */
const CLOCK_START = Date.parse('2026-09-24T07:00:00Z');

const ONLY = (process.env.JOURNEYS_ONLY ?? '').split('|').filter(Boolean);
const ONLY_PREVIEW = process.env.JOURNEYS_PREVIEW ?? null;
if (ONLY.length > 0 || ONLY_PREVIEW) {
  console.log(
    `FILTERED RUN — ${ONLY.length > 0 ? `only ${ONLY.join(', ')}` : 'every journey'}${
      ONLY_PREVIEW ? ` on ${ONLY_PREVIEW} only` : ''
    }. Not evidence.\n`,
  );
}
if (ONLY.length === 0 && !ONLY_PREVIEW) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

/* --------------------------------------------------------------------------
   The copy and the content the checks name
   ----------------------------------------------------------------------- */

const COPY = {
  en: JSON.parse(readFileSync(join(ROOT, 'apps/mobile/src/i18n/translations/_en.reference.json'))),
  ar: JSON.parse(readFileSync(join(ROOT, 'apps/mobile/src/i18n/translations/ar.json'))),
};

/**
 * The generated learning content this tree builds into the app. Used only to
 * CHOOSE where to go (a lesson with a single-choice and a multi-select or
 * typed question, the shortest course); what a screen shows is always read
 * from the screen, and a candidate that does not show what is needed is
 * passed over for the next.
 */
const BANK = (() => {
  const src = readFileSync(
    join(ROOT, 'packages/test-fixtures/src/learning/content.generated.ts'),
    'utf8',
  );
  const grab = (name) => {
    const m = src.match(new RegExp(`^export const ${name}\\b[^=]*= (.*);\\s*$`, 'm'));
    if (!m) throw new Error(`content.generated.ts has no ${name}`);
    return JSON.parse(m[1]);
  };
  return {
    questions: grab('LEARNING_QUESTIONS'),
    lessons: grab('LEARNING_LESSONS'),
    courses: grab('LEARNING_COURSES'),
    chapters: grab('LEARNING_CHAPTERS'),
  };
})();
const SINGLE = new Set(['choice', 'boolean']);
const KEEPS_CHECK = new Set(['multi', 'entry']);

/** Lessons whose practice should hold a single choice AND a multi-select or typed answer. */
const PRACTICE_LESSONS = (() => {
  const byObjective = new Map();
  for (const q of BANK.questions) {
    if (q.origin === 'course-exam') continue;
    if (!byObjective.has(q.objectiveId)) byObjective.set(q.objectiveId, []);
    byObjective.get(q.objectiveId).push(q);
  }
  return BANK.lessons
    .filter((l) => {
      const qs = byObjective.get(l.objectiveId) ?? [];
      const scored = (q) => (q.contentReview?.scoring ?? 'scored') === 'scored';
      return (
        qs.some((q) => SINGLE.has(q.kind) && scored(q)) && qs.some((q) => KEEPS_CHECK.has(q.kind))
      );
    })
    .map((l) => ({ id: l.id, courseId: l.courseId, objectiveId: l.objectiveId }));
})();
const lessonOfObjective = (objectiveId) => BANK.lessons.find((l) => l.objectiveId === objectiveId);
/** Checkpoints to sit, smallest reserve first where the content says so; each is verified on screen. */
const CHAPTERS = [
  'whole-picture',
  'understand-market',
  'analytical-tools',
  'what-moves-markets',
  'repeatable-approach',
  ...BANK.chapters.map((c) => c.id),
].filter((id, i, all) => all.indexOf(id) === i && BANK.chapters.some((c) => c.id === id));
const EXAM_COURSES = [
  ...new Set(BANK.questions.filter((q) => q.origin === 'course-exam').map((q) => q.courseId)),
];
const SHORTEST_COURSE = [...BANK.courses]
  .map((c) => ({ id: c.id, lessons: BANK.lessons.filter((l) => l.courseId === c.id).length }))
  .filter((c) => c.lessons > 0)
  .sort((a, b) => a.lessons - b.lessons)[0]?.id;

/* --------------------------------------------------------------------------
   Browser
   ----------------------------------------------------------------------- */

/**
 * `active=<css>`: the copies of a control a learner can press. The navigator
 * keeps the screens below the current one mounted and painted, with
 * `pointer-events: none`; this engine drops those (as in
 * sep22-learning-journeys.mjs).
 */
await playwright.selectors.register('active', () => ({
  queryAll(root, selector) {
    return Array.from(root.querySelectorAll(selector)).filter((el) => {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return false;
      const self = getComputedStyle(el);
      if (self.display === 'none' || self.visibility === 'hidden') return false;
      const parent = el.parentElement ? getComputedStyle(el.parentElement).pointerEvents : 'auto';
      return self.pointerEvents !== 'none' || parent !== 'none';
    });
  },
  query(root, selector) {
    return this.queryAll(root, selector)[0] ?? null;
  },
}));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

/** Restores a route carried in `?r=` the way the published `index.html` does (no-op when it already has). */
const restoreShim = (prefix) => {
  try {
    const r = new URLSearchParams(location.search).get('r');
    if (!r) return;
    const route = r.charAt(0) === '/' ? r : `/${r}`;
    history.replaceState(null, '', prefix + route);
  } catch {
    /* a sandboxed frame refuses history writes */
  }
};

const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

/* --------------------------------------------------------------------------
   One journey on one preview
   ----------------------------------------------------------------------- */

const records = [];

class Journey {
  constructor(spec, preview) {
    this.spec = spec;
    this.preview = preview;
    this.base = BASES[preview];
    this.prefix = new URL(this.base).pathname.replace(/\/+$/, '');
    this.lang = spec.context.language ?? 'en';
    this.errors = [];
    this.record = {
      id: spec.id,
      title: spec.title,
      preview,
      criteria: spec.criteria,
      context: {
        viewport: spec.context.viewport,
        browserLocale: spec.context.locale,
        appLanguage: this.lang,
        timezoneId: TZ,
        clock: spec.context.clock ? new Date(spec.context.clock).toISOString() : null,
      },
      steps: [],
      checks: [],
      screenshots: [],
      ok: true,
    };
    records.push(this.record);
  }

  async open() {
    this.context = await browser.newContext({
      viewport: this.spec.context.viewport,
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      locale: this.spec.context.locale,
      timezoneId: TZ,
    });
    this.page = await this.context.newPage();
    this.page.on('pageerror', (e) => this.errors.push(String(e).slice(0, 200)));
    if (this.spec.context.clock) await this.page.clock.install({ time: this.spec.context.clock });
    await this.page.addInitScript(() => {
      window.__ONEROYAL_FREEZE_MARKET = true;
    });
    await this.page.addInitScript(restoreShim, this.prefix);
  }

  async close() {
    await this.context?.close().catch(() => undefined);
  }

  /* ---- recording ------------------------------------------------------- */

  step(text) {
    this.record.steps.push(text);
    console.log(`     · ${text}`);
  }

  check(name, ok, detail = '') {
    const entry = { name, ok: Boolean(ok), detail: String(detail ?? '').slice(0, 300) };
    this.record.checks.push(entry);
    if (!entry.ok) this.record.ok = false;
    console.log(
      `  ${entry.ok ? 'ok  ' : 'FAIL'} ${this.spec.id}/${this.preview} · ${name}${entry.detail ? ` — ${entry.detail}` : ''}`,
    );
    return entry.ok;
  }

  blocked(name, reason) {
    const entry = { name, ok: false, blocked: true, detail: String(reason).slice(0, 300) };
    this.record.checks.push(entry);
    this.record.ok = false;
    console.log(`  BLKD ${this.spec.id}/${this.preview} · ${name} — ${entry.detail}`);
    return false;
  }

  async shot(label) {
    const file = `${this.spec.id}-${this.preview}-${String(this.record.screenshots.length + 1).padStart(2, '0')}-${slug(label)}.png`;
    await this.page
      .screenshot({ path: join(OUT_DIR, file), fullPage: false })
      .catch(() => undefined);
    this.record.screenshots.push(file);
  }

  /* ---- locators -------------------------------------------------------- */

  tid(name) {
    return this.page.locator(`active=[data-testid="${name}"]`).last();
  }

  async present(name) {
    return (await this.page.locator(`active=[data-testid="${name}"]`).count()) > 0;
  }

  async appears(name, timeout = 8000) {
    try {
      await this.tid(name).waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  async gone(name, timeout = 6000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (!(await this.present(name))) return true;
      await this.page.waitForTimeout(150);
    }
    return !(await this.present(name));
  }

  async tap(name, wait = 900) {
    try {
      await this.tid(name).click({ timeout: 15_000 });
    } catch (error) {
      throw new Error(`tap ${name}: ${String(error).split('\n')[0]}`);
    }
    await this.page.waitForTimeout(wait);
  }

  async text(name) {
    return (
      (await this.tid(name)
        .innerText()
        .catch(() => '')) ?? ''
    )
      .replace(/\s+/g, ' ')
      .trim();
  }

  async disabled(name) {
    const node = this.tid(name);
    const aria = await node.getAttribute('aria-disabled').catch(() => null);
    return aria === 'true' || (await node.isDisabled().catch(() => false));
  }

  /** The route relative to the preview's base. */
  rel() {
    const url = new URL(this.page.url());
    const path = url.pathname.startsWith(this.prefix)
      ? url.pathname.slice(this.prefix.length)
      : url.pathname;
    return (path || '/') + url.search;
  }

  /* ---- entering and moving --------------------------------------------- */

  async dismissIntro() {
    await this.tid('demo-intro-dismiss')
      .click({ timeout: 3000 })
      .catch(() => undefined);
    await this.page.waitForTimeout(400);
  }

  async enterDemo() {
    await this.page.goto(`${this.base}/welcome`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(900);
    await this.tap('welcome-demo', 2400);
    await this.dismissIntro();
  }

  /**
   * A full page load of `route` (a deep link, or a reload): the Pages 404
   * bounce, the restore shim, a fresh bundle, the remembered demo session.
   * A device that remembers no demo shows Welcome, and the demo is entered
   * again before the route is loaded once more.
   */
  async load(route) {
    await this.page.goto(`${this.base}${route}`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2200);
    if (await this.appears('welcome-demo', 1500)) {
      await this.tap('welcome-demo', 2400);
      await this.dismissIntro();
      await this.page.goto(`${this.base}${route}`, { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(2200);
    }
    await this.dismissIntro();
    return this.rel();
  }

  async reload() {
    await this.page.reload({ waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2200);
    if (await this.appears('welcome-demo', 1500)) {
      await this.tap('welcome-demo', 2400);
      return 'entered again from Welcome';
    }
    await this.dismissIntro();
    return 'demo session restored';
  }

  async toLearnHome() {
    await this.tap('tab-hub', 1200);
    if (!(await this.appears('hub-trader-pro', 4000))) await this.tap('tab-hub', 1200);
    await this.tap('hub-trader-pro', 1500);
    return this.appears('screen-learn-home');
  }

  async toCourse(courseId) {
    await this.toLearnHome();
    await this.tap('learn-courses-link', 1200);
    await this.tap(`learn-course-${courseId}`, 1500);
    return this.appears('screen-learn-course');
  }

  async toLesson(courseId, lessonId) {
    await this.toCourse(courseId);
    await this.tap(`learn-course-lesson-${lessonId}`, 1800);
    return this.appears('screen-learn-lesson');
  }

  async toChapter(chapterId) {
    await this.toLearnHome();
    await this.tap('learn-journey-link', 1200);
    await this.tap(`learn-chapter-${chapterId}`, 1500);
    return this.appears('screen-learn-chapter');
  }

  async toCheckpoint(chapterId) {
    await this.toChapter(chapterId);
    await this.tap('learn-chapter-checkpoint-start', 2200);
    return this.appears('learn-assessment-question-0', 10_000);
  }

  async toCourseExam(courseId) {
    await this.toCourse(courseId);
    await this.tap('learn-course-exam-start', 2200);
    return this.appears('learn-assessment-question-0', 10_000);
  }

  async switchLanguage(code) {
    await this.tap('tab-hub', 1200);
    if (!(await this.appears('hub-app-settings', 4000))) await this.tap('tab-hub', 1200);
    await this.tap('hub-app-settings', 1200);
    await this.tap('settings-language', 800);
    await this.tap(`language-option-${code}`, 1800);
    const lang = await this.page.evaluate(() => document.documentElement.lang);
    const home = await this.tid('tab-home')
      .boundingBox()
      .catch(() => null);
    const hub = await this.tid('tab-hub')
      .boundingBox()
      .catch(() => null);
    return { lang, homeX: home?.x ?? null, hubX: hub?.x ?? null };
  }

  /* ---- what the screen and the device hold ------------------------------ */

  /**
   * The rendered question cards on the live screen whose test id is
   * `<prefix><n>`, with the `item` each card was given (its React props).
   */
  async cards(prefix) {
    return this.page.locator(`active=[data-testid^="${prefix}"]`).evaluateAll(
      (els, p) =>
        els
          .filter((el) => new RegExp(`^${p}\\d+$`).test(el.getAttribute('data-testid') ?? ''))
          .map((el) => {
            const tid = el.getAttribute('data-testid');
            const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
            let fiber = key ? el[key] : null;
            for (let hops = 0; fiber && hops < 60; hops += 1) {
              const props = fiber.memoizedProps;
              if (props && props.item && props.testID === tid)
                return {
                  tid,
                  id: props.item.id,
                  kind: props.item.kind,
                  objectiveId: props.item.objectiveId ?? null,
                  origin: props.item.origin,
                  mode: props.mode ?? 'assessment',
                  restored: Boolean(props.initial),
                  feedback: props.feedback ?? 'immediate',
                };
              fiber = fiber.return;
            }
            return { tid, id: null };
          }),
      prefix,
    );
  }

  /** Every question card on the live screen (lesson, exercise and assessment cards). */
  async practiceCards() {
    return [
      ...(await this.cards('learn-lesson-question-')),
      ...(await this.cards('learn-lesson-exercise-')),
      ...(await this.cards('learn-assessment-question-')),
    ];
  }

  /** The learning record on the device, as the app wrote it. */
  async device() {
    return this.page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && /oneroyal\.learning\.v1\./.test(key)) {
          try {
            return { key, data: JSON.parse(localStorage.getItem(key)).data };
          } catch {
            return { key, data: null };
          }
        }
      }
      return null;
    });
  }

  async sittingsOf(scopeKey) {
    const d = await this.device();
    return (d?.data?.sittings ?? []).filter((s) => s.scopeKey === scopeKey);
  }

  async attemptsOf(activityId) {
    const d = await this.device();
    return (d?.data?.attempts ?? []).filter((a) => a.activityId === activityId);
  }

  /** Options of a card whose accessible name carries the key ("Correct answer" / "Your answer"). */
  async keyMarks(card) {
    const marks = [
      COPY[this.lang]['learn.correctAnswerLabel'],
      COPY[this.lang]['learn.yourAnswerLabel'],
    ];
    return this.page
      .locator(`active=[data-testid^="${card}-option-"]`)
      .evaluateAll(
        (els, m) =>
          els.filter((el) => m.some((x) => (el.getAttribute('aria-label') ?? '').endsWith(x)))
            .length,
        marks,
      );
  }

  /** Whatever a card of this kind needs to hold an answer, without submitting it. */
  async fillCard(card, kind) {
    if (await this.present(`${card}-option-0`)) {
      await this.tap(`${card}-option-0`, 300);
    } else if (await this.present(`${card}-entry`)) {
      await this.tid(`${card}-entry`).fill('1');
    } else if (await this.present(`${card}-open`)) {
      await this.tid(`${card}-open`).fill('Answered for the acceptance run.');
    } else if (kind === 'match') {
      const pairs = await this.page
        .locator(`active=[data-testid^="${card}-pair-"]:not([data-testid$="-answer"])`)
        .count();
      for (let r = 0; r < pairs; r += 1) await this.tap(`${card}-pair-${r}`, 120);
    }
    await this.page.waitForTimeout(250);
  }

  /** Waits for the card to say how its answer went; `none` when it says nothing. */
  async outcome(card, timeout = 8000) {
    const outcomes = ['not-saved', 'feedback', 'recorded', 'completed', 'invalid'];
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      for (const o of outcomes) if (await this.present(`${card}-${o}`)) return o;
      await this.page.waitForTimeout(150);
    }
    return 'none';
  }

  /** Answers one card of any kind: fill, then Check where the card has one. */
  async answer(card, kind) {
    if (await this.present(`${card}-held`)) return 'held';
    // Already answered (and saved): nothing to press.
    for (const o of ['feedback', 'recorded', 'completed'])
      if (await this.present(`${card}-${o}`)) return o;
    await this.fillCard(card, kind);
    if (await this.present(`${card}-check`)) await this.tap(`${card}-check`, 400);
    return this.outcome(card);
  }

  /** Answers every unanswered assessment card; returns their outcomes. */
  async answerAll(fromIndex = 0) {
    const cards = await this.cards('learn-assessment-question-');
    const out = [];
    for (const c of cards.slice(fromIndex)) out.push(await this.answer(c.tid, c.kind));
    return out;
  }

  /* ---- the checks the journeys share ------------------------------------ */

  /**
   * A13.1 on one practice surface: the first single-choice card has no Check,
   * and choosing an option marks it and explains it, with the key shown.
   */
  async singleChoiceOnSelection(label, prefix, prefer = () => true) {
    const cards = await this.cards(prefix);
    // A scored question where there is one (a practice-only answer schedules no review).
    const singles = cards.filter((c) => SINGLE.has(c.kind));
    const scored = [];
    for (const c of singles) if (!(await this.present(`${c.tid}-practice-only`))) scored.push(c);
    const card = scored.find(prefer) ?? singles.find(prefer) ?? scored[0] ?? singles[0];
    if (!card) {
      this.check(
        `${label}: a single-choice practice question is on the screen`,
        false,
        `cards: ${cards.map((c) => c.kind).join(',') || 'none'}`,
      );
      return null;
    }
    this.check(
      `${label}: the single-choice card runs in practice mode`,
      card.mode === 'practice' && card.feedback === 'immediate',
      `${card.tid} ${card.id} mode=${card.mode} feedback=${card.feedback}`,
    );
    this.check(
      `${label}: the single-choice card offers no Check button`,
      !(await this.present(`${card.tid}-check`)),
      card.tid,
    );
    this.check(
      `${label}: nothing is marked before an option is chosen`,
      !(await this.present(`${card.tid}-feedback`)) && (await this.keyMarks(card.tid)) === 0,
    );
    await this.tap(`${card.tid}-option-0`, 200);
    const shown = await this.appears(`${card.tid}-feedback`, 5000);
    const body = await this.text(`${card.tid}-feedback`);
    this.check(
      `${label}: choosing an option marks it at once, with its explanation`,
      shown && body.length > 20,
      body.slice(0, 160),
    );
    this.check(
      `${label}: the key is shown on the options`,
      (await this.keyMarks(card.tid)) >= 1,
      `${await this.keyMarks(card.tid)} option(s) labelled`,
    );
    return card;
  }

  /** A13.2 on a practice surface: a multi-select or typed card keeps its Check. */
  async keepsCheck(label, prefix) {
    const cards = await this.cards(prefix);
    const card = cards.find((c) => KEEPS_CHECK.has(c.kind));
    if (!card) {
      this.check(
        `${label}: a multi-select or typed practice question is on the screen`,
        false,
        `cards: ${cards.map((c) => c.kind).join(',') || 'none'}`,
      );
      return null;
    }
    this.check(
      `${label}: the ${card.kind} card offers Check`,
      await this.present(`${card.tid}-check`),
      `${card.tid} ${card.id}`,
    );
    await this.fillCard(card.tid, card.kind);
    await this.page.waitForTimeout(900);
    this.check(
      `${label}: filling the ${card.kind} answer marks nothing until Check`,
      !(await this.present(`${card.tid}-feedback`)) && (await this.present(`${card.tid}-check`)),
    );
    await this.tap(`${card.tid}-check`, 300);
    this.check(
      `${label}: Check marks the ${card.kind} answer`,
      await this.appears(`${card.tid}-feedback`, 5000),
    );
    return card;
  }

  /**
   * A13.2 in a formal sitting: the first card, answered, says only that it is
   * recorded — no hint before, no key, no correctness after.
   */
  async formalWithheld(label) {
    const cards = await this.cards('learn-assessment-question-');
    const first = cards[0];
    this.check(
      `${label}: the sitting is formal and says feedback waits for the end`,
      (await this.present('learn-assessment-formal-note')) &&
        cards.length > 0 &&
        cards.every((c) => c.mode === 'assessment' && c.feedback === 'withheld'),
      cards.map((c) => `${c.kind}:${c.mode}/${c.feedback}`).join(' '),
    );
    this.check(`${label}: no hint is offered`, !(await this.present(`${first.tid}-hint`)));
    const single = cards.find((c) => SINGLE.has(c.kind));
    if (single) {
      await this.fillCard(single.tid, single.kind);
      await this.page.waitForTimeout(900);
      this.check(
        `${label}: choosing a single-choice option marks nothing; Check is still needed`,
        !(await this.present(`${single.tid}-feedback`)) &&
          (await this.keyMarks(single.tid)) === 0 &&
          (await this.present(`${single.tid}-check`)),
        single.tid,
      );
      await this.tap(`${single.tid}-check`, 300);
    } else {
      await this.answer(first.tid, first.kind);
    }
    const target = single ?? first;
    const said = await this.outcome(target.tid);
    this.check(
      `${label}: the answered card says only that the answer is recorded`,
      said === 'recorded' && (await this.keyMarks(target.tid)) === 0,
      `${target.tid}: ${said}`,
    );
    return { cards, answered: target };
  }
}

/* --------------------------------------------------------------------------
   The journeys
   ----------------------------------------------------------------------- */

const JOURNEYS = [];
const journey = (id, title, criteria, context, run) =>
  JOURNEYS.push({
    id,
    title,
    criteria,
    context: { viewport: PHONE, locale: 'en-GB', ...context },
    run,
  });

/** Opens the first candidate lesson whose practice shows a single choice and a Check-keeping card. */
async function openPracticeLesson(j) {
  const tried = [];
  for (const lesson of PRACTICE_LESSONS.slice(0, 8)) {
    await j.toLesson(lesson.courseId, lesson.id);
    const cards = await j.cards('learn-lesson-question-');
    let scoredSingle = false;
    for (const c of cards)
      if (SINGLE.has(c.kind) && !(await j.present(`${c.tid}-practice-only`))) scoredSingle = true;
    tried.push(`${lesson.id}: ${cards.map((c) => c.kind).join(',') || 'none'}`);
    if (scoredSingle && cards.some((c) => KEEPS_CHECK.has(c.kind))) return { lesson, cards };
  }
  j.check(
    'a lesson whose practice has a single choice and a multi/typed answer opens',
    false,
    tried.join(' | '),
  );
  return null;
}

journey(
  'A13-practice',
  'Single-choice practice is marked and explained on selection, without Check, on every practice surface; multi-select and typed answers keep Check',
  ['A13.1', 'A13.2'],
  { clock: CLOCK_START },
  async (j) => {
    j.step('enter the demo; open a lesson with a single choice and a multi/typed question');
    await j.enterDemo();
    const found = await openPracticeLesson(j);
    if (!found) return;
    const { lesson } = found;
    j.check('lesson practice opens from the course', true, `${lesson.courseId} / ${lesson.id}`);
    await j.singleChoiceOnSelection('lesson practice', 'learn-lesson-question-');
    await j.keepsCheck('lesson practice', 'learn-lesson-question-');
    await j.shot('lesson-practice');

    j.step('objective review: "Practise this objective" on the lesson');
    const route = `/learn/assessment/objective/${lesson.objectiveId}`;
    const drillLabel = await j.text('learn-lesson-objective-drill');
    if (
      !j.check(
        'the lesson offers "Practise this objective"',
        drillLabel === COPY.en['learn.practiseObjective'],
        drillLabel || 'no control',
      )
    )
      return;
    await j.tap('learn-lesson-objective-drill', 1800);
    const at = j.rel();
    j.check(
      'objective review opens from the lesson button',
      at.startsWith(route) && (await j.appears('learn-assessment-question-0')),
      at,
    );
    j.check(
      'objective review is practice: no formal note',
      !(await j.present('learn-assessment-formal-note')),
    );
    await j.singleChoiceOnSelection('objective review', 'learn-assessment-question-');
    await j.shot('objective-review');

    j.step('retake practice: finish the objective review, press Retake');
    await j.answerAll();
    const result = await j.appears('learn-assessment-result', 8000);
    j.check('objective review reaches its result', result);
    if (result) {
      await j.tap('learn-assessment-retake', 2000);
      j.check('Retake opens fresh practice cards', await j.gone('learn-assessment-result', 6000));
      await j.singleChoiceOnSelection('retake practice', 'learn-assessment-question-');
      await j.shot('retake-practice');
    }

    j.step('a second lesson answered today, so two objectives come due');
    let other = null;
    let second = null;
    for (const l of PRACTICE_LESSONS.filter((x) => x.objectiveId !== lesson.objectiveId).slice(
      0,
      8,
    )) {
      await j.toLesson(l.courseId, l.id);
      for (const c of await j.cards('learn-lesson-question-'))
        if (SINGLE.has(c.kind) && !second && !(await j.present(`${c.tid}-practice-only`)))
          second = c;
      if (second) {
        other = l;
        break;
      }
    }
    if (
      !j.check(
        'a second lesson with a scored single choice opens',
        other !== null,
        other?.id ?? 'none',
      )
    )
      return;
    await j.tap(`${second.tid}-option-0`, 300);
    j.check('its single choice is answered', (await j.outcome(second.tid, 5000)) === 'feedback');

    j.step('four days later: both objectives are due for review');
    await j.page.clock.setSystemTime(CLOCK_START + 4 * DAY);
    await j.reload();
    await j.toLearnHome();
    const rowA = `learn-review-${lesson.objectiveId}`;
    const rowB = `learn-review-${other.objectiveId}`;
    j.check(
      'the learn home lists both objectives as due for review',
      (await j.appears(rowA, 6000)) && (await j.present(rowB)),
      `${rowA} · ${rowB}`,
    );
    await j.shot('review-due');

    j.step('the due review: "Review what\'s due" on the learn home');
    const dueRows = await j.page
      .locator('active=[data-testid^="learn-review-"]')
      .evaluateAll((els) =>
        els
          .map((el) => el.getAttribute('data-testid'))
          .filter((id) => id !== 'learn-review-start' && id !== 'learn-review-none'),
      );
    const startLabel = await j.text('learn-review-start');
    j.check(
      'the learn home offers "Review what\'s due" with the due count',
      startLabel === COPY.en['learn.reviewStart'].replace('{count}', String(dueRows.length)) &&
        dueRows.length >= 2,
      `${startLabel || 'no control'} · ${dueRows.length} due rows`,
    );
    await j.tap('learn-review-start', 2200);
    const reviewAt = j.rel();
    j.check(
      'the review sitting opens from the learn home button with due questions',
      reviewAt.startsWith('/learn/assessment/review') &&
        (await j.appears('learn-assessment-question-0', 8000)),
      reviewAt,
    );
    j.check(
      'the review sitting is practice: no formal note',
      !(await j.present('learn-assessment-formal-note')),
    );
    // A question of the FIRST objective, so the second stays due for the learn-home path.
    await j.singleChoiceOnSelection(
      'due review sitting',
      'learn-assessment-question-',
      (c) => c.objectiveId === lesson.objectiveId,
    );
    await j.shot('review-sitting');

    /* The one deep link kept: the URL of the sitting the button opened, loaded again. */
    j.step('the review sitting again by deep link (a page load of its URL)');
    const opened = (await j.sittingsOf('review')).at(-1);
    const again = await j.load(reviewAt);
    const resumed = (await j.sittingsOf('review')).at(-1);
    j.check(
      'the review sitting opens by deep link: the sitting the button opened, resumed',
      again.startsWith('/learn/assessment/review') &&
        (await j.appears('learn-assessment-question-0', 8000)) &&
        opened !== undefined &&
        (opened.completedAt !== null || resumed?.id === opened.id),
      `${again} · device sitting ${opened?.id ?? 'none'} → ${resumed?.id ?? 'none'}`,
    );

    await j.toLearnHome();
    const due = await j.appears(rowB, 6000);
    j.check('the second objective is still listed as due', due, rowB);
    if (due) {
      await j.tap(rowB, 1800);
      j.check('the due review opens the lesson', await j.appears('screen-learn-lesson'));
      await j.singleChoiceOnSelection('due review (learn home)', 'learn-lesson-question-');
      await j.shot('due-review-lesson');
    }
  },
);

/**
 * A13.2: a formal sitting answered to its last question says nothing about
 * correctness; the last answer completes it and every card then shows what
 * it withheld.
 */
async function sitToTheEnd(j, label) {
  const cards = await j.cards('learn-assessment-question-');
  const outcomes = [];
  for (const c of cards.slice(0, -1)) outcomes.push(await j.answer(c.tid, c.kind));
  let feedback = 0;
  let marks = 0;
  for (const c of cards) {
    if (await j.present(`${c.tid}-feedback`)) feedback += 1;
    marks += await j.keyMarks(c.tid);
  }
  j.check(
    `${label}: with one question left, every answer is only recorded and nothing is marked`,
    outcomes.every((o) => o === 'recorded') &&
      feedback === 0 &&
      marks === 0 &&
      !(await j.present('learn-assessment-result')),
    `${outcomes.join(',')}; feedback ${feedback}, key marks ${marks}`,
  );
  const last = cards.at(-1);
  await j.answer(last.tid, last.kind);
  j.check(
    `${label}: the last answer completes the sitting with a result`,
    await j.appears('learn-assessment-result', 8000),
  );
  let revealed = 0;
  for (const c of cards) if (await j.present(`${c.tid}-feedback`)) revealed += 1;
  j.check(
    `${label}: once complete, every card shows what it withheld`,
    revealed === cards.length && cards.length > 0,
    `${revealed}/${cards.length}`,
  );
}

journey(
  'A13-formal',
  'A chapter checkpoint and a course exam withhold the key and correctness until the sitting completes',
  ['A13.2'],
  {},
  async (j) => {
    await j.enterDemo();
    j.step('a chapter checkpoint');
    const chapter = CHAPTERS[0];
    j.check('the checkpoint opens', await j.toCheckpoint(chapter), chapter);
    await j.formalWithheld('checkpoint');
    await j.shot('checkpoint-withheld');
    await sitToTheEnd(j, 'checkpoint');
    await j.shot('checkpoint-revealed');

    j.step('a course exam');
    const course = EXAM_COURSES[0];
    j.check('the course exam opens', await j.toCourseExam(course), course);
    await j.formalWithheld('course exam');
    await j.shot('exam-withheld');
    await sitToTheEnd(j, 'course exam');
    await j.shot('exam-revealed');
  },
);

journey(
  'A14-sitting',
  'A checkpoint sitting resumes by identity after navigation, remount and reload, keys hidden; finish, retake, and no practice leak',
  ['A14.1', 'A14.2', 'A13.2'],
  {},
  async (j) => {
    await j.enterDemo();
    let chapter = null;
    for (const c of CHAPTERS.slice(0, 5)) {
      if ((await j.toCheckpoint(c)) && (await j.cards('learn-assessment-question-')).length >= 4) {
        chapter = c;
        break;
      }
    }
    if (
      !j.check(
        'a checkpoint with at least four questions opens',
        chapter !== null,
        CHAPTERS.slice(0, 5).join(','),
      )
    )
      return;
    const scopeKey = `chapter:${chapter}`;
    const route = `/learn/assessment/chapter/${chapter}`;

    j.step('answer three questions, then leave');
    const opened = await j.sittingsOf(scopeKey);
    const sitting = opened.at(-1);
    j.check(
      'opening the checkpoint records one open sitting on the device',
      opened.length === 1 && sitting?.completedAt === null,
      `${sitting?.id} (device record)`,
    );
    const cards = await j.cards('learn-assessment-question-');
    const outcomes = [];
    for (const c of cards.slice(0, 3)) outcomes.push(await j.answer(c.tid, c.kind));
    j.check(
      'three answers are recorded',
      outcomes.every((o) => o === 'recorded'),
      outcomes.join(','),
    );
    await j.page.waitForTimeout(600);
    const committed = (await j.sittingsOf(scopeKey)).at(-1);
    j.check(
      'the device holds the three answers under the sitting',
      committed?.id === sitting?.id && committed?.answers.length === 3,
      `${committed?.id}: ${committed?.answers.length} answers (device record)`,
    );
    await j.shot('three-answered');

    /*
     * `fromRecord`: the cards were built again, so the answers they show can
     * only have come from the sitting record (each card's `initial`), and the
     * screen says the sitting was resumed.
     */
    const resumedChecks = async (label, fromRecord) => {
      const now = (await j.sittingsOf(scopeKey)).at(-1);
      j.check(
        `${label}: the same sitting, with the same three committed answers`,
        now?.id === sitting?.id && now?.answers.length === 3 && now?.completedAt === null,
        `${now?.id}: ${now?.answers.length} answers (device record)`,
      );
      const shown = await j.cards('learn-assessment-question-');
      j.check(
        `${label}: the same questions, in the same order`,
        shown.map((c) => c.id).join('|') === cards.map((c) => c.id).join('|'),
        shown
          .map((c) => c.id)
          .slice(0, 3)
          .join(','),
      );
      let recorded = 0;
      for (const c of shown.slice(0, 3)) if (await j.present(`${c.tid}-recorded`)) recorded += 1;
      j.check(`${label}: the three answers are shown as recorded`, recorded === 3, `${recorded}/3`);
      let feedback = 0;
      let marks = 0;
      for (const c of shown) {
        if (await j.present(`${c.tid}-feedback`)) feedback += 1;
        marks += await j.keyMarks(c.tid);
      }
      j.check(
        `${label}: no key, no correctness and no result while it is unfinished`,
        feedback === 0 && marks === 0 && !(await j.present('learn-assessment-result')),
        `feedback ${feedback}, key marks ${marks}`,
      );
      if (fromRecord) {
        const restored = shown.filter((c) => c.restored).map((c) => c.id);
        j.check(
          `${label}: the cards are rebuilt from the sitting record (the three answered ones, no other)`,
          restored.length === 3 &&
            restored.every((id) => committed.answers.some((a) => a.activityId === id)),
          `${restored.length} restored (card props)`,
        );
        j.check(
          `${label}: the screen says the sitting was resumed`,
          await j.present('learn-assessment-resumed'),
        );
      }
    };
    /** Marks the live assessment screen, to tell a remount from a screen that survived. */
    const markScreen = () =>
      j.page.evaluate(() => {
        for (const el of document.querySelectorAll('[data-testid="screen-learn-assessment"]'))
          el.setAttribute('data-journey-mark', 'before');
      });
    const survived = () =>
      j.page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="screen-learn-assessment"]')].some(
          (el) => el.getAttribute('data-journey-mark') === 'before',
        ),
      );

    j.step('navigate away (Back, then the Hub tab) and come back to the checkpoint');
    await markScreen();
    await j.tap('header-back', 1400);
    j.check('Back leaves the sitting', await j.appears('screen-learn-chapter'));
    await j.toCheckpoint(chapter);
    const kept = await survived();
    j.step(
      `the assessment screen ${kept ? 'survived the navigation (kept mounted by the navigator)' : 'was mounted again'}`,
    );
    await resumedChecks('after navigating away and back', !kept);

    j.step('remount: another checkpoint in between, then this one again');
    const otherChapter = CHAPTERS.find((c) => c !== chapter);
    await j.toCheckpoint(otherChapter);
    j.check(
      'another checkpoint opens in between',
      (await j.cards('learn-assessment-question-')).every((c) => !cards.some((x) => x.id === c.id)),
      otherChapter,
    );
    await j.toCheckpoint(chapter);
    await resumedChecks('after a remount', true);

    j.step('reload the page on the sitting');
    const how = await j.reload();
    if (!(await j.appears('learn-assessment-question-0', 6000))) await j.load(route);
    j.check('the reload returns to the sitting', j.rel().startsWith(route), `${j.rel()} (${how})`);
    await j.appears('learn-assessment-question-0', 10_000);
    await resumedChecks('after a reload', true);
    await j.shot('resumed-after-reload');

    /* The leak rule: no practice surface shows a question of the open sitting. */
    const leakCheck = async (label, open, expectNone) => {
      const objectives = [...new Set(open.cards.map((c) => c.objectiveId).filter(Boolean))].slice(
        0,
        3,
      );
      const seen = [];
      for (const objectiveId of objectives) {
        const lesson = lessonOfObjective(objectiveId);
        if (!lesson) {
          // No lesson teaches it on this build: its drill by URL.
          await j.load(`/learn/assessment/objective/${objectiveId}`);
          await j.page.waitForTimeout(600);
          for (const c of await j.practiceCards()) seen.push(c.id);
          continue;
        }
        await j.load(`/learn/lesson/${lesson.id}`);
        await j.appears('learn-lesson-exercise', 6000);
        for (const c of await j.practiceCards()) seen.push(c.id);
        // The objective drill, from the lesson's "Practise this objective"; the
        // lesson offers it only when there is practice to draw (Sep24 A13.1).
        if (await j.present('learn-lesson-objective-drill')) {
          await j.tap('learn-lesson-objective-drill', 1800);
          await j.appears('learn-assessment-question-0', 6000);
          for (const c of await j.practiceCards()) seen.push(c.id);
        }
      }
      const ids = new Set(open.ids);
      const leaked = [...new Set(seen.filter((id) => ids.has(id)))];
      if (expectNone) {
        j.check(
          `${label}: no practice surface shows a question of the open sitting`,
          objectives.length > 0 && leaked.length === 0,
          `${objectives.length} objectives, ${seen.length} practice cards, leaked: ${leaked.join(',') || 'none'}`,
        );
      }
      return { objectives, seen, leaked };
    };
    j.step('practice for the sitting’s objectives while it is open');
    await leakCheck('first sitting open', { ids: sitting.itemIds, cards }, true);

    j.step('finish the sitting');
    await j.load(route);
    await j.appears('learn-assessment-question-0', 10_000);
    const rest = await j.answerAll(3);
    const finished = await j.appears('learn-assessment-result', 8000);
    j.check('the remaining answers finish the sitting with a result', finished, rest.join(','));
    const closed = (await j.sittingsOf(scopeKey)).at(-1);
    j.check(
      'the device marks the same sitting complete with every answer once',
      closed?.id === sitting?.id &&
        closed?.completedAt !== null &&
        closed?.answers.length === sitting.itemIds.length &&
        new Set(closed?.answers.map((a) => a.activityId)).size === closed?.answers.length,
      `${closed?.id}: ${closed?.answers.length}/${sitting.itemIds.length}, completedAt ${closed?.completedAt}`,
    );
    await j.shot('first-sitting-result');

    j.step('positive control: a finished sitting releases its questions to practice');
    const released = await leakCheck(
      'first sitting finished',
      { ids: sitting.itemIds, cards },
      false,
    );
    j.check(
      'after the sitting is finished, practice shows at least one of its questions (the leak check can see them)',
      released.leaked.length > 0,
      `${released.leaked.length} of its questions in practice`,
    );

    j.step('Retake: a new sitting');
    await j.load(route);
    await j.appears('learn-assessment-question-0', 10_000);
    const reopened = (await j.sittingsOf(scopeKey)).at(-1);
    j.check(
      'coming back after the finish opens a new sitting, not the finished one',
      reopened && reopened.id !== sitting.id && reopened.completedAt === null,
      `${reopened?.id} (device record)`,
    );
    const second = await j.cards('learn-assessment-question-');
    let fresh = 0;
    for (const c of second)
      if (!(await j.present(`${c.tid}-recorded`)) && !(await j.present(`${c.tid}-feedback`)))
        fresh += 1;
    j.check(
      'its cards are unanswered',
      fresh === second.length && second.length > 0,
      `${fresh}/${second.length}`,
    );
    const overlap = second.filter((c) => sitting.itemIds.includes(c.id)).length;
    j.step(`the new sitting re-asks ${overlap} question(s) of the first`);
    await leakCheck('second sitting open', { ids: reopened.itemIds, cards: second }, true);
    await j.load(route);
    await j.appears('learn-assessment-question-0', 10_000);
    await j.answerAll(0);
    j.check(
      'the new sitting finishes with a result',
      await j.appears('learn-assessment-result', 8000),
    );
    await j.tap('learn-assessment-retake', 2200);
    const third = (await j.sittingsOf(scopeKey)).at(-1);
    j.check(
      'pressing Retake on the result opens another new sitting',
      third &&
        third.id !== reopened.id &&
        third.completedAt === null &&
        (await j.gone('learn-assessment-result', 6000)),
      `${third?.id} (device record)`,
    );
    await j.shot('retake');
  },
);

/* The device store refusing writes (journey-checks S15-10, F74). */
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

journey(
  'A12-failed-write',
  'A refused durable answer write shows Retry, leaves no result, attempt or completed sitting, and Retry commits once',
  ['A12.1', 'A12.2'],
  {},
  async (j) => {
    await j.enterDemo();
    const chapter = CHAPTERS[1] ?? CHAPTERS[0];
    const scopeKey = `chapter:${chapter}`;
    j.check('the checkpoint opens', await j.toCheckpoint(chapter), chapter);
    const cards = await j.cards('learn-assessment-question-');
    const last = cards.at(-1);
    j.step(`answer ${cards.length - 1} of ${cards.length}`);
    const outcomes = [];
    for (const c of cards.slice(0, -1)) outcomes.push(await j.answer(c.tid, c.kind));
    j.check(
      'every answer but the last is recorded',
      outcomes.every((o) => o === 'recorded'),
      outcomes.join(','),
    );
    await j.page.waitForTimeout(600);
    const before = (await j.sittingsOf(scopeKey)).at(-1);
    const deviceBefore = await j.device();
    const attemptsBefore = (deviceBefore?.data?.attempts ?? []).length;
    const skillsBefore = JSON.stringify(deviceBefore?.data?.skills ?? {});

    j.step('the device store refuses writes; answer the last question');
    await breakTheDeviceStore(j.page);
    await j.fillCard(last.tid, last.kind);
    await j.tap(`${last.tid}-check`, 400);
    const said = await j.outcome(last.tid);
    j.check('the last answer says it was not saved', said === 'not-saved', `${last.tid}: ${said}`);
    j.check('the card offers Retry', await j.present(`${last.tid}-retry`));
    j.check(
      'the screen offers Retry for the unsaved answer',
      (await j.present('learn-assessment-save-failed')) &&
        (await j.present('learn-assessment-save-retry')),
    );
    j.check('no result is shown', !(await j.present('learn-assessment-result')));
    let revealed = 0;
    for (const c of cards) if (await j.present(`${c.tid}-feedback`)) revealed += 1;
    j.check('no key is revealed on any card', revealed === 0, `${revealed} revealed`);
    if (await j.present(`${last.tid}-option-0`))
      j.check(
        'the unsaved card is not locked: its options can still be changed',
        !(await j.disabled(`${last.tid}-option-0`)),
      );
    else
      j.check(
        'the unsaved card is not locked: Retry is enabled',
        !(await j.disabled(`${last.tid}-retry`)),
      );
    const during = (await j.sittingsOf(scopeKey)).at(-1);
    const deviceDuring = await j.device();
    j.check(
      'the device holds no completed sitting and no answer for the last question',
      during?.id === before?.id &&
        during?.completedAt === null &&
        during?.answers.length === cards.length - 1 &&
        !during?.answers.some((a) => a.activityId === last.id),
      `${during?.answers.length}/${cards.length} answers, completedAt ${during?.completedAt} (device record)`,
    );
    j.check(
      'no ghost attempt and no mastery change on the device',
      (deviceDuring?.data?.attempts ?? []).length === attemptsBefore &&
        JSON.stringify(deviceDuring?.data?.skills ?? {}) === skillsBefore,
      `attempts ${attemptsBefore} → ${(deviceDuring?.data?.attempts ?? []).length}`,
    );
    await j.shot('last-answer-not-saved');

    j.step('Retry while the store still refuses');
    await j.tap('learn-assessment-save-retry', 1200);
    j.check(
      'a retry that fails again still shows Retry and no result',
      (await j.present('learn-assessment-save-retry')) &&
        !(await j.present('learn-assessment-result')),
    );

    j.step('the store takes writes again; Retry');
    await mendTheDeviceStore(j.page);
    await j.tap('learn-assessment-save-retry', 1500);
    j.check(
      'the retry completes the sitting with a result',
      await j.appears('learn-assessment-result', 8000),
    );
    j.check('the Retry banner is gone', await j.gone('learn-assessment-save-failed', 4000));
    const after = (await j.sittingsOf(scopeKey)).at(-1);
    const attemptsAfter = await j.attemptsOf(last.id);
    j.check(
      'the last answer is committed exactly once and the sitting is complete',
      after?.id === before?.id &&
        after?.completedAt !== null &&
        after?.answers.filter((a) => a.activityId === last.id).length === 1 &&
        after?.answers.length === cards.length,
      `${after?.answers.length}/${cards.length}, completedAt ${after?.completedAt} (device record)`,
    );
    j.check(
      'one attempt is recorded for the last question',
      attemptsAfter.length === 1,
      `${attemptsAfter.length} (device record)`,
    );
    await j.shot('retried-result');

    j.step('after a reload the device still holds it once');
    await j.reload();
    const kept = (await j.sittingsOf(scopeKey)).find((s) => s.id === before?.id);
    j.check(
      'after a reload: one answer for the last question, the sitting complete',
      kept?.completedAt !== null &&
        kept?.answers.filter((a) => a.activityId === last.id).length === 1,
      `${kept?.answers.length} answers (device record)`,
    );

    j.step('lesson practice: a refused answer write, then Retry');
    const found = await openPracticeLesson(j);
    if (!found) return;
    const single = found.cards.find((c) => SINGLE.has(c.kind));
    const lessonAttempts = (await j.attemptsOf(single.id)).length;
    await breakTheDeviceStore(j.page);
    await j.tap(`${single.tid}-option-0`, 800);
    j.check(
      'lesson practice: a refused write shows Retry',
      (await j.appears(`${single.tid}-not-saved`, 5000)) &&
        (await j.present('learn-lesson-save-failed')) &&
        (await j.present('learn-lesson-save-retry')),
    );
    j.check(
      'lesson practice: nothing was recorded',
      (await j.attemptsOf(single.id)).length === lessonAttempts,
      `${(await j.attemptsOf(single.id)).length} attempts (device record)`,
    );
    await j.shot('lesson-not-saved');
    await mendTheDeviceStore(j.page);
    await j.tap('learn-lesson-save-retry', 1500);
    j.check(
      'lesson practice: Retry saves the answer',
      await j.gone('learn-lesson-save-failed', 5000),
    );
    j.check(
      'lesson practice: the answer is recorded exactly once',
      (await j.attemptsOf(single.id)).length === lessonAttempts + 1,
      `${(await j.attemptsOf(single.id)).length} attempts (device record)`,
    );
  },
);

journey(
  'A15.3-provisional',
  'The "Awaiting editorial approval" notice on the exam result, progress, learn home and certificates',
  ['A15.3'],
  {},
  async (j) => {
    const title = COPY.en['learn.pendingEditorial'];
    await j.enterDemo();
    j.step('control: nothing is marked yet');
    await j.toLearnHome();
    j.check(
      'learn home: no notice before any marked answer',
      !(await j.present('learn-progress-provisional')),
    );

    j.step('sit a checkpoint to its result');
    const chapter = CHAPTERS[2] ?? CHAPTERS[0];
    j.check('the checkpoint opens', await j.toCheckpoint(chapter), chapter);
    await j.answerAll(0);
    j.check('the checkpoint reaches its result', await j.appears('learn-assessment-result', 8000));
    const onResult = await j.text('learn-assessment-provisional');
    j.check('exam result: the notice is shown', onResult.includes(title), onResult.slice(0, 160));
    await j.shot('result-notice');

    await j.toLearnHome();
    const onHome = await j.text('learn-progress-provisional');
    j.check('learn home: the notice is shown', onHome.includes(title), onHome.slice(0, 160));

    j.step(`certificates: read every lesson of ${SHORTEST_COURSE} and answer one of its questions`);
    await j.toCourse(SHORTEST_COURSE);
    const lessons = await j.page
      .locator('active=[data-testid^="learn-course-lesson-"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    let read = 0;
    let answered = null;
    for (const id of lessons) {
      await j.tap(id, 1600);
      if (
        (await j.appears('learn-lesson-mark-read', 6000)) &&
        !(await j.disabled('learn-lesson-mark-read'))
      )
        await j.tap('learn-lesson-mark-read', 1000);
      if (await j.appears('learn-lesson-not-trading', 5000)) read += 1;
      if (!answered) {
        const card = (await j.cards('learn-lesson-question-')).find((c) => SINGLE.has(c.kind));
        if (
          card &&
          !(await j.present(`${card.tid}-practice-only`)) &&
          !(await j.present(`${card.tid}-held`))
        ) {
          await j.tap(`${card.tid}-option-0`, 500);
          if ((await j.outcome(card.tid, 5000)) === 'feedback') answered = card.id;
        }
      }
      await j.tap('header-back', 1200);
    }
    j.check(
      `every lesson of ${SHORTEST_COURSE} is marked read`,
      read === lessons.length && read > 0,
      `${read}/${lessons.length}`,
    );
    j.check('one of its questions is answered and marked', answered !== null, answered ?? 'none');
    /*
     * The progress screen shows its totals (and so the notice) once something
     * is read or demonstrated; with neither it shows its empty state.
     */
    await j.toLearnHome();
    await j.tap('learn-progress-link', 1500);
    const onProgress = await j.text('learn-progress-provisional');
    j.check('progress: the notice is shown', onProgress.includes(title), onProgress.slice(0, 160));
    await j.shot('progress-notice');
    await j.toLearnHome();
    await j.tap('learn-certificates-link', 1500);
    j.check('a certificate is listed', await j.appears(`learn-certificate-${SHORTEST_COURSE}`));
    const onCertificate = await j.text(`learn-certificate-provisional-${SHORTEST_COURSE}`);
    j.check(
      'certificate: the notice is shown',
      onCertificate.includes(title),
      onCertificate.slice(0, 160),
    );
    await j.shot('certificate-notice');
  },
);

/** The practice/formal difference again, under another viewport or language. */
const variation = async (j, label) => {
  const found = await openPracticeLesson(j);
  if (found) {
    await j.singleChoiceOnSelection(`${label}: lesson practice`, 'learn-lesson-question-');
    await j.keepsCheck(`${label}: lesson practice`, 'learn-lesson-question-');
    await j.shot('lesson-practice');
  }
  j.check(`${label}: the checkpoint opens`, await j.toCheckpoint(CHAPTERS[0]), CHAPTERS[0]);
  await j.formalWithheld(`${label}: checkpoint`);
  await j.shot('checkpoint-withheld');
};

journey(
  'A13-desktop',
  'Practice on selection and a withheld checkpoint at a desktop width',
  ['A13.1', 'A13.2'],
  { viewport: DESKTOP },
  async (j) => {
    await j.enterDemo();
    await variation(j, 'desktop 1280×800');
  },
);

journey(
  'A13-rtl',
  'Practice on selection and a withheld checkpoint in Arabic (right to left)',
  ['A13.1', 'A13.2'],
  { locale: 'ar', language: 'ar' },
  async (j) => {
    await j.enterDemo();
    const doc = await j.switchLanguage('ar');
    j.check('Arabic is applied to the document', /^ar/.test(doc.lang), doc.lang);
    j.check(
      'the layout is mirrored: Home is now on the right of the Hub',
      doc.homeX !== null && doc.hubX !== null && doc.homeX > doc.hubX,
      JSON.stringify(doc),
    );
    await variation(j, 'Arabic');
    const title = COPY.ar['learn.pendingEditorial'];
    await j.answerAll(0);
    if (await j.appears('learn-assessment-result', 8000)) {
      const notice = await j.text('learn-assessment-provisional');
      j.check(
        'Arabic: the result shows the notice in Arabic',
        notice.includes(title),
        notice.slice(0, 160),
      );
    } else j.check('Arabic: the checkpoint reaches its result', false);
  },
);

/* --------------------------------------------------------------------------
   The run
   ----------------------------------------------------------------------- */

const buildIdentity = {};
const engine = `${browser.browserType().name()} ${browser.version()}`;
const ranAt = new Date().toISOString();
const PREVIEWS = ['shipping', 'qa'];

for (const spec of JOURNEYS) {
  if (ONLY.length > 0 && !ONLY.includes(spec.id)) continue;
  for (const preview of PREVIEWS) {
    if (ONLY_PREVIEW !== null && preview !== ONLY_PREVIEW) continue;
    const j = new Journey(spec, preview);
    console.log(`\n${spec.id} · ${spec.title} · ${preview}`);
    try {
      await j.open();
      if (!buildIdentity[preview]) {
        await j.page.goto(`${j.base}/welcome`, { waitUntil: 'networkidle' });
        await j.page.waitForTimeout(600);
        buildIdentity[preview] = await j.text('welcome-build-identity');
      }
      await spec.run(j);
    } catch (error) {
      j.check('the journey ran to completion', false, String(error).split('\n')[0]);
      await j.shot('failure');
    }
    j.check(
      'no uncaught page error during the journey',
      j.errors.length === 0,
      [...new Set(j.errors)].slice(0, 2).join(' | '),
    );
    await j.close();
  }
}

await browser.close();

/* --------------------------------------------------------------------------
   The record
   ----------------------------------------------------------------------- */

const allChecks = records.flatMap((r) => r.checks);
const totals = {
  findings: new Set(records.map((r) => r.id)).size,
  runs: records.length,
  checks: allChecks.length,
  failed: allChecks.filter((c) => !c.ok && !c.blocked).length,
  blocked: allChecks.filter((c) => c.blocked).length,
};
const build = (m) => ({
  sourceRevision: m.sourceRevision,
  treeRevision: m.treeRevision,
  configuration: m.configuration,
  scopeClean: m.scopeClean ?? null,
});
const payload = {
  runner: 'sep24-learning-journeys',
  ranAt,
  commit: COMMIT,
  sourceRevision: SOURCE_REVISION,
  revisionDeclaration: RUNNER.revisionDeclaration,
  bases: BASES,
  buildIdentity: { qa: buildIdentity.qa ?? null, shipping: buildIdentity.shipping ?? null },
  builds: { qa: build(manifests.qa), shipping: build(manifests.shipping) },
  // Every journey and the previews it runs on, filtered or not (REV-GT-6).
  specs: JOURNEYS.map((spec) => ({
    id: spec.id,
    criteria: spec.criteria,
    previews: PREVIEWS,
    context: {
      viewport: spec.context.viewport,
      browserLocale: spec.context.locale,
      appLanguage: spec.context.language ?? 'en',
      timezoneId: TZ,
    },
  })),
  engine,
  viewports: { phone: PHONE, desktop: DESKTOP },
  locales: ['en', 'ar'],
  timezone: TZ,
  fault:
    'Storage.prototype.setItem throws QuotaExceededError while the fault is on (journey-checks S15-10, F74)',
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
  '# Sep24 learning journeys (A12, A13, A14, A15.3)',
  '',
  `Run at ${ranAt} on commit \`${COMMIT}\` (source revision \`${SOURCE_REVISION}\`), ${engine}, ${TZ}; phone ${PHONE.width}×${PHONE.height}, desktop ${DESKTOP.width}×${DESKTOP.height}; English, and Arabic for the RTL pass.`,
  '',
  `- Shipping: \`${BASES.shipping}\` — ${buildIdentity.shipping ?? 'identity not read'}`,
  `- QA: \`${BASES.qa}\` — ${buildIdentity.qa ?? 'identity not read'}`,
  ...(payload.filtered
    ? ['', `**FILTERED RUN** ${JSON.stringify(payload.filtered)} — not evidence.`]
    : []),
  '',
  '| Journey | Criteria | Preview | Viewport · language | Passed | Failed | Blocked |',
  '|---|---|---|---|---:|---:|---:|',
  ...records.map((r) => {
    const passed = r.checks.filter((c) => c.ok).length;
    const failed = r.checks.filter((c) => !c.ok && !c.blocked).length;
    const blocked = r.checks.filter((c) => c.blocked).length;
    const v = r.context.viewport;
    return `| ${r.id} — ${r.title} | ${r.criteria.join(', ')} | ${r.preview} | ${v.width}×${v.height} · ${r.context.appLanguage} | ${passed} | ${failed} | ${blocked} |`;
  }),
  '',
  `Totals: ${totals.findings} journeys, ${totals.runs} runs, ${totals.checks} checks, ${totals.failed} failed, ${totals.blocked} blocked.`,
  '',
  '## Failed and blocked checks',
  '',
  ...(failedLines.length > 0 ? failedLines : ['(none)']),
  '',
];
writeFileSync(join(OUT_DIR, 'INDEX.md'), `${index.join('\n')}\n`);

console.log(
  `\n${totals.findings} journeys, ${totals.runs} runs, ${totals.checks} checks, ${totals.failed} failed (${totals.blocked} blocked); written to ${OUT_JSON}`,
);
process.exitCode = totals.failed > 0 || totals.blocked > 0 ? 1 : 0;
