# Sep24 learning journeys (A12, A13, A14, A15.3)

Run at 2026-09-24T20:50:49.363Z on commit `null` (source revision `8e19e0a07a97824359ed08f5ce2f1c8eb6092a7d`), chromium 153.0.8010.12, Asia/Beirut; phone 390×844, desktop 1280×800; English, and Arabic for the RTL pass.

- Shipping: `https://relannan-gif.github.io/-oneroyal-stage1-audit/shipping` — Build identity · 8e19e0a07a97 · Awaiting approved legal content
- QA: `https://relannan-gif.github.io/-oneroyal-stage1-audit/qa` — Build identity · 8e19e0a07a97 · Non-production legal fixtures

| Journey | Criteria | Preview | Viewport · language | Passed | Failed | Blocked |
|---|---|---|---|---:|---:|---:|
| A13-practice — Single-choice practice is marked and explained on selection, without Check, on every practice surface; multi-select and typed answers keep Check | A13.1, A13.2 | shipping | 390×844 · en | 10 | 1 | 0 |
| A13-practice — Single-choice practice is marked and explained on selection, without Check, on every practice surface; multi-select and typed answers keep Check | A13.1, A13.2 | qa | 390×844 · en | 10 | 1 | 0 |
| A13-formal — A chapter checkpoint and a course exam withhold the key and correctness until the sitting completes | A13.2 | shipping | 390×844 · en | 17 | 0 | 0 |
| A13-formal — A chapter checkpoint and a course exam withhold the key and correctness until the sitting completes | A13.2 | qa | 390×844 · en | 17 | 0 | 0 |
| A14-sitting — A checkpoint sitting resumes by identity after navigation, remount and reload, keys hidden; finish, retake, and no practice leak | A14.1, A14.2, A13.2 | shipping | 390×844 · en | 13 | 12 | 0 |
| A14-sitting — A checkpoint sitting resumes by identity after navigation, remount and reload, keys hidden; finish, retake, and no practice leak | A14.1, A14.2, A13.2 | qa | 390×844 · en | 13 | 12 | 0 |
| A12-failed-write — A refused durable answer write shows Retry, leaves no result, attempt or completed sitting, and Retry commits once | A12.1, A12.2 | shipping | 390×844 · en | 4 | 8 | 0 |
| A12-failed-write — A refused durable answer write shows Retry, leaves no result, attempt or completed sitting, and Retry commits once | A12.1, A12.2 | qa | 390×844 · en | 4 | 8 | 0 |
| A15.3-provisional — The "Awaiting editorial approval" notice on the exam result, progress, learn home and certificates | A15.3 | shipping | 390×844 · en | 7 | 4 | 0 |
| A15.3-provisional — The "Awaiting editorial approval" notice on the exam result, progress, learn home and certificates | A15.3 | qa | 390×844 · en | 7 | 4 | 0 |
| A13-desktop — Practice on selection and a withheld checkpoint at a desktop width | A13.1, A13.2 | shipping | 1280×800 · en | 14 | 0 | 0 |
| A13-desktop — Practice on selection and a withheld checkpoint at a desktop width | A13.1, A13.2 | qa | 1280×800 · en | 14 | 0 | 0 |
| A13-rtl — Practice on selection and a withheld checkpoint in Arabic (right to left) | A13.1, A13.2 | shipping | 390×844 · ar | 16 | 1 | 0 |
| A13-rtl — Practice on selection and a withheld checkpoint in Arabic (right to left) | A13.1, A13.2 | qa | 390×844 · ar | 16 | 1 | 0 |

Totals: 7 journeys, 14 runs, 214 checks, 52 failed, 0 blocked.

## Failed and blocked checks

- A13-practice (shipping) FAILED: the lesson offers "Practise this objective" — no control
- A13-practice (qa) FAILED: the lesson offers "Practise this objective" — no control
- A14-sitting (shipping) FAILED: opening the checkpoint records one open sitting on the device — undefined (device record)
- A14-sitting (shipping) FAILED: the device holds the three answers under the sitting — undefined: undefined answers (device record)
- A14-sitting (shipping) FAILED: after navigating away and back: the same sitting, with the same three committed answers — undefined: undefined answers (device record)
- A14-sitting (shipping) FAILED: after a remount: the same sitting, with the same three committed answers — undefined: undefined answers (device record)
- A14-sitting (shipping) FAILED: after a remount: the three answers are shown as recorded — 0/3
- A14-sitting (shipping) FAILED: after a remount: the cards are rebuilt from the sitting record (the three answered ones, no other) — 0 restored (card props)
- A14-sitting (shipping) FAILED: after a remount: the screen says the sitting was resumed
- A14-sitting (shipping) FAILED: after a reload: the same sitting, with the same three committed answers — undefined: undefined answers (device record)
- A14-sitting (shipping) FAILED: after a reload: the three answers are shown as recorded — 0/3
- A14-sitting (shipping) FAILED: after a reload: the cards are rebuilt from the sitting record (the three answered ones, no other) — 0 restored (card props)
- A14-sitting (shipping) FAILED: after a reload: the screen says the sitting was resumed
- A14-sitting (shipping) FAILED: the journey ran to completion — TypeError: Cannot read properties of undefined (reading 'itemIds')
- A14-sitting (qa) FAILED: opening the checkpoint records one open sitting on the device — undefined (device record)
- A14-sitting (qa) FAILED: the device holds the three answers under the sitting — undefined: undefined answers (device record)
- A14-sitting (qa) FAILED: after navigating away and back: the same sitting, with the same three committed answers — undefined: undefined answers (device record)
- A14-sitting (qa) FAILED: after a remount: the same sitting, with the same three committed answers — undefined: undefined answers (device record)
- A14-sitting (qa) FAILED: after a remount: the three answers are shown as recorded — 0/3
- A14-sitting (qa) FAILED: after a remount: the cards are rebuilt from the sitting record (the three answered ones, no other) — 0 restored (card props)
- A14-sitting (qa) FAILED: after a remount: the screen says the sitting was resumed
- A14-sitting (qa) FAILED: after a reload: the same sitting, with the same three committed answers — undefined: undefined answers (device record)
- A14-sitting (qa) FAILED: after a reload: the three answers are shown as recorded — 0/3
- A14-sitting (qa) FAILED: after a reload: the cards are rebuilt from the sitting record (the three answered ones, no other) — 0 restored (card props)
- A14-sitting (qa) FAILED: after a reload: the screen says the sitting was resumed
- A14-sitting (qa) FAILED: the journey ran to completion — TypeError: Cannot read properties of undefined (reading 'itemIds')
- A12-failed-write (shipping) FAILED: the last answer says it was not saved — learn-assessment-question-7: feedback
- A12-failed-write (shipping) FAILED: the card offers Retry
- A12-failed-write (shipping) FAILED: the screen offers Retry for the unsaved answer
- A12-failed-write (shipping) FAILED: no result is shown
- A12-failed-write (shipping) FAILED: no key is revealed on any card — 8 revealed
- A12-failed-write (shipping) FAILED: the unsaved card is not locked: its options can still be changed
- A12-failed-write (shipping) FAILED: the device holds no completed sitting and no answer for the last question — undefined/8 answers, completedAt undefined (device record)
- A12-failed-write (shipping) FAILED: the journey ran to completion — Error: tap learn-assessment-save-retry: TimeoutError: locator.click: Timeout 15000ms exceeded.
- A12-failed-write (qa) FAILED: the last answer says it was not saved — learn-assessment-question-7: feedback
- A12-failed-write (qa) FAILED: the card offers Retry
- A12-failed-write (qa) FAILED: the screen offers Retry for the unsaved answer
- A12-failed-write (qa) FAILED: no result is shown
- A12-failed-write (qa) FAILED: no key is revealed on any card — 8 revealed
- A12-failed-write (qa) FAILED: the unsaved card is not locked: its options can still be changed
- A12-failed-write (qa) FAILED: the device holds no completed sitting and no answer for the last question — undefined/8 answers, completedAt undefined (device record)
- A12-failed-write (qa) FAILED: the journey ran to completion — Error: tap learn-assessment-save-retry: TimeoutError: locator.click: Timeout 15000ms exceeded.
- A15.3-provisional (shipping) FAILED: exam result: the notice is shown
- A15.3-provisional (shipping) FAILED: learn home: the notice is shown
- A15.3-provisional (shipping) FAILED: progress: the notice is shown
- A15.3-provisional (shipping) FAILED: certificate: the notice is shown
- A15.3-provisional (qa) FAILED: exam result: the notice is shown
- A15.3-provisional (qa) FAILED: learn home: the notice is shown
- A15.3-provisional (qa) FAILED: progress: the notice is shown
- A15.3-provisional (qa) FAILED: certificate: the notice is shown
- A13-rtl (shipping) FAILED: Arabic: the result shows the notice in Arabic
- A13-rtl (qa) FAILED: Arabic: the result shows the notice in Arabic

