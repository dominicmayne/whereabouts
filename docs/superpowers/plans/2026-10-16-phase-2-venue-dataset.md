# Phase 2 plan: real venue dataset

## Spec
Replace the hand-written example evenings with a dataset of checked London venues, and have the app build each evening from it based on the four answers.

Acceptance criteria:
- `venues.js` holds every venue once, each tagged with: area, map position, stations and lines, vibe, price per person, group types, which part of the evening it suits (start, dinner, after, end), booking advice and a source link.
- Every venue has been checked against the web (open in October 2026, address, stations, price). Closed ones are replaced with a similar open venue nearby.
- The app builds a plan of three stops: dinner, something after, and somewhere to end up (or a pre-dinner start). Stops are within walking distance of each other, fit the budget, suit the group, and match the vibe.
- "Stay local" keeps every stop within about 3.5 km of Fulham Broadway.
- "Another plan" gives a genuinely different evening each time.
- Still opens by double-clicking `index.html` (data is a .js file, not fetched JSON, because browsers block fetch from a local folder).

## Tasks
1. Fan out the fact-check: four parallel checks of ~25 venues each.
2. Build `venues.js` from the checked results.
3. Write `planner.js`: filter, score and chain venues into an evening, plus a simple written summary (Phase 3 swaps this for Claude).
4. Wire it into `app.js`, remove `plans.js`.
5. Verify every answer combination produces a plan, and screenshot phone and desktop.

## Risks
- Some answer combinations may have few matches (e.g. fancy + solo + under £30). The planner relaxes vibe first, then budget, and says so on the plan.
- The written summary is stitched from each venue's one-liner until Phase 3.

## Result (16 Oct)
- 101 venues fact-checked by four parallel web checks. 4 had closed and were replaced: Bounce Old Street (now Flight Club Shoreditch), Chiltern Firehouse (fire, now Trishna), Curzon Chelsea (now Everyman Chelsea), Megan's King's Road (now Megan's by the Green, which still needs confirming). Two were renamed: The Sands End is now The Fulham Arms, and Odeon Putney is now ODEON Luxe Putney. Around 30 tips were corrected.
- Every one of the 72 answer combinations produces a three-stop evening. 19 of them need the rules relaxed (mostly "under £30" + "stay local", where there are few cheap local dinners), and the plan says so.
- `plans.js` retired. The data now lives in `venues.js`, and the logic lives in `planner.js`.
