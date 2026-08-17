# Budget Club & Calendar - Frontend React + TypeScript

Frontend moderno sviluppato in React 18, TypeScript e Vite, integrato con il backend Spring Boot e predisposto per packaging mobile tramite Capacitor.

---

## 📂 Struttura del Progetto

```
frontend/
├── public/                 # Asset statici (immagini, icone)
├── src/
│   ├── api/
│   │   └── client.ts       # Client HTTP e wrapper REST verso Spring Boot
│   ├── components/
│   │   ├── CalendarWidget.tsx        # Widget Calendario & Appuntamenti con CRUD
│   │   ├── CategoryCharts.tsx        # Grafici Recharts per categorie e trend
│   │   ├── CategoryLimitsWidget.tsx  # Gestione limiti di spesa
│   │   ├── SavingsGoalsWidget.tsx    # Gestione salvadanai, versamenti e transazioni
│   │   ├── RunnerArcade.tsx          # Retro mini-game Pixel Runner
│   │   ├── CoinCatcherArcade.tsx     # Retro mini-game Coin Catcher
│   │   ├── SudokuArcade.tsx          # Retro mini-game Sudoku
│   │   ├── LiveClock.tsx             # Orologio digitale in tempo reale
│   │   ├── Navbar.tsx                # Barra di navigazione con stato utente
│   │   ├── PaginatedTable.tsx        # Tabella generica riutilizzabile con paginazione
│   │   ├── PixelStars.tsx            # Animazione sfondo canvas a stelle pixel
│   │   ├── Toast.tsx                 # Notifiche toast temporanee
│   │   └── ErrorBoundary.tsx         # Gestione e cattura errori React
│   ├── context/
│   │   └── AuthContext.tsx           # Gestione globale autenticazione JWT
│   ├── pages/
│   │   ├── DashboardPage.tsx         # Panoramica saldi, grafici, previsioni e prossimi eventi
│   │   ├── OperationsPage.tsx        # Gestione entrate, spese, debiti, flexia, abbonamenti
│   │   ├── ReportPage.tsx            # Report mensile e statistiche
│   │   ├── GamePage.tsx              # Sala giochi arcade retro
│   │   ├── HelpPage.tsx              # Guida all'uso dell'applicazione
│   │   ├── LoginPage.tsx             # Login e registrazione
│   │   └── ResetPasswordPage.tsx     # Reimpostazione password tramite token email
│   ├── styles/
│   │   └── style.css                 # Design system Vanilla CSS (tema retro Spidey/Arcade)
│   ├── types/
│   │   └── index.ts                  # Definizioni dei tipi TypeScript
│   ├── utils/
│   │   └── arcadeAudio.ts            # Sintetizzatore audio retro con Web Audio API
│   ├── App.tsx                       # Routing principale SPA (React Router)
│   └── main.tsx                      # Entry point React
├── package.json
├── tsconfig.json
└── vite.config.ts                    # Configurazione Vite e proxy /api verso Spring Boot (8080)
```

---

## 🚀 Avvio in Sviluppo

```bash
cd frontend
npm install
npm run dev
```

L'applicazione sarà disponibile all'indirizzo **http://localhost:5173**.  
Le richieste verso `/api/*` vengono instradate automaticamente verso il backend attivo su `http://localhost:8080`.

---

## 📱 Build di Produzione e Capacitor Android

```bash
# Build della SPA web ottimizzata
npm run build

# Sincronizzazione con il progetto Android (se si usa Capacitor)
npx cap sync android
```

---

## 🧭 Mappa delle Route

| Percorso | Vista | Descrizione |
|---|---|---|
| `/` | `DashboardPage` | Saldo, grafici spese/limiti, forecast, salvadanai e appuntamenti |
| `/operations` | `OperationsPage` | Inserimento e gestione entrate, uscite, debiti, abbonamenti e flexia |
| `/report` | `ReportPage` | Report analitico mensile e grafici di spesa |
| `/game` | `GamePage` | Sala arcade con mini-giochi retro |
| `/help` | `HelpPage` | Documentazione e guida operativa |
| `/login` | `LoginPage` | Autenticazione e creazione nuovo account |
| `/reset-password` | `ResetPasswordPage` | Conferma reimpostazione password |
