# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

| | |
| --- | --- |
| **Application revision** | `3fb077b729c6c0c83331dcf8a492f3359e8b47dd` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-10951d3828902787fa4f1c91159be610.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-222146ec27c2ba000feb3688dc4ac3d0.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |

This revision is the acceptance-fix sprint on top of the client experience
correction sprint, answering the independent client acceptance review of
`f357550` (R01–R07) and the approved update of 7 September 2026 (R08): the
instrument symbol never gives way on Markets, the picker, the chart header,
the ticket or review at 320–430; the chart is sized from its measured
container so the desktop price axis and price label stay inside the column;
the research fixture carries no integration prose; the deposit review heads
a card-return rule as a withdrawal rule; Rewards has one unavailable state
and Cashback labels its sample as an example; the Welcome coach card groups
each metric with its name and the provider buttons sit side by side on one
line each; the ticket carries one loss caveat and says where an MT4
account's orders are placed before any order intent; and the instrument
page shows a non-pressable Sell / Spread / Buy strip with one New order
action that opens the shared ticket without choosing a direction for the
client. Everything from the earlier passes is retained. Evidence for it is
on the same branch (`docs/test-logs/`, `docs/screenshots/`,
`docs/chart-evidence/`, `docs/redesign-evidence/`, `docs/sprint-evidence/`,
`docs/acceptance-evidence/`, `AUDIT_MANIFEST.md`, `docs/ACCEPTANCE_FIXES.md`);
it is not part of this repository.

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
