# 🔄 Migrazione da Username a Email per Autenticazione

## Sommario
È stata effettuata una migrazione completa del sistema di autenticazione da **username** (chiave primaria) a **email** (chiave primaria).

**Benefici:**
- Email è univoca per account
- Username può essere duplicato (più utenti con lo stesso username ma email diversa)
- Autenticazione più naturale (gli utenti usano email per login)

---

## 📝 Modifiche Backend

### 1. **AppUserEntity.java**
```java
// PRIMA: username era @Id
@Id
private String username;

// DOPO: email è @Id
@Id
private String email;
```

**Effetto:** 
- La tabella `app_users` ora usa email come Primary Key
- `username` diventa una colonna nullable e non univoca

### 2. **UserManagementService.java**
```java
// createUser()
// PRIMA: controllava se username esisteva
if (appUserRepository.existsById(normalizedUsername))

// DOPO: controlla se email esiste
if (appUserRepository.existsById(normalizedEmail))
```

```java
// deleteUser()
// PRIMA: parametro era username
public void deleteUser(String username)

// DOPO: parametro è email
public void deleteUser(String email)
```

### 3. **OperatorUserController.java**
```java
// DELETE endpoint
// PRIMA
@DeleteMapping("/{username}")
public Map<String, String> delete(@PathVariable String username, ...)

// DOPO
@DeleteMapping("/{email}")
public Map<String, String> delete(@PathVariable String email, ...)

// Verifica: utente autenticato elimina il suo account (per email)
if (principal == null || !principal.getName().equalsIgnoreCase(email))
```

### 4. **SecurityConfig.java**
```java
// UserDetailsService Bean
// PRIMA: cercava per username
return username -> appUserRepository.findById(username.trim().toLowerCase())
    .map(user -> User.withUsername(user.getUsername())...)

// DOPO: cerca per email (passato come "username" in Basic Auth)
return email -> appUserRepository.findById(email.trim().toLowerCase())
    .map(user -> User.withUsername(user.getEmail())...)
```

---

## 🌐 Modifiche Frontend

### 1. **common.js**
```javascript
// Variabili globali
// PRIMA
let authenticatedUsername = localStorage.getItem('budgetUsername');

// DOPO
let authenticatedEmail = localStorage.getItem('budgetEmail');
```

```javascript
// Funzioni rinominate
// PRIMA: ensureUsernameFromAuth()
// DOPO: ensureEmailFromAuth()

// Estrae email dal Basic Auth header
const decoded = atob(authHeader.substring(6));
authenticatedEmail = decoded.substring(0, separatorIndex);
```

```javascript
// bindLoginForm()
// PRIMA
const normalizedUsername = form.username.value.trim().toLowerCase();

// DOPO
const normalizedEmail = form.email.value.trim().toLowerCase();
const token = btoa(`${normalizedEmail}:${form.password.value}`);
```

```javascript
// deleteAccount()
// DOPO: usa email
await deleteRequest(`${api.deleteUser}/${encodeURIComponent(authenticatedEmail)}`);
```

### 2. **login.html**
```html
<!-- Form di login -->
<!-- PRIMA -->
<input name="username" placeholder="Username" required>

<!-- DOPO -->
<input name="email" type="email" placeholder="Email" required>
```

```javascript
// Event listener del login
// PRIMA
const username = form.username.value.trim().toLowerCase();
const token = btoa(`${username}:${form.password.value}`);
localStorage.setItem('budgetUsername', username);

// DOPO
const email = form.email.value.trim().toLowerCase();
const token = btoa(`${email}:${form.password.value}`);
localStorage.setItem('budgetEmail', email);
```

### 3. **index.html**
```html
<!-- PRIMA -->
<span id="authUsernameLabel">utente</span>

<!-- DOPO -->
<span id="authEmailLabel">utente</span>
```

---

## 🔐 Autenticazione Basic Auth

**Formato prima:**
```
username:password
es: mario:password123
```

**Formato dopo:**
```
email:password
es: mario@example.com:password123
```

---

## 🗄️ Migrazione Database

**SQL da eseguire (PostgreSQL):**
```sql
-- Crea una nuova tabella con email come primary key
CREATE TABLE app_users_new (
    email VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    reset_token VARCHAR(255),
    reset_token_expiry TIMESTAMP
);

-- Copia i dati dalla vecchia tabella
INSERT INTO app_users_new 
SELECT email, username, password_hash, created_at, reset_token, reset_token_expiry 
FROM app_users;

-- Elimina la vecchia tabella
DROP TABLE app_users;

-- Rinomina la nuova tabella
ALTER TABLE app_users_new RENAME TO app_users;
```

**OU** se usi `spring.jpa.hibernate.ddl-auto=update`:
- Spring Boot aggiornerà automaticamente lo schema al riavvio
- **Attenzione:** Eseguire con cautela in produzione!

---

## ✅ Checklist Post-Migrazione

- [ ] Database aggiornato (schema modificato)
- [ ] Tutti gli account hanno email univoca
- [ ] Utenti loggati con nuovo formato email:password
- [ ] Bottone "Elimina Account" funziona con email
- [ ] Test di registrazione nuovo account con email univoca
- [ ] Test di login con email
- [ ] Test di eliminazione account tramite email

---

## 🧪 Testing

### Login
```
Email: katia@example.com
Password: password123

Authorization Header:
Basic a2F0aWFAZXhhbXBsZS5jb206cGFzc3dvcmQxMjM=
```

### Eliminazione Account
```
DELETE /api/operator/users/katia@example.com
Authorization: Basic [encoded email:password]

Response: {"status": "deleted"}
```

---

## 📌 Note Importanti

1. **Backward Incompatibility**: I client che usano ancora `username` per il login **non funzioneranno** fino all'aggiornamento
2. **localStorage**: 
   - Vecchia chiave: `budgetUsername`
   - Nuova chiave: `budgetEmail`
3. **Principal.getName()** in Spring Security ritorna ora l'email (la primary key)
4. **AppUserRepository**: `findByEmail()` è ancora disponibile per query per email

---

## 🚀 Rollback (se necessario)

Per tornare alla versione precedente:
1. Revert dei file modificati da git
2. Ripristino database da backup
3. Riavvio dell'applicazione

```bash
git revert HEAD~N  # N = numero di commit da invertire
```

