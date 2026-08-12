# CalendarOnline & Budget Tracker (BE + FE + DB)

Implementazione full-stack con:
- persistenza PostgreSQL
- autenticazione utenti (budget separato per utente)
- dashboard avanzata con trend mensile entrate/spese
- interfaccia moderna e reattiva

## Funzionalita

- Entrate (es. stipendio)
- Spese
- Debiti con durata e rate mensili
- Flexia con valore variabile per mese
- Abbonamenti personalizzati
- Chiusura mese (manuale o automatica il giorno 1)
- Creazione nuovi utenti dal pannello "Accesso operatore"
- Invio email report mensile (se SMTP configurato)

La chiusura mese sottrae automaticamente:
- rata debiti attivi
- valore flexia del mese
- abbonamenti mensili

## Stack

- Backend: Spring Boot, REST, Spring Security, Spring Data JPA
- Database: PostgreSQL
- Frontend: React + Vite + Capacitor (Android App)

## Avvio rapido (Windows PowerShell)

```powershell
docker compose up -d postgres
docker compose up -d mailpit
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

Apri poi `http://localhost:8080/login.html`.
Per vedere le email locali (reset password / report) apri `http://localhost:8025`.

## Utenti demo

- `mario / password123`
- `luigi / password123`

Ogni utente vede solo il proprio budget.

## Endpoint principali

- `POST /api/budget/incomes`
- `POST /api/budget/expenses`
- `POST /api/budget/debts`
- `POST /api/budget/flexia`
- `POST /api/budget/subscriptions`
- `POST /api/budget/monthly-close`
- `GET /api/budget/dashboard`
- `POST /api/operator/users`
- `POST /api/auth/reset-password`
- `POST /api/auth/reset-password/confirm`

## Login e reset password

- Login/registrazione utente dalla pagina `login.html`
- Reset password via email (link con token) tramite `Password dimenticata?`
- Pagina conferma reset: `reset-password.html?token=...`

## Email report fine mese

Le email vengono inviate alla chiusura automatica del giorno 1 e per il reset password.
In locale puoi usare Mailpit (già nel `compose.yaml`) con:

```properties
spring.mail.host=localhost
spring.mail.port=1025
spring.mail.username=
spring.mail.password=
spring.mail.properties.mail.smtp.auth=false
spring.mail.properties.mail.smtp.starttls.enable=false
```

Con provider reale, sostituisci i valori SMTP in `src/main/resources/application.properties`:

```properties
spring.mail.host=...
spring.mail.port=...
spring.mail.username=...
spring.mail.password=...
```

## Test

```powershell
.\mvnw.cmd -Dtest=BudgetEngineTest test
```

`BudgetEngineTest` verifica la sottrazione combinata in chiusura mensile (debito + flexia + abbonamento).

