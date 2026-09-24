# OneRoyal mobile — Stage 1 previews

Two self-contained builds of the OneRoyal mobile application's web export,
published for review on GitHub Pages.

<!-- identity:start -->
| | |
| --- | --- |
| **Application revision** | `8e19e0a07a97824359ed08f5ce2f1c8eb6092a7d` on `claude/oneroyal-graphite-integration-8fcqxv` in `relannan-gif/Royal-trading-app` |
| Shipping bundle | `entry-281c327b0e4009204174a9a904f91d8c.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=` |
| QA bundle | `entry-4b8f016fbc4c1fe41cf1996b511d4c28.js` — `EXPO_PUBLIC_LEGAL_FIXTURES=non-production` |
| Build-time difference from the audit bundle | `expo.experiments.baseUrl` set to `/-oneroyal-stage1-audit/shipping` and `/-oneroyal-stage1-audit/qa` respectively, so routing works under this repository's Pages path. No source change. |
<!-- identity:end -->

This revision is the correction sprint for the independent audit of 13
September 2026: thirty-three findings — eight of them money, state or
isolation blockers — reproduced, corrected and bound to evidence that ran.

The work under it is not cosmetic. A paid challenge now takes the fee before
it confirms, through one client-scoped purchase intent and an idempotent
wallet debit, so a double tap, a lost response, a failed write or a restart
leaves one fee and one account or an explicit failure. A payout settles
exactly once against a durable posting key: settled twice concurrently, it
credits once. Durable records no longer outlive the ledger that gives them
meaning, switching clients no longer leaves the previous client's account on
screen, and unreadable storage is reported rather than overwritten by the
next purchase.

Two of the findings turned out to be product defects rather than evidence
defects, and both were visible to a client. The Prop phase screen decided
"objective met" from whether a next phase existed, so anyone mid-challenge
with unmet targets was congratulated; it now measures the objectives and
says how many are outstanding. And a USDJPY backtest computed profit in the
instrument's own currency and labelled it USD without converting —
overstating the result by about 156 times for anyone sizing a robot from it.

Stopping a copy subscription now posts what it realised, releases the margin
it held, and survives a restart: a closed copy stays closed with its deal, a
detached one stays open exactly as promised. The order protection editor
previews the field being edited, refuses to apply protection it cannot show,
and never estimates against a direction other than the order's own. Coach
carries one analytical context everywhere, and a selection that cannot be
reported on produces no answer rather than quietly falling back to the Trade
tab's account.

Four corrections are structural rather than local, because the pattern the
audit identified is that a fix lands on three screens and the mistake
survives to be reinvented. Internal account identifiers are banned from every
label in the app by a test that reads the files. The rule deciding whether a
defect may be called closed is a tested function, and is now itself inside
the gate it judges. A reference capture that names a state must prove that
state before the photograph is taken, and refuses the capture otherwise. And
the accessibility sweep records which journeys it actually reached.

**What is not claimed.** One evidence gate is shipped red on the owner's
decision rather than edited until it passed: the preservation comparison
against the delivered baseline reports 16 of 20 page/width pairs preserved,
because the approved compact Coach landing moved fourteen scope controls
behind a sheet. The finding is true, so it is reported, with the reasoning
recorded beside it. Native VoiceOver and TalkBack were not run: there is
no physical device here, and the accessibility artifact says so inside itself
rather than only in prose. Rows closed on a browser walk with no unit test,
and rows closed on unit tests with no walk, are each labelled for what they
rest on. Reference states the demo client cannot reach are recorded NOT
VERIFIED with the missing fixture named. Rewards enrolment and the hosted
payment handoff remain unbuilt and say so; Partners is reserved and
deliberately not built.

Direct routes on either preview (press **Explore the demo** first for the
in-app ones; a refresh returns to Welcome): `/welcome`, `/markets`,
`/markets/instrument/XAUUSD`, `/trade/new`,
`/trade/ticket?symbol=XAUUSD&side=buy`, `/trade/exits?symbol=XAUUSD24`,
`/coach`, `/hub/prop`, `/hub/prop/plans`, `/hub/robots/create/rules`,
`/hub/strategies/copy/str-atlas`, `/hub/wallet/deposit`. The
deposit-allowance sequence needs a fresh applicant on the QA preview: Open an
account → complete step 1 → Continue → Hub → Funds → Wallet → Deposit.

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

Stage 1 is not approved, not production-ready and not complete. Final
approval rests with Rayan. The audit evidence for this revision is delivered
separately and is not part of this repository.
