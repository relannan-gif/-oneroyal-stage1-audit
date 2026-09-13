# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

<!-- identity:start -->
| | |
| --- | --- |
| **Application revision** | `862748e6a249f3cca28dadfac12924eb783898e4` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-09a8c05cf55cf062b10a4eacc7d4c160.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-4dbc2bf747e8294b8b138c1377659018.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |
<!-- identity:end -->

This revision is the correction pack of 12 September 2026: all fifty-five
recorded defects, OR-01 to OR-55, corrected and bound to a test that runs.

The work under it is mostly not cosmetic. A shared client identity now scopes
every stored record, so a Market Play prediction, a prop purchase and a robot
draft survive a reload and belong to one client rather than to the browser.
Prop purchases, payouts and breach appeals write durable records through the
ledger instead of a screen's own state, and each refreshes the views behind
it — a paid challenge no longer confirms and then tells the client it is not
on their account. Robots run against an explicit eligible ORX destination
with versioned consent that a changed limit invalidates, and the simulation
advances only while a robot screen is open, which the dashboard now says in
as many words instead of implying a service that is not running.

Five of the defects found in this pass were commercially serious and are
worth naming: a payment that confirmed and then denied the purchase, a robot
that read "Running" after being stopped, a blank screen in the middle of the
robot setup, a Market Play prediction that could be taken and then lost on
reload, and a simulation that kept running after the client left the screen.
None of them were visible from a route list; each was found by a suite that
had been printing results nobody was recording.

The QA preview carries labelled non-production legal placeholders so an
application can be completed; the shipping preview fails closed on the
declarations step until OneRoyal supplies approved legal text. Rewards
enrolment and the hosted payment handoff are not built: no campaign is
configured and no payment provider is connected, and each says so rather than
showing a form that cannot answer. Partners is reserved and deliberately not
built. Physical iOS and Android devices, VoiceOver, TalkBack and real
payment, identity and OAuth providers were not exercised, and the delivery
records them as not run rather than as passed. The evidence workbook (journey
recordings, before/after captures, registers) is not part of this repository.

Direct routes on either preview (press **Explore the demo** first for the
in-app ones; a refresh returns to Welcome): `/welcome`,
`/coach-preview/risk-consistency`, `/markets`, `/markets/instrument/XAUUSD`,
`/trade/new`, `/trade/ticket?symbol=XAUUSD&side=buy`, `/trade/ticket?symbol=XAUUSD` (no direction chosen). The deposit-allowance
sequence needs a fresh applicant on the QA preview: Open an account →
complete step 1 → Continue → Hub → Funds → Wallet → Deposit.

- `shipping/` — the default configuration. No legal documents have been
  supplied; the onboarding consent step fails closed.
- `qa/` — the same application with clearly labelled non-production legal
  fixtures, so onboarding can be walked end to end. Not OneRoyal approved
  content.

**Everything is simulated.** Accounts, balances, prices, positions, orders,
deposits, withdrawals, transfers and documents are demonstration data held in
memory for the life of the page. No provider, payment rail, trading platform
or authentication service is connected; nothing entered here reaches anyone.
A page refresh resets the demo.

Stage 1 is not approved, not production-ready and not complete. The audit
evidence for this revision is delivered separately and is not part of this
repository.
