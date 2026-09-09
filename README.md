# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

| | |
| --- | --- |
| **Application revision** | `3e08271a14da2da595a0fe36b5b6de62337c1233` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-6f80925af459bd833f5392f4b0b7fd5e.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-2f5132c66e263be0efd4011c6b7c5f54.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |

This revision is the consolidated design and correction sprint of 8–9 September 2026, completed against the approved design catalogue: the 68 main-page designs and their supporting states applied across the app on the shared graphite/plum/yellow system, the nine priority-one audit defects and the remaining audit rows corrected at the data boundary and asserted on state, and the four explicitly approved trading screens (Trade, Choose an instrument, the order ticket and its review) preserved with their volume picker, exposure sizing and stop-loss refinements. The supporting states added in this revision include order expiry, saved and editable chart drawings, filtered trades behind any performance breakdown, insight data coverage, support attachments with a closed conversation and a failed reply that keeps the client's words, profile change requests that leave the stored details in use, a crypto deposit that asks for the network before showing any transfer detail, a withdrawal step-up that refuses a wrong code without submitting anything, a corporate review stage, and the identity-verification handoff with its file review, upload progress and camera-permission fallback. Three states that a client must never misread are also built: an order or a close whose answer was lost is reported as neither placed nor failed, with the reference to check, and a cancellation that a fill beat names the position the client now holds. The QA preview carries labelled non-production legal placeholders so an application can be completed; the shipping preview fails closed on the declarations step until OneRoyal supplies approved legal text. Rewards enrolment and the hosted payment handoff are not built: no campaign is configured and no payment provider is connected, and each says so rather than showing a form that cannot answer. Partners is reserved and deliberately not built. Physical iOS and Android devices, real payment, identity and OAuth providers were not exercised. The evidence workbook (journey recordings, before/after captures, registers)
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
