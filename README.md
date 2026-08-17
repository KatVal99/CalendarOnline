# CalendarOnline & Budget Tracker

Applicazione full-stack moderna per la gestione delle finanze personali e del calendario appuntamenti, con architettura modulare, persistenza su database relazionale e interfaccia web reattiva (con supporto mobile tramite Capacitor).

---

## 🚀 Funzionalità Principali

### 💰 Gestione Budget & Finanze
- **Entrate e Spese**: Tracciamento con categorizzazione, date personalizzate e storico movimenti.
- **Salvadanai & Obiettivi di Risparmio**: Creazione obiettivi di risparmio con importo target, scadenza, versamenti/prelievi dedicati e storico transazioni.
- **Limiti di Spesa per Categoria**: Impostazione di tetti mensili di spesa per categoria con monitoraggio in tempo reale.
- **Previsioni di Cassa (Cashflow Forecast)**: Calcolo automatico della media mensile entrate/spese e proiezione del saldo a 3, 6 e 12 mesi.
- **Debiti & Rateizzazioni**: Piani di ammortamento con durata e calcolo automatico delle rate mensili residue.
- **Spese Flessibili (Flexia)**: Gestione delle quote variabili per mese.
- **Abbonamenti & Ricorrenze**: Gestione costi fissi mensili.
- **Chiusura Mensile Automatica**: Esecuzione automatica il 1° del mese (o manuale) con contabilizzazione di rate, flexia e abbonamenti.
- **Ritenzione Movimenti**: Pulizia automatica programmata dei movimenti oltre la finestra di conservazione.

### 📅 Calendario & Appuntamenti
- **Calendario Interattivo**: Navigazione mensile con visualizzazione appuntamenti per giorno.
- **Gestione Eventi**: Creazione, modifica ed eliminazione appuntamenti con categoria (lavoro, personale, salute, finanze, studio, svago), orari e note.
- **Prossimo Appuntamento**: Widget in tempo reale con countdown e dettagli del prossimo evento in programma.

### 🎮 Retro Arcade Games
- **Area Svago**: Mini-giochi arcade integrati in stile pixel retro (Pixel Runner, Coin Catcher, Sudoku).

### 🔐 Autenticazione & Sicurezza
- Autenticazione stateless basata su **JWT (JSON Web Token)**.
- Isolamento completo dei dati per singolo utente.
- Registrazione nuovi utenti e pannello operatore.
- Flusso di **Reset Password** sicuro via email con token temporaneo.
- Invio report mensile via email (SMTP / Mailpit).

---

## 🛠️ Stack Tecnologico

### Backend
- **Java 17** con **Spring Boot 4.0**
- **Spring Security** + JWT (io.jsonwebtoken)
- **Spring Data JPA** / Hibernate
- **Database**: PostgreSQL (produzione/docker) & H2 in-memory (test)
- **Flyway** per versionamento e migrazione database
- **Spring Mail** per notifiche e reset password
- **Springdoc OpenAPI / Swagger UI** (`/swagger-ui.html`)

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **React Router 6** (Single Page Application)
- **Recharts** per grafici finanziari e trend
- **Capacitor** per packaging app Android
- **Vanilla CSS** con design system custom retro/cyberpunk

---

## ⚙️ Avvio Rapido

### 1. Prerequisiti
- Docker & Docker Compose (oppure PostgreSQL locale)
- Java JDK 17+
- Node.js 18+ e npm

### 2. Avvio Database e Mail Server Locale
```powershell
docker compose up -d postgres mailpit
```
- **PostgreSQL**: porta `5432`
- **Mailpit Web UI**: [http://localhost:8025](http://localhost:8025) (per ispezionare le email inviate in locale)

### 3. Avvio Backend (Spring Boot)
```powershell
# Esecuzione test unitari
.\mvnw.cmd test

# Avvio applicazione
.\mvnw.cmd spring-boot:run
```
Il backend sarà attivo su `http://localhost:8080`.

### 4. Avvio Frontend (React + Vite)
```powershell
cd frontend
npm install
npm run dev
```
La Web App sarà accessibile su `http://localhost:5173`.  
Le chiamate API `/api/*` vengono instradate automaticamente verso il backend Spring Boot (`http://localhost:8080`).

---

## 👤 Utenti Demo Preconfigurati

| Username | Password | Ruolo |
|---|---|---|
| `mario` | `password123` | Utente Standard |
| `luigi` | `password123` | Utente Standard |

---

## 📡 API Endpoints Principali

### Budget & Finanze
- `GET  /api/budget/dashboard` - Snapshot completo dashboard
- `POST /api/budget/incomes` - Registra entrata
- `POST /api/budget/expenses` - Registra spesa
- `GET  /api/budget/savings-goals` - Lista salvadanai con riconciliazione
- `POST /api/budget/savings-goals` - Crea salvadanaio
- `POST /api/budget/savings-goals/{id}/deposit` - Versamento / prelievo salvadanaio
- `GET  /api/budget/category-limits` - Limiti di spesa per categoria
- `POST /api/budget/category-limits` - Imposta limite categoria
- `GET  /api/budget/categories/summary` - Riepilogo spese mensili per categoria
- `GET  /api/budget/forecast` - Previsione flussi di cassa a 3, 6 e 12 mesi
- `POST /api/budget/debts` - Aggiunge piano debito/rateizzazione
- `POST /api/budget/flexia` - Imposta flexia mensile
- `POST /api/budget/subscriptions` - Aggiunge abbonamento

### Calendario
- `GET    /api/calendar/events` - Lista eventi per mese/anno
- `GET    /api/calendar/events/next` - Prossimo appuntamento
- `POST   /api/calendar/events` - Crea appuntamento
- `PUT    /api/calendar/events/{id}` - Modifica appuntamento
- `DELETE /api/calendar/events/{id}` - Elimina appuntamento

### Autenticazione
- `POST /api/auth/login` - Login utente (restituisce JWT token)
- `POST /api/auth/register` - Registrazione utente
- `POST /api/auth/reset-password` - Richiesta link reset password
- `POST /api/auth/reset-password/confirm` - Conferma nuova password con token
