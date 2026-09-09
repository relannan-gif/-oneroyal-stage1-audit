# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

| | |
| --- | --- |
| **Application revision** | `fbd54a54a962f8f73cec12d2c989e9c20e3bb1d2` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-b9dc35fbb2c45cf1b19e1d1d12e4d63e.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-37fe3218ac015a22fc321a67fb1d7763.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |

This revision is the consolidated design and correction sprint of 8 September 2026: the 68 main-page designs and their supporting states applied across the app on the shared graphite/plum/yellow system, the nine priority-one audit defects and the remaining audit rows corrected at the data boundary and asserted on state, and the four explicitly approved trading screens (Trade, Choose an instrument, the order ticket and its review) preserved with their volume picker, exposure sizing and stop-loss refinements. The QA preview carries labelled non-production legal placeholders so an application can be completed; the shipping preview fails closed on the declarations step until OneRoyal supplies approved legal text. Partners is reserved and deliberately not built. Physical iOS and Android devices, real payment, identity and OAuth providers were not exercised. The evidence workbook (journey recordings, before/after captures, registers)
is not part of this repository.

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
