# Sep22 consuming-UI journeys

Run at 2026-09-25T05:26:25.282Z on commit `null` (source revision `b7d50d66c8944fdc918190718abcb50f1457b493`), chromium 153.0.8010.12, 393×852, Asia/Beirut unless a journey sets its own clock and zone.

- Shipping: `https://relannan-gif.github.io/-oneroyal-stage1-audit/shipping` — Build identity · b7d50d66c894 · Awaiting approved legal content
- QA: `https://relannan-gif.github.io/-oneroyal-stage1-audit/qa` — Build identity · b7d50d66c894 · Non-production legal fixtures

A BLOCKED check is a variation the auditor named that no control on the build can drive; it is counted on its own, never as a pass and never as a failure of the repaired behaviour, and its detail says what would close it.

| Finding | Preview | Checks passed | Failed | Blocked | Screenshot |
|---|---|---:|---:|---:|---|
| F09 — Demo context becomes Live in account chooser | shipping | 13 | 0 | 0 | [F09-shipping-demo-draft.png](./F09-shipping-demo-draft.png) |
| F09 — Demo context becomes Live in account chooser | qa | 13 | 0 | 0 | [F09-qa-demo-draft.png](./F09-qa-demo-draft.png) |
| F13 — Internal IDs and unformatted values leak into financial review | shipping | 18 | 0 | 0 | [F13-shipping-pamm-review.png](./F13-shipping-pamm-review.png) |
| F13 — Internal IDs and unformatted values leak into financial review | qa | 18 | 0 | 0 | [F13-qa-pamm-review.png](./F13-qa-pamm-review.png) |
| F16 — ORX receipt still labels credentials MetaTrader | shipping | 14 | 0 | 0 | [F16-shipping-orx-live-receipt.png](./F16-shipping-orx-live-receipt.png) |
| F16 — ORX receipt still labels credentials MetaTrader | qa | 14 | 0 | 0 | [F16-qa-orx-live-receipt.png](./F16-qa-orx-live-receipt.png) |
| F21 — Unsaved e-wallet provider text carries across rails | shipping | 12 | 0 | 0 | [F21-shipping-bank-draft.png](./F21-shipping-bank-draft.png) |
| F21 — Unsaved e-wallet provider text carries across rails | qa | 12 | 0 | 0 | [F21-qa-bank-draft.png](./F21-qa-bank-draft.png) |
| F24 — Portfolio omits account scope and uses an ambiguous equity label | shipping | 8 | 0 | 0 | [F24-shipping-main-performance.png](./F24-shipping-main-performance.png) |
| F24 — Portfolio omits account scope and uses an ambiguous equity label | qa | 8 | 0 | 0 | [F24-qa-main-performance.png](./F24-qa-main-performance.png) |
| F25 — ORX account platform details name MT4 | shipping | 7 | 0 | 0 | [F25-shipping-orx-platform.png](./F25-shipping-orx-platform.png) |
| F25 — ORX account platform details name MT4 | qa | 7 | 0 | 0 | [F25-qa-orx-platform.png](./F25-qa-orx-platform.png) |
| F33 — Chart hover readout shifts toolbar targets under the pointer | shipping | 19 | 0 | 0 | [F33-shipping-393-hover.png](./F33-shipping-393-hover.png) |
| F33 — Chart hover readout shifts toolbar targets under the pointer | qa | 19 | 0 | 0 | [F33-qa-393-hover.png](./F33-qa-393-hover.png) |
| F36 — Triggered alert contradicts notify-once status copy | shipping | 11 | 0 | 0 | [F36-shipping-triggered-off.png](./F36-shipping-triggered-off.png) |
| F36 — Triggered alert contradicts notify-once status copy | qa | 11 | 0 | 0 | [F36-qa-triggered-off.png](./F36-qa-triggered-off.png) |
| F37 — Calendar This week label does not match its date window | shipping | 17 | 0 | 0 | [F37-shipping-pacific-kiritimati-week.png](./F37-shipping-pacific-kiritimati-week.png) |
| F37 — Calendar This week label does not match its date window | qa | 17 | 0 | 0 | [F37-qa-pacific-kiritimati-week.png](./F37-qa-pacific-kiritimati-week.png) |
| F42 — Journal trade link does not identify its trade | shipping | 9 | 0 | 0 | [F42-shipping-linked-trade.png](./F42-shipping-linked-trade.png) |
| F42 — Journal trade link does not identify its trade | qa | 9 | 0 | 0 | [F42-qa-linked-trade.png](./F42-qa-linked-trade.png) |
| F56 — Funding review and tracker contradict disconnected payment availability | shipping | 19 | 0 | 0 | [F56-shipping-crypto-review.png](./F56-shipping-crypto-review.png) |
| F56 — Funding review and tracker contradict disconnected payment availability | qa | 19 | 0 | 0 | [F56-qa-crypto-review.png](./F56-qa-crypto-review.png) |
| F59 — Hub challenge progress link is broken | shipping | 12 | 0 | 0 | [F59-shipping-dashboard.png](./F59-shipping-dashboard.png) |
| F59 — Hub challenge progress link is broken | qa | 12 | 0 | 0 | [F59-qa-dashboard.png](./F59-qa-dashboard.png) |
| F64 — Corporate external-representative branch cannot be completed | qa | 17 | 0 | 0 | [F64-qa-representative.png](./F64-qa-representative.png) |
| F72 — Challenge consent omits configured conditions and payout timing | shipping | 16 | 0 | 0 | [F72-shipping-consent-terms.png](./F72-shipping-consent-terms.png) |
| F72 — Challenge consent omits configured conditions and payout timing | qa | 16 | 0 | 0 | [F72-qa-consent-terms.png](./F72-qa-consent-terms.png) |
| F74 — Verification method change races with Continue | shipping | 8 | 0 | 0 | [F74-shipping-shipping-fails-closed-before-verification.png](./F74-shipping-shipping-fails-closed-before-verification.png) |
| F74 — Verification method change races with Continue | qa | 29 | 0 | 0 | [F74-qa-after-rapid-choice.png](./F74-qa-after-rapid-choice.png) |
| F75 — Late document-upload cancellation falsely promises nothing was sent | qa | 8 | 0 | 0 | [F75-qa-early-cancel.png](./F75-qa-early-cancel.png) |
| F132 — Demo starting-balance choices show USD for selected EUR/GBP accounts | shipping | 8 | 0 | 0 | [F132-shipping-gbp-choices.png](./F132-shipping-gbp-choices.png) |
| F132 — Demo starting-balance choices show USD for selected EUR/GBP accounts | qa | 8 | 0 | 0 | [F132-qa-gbp-choices.png](./F132-qa-gbp-choices.png) |
| F133 — Unconfirmed market-order recovery can retain the wrong ledger tab | shipping | 18 | 0 | 0 | [F133-shipping-low-margin-warning.png](./F133-shipping-low-margin-warning.png) |
| F133 — Unconfirmed market-order recovery can retain the wrong ledger tab | qa | 18 | 0 | 0 | [F133-qa-low-margin-warning.png](./F133-qa-low-margin-warning.png) |
| F137 — Cancelling account-password verification retains the unsent password | shipping | 11 | 0 | 0 | [F137-shipping-typed.png](./F137-shipping-typed.png) |
| F137 — Cancelling account-password verification retains the unsent password | qa | 11 | 0 | 0 | [F137-qa-typed.png](./F137-qa-typed.png) |
| F140 — Wallet Today section includes a transaction labelled Yesterday | shipping | 29 | 0 | 0 | [F140-shipping-beirut-00-30.png](./F140-shipping-beirut-00-30.png) |
| F140 — Wallet Today section includes a transaction labelled Yesterday | qa | 29 | 0 | 0 | [F140-qa-beirut-00-30.png](./F140-qa-beirut-00-30.png) |
| F141 — Order ticket repeats closed-market notices and retains distracting context banners | shipping | 17 | 0 | 0 | [F141-shipping-closed-gold-ticket.png](./F141-shipping-closed-gold-ticket.png) |
| F141 — Order ticket repeats closed-market notices and retains distracting context banners | qa | 17 | 0 | 0 | [F141-qa-closed-gold-ticket.png](./F141-qa-closed-gold-ticket.png) |
| F142 — Portfolio RTL endpoint captions oppose plotted chronology | shipping | 7 | 0 | 0 | [F142-shipping-arabic-portfolio.png](./F142-shipping-arabic-portfolio.png) |
| F142 — Portfolio RTL endpoint captions oppose plotted chronology | qa | 7 | 0 | 0 | [F142-qa-arabic-portfolio.png](./F142-qa-arabic-portfolio.png) |
| F147 — Closed position lookup loses continuity with its resulting trade | shipping | 17 | 0 | 0 | [F147-shipping-closed-record.png](./F147-shipping-closed-record.png) |
| F147 — Closed position lookup loses continuity with its resulting trade | qa | 17 | 0 | 0 | [F147-qa-closed-record.png](./F147-qa-closed-record.png) |
| F144 — Robot catalogue search restricts testable selection to five fixtures | shipping | 11 | 0 | 0 | [F144-shipping-untested-instrument-chosen.png](./F144-shipping-untested-instrument-chosen.png) |
| F144 — Robot catalogue search restricts testable selection to five fixtures | qa | 11 | 0 | 0 | [F144-qa-untested-instrument-chosen.png](./F144-qa-untested-instrument-chosen.png) |

Totals: 24 findings, 46 runs, 648 checks, 0 failed, 0 blocked.

## Failed and blocked checks

(none)

