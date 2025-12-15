# Kalkulator Urlopów - Polska

Aplikacja webowa do planowania urlopów w Polsce z uwzględnieniem świąt i dni wolnych.

## Funkcjonalności

### Podstawowe
- **Wybór roku:** 2025-2029
- **Elastyczna liczba dni urlopu:** 0-40 dni (domyślnie 20)
- **Automatyczne pobieranie świąt** z API dla wybranego roku
- **Wykrywanie świąt w soboty** - automatyczny dodatkowy dzień wolny do wykorzystania w tym samym miesiącu

### Gotowe kombinacje urlopowe
Aplikacja automatycznie generuje propozycje na podstawie świąt:
- Święto w czwartek/piątek → 1 dzień urlopu = 4 dni wolne
- Święto w wtorek/środę → 1-2 dni urlopu = 4-5 dni wolne
- Święto w poniedziałek → 1 dzień urlopu = 4 dni wolne
- Specjalne kombinacje dla Świąt Bożego Narodzenia i Wielkanocy

### Interaktywny kalendarz
- Kliknij dowolny dzień roboczy, aby dodać/usunąć urlop
- **Kolorowe oznaczenia:**
  - 🔴 Czerwony = święta państwowe
  - 🟡 Żółty = zaznaczony urlop
  - 🟢 Zielony = weekendy
  - 🔵 Niebieski = ciągły okres wolnego (święto + urlop + weekend)

### Dodatkowe funkcje
- **Podsumowanie na żywo** - wykorzystane/pozostałe dni urlopu i łączna liczba dni wolnych
- **LocalStorage** - automatyczny zapis planu osobno dla każdego roku
- **Przycisk "Wyczyść plan"** - szybki reset
- **Export PDF** - pobierz kalendarz z zaznaczonymi dniami + podsumowanie
- **Sugestia optymalna** - algorytm automatycznie wybiera kombinacje dające maksymalną liczbę dni wolnego

## Tech Stack

- **React** - UI framework
- **Vite** - Build tool i dev server
- **Tailwind CSS** - Styling
- **date-fns** - Manipulacja datami
- **jspdf + html2canvas** - Export PDF
- **API świąt:** [Nager.Date API](https://date.nager.at/)

## Instalacja i uruchomienie lokalnie

### Wymagania
- Node.js 18+ i npm

### Kroki

1. **Sklonuj repozytorium:**
```bash
git clone https://github.com/Pamela69420/-wi-ta.git
cd -wi-ta
```

2. **Zainstaluj zależności:**
```bash
npm install
```

3. **Uruchom serwer deweloperski:**
```bash
npm run dev
```

4. **Otwórz w przeglądarce:**
```
http://localhost:5173
```

## Deployment

### Vercel (Zalecane)

1. **Zainstaluj Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
vercel
```

3. **Lub użyj Vercel Dashboard:**
   - Wejdź na [vercel.com](https://vercel.com)
   - Kliknij "New Project"
   - Importuj repozytorium GitHub
   - Vercel automatycznie wykryje Vite i skonfiguruje build

**Build settings dla Vercel:**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### GitHub Pages

1. **Dodaj do `vite.config.js`:**
```js
export default {
  base: '/-wi-ta/', // Nazwa twojego repo
}
```

2. **Zainstaluj gh-pages:**
```bash
npm install --save-dev gh-pages
```

3. **Dodaj do `package.json`:**
```json
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

4. **Deploy:**
```bash
npm run deploy
```

5. **Włącz GitHub Pages w ustawieniach repo:**
   - Settings → Pages → Source: `gh-pages` branch

### Netlify

1. **Drag & Drop:**
   - Zbuduj projekt: `npm run build`
   - Przeciągnij folder `dist` na [netlify.com/drop](https://app.netlify.com/drop)

2. **Lub użyj Netlify CLI:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**Build settings dla Netlify:**
- Build command: `npm run build`
- Publish directory: `dist`

## Build production

```bash
npm run build
```

Zbudowana aplikacja będzie w folderze `dist/`.

## Struktura projektu

```
-wi-ta/
├── src/
│   ├── App.jsx          # Główny komponent aplikacji
│   ├── App.css          # Style niestandardowe
│   ├── index.css        # Globalne style + Tailwind
│   └── main.jsx         # Entry point
├── public/              # Statyczne assety
├── index.html           # HTML template
├── package.json         # Zależności i skrypty
├── tailwind.config.js   # Konfiguracja Tailwind
├── vite.config.js       # Konfiguracja Vite
└── README.md           # Ten plik
```

## Jak używać aplikacji

1. **Wybierz rok** z dropdown (2025-2029)
2. **Ustaw liczbę dni urlopu** za pomocą slidera
3. **Przeglądaj gotowe kombinacje** i zaznaczaj checkboxy interesujących propozycji
4. **Ręcznie dodaj dodatkowe dni** klikając na kalendarz
5. **Użyj "Sugestia optymalna"** aby algorytm automatycznie wybrał najlepsze kombinacje
6. **Eksportuj plan do PDF** jeśli chcesz zapisać lub wydrukować

## Licencja

MIT

## Autor

Stworzono z pomocą Claude AI
