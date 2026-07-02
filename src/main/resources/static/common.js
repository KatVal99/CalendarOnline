const BudgetApp = (() => {
    const api = {
        createUser: '/api/operator/users',
        deleteUser: '/api/operator/users',
        income: '/api/budget/incomes',
        deleteIncome: '/api/budget/incomes',
        expense: '/api/budget/expenses',
        deleteExpense: '/api/budget/expenses',
        debt: '/api/budget/debts',
        deleteDebt: '/api/budget/debts',
        flexia: '/api/budget/flexia',
        deleteFlexia: '/api/budget/flexia',
        subscription: '/api/budget/subscriptions',
        deleteSubscription: '/api/budget/subscriptions',
        closeMonth: '/api/budget/monthly-close',
        dashboard: '/api/budget/dashboard',
        calendarEvents: '/api/calendar/events'
    };

    let authHeader = localStorage.getItem('budgetAuthHeader') || '';
    let authenticatedEmail = localStorage.getItem('budgetEmail') || '';

    // ========== ERROR HANDLING SYSTEM ==========

    /**
     * Mappa degli errori comuni con messaggi user-friendly e soluzioni
     */
    const ERROR_MESSAGES = {
        // Validazione creazione account
        400: {
            'username, password e email sono obbligatori': {
                title: 'Campi Incompleti',
                message: 'Assicurati di compilare tutti i campi: Username, Password e Email.',
                severity: 'warning',
                solutions: [
                    '✓ Inserisci un username',
                    '✓ Inserisci una password',
                    '✓ Inserisci un\'email valida'
                ]
            },
            'La password deve avere almeno 8 caratteri': {
                title: 'Password Troppo Corta',
                message: 'La password deve contenere almeno 8 caratteri.',
                severity: 'warning',
                solutions: [
                    '✓ Usa lettere maiuscole e minuscole',
                    '✓ Aggiungi numeri',
                    '✓ Aggiungi caratteri speciali (!@#$%)'
                ]
            },
            'Email non valida': {
                title: 'Email Non Valida',
                message: 'L\'email non contiene il simbolo "@".',
                severity: 'warning',
                solutions: [
                    '✓ Esempio corretto: mario@example.com',
                    '✓ Assicurati di includere il dominio',
                    '✓ Controlla la ortografia'
                ]
            },
            'Email gia registrata': {
                title: 'Email Già Registrata',
                message: 'Questa email è già collegata a un account.',
                severity: 'warning',
                solutions: [
                    '✓ Usa un\'email diversa',
                    '✓ Se dimentichi la password, usa "Password dimenticata"',
                    '✓ Contatta il supporto se è un errore'
                ]
            },
            'Utente gia presente': {
                title: 'Account Esiste Già',
                message: 'Un account con questi dati esiste già.',
                severity: 'warning',
                solutions: [
                    '✓ Prova ad accedere con le tue credenziali',
                    '✓ Usa "Password dimenticata" se non la ricordi',
                    '✓ Contatta il supporto'
                ]
            }
        },

        // Errori di autenticazione
        401: {
            'default': {
                title: '⚠️ Accesso Negato',
                message: 'Le credenziali fornite non sono valide.',
                severity: 'critical',
                solutions: [
                    '✓ Controlla email e password',
                    '✓ Assicurati di usare l\'email (non lo username)',
                    '✓ Usa "Password dimenticata" se non la ricordi',
                    '✓ Verifica che il Caps Lock sia disattivato'
                ]
            }
        },

        // Errori di autorizzazione
        403: {
            'Non autorizzato': {
                title: '🔒 Non Autorizzato',
                message: 'Non hai i permessi per eseguire questa azione.',
                severity: 'critical',
                solutions: [
                    '✓ Accedi con l\'account corretto',
                    '✓ Logout e login di nuovo',
                    '✓ Contatta l\'amministratore'
                ]
            },
            'Non autorizzato a eliminare questo account': {
                title: '🔒 Operazione Non Consentita',
                message: 'Puoi eliminare solo il tuo account.',
                severity: 'critical',
                solutions: [
                    '✓ Accedi con l\'email dell\'account da eliminare',
                    '✓ Puoi eliminare solo il tuo profilo',
                    '✓ Contatta l\'amministratore se hai problemi'
                ]
            }
        },

        // Errori di risorsa
        404: {
            'Utente non trovato': {
                title: '🔍 Utente Non Trovato',
                message: 'L\'account non esiste nel sistema.',
                severity: 'warning',
                solutions: [
                    '✓ Verifica che l\'email sia corretta',
                    '✓ Crea un nuovo account se non esiste',
                    '✓ Contatta il supporto'
                ]
            }
        },

        // Errori di server
        500: {
            'default': {
                title: '⚠️ Errore del Server',
                message: 'Si è verificato un errore interno. Contatta il supporto.',
                severity: 'critical',
                solutions: [
                    '✓ Riprova tra qualche secondo',
                    '✓ Aggiorna la pagina (F5)',
                    '✓ Svuota la cache del browser (CTRL+SHIFT+R)',
                    '✓ Contatta il supporto: support@budgetclub.com'
                ]
            }
        },

        // Errori di rete
        'network': {
            'default': {
                title: '📡 Errore di Connessione',
                message: 'Impossibile connettersi al server. Verifica la tua connessione.',
                severity: 'critical',
                solutions: [
                    '✓ Verifica la connessione internet',
                    '✓ Controlla se il router è acceso',
                    '✓ Riprova tra qualche secondo',
                    '✓ Se il problema persiste, contatta il supporto'
                ]
            }
        }
    };

    /**
     * Mostra un modal di errore completo con dettagli e soluzioni
     */
    function showErrorModal(statusCode, errorMessage, rawError = null, details = null) {
        // Rimuovi eventuale modal precedente
        const existing = document.querySelector('.error-modal');
        if (existing) {
            existing.remove();
        }

        // Cerca il messaggio di errore nella mappa
        let errorConfig = ERROR_MESSAGES[statusCode]?.[errorMessage]
            || ERROR_MESSAGES[statusCode]?.['default']
            || {
                title: `Errore ${statusCode}`,
                message: errorMessage || 'Si è verificato un errore sconosciuto.',
                severity: statusCode >= 500 ? 'critical' : 'warning'
            };

        // Crea il modal
        const modal = document.createElement('div');
        modal.className = `error-modal ${errorConfig.severity === 'critical' ? 'error-modal-critical' : ''}`;

        const content = document.createElement('div');
        content.className = 'error-modal-content';

        // Header con icona
        const header = document.createElement('div');
        header.className = 'error-modal-header';
        const icon = document.createElement('span');
        icon.className = 'error-modal-icon';
        icon.textContent = errorConfig.severity === 'critical' ? '⚠️' : '❌';
        header.appendChild(icon);
        const title = document.createElement('span');
        title.textContent = errorConfig.title;
        header.appendChild(title);
        content.appendChild(header);

        // Status code
        const statusDiv = document.createElement('div');
        statusDiv.className = 'error-modal-status';
        statusDiv.textContent = `HTTP ${statusCode}`;
        content.appendChild(statusDiv);

        // Messaggio principale
        const msgDiv = document.createElement('div');
        msgDiv.className = 'error-modal-message';
        msgDiv.textContent = errorConfig.message;
        content.appendChild(msgDiv);

        // Soluzioni suggerite
        if (errorConfig.solutions && errorConfig.solutions.length > 0) {
            const solutionsDiv = document.createElement('div');
            solutionsDiv.className = 'error-modal-details';

            const solutionTitle = document.createElement('div');
            solutionTitle.className = 'error-modal-details-title';
            solutionTitle.textContent = '💡 Come Risolvere:';
            solutionsDiv.appendChild(solutionTitle);

            const solutionContent = document.createElement('div');
            solutionContent.className = 'error-modal-details-content';
            solutionContent.innerHTML = errorConfig.solutions
                .map(s => `${s}<br>`)
                .join('');
            solutionsDiv.appendChild(solutionContent);
            content.appendChild(solutionsDiv);
        }

        // Dettagli tecnici (se disponibili)
        if (details || rawError) {
            const techDiv = document.createElement('div');
            techDiv.className = 'error-modal-details';

            const techTitle = document.createElement('div');
            techTitle.className = 'error-modal-details-title';
            techTitle.textContent = '🔧 Dettagli Tecnici:';
            techDiv.appendChild(techTitle);

            const techContent = document.createElement('div');
            techContent.className = 'error-modal-details-content';
            techContent.textContent = details || (rawError?.message || 'Nessun dettaglio disponibile');
            techDiv.appendChild(techContent);
            content.appendChild(techDiv);
        }

        // Pulsanti azione
        const actions = document.createElement('div');
        actions.className = 'error-modal-actions';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'error-modal-btn error-modal-btn-close';
        closeBtn.textContent = '✓ Chiudi';
        closeBtn.addEventListener('click', () => modal.remove());
        actions.appendChild(closeBtn);

        if (details || rawError) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'error-modal-btn error-modal-btn-copy';
            copyBtn.textContent = '📋 Copia Errore';
            copyBtn.addEventListener('click', () => {
                const errorText = `${errorConfig.title}\nHTTP ${statusCode}\n${errorMessage}\n${details || rawError?.message}`;
                navigator.clipboard.writeText(errorText).then(() => {
                    copyBtn.textContent = '✓ Copiato!';
                    setTimeout(() => {
                        copyBtn.textContent = '📋 Copia Errore';
                    }, 2000);
                });
            });
            actions.appendChild(copyBtn);
        }

        content.appendChild(actions);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Chiudi al click fuori dal modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Chiudi con Escape
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Gestisce errori da risposte HTTP
     */
    function handleHttpError(response) {
        let statusCode = response.status;
        let errorMessage = '';

        return response.text().then(text => {
            errorMessage = text;

            // Prova a parsare come JSON
            try {
                const json = JSON.parse(text);
                errorMessage = json.error || json.message || text;
            } catch (e) {
                // Non è JSON, usa il testo grezzo
            }

            showErrorModal(statusCode, errorMessage);
            throw new Error(`HTTP ${statusCode}: ${errorMessage}`);
        });
    }

    /**
     * Gestisce errori di rete/connessione
     */
    function handleNetworkError(error) {
        console.error('Network error:', error);
        showErrorModal('network', error.message || 'Errore di connessione', error);
    }

    // ========== FINE ERROR HANDLING SYSTEM ==========


    function getAuthState() {
        return { authHeader, authenticatedEmail };
    }

    function setAuthState(header, email) {
        authHeader = header || '';
        authenticatedEmail = email || '';
        if (authHeader) {
            localStorage.setItem('budgetAuthHeader', authHeader);
        } else {
            localStorage.removeItem('budgetAuthHeader');
        }
        if (authenticatedEmail) {
            localStorage.setItem('budgetEmail', authenticatedEmail);
        } else {
            localStorage.removeItem('budgetEmail');
        }
        updateAuthUi();
    }

    function ensureEmailFromAuth() {
        if (authenticatedEmail || !authHeader.startsWith('Basic ')) {
            return;
        }
        try {
            const decoded = atob(authHeader.substring(6));
            const separatorIndex = decoded.indexOf(':');
            if (separatorIndex > 0) {
                authenticatedEmail = decoded.substring(0, separatorIndex);
                localStorage.setItem('budgetEmail', authenticatedEmail);
            }
        } catch (error) {
            authenticatedEmail = '';
        }
    }

    function authHeaders(includeContentType = true) {
        const headers = includeContentType ? { 'Content-Type': 'application/json' } : {};
        if (authHeader) {
            headers.Authorization = authHeader;
        }
        return headers;
    }

    function updateAuthUi() {
        ensureEmailFromAuth();
        const info = document.getElementById('authInfo');
        const userBadge = document.getElementById('authUserBadge');
        const emailLabel = document.getElementById('authEmailLabel');
        const logoutBtn = document.getElementById('logoutBtn');
        const authRequired = document.getElementById('authRequiredMessage');

        if (userBadge) {
            userBadge.hidden = !authHeader;
        }
        if (logoutBtn) {
            logoutBtn.hidden = false;
        }
        if (emailLabel) {
            emailLabel.textContent = authHeader ? (authenticatedEmail || 'sconosciuto') : 'utente';
        }
    }

    function clearDashboardFragments() {
        const ids = ['balance', 'debtList', 'subscriptionList', 'flexiaList', 'ledgerBody', 'monthlyBody', 'calendarEventList'];
        ids.forEach((id) => {
            const element = document.getElementById(id);
            if (!element) {
                return;
            }
            if (element.tagName === 'TBODY' || element.tagName === 'UL') {
                element.innerHTML = '';
            } else if (id === 'balance') {
                element.textContent = '0.00 EUR';
            }
        });
    }

    function logout() {
        setAuthState('', '');
        clearDashboardFragments();
        window.dispatchEvent(new CustomEvent('budget:logout'));
        window.location.href = 'login.html';
    }

    async function deleteAccount() {
        if (!authHeader || !authenticatedEmail) {
            showErrorModal(401, 'Sessione non valida o scaduta');
            return;
        }

        const confirmed = window.confirm('⚠️ ATTENZIONE: Questo eliminerà permanentemente il tuo account e tutti i dati associati.\n\nSei sicuro di voler continuare?');
        if (!confirmed) {
            return;
        }

        try {
            console.log('Eliminazione account per:', authenticatedEmail);
            await deleteRequest(`${api.deleteUser}/${encodeURIComponent(authenticatedEmail)}`);
            showToast('Account eliminato. Logout in corso...', null, null);
            setTimeout(() => {
                logout();
            }, 2000);
        } catch (error) {
            console.error('Errore eliminazione account:', error);
            showErrorModal(500, 'Errore durante eliminazione account', error);
        }
    }

    async function postJson(url, payload, options = {}) {
        const headers = options.publicRequest ? { 'Content-Type': 'application/json' } : authHeaders(true);
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || 'Richiesta non riuscita');
        }
        return response;
    }

    async function deleteRequest(url) {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: authHeaders(false)
        });
        if (!response.ok) {
            const text = await response.text();
            showErrorModal(response.status, text || 'Eliminazione non riuscita');
            throw new Error(`HTTP ${response.status}: ${text || 'Eliminazione non riuscita'}`);
        }
        return response;
    }

    async function fetchDashboard() {
        if (!authHeader) {
            updateAuthUi();
            return null;
        }
        const response = await fetch(api.dashboard, { headers: authHeaders(false) });
        if (!response.ok) {
            if (response.status === 401) {
                logout();
                const info = document.getElementById('authInfo');
                if (info) {
                    info.textContent = 'Credenziali non valide';
                }
                return null;
            }
            throw new Error('Errore dashboard');
        }
        return response.json();
    }

    function parseMoney(inputValue) {
        return Number.parseFloat(inputValue);
    }

    function parseMonthInput(value) {
        return value;
    }

    function showToast(message, actionLabel, actionHandler) {
        const existing = document.getElementById('kawaiiToast');
        if (existing) {
            existing.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'kawaiiToast';
        toast.className = 'kawaii-toast';

        const text = document.createElement('span');
        text.textContent = message;
        toast.appendChild(text);

        if (actionLabel && typeof actionHandler === 'function') {
            const button = document.createElement('button');
            button.className = 'toast-btn';
            button.textContent = actionLabel;
            button.addEventListener('click', () => {
                actionHandler();
                toast.remove();
            });
            toast.appendChild(button);
        }

        document.body.appendChild(toast);
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5500);
    }

    function bindLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) {
            return;
        }
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.target;
            const normalizedEmail = form.email.value.trim().toLowerCase();
            const token = btoa(`${normalizedEmail}:${form.password.value}`);
            setAuthState(`Basic ${token}`, normalizedEmail);
            window.dispatchEvent(new CustomEvent('budget:login'));
        });
    }

    function bindCreateUserForm() {
        const form = document.getElementById('createUserForm');
        if (!form) {
            return;
        }
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const info = document.getElementById('createUserInfo');
            try {
                await postJson(api.createUser, {
                    username: form.username.value,
                    password: form.password.value,
                    email: form.email.value
                }, { publicRequest: true });
                if (info) {
                    info.textContent = 'Utente creato correttamente.';
                }
                form.reset();
            } catch (error) {
                if (info) {
                    info.textContent = 'Creazione utente fallita: ' + error.message;
                }
            }
        });
    }

    function bindLogoutButton() {
        const logoutBtn = document.getElementById('logoutBtn');
        const deleteAccountBtn = document.getElementById('deleteAccountBtn');
        if (!logoutBtn) {
            return;
        }
        logoutBtn.addEventListener('click', logout);
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', deleteAccount);
        }
        // Fallback: in caso di temi/css che sovrappongono layer, forziamo il click sul bottone.
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target && target.id === 'logoutBtn') {
                logout();
            }
        });
    }

    function initCommon() {
        updateAuthUi();
        bindLoginForm();
        bindCreateUserForm();
        bindLogoutButton();
    }

    return {
        api,
        initCommon,
        getAuthState,
        setAuthState,
        updateAuthUi,
        logout,
        deleteAccount,
        authHeaders,
        postJson,
        deleteRequest,
        fetchDashboard,
        parseMoney,
        parseMonthInput,
        showToast,
        showErrorModal,
        handleHttpError,
        handleNetworkError
    };
})();

window.BudgetApp = BudgetApp;
