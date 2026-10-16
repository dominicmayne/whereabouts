# Phase 1 plan: static prototype

## Spec
Prove the design and flow work on a phone before any real data or AI.

Acceptance criteria:
- Landing screen with the Whereabouts wordmark and one clear "Plan tonight" action.
- Four questions, one per screen: vibe, group, budget per person, travel distance. Tapping an answer moves on straight away. A back control works.
- A plan screen showing a full evening (eat, then, end up) as a route of stops, each with time, venue, area, station and tube line.
- "Another plan" swaps to a different example that still fits the answers. "Share" uses the phone's share sheet, or copies the plan text where that isn't available.
- Works at 375px wide with no sideways scroll, in light and dark mode, with no build step (double-click index.html to open).

## Decisions
- Plain HTML/CSS/JS, not React + Tailwind. Four screens of state doesn't need a framework, there's nothing to install, and Netlify serves the folder as-is.
- Example plans are hardcoded in `plans.js` with real, well-known venues. They are placeholders: Phase 2 replaces them with the tagged dataset.
- Memorable element: the evening drawn as a tube-map line, with each stop's real line colour. Everything else stays quiet.
- No "save" yet: sharing covers it for now. Saved plans need storage, which can wait.

## Tasks
1. `index.html`: the four screens as sections, only one visible at a time.
2. `styles.css`: colour and type tokens (light + dark), mobile-first layout, route diagram.
3. `plans.js`: 7 example evenings tagged with vibe / group / budget / travel.
4. `app.js`: answer handling, pick the best-matching plan, regenerate, share.
5. Verify in a headless browser at phone size, light and dark.

## Risks
- Example venue details (opening hours, bookings) are from memory and not verified. Phase 2 checks every venue.
- Only 7 examples, so some answer combinations get a loose match. Fine for a prototype.

## Update: desktop, live map, more evenings (Dom's request, 16 Oct)
- Live map in `map.js`: hand-drawn SVG London (Thames, area names, Home at Fulham Broadway), no tiles or API key. The camera glides on a spring to whichever stop you scroll to, and you can drag it with rubber-banding at the edges. Real map tiles (e.g. Leaflet + OpenStreetMap) can come in Phase 4 if wanted.
- Desktop: two columns, plan on the left and a tall sticky map on the right; landing page shows every venue on the map. Keyboard: 1-4 answer, R for another plan, Esc goes back.
- Phone: map sticks to the top while stops scroll under it; progress bar on questions; distance from home and an "Open in Maps" link on every stop.
- 15 example evenings now (was 7), adding Battersea Power Station, South Bank, Shoreditch, King's Road, Bishops Park, Barbican, Borough and Covent Garden.
- Fixed: the screen entry animation left a transform behind, which stopped the phone action bar sitting at the bottom.
