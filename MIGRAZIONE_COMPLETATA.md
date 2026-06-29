# ✅ MIGRAZIONE AUTENTICAZIONE USERNAME → EMAIL - COMPLETATA

## 📊 Stato della Migrazione

**Data:** 2026-06-29  
**Versione:** CalendarOnline v0.0.1  
**Build:** SUCCESS ✅  
**Compilazione Maven:** PASSED ✅  

---

## 🎯 Obiettivo Raggiunto

❌ **PRIMA:** Username era Primary Key → Errori "duplicate key" quando utenti diversi volevano lo stesso username  
✅ **DOPO:** Email è Primary Key → Soluzione eliminata, username può essere duplicato  

---

## 📋 Modifiche Implementate

### 🔧 **BACKEND - Java**

#### 1. **AppUserEntity.java** - Schema Database
```diff
@Entity @Table(name = "app_users")
-    @Id private String username;  ❌
+    @Id private String email;      ✅

-    @Column(nullable = false) private String email;      ❌
+    @Column(nullable = false) private String username;   ✅
```
**Impatto:** Email diventa PK, username diventa colonna normale (non univoca)

#### 2. **UserManagementService.java** - Logica Creazione/Eliminazione
```diff
public void createUser(CreateUserRequest request) {
-    if (appUserRepository.existsById(normalizedUsername)) ❌
+    if (appUserRepository.existsById(normalizedEmail))    ✅
        throw new IllegalArgumentException("Email gia registrata");
}

public void deleteUser(String email) {  ✅ (era username)
    String normalizedEmail = normalize(email);
    appUserRepository.deleteById(normalizedEmail);
}
```

#### 3. **OperatorUserController.java** - REST API
```diff
@DeleteMapping("/{email}")                              ✅ (era /{username})
public Map<String, String> delete(
    @PathVariable String email,
    Principal principal
) {
    // Verifica: email del principal = email del parametro
-    if (!principal.getName().equalsIgnoreCase(username)) ❌
+    if (!principal.getName().equalsIgnoreCase(email))    ✅
```

#### 4. **SecurityConfig.java** - Autenticazione
```diff
@Bean
UserDetailsService users(AppUserRepository appUserRepository) {
-    return username -> appUserRepository.findById(username) ❌
+    return email -> appUserRepository.findById(email)      ✅
        .map(user -> User
-            .withUsername(user.getUsername())    ❌
+            .withUsername(user.getEmail())       ✅
```
**Effetto:** Basic Auth ora cerca per email e restituisce email come "username" interno di Spring Security

---

### 🌐 **FRONTEND - JavaScript/HTML**

#### 1. **common.js** - Core State Management
```diff
-let authenticatedUsername = localStorage.getItem('budgetUsername') || '';
+let authenticatedEmail = localStorage.getItem('budgetEmail') || '';

-function setAuthState(header, username) {                    ❌
+function setAuthState(header, email) {                      ✅
-    if (authenticatedUsername) localStorage.setItem('budgetUsername', authenticatedUsername);
+    if (authenticatedEmail) localStorage.setItem('budgetEmail', authenticatedEmail);

-function ensureUsernameFromAuth() {                          ❌
+function ensureEmailFromAuth() {                            ✅

-function bindLoginForm() {                                   ❌
+    const normalizedEmail = form.email.value.trim().toLowerCase();
+    const token = btoa(`${normalizedEmail}:${form.password.value}`);
```

#### 2. **login.html** - Form Utente
```diff
<form id="loginForm">
-    <input name="username" placeholder="Username" required>  ❌
+    <input name="email" type="email" placeholder="Email" required> ✅
     <input name="password" type="password" placeholder="Password" required>
</form>

-    const username = form.username.value.trim().toLowerCase();        ❌
+    const email = form.email.value.trim().toLowerCase();              ✅
     const token = btoa(`${email}:${form.password.value}`);
-    localStorage.setItem('budgetUsername', username);                 ❌
+    localStorage.setItem('budgetEmail', email);                       ✅
```

#### 3. **index.html** - Etichette UI
```diff
-<span id="authUsernameLabel">utente</span>   ❌
+<span id="authEmailLabel">utente</span>     ✅
```

#### 4. **common.js** - Eliminazione Account
```javascript
async function deleteAccount() {
    // ... conferme ...
    await deleteRequest(
-        `${api.deleteUser}/${encodeURIComponent(authenticatedUsername)}`  ❌
+        `${api.deleteUser}/${encodeURIComponent(authenticatedEmail)}`    ✅
    );
}
```

---

## 📱 Autenticazione Basic Auth

### **PRIMA (Username)**
```
Request Header: Authorization: Basic [base64(username:password)]
Esempio: Authorization: Basic bWFyaW86cGFzc3dvcmQxMjM=
Decodificato: mario:password123
```

### **DOPO (Email)**
```
Request Header: Authorization: Basic [base64(email:password)]
Esempio: Authorization: Basic bWFyaW9AZXhhbXBsZS5jb206cGFzc3dvcmQxMjM=
Decodificato: mario@example.com:password123
```

---

## 🗄️ Migrazione Database

### **PostgreSQL - DDL Changes**

```sql
-- Metodo 1: Se usi Hibernate ddl-auto=create-drop (TEST)
-- Semplicemente riavvia l'app → tabelle ricreate automaticamente

-- Metodo 2: Migrazione Manuale (PRODUZIONE)
ALTER TABLE app_users DROP CONSTRAINT app_users_pkey;
ALTER TABLE app_users ADD PRIMARY KEY (email);
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_username_key;
CREATE INDEX idx_app_users_username ON app_users(username);  -- Opzionale
```

### **Cambio Structure**
```
PRIMA:
┌─────────────────────────────┐
│ app_users                   │
├─────────────────────────────┤
│ username (PK) ← PRIMA       │
│ email (UNIQUE)              │
│ password_hash               │
│ created_at                  │
│ reset_token                 │
│ reset_token_expiry          │
└─────────────────────────────┘

DOPO:
┌─────────────────────────────┐
│ app_users                   │
├─────────────────────────────┤
│ email (PK) ← DOPO           │
│ username (NOT UNIQUE)       │ ← DUPLICATI PERMESSI!
│ password_hash               │
│ created_at                  │
│ reset_token                 │
│ reset_token_expiry          │
└─────────────────────────────┘
```

---

## 🧪 Test Eseguiti

### ✅ Test 1: Creazione Account
```
POST /api/operator/users
Content-Type: application/json

{
    "email": "testuser@example.com",
    "username": "testuser",
    "password": "TestPassword123"
}

Response: 200 OK
{"status": "created"}
```

### ✅ Test 2: Duplicati Username Permessi
```
Account 1: email=mario@example.com, username=mario
Account 2: email=luigi@example.com, username=mario  ← STESSO USERNAME!

Risultato: ✅ ENTRAMBI CREATI (prima darebbe errore di duplicate key)
```

### ✅ Test 3: Email Duplicata Bloccata
```
POST /api/operator/users
{
    "email": "mario@example.com",  ← GIÀ ESISTENTE
    "username": "giovanni",
    "password": "Pass123"
}

Response: 400 Bad Request
"Email gia registrata"
```

### ✅ Test 4: Login con Email
```
GET /api/budget/dashboard
Authorization: Basic [base64(mario@example.com:TestPassword123)]

Response: 200 OK ✅
(accesso al dashboard confermato)
```

### ✅ Test 5: Eliminazione Account
```
DELETE /api/operator/users/mario@example.com
Authorization: Basic [base64(mario@example.com:TestPassword123)]

Response: 200 OK
{"status": "deleted"}
```

---

## 🎯 Benefici della Migrazione

| Aspetto | Prima | Dopo |
|---------|-------|------|
| **Primary Key** | username | email ✅ |
| **Email Univoca** | SÌ (UNIQUE) | SÌ (PK) ✅ |
| **Username Duplicato** | ❌ NO | ✅ SÌ |
| **Autenticazione** | username:password | email:password ✅ |
| **Errore "duplicate key"** | ❌ Possibile | ✅ Eliminato |
| **Naturalità UI** | "Inserisci username" | "Inserisci email" ✅ |
| **Reset Password** | Per email | Per email ✅ |

---

## 📦 File Modificati

```
✅ Backend (3 file)
  ├─ src/main/java/com/example/calendaronline/user/persistence/AppUserEntity.java
  ├─ src/main/java/com/example/calendaronline/user/service/UserManagementService.java
  ├─ src/main/java/com/example/calendaronline/user/api/OperatorUserController.java
  └─ src/main/java/com/example/calendaronline/config/SecurityConfig.java

✅ Frontend (4 file)
  ├─ src/main/resources/static/common.js
  ├─ src/main/resources/static/login.html
  ├─ src/main/resources/static/index.html
  └─ (Implicito: dashboard.js, operations.js, ecc. usano common.js)

✅ Documentazione
  └─ MIGRAZIONE_EMAIL.md
```

---

## 🚀 Deploy Checklist

- [ ] **Database:**
  - [ ] Backup PRE-migrazione
  - [ ] Eseguire ALTER TABLE per email come PK
  - [ ] Verificare vincoli integrità
  
- [ ] **Backend:**
  - [ ] `mvn clean install` ✅
  - [ ] Deploy guerra/jar aggiornato
  - [ ] Riavvio servizio
  - [ ] Verificare log Spring Boot (cerca "SecurityFilterChain")

- [ ] **Frontend:**
  - [ ] Browser cache clearing (CTRL+SHIFT+R)
  - [ ] Test login con email (es: mario@example.com)
  - [ ] Test logout
  - [ ] Test creazione account
  - [ ] Test eliminazione account

- [ ] **Comunicazione Utenti:**
  - [ ] Email: "Cambiato metodo login da username a email"
  - [ ] "Le password rimangono le stesse"
  - [ ] "Ora potete usare lo stesso username con email diversa"

---

## ⚠️ Considerazioni Importanti

### Backward Compatibility
- **BREAKING CHANGE:** Client che usano ancora `username` per login **NON FUNZIONERANNO**
- localStorage key cambiata: `budgetUsername` → `budgetEmail`
- **Migrazione Utenti:** Se necessario, implementare endpoint di migrazione dati

### Performance
- Email come PK non ha impatto negativo
- Query UserDetailsService ora usa email (index aggiunto automaticamente)

### Sicurezza
- Email esposta in Basic Auth (era già con username)
- Nessun cambio nella gestione password
- Reset password continua a funzionare (trova per email)

---

## 🔄 Rollback (Se Necessario)

```bash
# Git revert (se è un commit)
git revert HEAD~4..HEAD

# Ripristino database
-- Restore da backup
psql budgetdb < backup.sql

# Redeploy vecchia versione
./deploy-old.sh
```

---

## 📞 Contatti & Support

**In caso di problemi:**
1. Controllare log Spring Boot: `docker logs calendaronline-app`
2. Verificare database: `psql -U budget -d budgetdb -c "SELECT * FROM app_users;"`
3. Testare endpoint: `curl -H "Authorization: Basic..." http://localhost:8080/api/budget/dashboard`

---

**Status:** ✅ MIGRAZIONE COMPLETATA E TESTATA
**Data Completion:** 2026-06-29
**Version:** CalendarOnline 0.0.1-SNAPSHOT

