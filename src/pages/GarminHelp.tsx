import { TopBar } from '../components/ui'

const TEMPLATE = 'kroki=[Statystyki 1]\naktywne=[Statystyki 2]\nspoczynkowe=[Statystyki 3]'

export function GarminHelp() {
  return (
    <div className="page">
      <TopBar title="Dane z Garmina" back="/" />
      <div className="card small stack">
        <div>
          Kuźnia (jak każda aplikacja z przeglądarki) nie ma dostępu do Garmina ani do aplikacji Zdrowie. Obejście: <b>Skrót iOS</b> pobiera ze Zdrowia kroki i kalorie i kopiuje je, a w Kuźni stukasz <b>„Wklej z Garmina”</b>.
        </div>
      </div>

      <div className="section-title">1. Garmin → Zdrowie (raz)</div>
      <div className="card small">
        <ol className="steps">
          <li>W <b>Garmin Connect</b>: Więcej (☰) → Ustawienia → Aplikacje partnerskie (Połączone aplikacje) → <b>Apple Zdrowie</b>.</li>
          <li>Włącz zapisywanie: <b>kroki, energia aktywna, energia spoczynkowa</b>.</li>
          <li>W aplikacji <b>Zdrowie</b> sprawdź, że pojawiają się dane ze źródła „Connect”.</li>
        </ol>
      </div>

      <div className="section-title">2. Zbuduj skrót (raz, ok. 5 minut)</div>
      <div className="card small stack">
        <div className="muted">Otwórz aplikację <b>Skróty</b> → „+” (nowy skrót). Nazwij go np. „Kuźnia”. Akcje dodajesz przez pole wyszukiwania na dole.</div>
        <ol className="steps">
          <li>
            Dodaj akcję <b>„Znajdź próbki Zdrowia”</b> (ang. <i>Find Health Samples</i> – wpisz w wyszukiwarkę „próbki” lub „Zdrowie”). Ustaw:
            <br />• Typ: <b>Kroki</b>
            <br />• dodaj filtr <b>Data początkowa</b> → <b>jest dzisiaj</b>
            <br />• dodaj filtr <b>Źródło</b> → <b>Connect</b> (żeby nie liczyć kroków podwójnie – z iPhone’a i z zegarka)
          </li>
          <li>Dodaj akcję <b>„Oblicz statystyki”</b> (<i>Calculate Statistics</i>) → wybierz <b>Suma</b>.</li>
          <li>Powtórz punkty 1–2 dla typu <b>Energia aktywna</b>.</li>
          <li>Powtórz punkty 1–2 dla typu <b>Energia spoczynkowa</b>.</li>
          <li>
            Dodaj akcję <b>„Tekst”</b> i wpisz dokładnie tak (w nawiasach wstaw zmienne – stuknij w tekst i wybierz z paska nad klawiaturą kolejne „Statystyki”):
            <pre className="code">{TEMPLATE}</pre>
          </li>
          <li>Dodaj akcję <b>„Kopiuj do schowka”</b> (<i>Copy to Clipboard</i>).</li>
        </ol>
        <div className="muted">Za pierwszym razem iPhone zapyta o dostęp do Zdrowia – zezwól.</div>
      </div>

      <div className="section-title">3. Codziennie (10 sekund)</div>
      <div className="card small">
        <ol className="steps">
          <li>Wieczorem uruchom skrót „Kuźnia” (możesz dodać go jako widżet lub na ekran główny: w skrócie ⓘ → „Dodaj do ekranu początkowego”).</li>
          <li>Otwórz Kuźnię → Dziś → Dzienniczek → <b>„Wklej z Garmina”</b> i zezwól na wklejenie.</li>
        </ol>
        <div className="muted" style={{ marginTop: 8 }}>
          Dane trafiają do dnia otwartego w Dzienniczku. Skrót bierze dane z dzisiaj – najlepiej uruchamiać go przed snem. Jeśli zapomnisz, w Diecie przejdź na wczorajszy dzień i wpisz liczby ręcznie.
        </div>
      </div>

      <div className="note small">
        Działa też z każdym innym zegarkiem lub opaską, która zapisuje dane do Zdrowia (Apple Watch, Xiaomi, Huawei) – zmień tylko „Źródło” na nazwę ich aplikacji albo usuń ten filtr, jeśli masz tylko jedno źródło kroków.
      </div>
    </div>
  )
}
