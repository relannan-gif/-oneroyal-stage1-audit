# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

| | |
| --- | --- |
| **Application revision** | `825c9b8de3f1d59c35f4a669d4243368662ceaaa` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-26381ff914fe4c2e64ff741bf316973b.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-771f54e99666daf5d5fc9fe377ae2ff8.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |

This revision carries the corrections from the independent desktop and mobile
browser review of 5 September (identity reset on signup, phone field, profile
review, receipts, tab history and the rest). The list, with what was and was
not independently reproduced, is `docs/PLACEHOLDERS_AND_OPEN_ITEMS.md` in the
source repository.

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
