# Kuźnia: notatki projektu

A free training and diet PWA in Polish, for one user on an iPhone. Live at https://jakubapp33.github.io/kuznia/ (repo jakubapp33/kuznia).

## Working with the user
- Talk in Polish, in plain language. The user is a student and tests on an iPhone (Safari).
- Only free solutions. All data stays on the phone (IndexedDB), with a JSON backup.
- Recommendations are evidence-based, but the UI never shows citations.
- Before publishing, ask, unless the user asked for it themselves.

## Stack and commands
- Vite + React 19 + TypeScript, Dexie (IndexedDB), react-router (HashRouter), vite-plugin-pwa, vitest + jsdom.
- `npm run dev` · `npm test` · `npm run deploy` (tests, build, force-push to the gh-pages branch).
- `npm run products` downloads Open Food Facts products into `public/data/products.json`. It takes about 5 minutes.
- No browser is available for checks: use the jsdom smoke test (`src/smoke.test.tsx`), which covers every route.

## Structure
- `src/data/`:
  - `exercises.ts`: 164 exercises.
  - `plans.ts`: plan templates.
  - `foods.ts`: base foods with vitamins.
  - `foods-extra.ts`: about 450 products and dishes.
  - `micros.ts`: Polish nutrition norms.
- `src/lib/`:
  - `nutrition.ts`: BMR, TDEE, macros, adaptive TDEE.
  - `progression.ts`: double progression, RIR, e1RM.
  - `insights.ts`: conclusions from workouts.
  - `weight.ts`: weight trend.
  - `energy.ts`: energy balance.
  - `units.ts`: household measures by product name.
  - `search.ts`: exercise search (muscles, synonyms, typos) and Polish stemming.
  - `products.ts`: OFF product database with store filters.
  - `healthPaste.ts`: pasting Garmin data via an iOS Shortcut.
- `src/pages/`: screens. `src/components/`: shared UI.

## History
- v0.1: plans, sessions, timer, progression, exercise library with a body map, diet with OFF and barcodes, macro calculator.
- v0.2: micronutrients, 12k-product store database, journal (sleep, water, energy, note), meal times, insights, weight analysis.
- v0.3: steps and kcal from the watch, 14-day energy balance compared with weight, "Wklej z Garmina" through an iOS Shortcut (`/garmin`).
- v0.4: household measures, about 450 new products and dishes, exercise search by muscle groups, RIR column in sessions.

## Known limits and open items
- Open Food Facts is exhausted: about 12.8k Polish products with macros. More coverage means adding generic foods by hand.
- The iOS Shortcut for Garmin has not yet been tested by the user on an iPhone.
- The phone layout (e.g. the sets table with the RIR column) has not been checked on a real device.
