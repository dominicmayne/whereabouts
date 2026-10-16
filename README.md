# Whereabouts

London evening planner. Currently on **Phase 2: real venue dataset**. The app builds each evening from a checked list of 101 London venues.

## Files
- `index.html`: the page structure (three screens: intro, questions, plan).
- `venues.js`: the venue dataset. One entry per venue, with area, map position, stations, vibe, price, who it suits and when in the evening it works. Edit this to add or fix venues; the field list is at the top.
- `planner.js`: picks dinner, something after and somewhere to end up from `venues.js`, based on your answers.
- `styles.css`: all the look and feel. Colours and fonts are set at the top.
- `map.js`: the live London map (hand-drawn Thames, area names, your stops, the gliding camera).
- `app.js`: what happens when you tap things.
- `docs/superpowers/plans/`: the written plan for each phase.

## How to preview it on your computer

1. **Download the folder.** Download the `whereabouts` folder from the project files to your computer, for example into `Documents`.
2. **Open it.** Double-click `index.html`. It opens in your web browser. That's it: there's nothing to install, because it's plain HTML, CSS and JavaScript that every browser already understands.
3. **See it phone-sized (Chrome).** Press `Cmd + Option + I` (Mac) or `Ctrl + Shift + I` (Windows). This opens DevTools, the browser's built-in inspector. Then press `Cmd + Shift + M` (Mac) or `Ctrl + Shift + M` (Windows) to turn on the device toolbar, and pick "iPhone 14 Pro" from the dropdown at the top.
4. **Changed a file?** Save it, then press `Cmd + R` / `Ctrl + R` in the browser to reload.

### Optional: run a tiny local web server
Not needed now, but you'll want it from Phase 3. Open Terminal (Mac: `Cmd + Space`, type "Terminal"), then:

```
cd ~/Documents/whereabouts
```
`cd` means "change directory": it moves Terminal into the folder.

```
python3 -m http.server 8000
```
This starts a small web server built into Python that serves the folder. Open http://localhost:8000 in your browser. Press `Ctrl + C` in Terminal to stop it.

## Adding a venue
Open `venues.js`, copy any entry, and change the fields. The important ones:
- `slots`: when in the evening it works: `"start"` (a drink or a view before dinner), `"dinner"`, `"after"` (film, show, bar), `"end"` (nightcap, late spot, walk home).
- `line`: one sentence starting with a verb, like `"Book the Harwood Arms and order the scotch egg."` The plan joins these into its story.
- `at`: latitude and longitude. In Google Maps, right-click the place and click the numbers at the top to copy them.
Save, then reload the page.

## Putting it online (a public link anyone can open)
We use Netlify's free drag-and-drop hosting. No commands needed.
1. Download `whereabouts-site.zip` and double-click it to unzip. You get a folder called `whereabouts`.
2. Go to https://app.netlify.com/drop and sign up for a free account (email or GitHub). Without an account the link only lasts an hour.
3. Drag the `whereabouts` folder onto the page. After a few seconds Netlify gives you a link ending in `.netlify.app`. That's it: anyone can open it.
4. Optional: in the site's settings, change the site name to something like `whereabouts-london` for a nicer link.
5. To update it later, open the site in Netlify, go to Deploys, and drag the new folder onto that page.
