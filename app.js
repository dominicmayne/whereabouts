// Whereabouts app logic: ask four questions, build an evening with planner.js, show it on a live map.

const QUESTIONS = [
  { key: "vibe", title: "What's the vibe?", options: [
    { value: "casual", label: "Casual", hint: "Jeans, pints, no booking" },
    { value: "mid", label: "Somewhere nice", hint: "A bit of effort, not a big deal" },
    { value: "fancy", label: "Fancy", hint: "Dress up, book ahead" },
  ]},
  { key: "group", title: "Who's coming?", options: [
    { value: "date", label: "A date", hint: "Two of you" },
    { value: "friends", label: "Friends", hint: "A group" },
    { value: "solo", label: "Just me", hint: "An evening to yourself" },
  ]},
  { key: "budget", title: "Budget each?", options: [
    { value: 1, label: "Under £30" },
    { value: 2, label: "£30 to £60" },
    { value: 3, label: "£60 to £100" },
    { value: 4, label: "£100 or more" },
  ]},
  { key: "travel", title: "How far will you go?", options: [
    { value: "local", label: "Stay local", hint: "Fulham, Chelsea, walkable" },
    { value: "anywhere", label: "Anywhere in London", hint: "Happy to get the tube" },
  ]},
];

const answers = {};
let step = 0;
let current = null; // the plan on screen
let shown = new Set(); // dinner venues already used for these answers, so "Another plan" moves on

const $ = (id) => document.getElementById(id);
const screenId = () => document.querySelector(".screen:not([hidden])").id;

// Today's date in London, e.g. "Tonight · Friday 16 October".
$("today-intro").textContent = $("today-plan").textContent = "Tonight · " +
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/London" }).format(new Date());

// Show one screen and hide the others.
function show(id) {
  for (const s of document.querySelectorAll(".screen")) s.hidden = s.id !== id;
  window.scrollTo(0, 0);
}

// ---------- Maps ----------
const introMap = createMap($("intro-map"));
// Every venue in the dataset on the landing page map, grouped into neighbourhood bubbles.
introMap.setPoints(VENUES, { home: false, routeLine: false, numbered: false, cluster: true });

const planMap = createMap($("plan-map"), {
  // Tapping a numbered marker scrolls its stop into view.
  onPick: (i) => document.querySelectorAll(".stop")[i].scrollIntoView({ behavior: "smooth", block: "center" }),
});
$("overview").addEventListener("click", () => { setActive(null); });

function setActive(i) {
  document.querySelectorAll(".stop").forEach((li, n) => li.classList.toggle("active", n === i));
  planMap.focus(i);
}

// As you scroll, whichever stop is in the middle of the screen is the one the map flies to.
const watcher = new IntersectionObserver((entries) => {
  // Only once you've started scrolling, so the plan opens on the whole route.
  for (const e of entries) if (e.isIntersecting && window.scrollY > 40) setActive(Number(e.target.dataset.i));
}, { rootMargin: "-50% 0px -35% 0px" });
// Scrolled back up to the title: show the whole route again.
new IntersectionObserver(([e]) => { if (e.isIntersecting && current) setActive(null); })
  .observe($("plan-title"));

// ---------- Questions ----------
function renderQuestion() {
  const q = QUESTIONS[step];
  $("q-count").textContent = `${step + 1} of ${QUESTIONS.length}`;
  document.querySelectorAll(".progress i").forEach((bar, n) => bar.classList.toggle("done", n <= step));
  $("q-title").textContent = q.title;
  $("options").replaceChildren(...q.options.map((opt, n) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "option";
    if (answers[q.key] === opt.value) b.dataset.picked = "";
    b.innerHTML = `<span class="option-label">${opt.label}</span>` +
      (opt.hint ? `<span class="option-hint">${opt.hint}</span>` : "") +
      `<kbd class="option-key">${n + 1}</kbd>`;
    // Pick on pointer-down so it feels instant. Keyboard users still get "click" (detail is 0).
    b.addEventListener("pointerdown", (e) => { if (e.button === 0) pick(q.key, opt.value); });
    b.addEventListener("click", (e) => { if (e.detail === 0) pick(q.key, opt.value); });
    return b;
  }));
  // Replay the entry animation for each new question.
  const screen = $("screen-question");
  screen.style.animation = "none";
  screen.offsetHeight; // forces the browser to notice the reset
  screen.style.animation = "";
  show("screen-question");
}

function pick(key, value) {
  answers[key] = value;
  step += 1;
  if (step < QUESTIONS.length) renderQuestion();
  else { shown = new Set(); renderPlan(); }
}

function renderPlan() {
  let plan = planEvening(answers, shown);
  if (!plan && shown.size) { shown = new Set(); plan = planEvening(answers, shown); } // seen them all: start over
  if (!plan) { toast("Nothing fits those answers yet. Try a different budget."); return; }
  shown.add(plan.dinner.id);
  current = plan;
  const times = timesFor(plan.stops, answers);
  $("plan-title").textContent = plan.title;
  $("plan-story").textContent = plan.story;
  $("plan-note").textContent = plan.note || "";
  $("plan-tags").textContent = QUESTIONS.map((q) => q.options.find((o) => o.value === answers[q.key]).label).join(" · ");

  watcher.disconnect();
  $("route").replaceChildren(...plan.stops.map((s, i) => {
    const li = document.createElement("li");
    li.className = "stop";
    li.dataset.i = i;
    // The line down to the next stop takes the colour of that stop's first tube line.
    const next = plan.stops[i + 1];
    if (next) li.style.setProperty("--line", LINES[next.stations[0][1]]);
    const km = kmBetween(HOME.at, s.at);
    const mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${s.name}, London`);
    li.innerHTML = `
      <span class="stop-dot" aria-hidden="true"></span>
      <div class="stop-card" role="button" tabindex="0">
        <span class="stop-time">${times[i]}${s.booking === "yes" ? ` <span class="stop-book">Book ahead</span>` : ""}</span>
        <h3 class="stop-name">${s.name}</h3>
        <p class="stop-what">${s.what}</p>
        <p class="stop-tip">${s.tip}</p>
        <div class="stop-meta">
          <div class="stations">${s.stations.map(([name, line]) =>
            `<span class="station"><i style="--c:${LINES[line]}"></i>${name} · ${line}</span>`).join("")}
          </div>
          <span class="stop-far">${km < 0.3 ? "Round the corner" : km.toFixed(1) + " km from home"}</span>
          <a class="stop-link" href="${mapsUrl}" target="_blank" rel="noopener">Open in Maps</a>
        </div>
      </div>`;
    const card = li.querySelector(".stop-card");
    card.addEventListener("click", (e) => { if (!e.target.closest("a")) setActive(i); });
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(i); } });
    watcher.observe(li);
    return li;
  }));

  const wasOnPlan = screenId() === "screen-plan";
  show("screen-plan");
  planMap.setPoints(plan.stops);
  if (wasOnPlan) { // "Another plan": replay the entry animation so the change is obvious
    const s = $("screen-plan");
    s.style.animation = "none"; s.offsetHeight; s.style.animation = "";
  }
}

// ---------- Sharing ----------
// Share through the phone's share sheet, or copy the plan as text if that isn't available.
async function share() {
  const times = timesFor(current.stops, answers);
  const text = `${current.title}\n\n${current.story}\n\n` +
    current.stops.map((s, i) => `${times[i]}  ${s.name} (${s.stations[0][0]})`).join("\n");
  try {
    if (navigator.share) return await navigator.share({ title: "Whereabouts", text });
    await navigator.clipboard.writeText(text);
    toast("Plan copied. Paste it in the group chat.");
  } catch (err) {
    if (err.name !== "AbortError") toast("Couldn't share from this browser.");
  }
}

function toast(message) {
  const t = $("toast");
  t.textContent = message;
  t.dataset.show = "";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => delete t.dataset.show, 2400);
}

// ---------- Buttons and keys ----------
$("start").addEventListener("click", () => { step = 0; renderQuestion(); });
$("back").addEventListener("click", () => {
  if (step === 0) show("screen-intro");
  else { step -= 1; renderQuestion(); }
});
$("restart").addEventListener("click", () => show("screen-intro"));
$("another").addEventListener("click", renderPlan);
$("share").addEventListener("click", share);

// Desktop shortcuts: number keys answer questions, R gets another plan, Escape goes back.
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const where = screenId();
  if (where === "screen-question") {
    const opt = QUESTIONS[step].options[Number(e.key) - 1];
    if (opt) pick(QUESTIONS[step].key, opt.value);
    if (e.key === "Escape") $("back").click();
  } else if (where === "screen-plan" && e.key.toLowerCase() === "r") renderPlan();
  else if (where === "screen-intro" && e.key === "Enter" && e.target === document.body) $("start").click();
});
