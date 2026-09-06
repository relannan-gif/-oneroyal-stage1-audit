# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

| | |
| --- | --- |
| **Application revision** | `f357550f86bdc4f9909c94d38ba212a8bd2caf6a` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-05e5e8d3476ac36a14e2bc0ec33e80b8.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-579a6f16d78cb7c0334e4eb2f7ed585f.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |

This revision is the client experience correction sprint on top of the
redesign correction pass: one account identity through ticket, review and
receipt; pending orders refuse a blank, wrong-side or too-close price; the
active order type owns its inputs; one loss calculation in the account
currency; the blank-screen crash removed and an error boundary with
recovery added; the $2,000 pre-verification deposit allowance kept as one
ledger ("$1,500 remaining before verification"); M1/M5 candles generated at
tick resolution with a width-responsive bar count and growing panes; a
pinch that starts with both fingers down zooms; the approved Welcome and
See why pages; Markets, the picker, the ticket and the instrument page say
what they are; desktop screens sit in a declared column; client-facing copy
no longer narrates the implementation. Everything from the earlier passes
is retained. Evidence for it is on the same branch (`docs/test-logs/`,
`docs/screenshots/`, `docs/chart-evidence/`, `docs/redesign-evidence/`,
`docs/sprint-evidence/`, `AUDIT_MANIFEST.md`, `docs/SPRINT_REPORT.md`); it
is not part of this repository.

Direct routes on either preview (press **Explore the demo** first for the
in-app ones; a refresh returns to Welcome): `/welcome`,
`/coach-preview/risk-consistency`, `/markets`, `/markets/instrument/XAUUSD`,
`/trade/new`, `/trade/ticket?symbol=XAUUSD&side=buy`. The deposit-allowance
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
