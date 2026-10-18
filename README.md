# Kuźnia – trening i dieta (PWA)

Darmowy dziennik treningowy i dietetyczny oparty na badaniach. Dane tylko na telefonie (IndexedDB) + kopia zapasowa JSON.

- `npm run dev` – podgląd na żywo (także z iPhone'a w tej samej sieci Wi-Fi)
- `npm test` – testy (logika, baza ćwiczeń/produktów, renderowanie ekranów)
- `npm run build` – wersja do publikacji w `dist/`
- `npm run icons` – ikony PNG z `public/favicon.svg`

Dane: `src/data/exercises.ts` (ćwiczenia), `src/data/plans.ts` (gotowe plany), `src/data/foods.ts` (produkty offline).
Produkty ze sklepów i kody kreskowe: Open Food Facts (online).
