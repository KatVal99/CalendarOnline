# 🚨 Sistema di Gestione Errori - Popup Rossi/Rosa

## 📋 Panoramica

Tutti gli errori dell'applicazione vengono mostrati in **popup/modal eleganti** rossi e rosa con:
- ✅ Titolo chiaro e descrittivo
- ✅ Messaggio user-friendly in italiano
- ✅ Codice HTTP della risposta
- ✅ Soluzioni consigliate (💡 Come Risolvere)
- ✅ Dettagli tecnici (se disponibili)
- ✅ Pulsanti di azione (Chiudi, Copia Errore)

---

## 🎨 Stili dei Popup

### **Errore Generico (Avvertimento)**
```
⚠️ Titolo Errore
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTTP 400

Messaggio descrittivo dell'errore

💡 Come Risolvere:
  ✓ Soluzione 1
  ✓ Soluzione 2
  ✓ Soluzione 3

[✓ Chiudi] [📋 Copia Errore]
```

### **Errore Critico (Rosso Scuro)**
```
⚠️ ERRORE CRITICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTTP 500

Messaggio descrittivo dell'errore

💡 Come Risolvere:
  ✓ Soluzione 1
  ✓ Soluzione 2

🔧 Dettagli Tecnici:
  [Error details...]

[✓ Chiudi] [📋 Copia Errore]
```

---

## 📊 Tutti gli Errori Gestiti

### **🔐 AUTENTICAZIONE E AUTORIZZAZIONE**

#### **400 Bad Request - Campi Incompleti**
```
Errore: "username, password e email sono obbligatori"
Titolo: ❌ Campi Incompleti
Messaggio: "Assicurati di compilare tutti i campi: Username, Password e Email."
Soluzioni:
  ✓ Inserisci un username
  ✓ Inserisci una password
  ✓ Inserisci un'email valida
Trigger: Registrazione con campi vuoti
```

#### **400 Bad Request - Password Troppo Corta**
```
Errore: "La password deve avere almeno 8 caratteri"
Titolo: ❌ Password Troppo Corta
Messaggio: "La password deve contenere almeno 8 caratteri."
Soluzioni:
  ✓ Usa lettere maiuscole e minuscole
  ✓ Aggiungi numeri
  ✓ Aggiungi caratteri speciali (!@#$%)
Trigger: Password < 8 caratteri in registrazione
```

#### **400 Bad Request - Email Non Valida**
```
Errore: "Email non valida"
Titolo: ❌ Email Non Valida
Messaggio: "L'email non contiene il simbolo '@'."
Soluzioni:
  ✓ Esempio corretto: mario@example.com
  ✓ Assicurati di includere il dominio
  ✓ Controlla la ortografia
Trigger: Email senza "@" in registrazione
```

#### **400 Bad Request - Email Già Registrata**
```
Errore: "Email gia registrata"
Titolo: ❌ Email Già Registrata
Messaggio: "Questa email è già collegata a un account."
Soluzioni:
  ✓ Usa un'email diversa
  ✓ Se dimentichi la password, usa "Password dimenticata"
  ✓ Contatta il supporto se è un errore
Trigger: Registrazione con email già esistente
```

#### **400 Bad Request - Account Esiste Già**
```
Errore: "Utente gia presente"
Titolo: ❌ Account Esiste Già
Messaggio: "Un account con questi dati esiste già."
Soluzioni:
  ✓ Prova ad accedere con le tue credenziali
  ✓ Usa "Password dimenticata" se non la ricordi
  ✓ Contatta il supporto
Trigger: Duplicate key su username (legacy)
```

#### **401 Unauthorized - Accesso Negato**
```
Errore: (qualsiasi messaggio)
Titolo: ⚠️ Accesso Negato
Messaggio: "Le credenziali fornite non sono valide."
Soluzioni:
  ✓ Controlla email e password
  ✓ Assicurati di usare l'email (non lo username)
  ✓ Usa "Password dimenticata" se non la ricordi
  ✓ Verifica che il Caps Lock sia disattivato
Trigger: Login con credenziali sbagliate
```

#### **403 Forbidden - Non Autorizzato**
```
Errore: "Non autorizzato"
Titolo: 🔒 Non Autorizzato
Messaggio: "Non hai i permessi per eseguire questa azione."
Soluzioni:
  ✓ Accedi con l'account corretto
  ✓ Logout e login di nuovo
  ✓ Contatta l'amministratore
Trigger: Tentativo di accesso con permessi insufficienti
```

#### **403 Forbidden - Non Autorizzato a Eliminare Account**
```
Errore: "Non autorizzato a eliminare questo account"
Titolo: 🔒 Operazione Non Consentita
Messaggio: "Puoi eliminare solo il tuo account."
Soluzioni:
  ✓ Accedi con l'email dell'account da eliminare
  ✓ Puoi eliminare solo il tuo profilo
  ✓ Contatta l'amministratore se hai problemi
Trigger: Eliminazione account di un altro utente
```

---

### **🔍 RICERCA E RISORSA**

#### **404 Not Found - Utente Non Trovato**
```
Errore: "Utente non trovato"
Titolo: 🔍 Utente Non Trovato
Messaggio: "L'account non esiste nel sistema."
Soluzioni:
  ✓ Verifica che l'email sia corretta
  ✓ Crea un nuovo account se non esiste
  ✓ Contatta il supporto
Trigger: Eliminazione/ricerca di utente non esistente
```

---

### **⚠️ ERRORI DI SERVER**

#### **500 Internal Server Error**
```
Errore: (qualsiasi messaggio di errore server)
Titolo: ⚠️ Errore del Server
Messaggio: "Si è verificato un errore interno. Contatta il supporto."
Soluzioni:
  ✓ Riprova tra qualche secondo
  ✓ Aggiorna la pagina (F5)
  ✓ Svuota la cache del browser (CTRL+SHIFT+R)
  ✓ Contatta il supporto: support@budgetclub.com
Trigger: Errore non gestito nel backend
Dettagli Tecnici: Stack trace dell'errore (se disponibile)
```

#### **500 Internal Server Error - Duplicate Key (POST /api/operator/users)**
```
Errore: "ERROR: duplicate key value violates unique constraint..."
Titolo: ⚠️ Errore del Server
Messaggio: "Si è verificato un errore interno. Contatta il supporto."
Dettagli Tecnici: 
  ERROR: duplicate key value violates unique constraint "app_users_pkey"
  Dettaglio: Key (email)=(mario@example.com) already exists.
Trigger: Database constraint violation (email duplicata)
Nota: Questo è un errore di backend, il frontend dovrebbe prevenirlo
```

---

### **📡 ERRORI DI RETE**

#### **Network Error - Connessione Impossibile**
```
Errore: (TypeError, fetch error, ecc.)
Titolo: 📡 Errore di Connessione
Messaggio: "Impossibile connettersi al server. Verifica la tua connessione."
Soluzioni:
  ✓ Verifica la connessione internet
  ✓ Controlla se il router è acceso
  ✓ Riprova tra qualche secondo
  ✓ Se il problema persiste, contatta il supporto
Trigger: Server offline, DNS problem, firewall, ecc.
Dettagli Tecnici: Error message dal browser
```

---

## 🎯 Come Utilizzare il Sistema di Errori

### **Nel Frontend JavaScript**

```javascript
// Mostrare un errore generico
BudgetApp.showErrorModal(400, 'Email non valida');

// Mostrare un errore con dettagli tecnici
BudgetApp.showErrorModal(500, 'Errore interno', null, 'Stack trace...');

// Gestire errori da fetch (network error)
try {
    await fetch(url);
} catch (error) {
    BudgetApp.handleNetworkError(error);
}

// Gestire errori da risposta HTTP
try {
    const response = await fetch(url);
    if (!response.ok) {
        const text = await response.text();
        BudgetApp.showErrorModal(response.status, text);
    }
} catch (error) {
    BudgetApp.handleNetworkError(error);
}
```

### **Nel Backend (Java)**

Il backend lancia `IllegalArgumentException` con messaggi che vengono catturati dal frontend:

```java
// Esempio: Creare utente con dati duplicati
if (appUserRepository.existsById(normalizedEmail)) {
    throw new IllegalArgumentException("Email gia registrata");
    // Frontend mostra: ❌ Email Già Registrata
}

// Il messaggio viene convertito automaticamente in risposta HTTP 400
// ApiExceptionHandler cattura l'eccezione e restituisce il messaggio
```

---

## 🎨 Personalizzazione degli Errori

### **Aggiungere un Nuovo Errore**

```javascript
// In common.js, dentro ERROR_MESSAGES:

400: {
    'Mio nuovo errore': {
        title: 'Titolo Custom',
        message: 'Messaggio custom',
        severity: 'warning',  // o 'critical'
        solutions: [
            '✓ Soluzione 1',
            '✓ Soluzione 2'
        ]
    }
}

// Usare:
BudgetApp.showErrorModal(400, 'Mio nuovo errore');
```

### **Cambiare Colori**

I colori sono definiti in `style.css`:

```css
.error-modal-content {
    background: linear-gradient(135deg, #ff6b9d 0%, #ff8fcb 100%);  /* Rosa */
    border: 3px solid #d13e8b;
}

.error-modal-critical .error-modal-content {
    background: linear-gradient(135deg, #c41e3a 0%, #e63e6d 100%);  /* Rosso scuro */
    border-color: #8b0000;
}
```

---

## ✅ Checklist: Errori Coperti

- [x] Autenticazione (401 Unauthorized)
- [x] Autorizzazione (403 Forbidden)
- [x] Validazione dati (400 Bad Request)
- [x] Risorsa non trovata (404 Not Found)
- [x] Errori server (500 Internal Server Error)
- [x] Errori di rete (Network errors)
- [x] Duplicate key (Email/Username)
- [x] Password troppo corta
- [x] Email non valida
- [x] Campi incompleti
- [x] Eliminazione account non autorizzata
- [x] Connessione server offline

---

## 📱 UI/UX Features

### **Animazioni**
- ⏳ Fade-in del modal (0.3s)
- 🎯 Shake dell'icona di errore (loop)
- ✨ Hover effects sui pulsanti
- 🎬 Transition smooth su chiudi

### **Interazioni**
- 🖱️ Click sui pulsanti
- ⌨️ Tasto ESC per chiudere
- 🖱️ Click fuori dal modal per chiudere
- 📋 Pulsante "Copia Errore" con feedback

### **Responsive**
- 📱 Mobile: width 90%
- 🖥️ Desktop: max-width 520px
- 📐 Centro automatico sulla schermata

---

## 🧪 Testing degli Errori

### **Test Manuale - Email Già Registrata**
```
1. Registra account: mario@example.com
2. Prova a registrare di nuovo: mario@example.com
3. ✅ Popup: ❌ Email Già Registrata
4. ✅ Soluzioni consigliate mostrate
```

### **Test Manuale - Password Troppo Corta**
```
1. Modulo registrazione
2. Inserisci password: 1234567  (7 caratteri)
3. Clicca Registrati
4. ✅ Popup: ❌ Password Troppo Corta
5. ✅ Suggerimento: minimo 8 caratteri
```

### **Test Manuale - Credenziali Sbagliate**
```
1. Login: mario@example.com
2. Password: wrong
3. Clicca Entra
4. ✅ Popup: ⚠️ Accesso Negato
5. ✅ Soluzioni: controlla email/password
```

### **Test Manuale - Errore Server (500)**
```
1. Arresta il backend
2. Prova a login
3. ✅ Popup: 📡 Errore di Connessione
4. ✅ O: ⚠️ Errore del Server (se timeout HTTP)
```

---

## 📞 Contatti e Support

**Se scopri nuovi errori:**
1. Annota il messaggio esatto
2. Nota il codice HTTP
3. Scrivi i passi per riprodurlo
4. Contatta: support@budgetclub.com

---

## 📝 Note Importanti

- **Non fare refresh automatico** dopo un errore (l'utente decide)
- **Modal sempre in primo piano** (z-index: 10000)
- **Chiudere modal precedenti** prima di mostrarne uno nuovo
- **Dettagli tecnici solo se utile** (non sovraccaricare)
- **Messaggi sempre in italiano** (user-friendly)
- **Niente console.error visibile** agli utenti (solo nel browser devtools)

---

**Versione:** 2.0
**Data:** 2026-06-29
**Status:** ✅ PROD READY

