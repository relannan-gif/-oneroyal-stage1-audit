# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

| | |
| --- | --- |
| **Application revision** | `f2e447d940d6d7c33ad6f6de89b31e8627a188e0` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-cf6d8921872553ce5cad0be928cab194.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-ebbfa2f32ad609ce468342f50fa09381.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |

This revision is the approved four-screen mobile UX sprint of 8 September
2026 on top of the acceptance-fix sprint and its follow-up. Markets rows
carry an instrument target (symbol, name, "Chart & info ›") that opens the
instrument page and a separate Order control that opens the shared ticket
with no direction; the bid and the ask are plain text. The instrument page
has one header row, a labelled Bid price with the ask and the spread as
text, Chart / News / Research / Details as tabs and a 64-point New order
dock directly above the navigation. Trade carries + New order in its pinned
header with no bottom dock, a compact account summary and compact position
rows. Home's and Trade's New order open a dedicated Choose instrument
screen whose rows open the same ticket. The ticket is neutral until a
direction is chosen; explicit Buy/Sell links keep their side. In-app Back
pops the tab's stack and brings a tab being left to its root. Everything
from the earlier passes is retained. Evidence for it is on the same branch
(`docs/test-logs/`, `docs/screenshots/`, `docs/chart-evidence/`,
`docs/redesign-evidence/`, `docs/sprint-evidence/`,
`docs/acceptance-evidence/`, `docs/UX_SPRINT_2026-09-08.md`) and
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
