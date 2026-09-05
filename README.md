# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

| | |
| --- | --- |
| **Application revision** | `60954302a6fbd0a624bc44ed78b6c34ea24076c2` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-250b5a2397816c470c57742b8d85ec06.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-4461ab5f47cd00cb9c088fcef3e59cd0.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |

This revision is the catalogue and chart pass: the full MT5 and MT4
instrument catalogue (2,029 platform records, imported from the broker's
workbook extracts with provenance), an interactive price chart (crosshair,
pan and zoom, M1–W1 intervals, indicators, drawings with undo and redo that
persist per platform and symbol, full screen), margin thresholds as
percentages with margin call at 100% and stop out at 20%, the reopened Hub
tab and finished-funds-flow fixes, the pre-verification deposit cap enforced
at the amount step, and the Rewards & Cashback entries. Evidence for it is
on the same branch at `a24215ecb650b04f122a61ac44412249d60c2ac7`
(`docs/test-logs/`, `docs/screenshots/`, `docs/chart-evidence/`,
`AUDIT_MANIFEST.md`); it is not part of this repository.

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
