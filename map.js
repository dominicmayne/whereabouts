// The live map. It's a hand-drawn London (the Thames, a few area names, your stops),
// not map tiles, so it needs no API key, works offline and matches the app's look.
// A "camera" glides between stops on a spring, and you can drag it around.

const HOME = { name: "Fulham Broadway", at: [51.4802, -0.1953] };

// The Thames from Hammersmith to Greenwich, as [lat, lng] points along the middle of the river.
// Shortcut: roughly traced by hand, so it's accurate to about 100m. Fine for a sketch map.
const THAMES = [
  [51.4950, -0.2600], [51.4882, -0.2299], [51.4800, -0.2230], [51.4700, -0.2180], [51.4668, -0.2134],
  [51.4655, -0.2000], [51.4660, -0.1880], [51.4725, -0.1800], [51.4800, -0.1735], [51.4825, -0.1665],
  [51.4848, -0.1500], [51.4860, -0.1380], [51.4880, -0.1270], [51.4945, -0.1230], [51.5008, -0.1219],
  [51.5065, -0.1203], [51.5087, -0.1167], [51.5098, -0.1045], [51.5096, -0.0985], [51.5079, -0.0877],
  [51.5055, -0.0754], [51.5030, -0.0600], [51.5070, -0.0450], [51.5050, -0.0280], [51.4950, -0.0110],
  [51.4850, -0.0100], [51.4840, 0.0050],
];

const AREAS = [
  ["Fulham", 51.4760, -0.2040], ["Chelsea", 51.4890, -0.1680], ["Battersea", 51.4720, -0.1580],
  ["Kensington", 51.4990, -0.1940], ["Notting Hill", 51.5110, -0.2000], ["Putney", 51.4590, -0.2170],
  ["Westminster", 51.4985, -0.1350], ["Soho", 51.5162, -0.1385], ["Covent Garden", 51.5140, -0.1190],
  ["Marylebone", 51.5205, -0.1550], ["King's Cross", 51.5310, -0.1215], ["The City", 51.5155, -0.0920],
  ["South Bank", 51.5020, -0.1110], ["Shoreditch", 51.5255, -0.0790],
  ["Camden", 51.5450, -0.1500], ["Islington", 51.5420, -0.1030], ["Hampstead", 51.5600, -0.1800],
  ["Dalston", 51.5510, -0.0700], ["Brixton", 51.4580, -0.1130], ["Peckham", 51.4730, -0.0660],
  ["Greenwich", 51.4800, 0.0040], ["Mayfair", 51.5085, -0.1470], ["Bermondsey", 51.4975, -0.0730],
  ["Hammersmith", 51.4935, -0.2250],
];

// Flatten [lat, lng] onto a flat plane (good enough at city scale). 1 unit is about 1 km.
const LAT0 = 51.5;
const project = ([lat, lng]) => ({ x: lng * 111.32 * Math.cos(LAT0 * Math.PI / 180), y: -lat * 110.57 });

// Straight-line distance in km between two [lat, lng] points.
function kmBetween(a, b) {
  const p = project(a), q = project(b);
  return Math.hypot(p.x - q.x, p.y - q.y);
}

function createMap(svg, { onPick } = {}) {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const river = svg.appendChild(el("path", { class: "map-river" }));
  const areaLayer = svg.appendChild(el("g", { class: "map-areas" }));
  const route = svg.appendChild(el("path", { class: "map-route", pathLength: 1 }));
  const markerLayer = svg.appendChild(el("g"));
  const areaLabels = AREAS.map(([name, lat, lng]) => {
    const t = areaLayer.appendChild(el("text", { "text-anchor": "middle" }));
    t.textContent = name;
    return { t, p: project([lat, lng]) };
  });
  const riverPts = THAMES.map(project);

  let points = [];   // { p, node, kind } for home and stops
  let clusters = []; // landing map only: one bubble per neighbourhood, merged when they'd overlap
  let bounds = null; // the area the camera is allowed to roam
  let W = 1, H = 1;

  // Camera: centre (x, y) and zoom as a log value, so zooming feels even.
  // Each value has a target and a velocity; the spring pulls current toward target.
  const cam = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, tx: 0, ty: 0, tz: 0, damping: 1 };
  const RESPONSE = 0.4; // seconds, how quickly the camera settles
  let running = false, last = 0, dragging = null;

  function step(now) {
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
    last = now;
    const k = (2 * Math.PI / RESPONSE) ** 2;           // stiffness
    const c = 4 * Math.PI * cam.damping / RESPONSE;     // friction
    let moving = false;
    for (const [v, pos, t] of [["vx", "x", "tx"], ["vy", "y", "ty"], ["vz", "z", "tz"]]) {
      if (dragging && pos !== "z") continue; // your finger is in charge while dragging
      cam[v] += (k * (cam[t] - cam[pos]) - c * cam[v]) * dt;
      cam[pos] += cam[v] * dt;
      if (Math.abs(cam[t] - cam[pos]) > 0.0005 || Math.abs(cam[v]) > 0.0005) moving = true;
    }
    render();
    if (moving || dragging) requestAnimationFrame(step);
    else running = false;
  }
  function kick() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(step);
  }

  // World units -> pixels on screen.
  function toScreen(p) {
    const s = Math.exp(cam.z);
    return { x: (p.x - cam.x) * s + W / 2, y: (p.y - cam.y) * s + H / 2 };
  }

  function render() {
    const line = (pts) => pts.map((p, i) => { const s = toScreen(p); return `${i ? "L" : "M"}${s.x.toFixed(1)} ${s.y.toFixed(1)}`; }).join("");
    const s = Math.exp(cam.z);
    river.setAttribute("d", line(riverPts));
    river.style.strokeWidth = Math.max(6, 0.22 * s); // the Thames is ~220m wide
    // Area names: skip any that would sit on top of one already drawn, so small screens stay readable.
    const placed = [];
    for (const a of areaLabels) {
      const q = toScreen(a.p), w = a.t.textContent.length * 7.5 + 8;
      const clash = clusters.length || placed.some((b) => Math.abs(b.x - q.x) < (b.w + w) / 2 && Math.abs(b.y - q.y) < 18);
      a.t.style.display = clash ? "none" : "";
      if (clash) continue;
      placed.push({ x: q.x, y: q.y, w });
      a.t.setAttribute("x", q.x.toFixed(1));
      a.t.setAttribute("y", q.y.toFixed(1));
    }
    renderClusters();
    const stops = points.filter((pt) => pt.kind === "stop");
    route.setAttribute("d", stops.length > 1 ? line(stops.map((pt) => pt.p)) : "");
    for (const pt of points) {
      let q = toScreen(pt.p);
      if (pt.kind === "home") q = homeAt(q, pt);
      pt.node.setAttribute("transform", `translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`);
    }
  }

  // If home is off the edge of the map, pin it to the edge with an arrow and the distance,
  // so you always know which way home is without the map zooming out to fit it.
  function homeAt(q, pt) {
    const m = 22, inside = q.x > m && q.x < W - m && q.y > m && q.y < H - m;
    pt.node.classList.toggle("offscreen", !inside);
    if (inside) { pt.label.textContent = "Home"; return q; }
    const cx = W / 2, cy = H / 2, dx = q.x - cx, dy = q.y - cy;
    const k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m) / Math.abs(dy || 1e-6));
    const centre = { x: cam.x, y: cam.y };
    pt.label.textContent = `Home ${Math.hypot(pt.p.x - centre.x, pt.p.y - centre.y).toFixed(1)} km`;
    pt.arrow.setAttribute("transform", `rotate(${(Math.atan2(dy, dx) * 180 / Math.PI).toFixed(0)})`);
    // Keep the label inside the frame: put it on whichever side has room.
    const right = cx + dx * k < W / 2;
    pt.label.setAttribute("x", right ? 14 : -14);
    pt.label.setAttribute("text-anchor", right ? "start" : "end");
    return { x: cx + dx * k, y: cy + dy * k };
  }

  // Landing map: one bubble per neighbourhood showing how many places it has.
  // Bubbles that would overlap at the current zoom merge into the bigger one; zoom in and they split.
  function renderClusters() {
    if (!clusters.length) return;
    const kept = [];
    for (const c of clusters) { // already sorted biggest first
      const q = toScreen(c.p);
      const into = kept.find((k) => Math.hypot(k.q.x - q.x, (k.q.y - q.y) * 0.8) < k.r + 10 + Math.sqrt(c.n) * 3.2 + 22); // + room for the name underneath
      if (into) { into.total += c.n; into.merged += 1; c.node.style.display = "none"; continue; }
      kept.push({ c, q, total: c.n, merged: 0, r: 10 + Math.sqrt(c.n) * 3.2 });
    }
    for (const k of kept) {
      const r = 10 + Math.sqrt(k.total) * 3.2;
      k.c.node.style.display = "";
      k.c.node.setAttribute("transform", `translate(${k.q.x.toFixed(1)} ${k.q.y.toFixed(1)})`);
      k.c.circle.setAttribute("r", r.toFixed(1));
      k.c.count.textContent = k.total;
      k.c.label.textContent = k.merged ? `${k.c.name} +${k.merged}` : k.c.name;
      k.c.label.setAttribute("y", (r + 13).toFixed(1));
    }
  }

  // The camera target that fits a set of world points into the frame.
  function fitTarget(pts, padding = 56, minSpan = 0.6) {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, minSpan), spanY = Math.max(maxY - minY, minSpan); // don't zoom in further than minSpan km
    const s = Math.min((W - padding * 2) / spanX, (H - padding * 2) / spanY);
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: Math.log(s) };
  }
  function goTo(t, damping = 1) {
    if (W === 1) return; // not on screen yet; the ResizeObserver below fits it when it appears
    cam.tx = t.x; cam.ty = t.y; cam.tz = t.z; cam.damping = damping;
    kick();
  }

  // Replace what's on the map. stops: [{ name, at }]. Optional home marker and route line.
  function setPoints(stops, { home = true, routeLine = true, numbered = true, cluster = false } = {}) {
    markerLayer.replaceChildren();
    points = [];
    clusters = [];
    if (cluster) {
      const byArea = new Map();
      for (const s of stops) {
        const c = byArea.get(s.area) || { name: s.area, sum: { x: 0, y: 0 }, n: 0 };
        const q = project(s.at);
        c.sum.x += q.x; c.sum.y += q.y; c.n += 1;
        byArea.set(s.area, c);
      }
      clusters = [...byArea.values()].sort((a, b) => b.n - a.n).map((c) => {
        const g = markerLayer.appendChild(el("g", { class: "map-cluster" }));
        const circle = g.appendChild(el("circle"));
        const count = g.appendChild(el("text", { class: "count", "text-anchor": "middle", y: 4.5 }));
        const label = g.appendChild(el("text", { class: "name", "text-anchor": "middle" }));
        const p = { x: c.sum.x / c.n, y: c.sum.y / c.n };
        g.addEventListener("click", () => goTo({ x: p.x, y: p.y, z: cam.z + 1 })); // tap a bubble to zoom in
        return { name: c.name, n: c.n, p, node: g, circle, count, label };
      });
      stops = []; // the bubbles stand in for the individual dots
    }
    if (home) {
      const g = markerLayer.appendChild(el("g", { class: "map-home" }));
      const arrow = g.appendChild(el("path", { class: "map-home-arrow", d: "M9 -6 L17 0 L9 6 Z" }));
      g.append(el("rect", { x: -7, y: -7, width: 14, height: 14, rx: 3 }));
      const t = g.appendChild(el("text", { x: 14, y: 4 }));
      t.textContent = "Home";
      points.push({ p: project(HOME.at), node: g, kind: "home", label: t, arrow });
    }
    stops.forEach((s, i) => {
      const g = markerLayer.appendChild(el("g", { class: numbered ? "map-stop" : "map-dot", tabindex: numbered ? 0 : -1 }));
      g.append(el("circle", { r: numbered ? 13 : 4 }));
      if (numbered) {
        const t = g.appendChild(el("text", { "text-anchor": "middle", y: 4.5 }));
        t.textContent = i + 1;
        g.setAttribute("aria-label", `${i + 1}. ${s.name}`);
        g.addEventListener("click", () => onPick && onPick(i));
      }
      points.push({ p: project(s.at), node: g, kind: "stop", i });
    });
    route.style.display = routeLine ? "" : "none";
    // Restart the route "drawing itself" animation.
    route.classList.remove("draw");
    route.getBoundingClientRect();
    route.classList.add("draw");

    const all = [...points.map((pt) => pt.p), ...clusters.map((c) => c.p)];
    const pad = 1.2; // km of slack around everything for dragging
    bounds = {
      minX: Math.min(...all.map((p) => p.x)) - pad, maxX: Math.max(...all.map((p) => p.x)) + pad,
      minY: Math.min(...all.map((p) => p.y)) - pad, maxY: Math.max(...all.map((p) => p.y)) + pad,
    };
    overview();
  }

  // The whole-plan view: fit tonight's stops (home gets an edge arrow if it's off the map).
  function overviewTarget() {
    const stops = points.filter((pt) => pt.kind === "stop").map((pt) => pt.p);
    const pts = stops.length ? stops : [...points.map((pt) => pt.p), ...clusters.map((c) => c.p)];
    return fitTarget(pts, stops.length ? 60 : 30);
  }
  function overview() { if (points.length || clusters.length) goTo(overviewTarget()); }

  // Fly to one stop and highlight it. null means show everything.
  function focus(i) {
    for (const pt of points) pt.node.classList.toggle("active", pt.kind === "stop" && pt.i === i);
    if (i === null) return overview();
    const pt = points.find((x) => x.kind === "stop" && x.i === i);
    if (!pt) return;
    // Zoom so all tonight's stops fit around this one (close-together stops get pulled apart),
    // but never wider than ~2.5km so you can still see where you are.
    const fit = fitTarget(points.filter((x) => x.kind === "stop").map((x) => x.p), 50, 0.25);
    goTo({ x: pt.p.x, y: pt.p.y, z: Math.max(fit.z - 0.25, Math.log(Math.min(W, H) / 2.5)) });
  }

  // Dragging: follow the finger, stretch (rubber-band) past the edges, then glide and settle.
  function clampAxis(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function rubber(v, lo, hi) {
    if (v < lo) return lo - (lo - v) * 0.35;
    if (v > hi) return hi + (v - hi) * 0.35;
    return v;
  }
  svg.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".map-stop, .map-cluster")) return;
    svg.setPointerCapture(e.pointerId);
    dragging = { px: e.clientX, py: e.clientY, x: cam.x, y: cam.y, t: performance.now(), vx: 0, vy: 0 };
    cam.vx = cam.vy = 0;
    svg.classList.add("dragging");
    kick();
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const s = Math.exp(cam.z), now = performance.now();
    const rawX = dragging.x - (e.clientX - dragging.px) / s;
    const rawY = dragging.y - (e.clientY - dragging.py) / s;
    const nx = rubber(rawX, bounds.minX, bounds.maxX), ny = rubber(rawY, bounds.minY, bounds.maxY);
    const dt = Math.max(1, now - dragging.t) / 1000;
    dragging.vx = (nx - cam.x) / dt; dragging.vy = (ny - cam.y) / dt; dragging.t = now;
    cam.x = nx; cam.y = ny;
  });
  const release = () => {
    if (!dragging) return;
    // A flick carries on a little (momentum), then the spring pulls it back inside the edges.
    cam.vx = dragging.vx; cam.vy = dragging.vy;
    cam.tx = clampAxis(cam.x + dragging.vx * 0.15, bounds.minX, bounds.maxX);
    cam.ty = clampAxis(cam.y + dragging.vy * 0.15, bounds.minY, bounds.maxY);
    cam.damping = 0.8;
    dragging = null;
    svg.classList.remove("dragging");
    kick();
  };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);

  // Keep the drawing sharp when the map changes size (phone rotation, window resize).
  new ResizeObserver(() => {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const first = W === 1;
    W = r.width; H = r.height;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    if (first && (points.length || clusters.length)) { const t = overviewTarget(); Object.assign(cam, { x: t.x, y: t.y, z: t.z, tx: t.x, ty: t.y, tz: t.z }); }
    render();
  }).observe(svg);

  return { setPoints, focus, overview };
}
