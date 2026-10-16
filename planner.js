// The planner: turns the four answers into an evening, using the venues in venues.js.
// An evening is three stops in walking distance of each other:
//   dinner -> something after -> somewhere to end up   (or: a start -> dinner -> after)

const LOCAL_KM = 3.5;   // "Stay local" means every stop within this distance of home
const WALK_KM = 1.8;    // the most we'll ask you to walk between stops
const VIBES = ["casual", "mid", "fancy"];

// Walking time, at a city pace of about 12 minutes per km.
const walkMins = (km) => Math.max(2, Math.round(km * 12));

// How well one venue suits the answers. Higher is better; -Infinity means "don't use it".
function fit(v, answers, strict) {
  if (strict.local && kmBetween(HOME.at, v.at) > LOCAL_KM) return -Infinity;
  if (v.price > answers.budget + (strict.budget ? 0 : 1)) return -Infinity;
  const vibeGap = Math.min(...v.vibe.map((x) => Math.abs(VIBES.indexOf(x) - VIBES.indexOf(answers.vibe))));
  if (vibeGap > (strict.vibe ? 0 : 1)) return -Infinity;
  if (!v.groups.includes(answers.group)) return -Infinity;
  return 10 - vibeGap * 3 - (answers.budget - v.price) * 0.5; // prefer using the budget you've got
}

// Best venue for a slot near `from`, skipping ones already used. A little randomness keeps plans varied.
function pickNear(slot, from, answers, strict, used) {
  let best = null, bestScore = -Infinity;
  for (const v of VENUES) {
    if (!v.slots.includes(slot) || used.has(v.id)) continue;
    const km = kmBetween(from.at, v.at);
    if (km > WALK_KM) continue;
    const s = fit(v, answers, strict) - km * 4 + Math.random() * 2; // closer is better
    if (s > bestScore) { best = v; bestScore = s; }
  }
  return best;
}

// Build one evening. `avoid` holds dinner venues already shown, so "Another plan" moves on.
// If nothing fits, relax the rules one at a time: vibe first, then budget.
function planEvening(answers, avoid = new Set()) {
  const tries = [
    { vibe: true, budget: true, note: null },
    { vibe: false, budget: true, note: "Nudged the vibe a little to find a good fit." },
    { vibe: false, budget: false, note: "This one stretches the budget a bit." },
  ];
  let shortOne = null;
  for (const t of tries) {
    const strict = { ...t, local: answers.travel === "local" };
    const dinners = VENUES
      .filter((v) => v.slots.includes("dinner") && !avoid.has(v.id))
      .map((v) => ({ v, s: fit(v, answers, strict) + Math.random() * 3 }))
      .filter((x) => x.s > -Infinity)
      .sort((a, b) => b.s - a.s);
    for (const { v: dinner } of dinners) {
      const used = new Set([dinner.id]);
      const after = pickNear("after", dinner, answers, strict, used);
      if (!after) continue;
      used.add(after.id);
      // Usually finish somewhere late; sometimes start with a view or a drink instead.
      const end = pickNear("end", after, answers, strict, used);
      const start = pickNear("start", dinner, answers, strict, used);
      if (!end && !start) { shortOne = shortOne || { stops: [dinner, after], dinner, note: t.note }; continue; }
      const stops = end && (Math.random() < 0.7 || !start) ? [dinner, after, end] : [start, dinner, after];
      return { stops, dinner, note: t.note, title: titleFor(stops, answers), story: storyFor(stops) };
    }
  }
  // Only two stops fit anywhere: better than nothing.
  if (shortOne) return { ...shortOne, title: titleFor(shortOne.stops, answers), story: storyFor(shortOne.stops) };
  return null;
}

// Times for each stop, working back from dinner at 7:30pm (8pm for fancy).
function timesFor(stops, answers) {
  const dinnerAt = answers.vibe === "fancy" ? 20 * 60 : 19 * 60 + 30;
  const di = stops.findIndex((s) => s.slots.includes("dinner"));
  const fmt = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${h > 12 ? h - 12 : h}:${String(mm).padStart(2, "0")}pm`; };
  return stops.map((s, i) => fmt(dinnerAt + (i - di) * (i < di ? 75 : 120) + (i > di + 1 ? -15 : 0)));
}

// Placeholder headline until Phase 3 has Claude write it.
function titleFor(stops, answers) {
  const area = stops[1].area === stops[0].area ? stops[0].area : `${stops[0].area} to ${stops[stops.length - 1].area}`;
  const who = { date: "for two", friends: "for the group", solo: "on your own" }[answers.group];
  const how = { casual: "no fuss", mid: "done properly", fancy: "dressed up" }[answers.vibe];
  return `${area} ${who}, ${how}.`;
}

// Placeholder story stitched from each venue's one-liner. Phase 3 replaces this with Claude.
function storyFor(stops) {
  const lower = (s) => s[0].toLowerCase() + s.slice(1);
  return stops.map((s, i) => {
    if (i === 0) return s.line;
    const km = kmBetween(stops[i - 1].at, s.at);
    const opener = i === stops.length - 1 ? "To finish" : "Then";
    // A stop that is itself a walk doesn't need "N minutes' walk away" in front of it.
    if (/^(Walk|Wander|Cross)\b/.test(s.line)) return `${opener === "Then" ? "Then" : "To finish,"} ${lower(s.line)}`;
    const away = km < 0.15 ? "next door" : `${walkMins(km)} minutes' walk away`;
    const walk = `${opener}, ${away}, `;
    return walk + lower(s.line);
  }).join(" ");
}
