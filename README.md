# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

| | |
| --- | --- |
| **Application revision** | `fa5ebb2c605872906109a7df36dbc51049f798d8` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-1cfc38cb2e1caa51e764286d2df1d0b2.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-5f5f8051ffc3bd925a314bb1c35fa172.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |

This revision is the redesign correction pass on top of the catalogue and
chart pass: Markets and Choose an instrument on one shared quote row (Sell
and Buy in aligned columns, change and spread beneath, inline search,
Watchlist / All / Recent and an asset-class sheet), and the order ticket
rebuilt to the approved compact structure (order type, volume stepper and
presets, Stop-loss & take-profit in three methods with a collapsed summary,
Costs & order details collapsed, Sell / Buy with live quotes as the primary
action). Everything from the earlier passes — the full instrument catalogue,
the interactive chart, margin thresholds, the Hub navigation and deposit
fixes, Rewards & Cashback — is retained. Evidence for it is on the same
branch (`docs/test-logs/`, `docs/screenshots/`, `docs/chart-evidence/`,
`docs/redesign-evidence/`, `AUDIT_MANIFEST.md`); it is not part of this
repository.

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
