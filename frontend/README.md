# Budget Club - Frontend React + TypeScript

Frontend React/TypeScript/Vite che sostituisce i file HTML/JS statici del progetto Spring Boot.

## Struttura

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts          # Wrapper REST verso Spring Boot
│   ├── components/
│   │   ├── CalendarWidget.tsx  # Calendario con CRUD appuntamenti
│   │   ├── ErrorModal.tsx      # Modal errori
│   │   ├── LiveClock.tsx       # Orologio live
│   │   ├── Navbar.tsx          # Barra navigazione
│   │   ├── PaginatedTable.tsx  # Tabella generica con paginazione
│   │   ├── PixelStars.tsx      # Animazione stelle retro (canvas)
│   │   └── Toast.tsx           # Notifiche temporanee
│   ├── context/
│   │   └── AuthContext.tsx     # Stato autenticazione globale
│   ├── pages/
│   │   ├── DashboardPage.tsx   # → index.html
│   │   ├── HelpPage.tsx        # → help.html
│   │   ├── LoginPage.tsx       # → login.html
│   │   ├── OperationsPage.tsx  # → operations.html
│   │   ├── ReportPage.tsx      # → report.html
│   │   └── ResetPasswordPage.tsx # → reset-password.html
│   ├── styles/
│   │   └── style.css           # Tema retro arcade
│   ├── types/
│   │   └── index.ts            # Interfacce TypeScript
│   ├── App.tsx                 # Router + layout
│   └── main.tsx                # Entry point
├── index.html
├── package.json
├── vite.config.ts              # Proxy /api → localhost:8080
└── tsconfig.json
```

## Avvio

```bash
cd frontend
npm install
npm run dev
```

Il frontend gira su **http://localhost:5173**.  
Tutte le chiamate `/api/*` vengono proxate automaticamente verso **http://localhost:8080** (backend Spring Boot).

## Route

| URL                       | Pagina             |
|---------------------------|--------------------|
| `/`                       | Dashboard          |
| `/login`                  | Login / Registrazione |
| `/operations`             | Operazioni CRUD    |
| `/report`                 | Report mensile     |
| `/help`                   | Guida              |
| `/reset-password?token=…` | Reset password     |

## Differenze dall'HTML statico

- HTML ora è **JSX dentro file `.tsx`** (TypeScript + React)
- Autenticazione gestita con **React Context** invece di `localStorage` raw
- **React Router** per la navigazione SPA (no reload di pagina)
- **Componenti riutilizzabili**: `PaginatedTable`, `CalendarWidget`, `Toast`, `ErrorModal`
- **Tipizzazione completa** con interfacce TypeScript
- Proxy Vite elimina problemi CORS in sviluppo

