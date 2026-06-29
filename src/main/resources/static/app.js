const api = {
    createUser: '/api/operator/users',
    income: '/api/budget/incomes',
    expense: '/api/budget/expenses',
    debt: '/api/budget/debts',
    deleteDebt: '/api/budget/debts',
    flexia: '/api/budget/flexia',
    deleteFlexia: '/api/budget/flexia',
    subscription: '/api/budget/subscriptions',
    deleteSubscription: '/api/budget/subscriptions',
    closeMonth: '/api/budget/monthly-close',
    dashboard: '/api/budget/dashboard'
};

let authHeader = localStorage.getItem('budgetAuthHeader') || '';
let authenticatedUsername = localStorage.getItem('budgetUsername') || '';
const pendingSubscriptionDeletes = new Map();
const movingStars = [];
let calendarCursor = new Date();

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authHeader) {
        headers.Authorization = authHeader;
    }
    return headers;
}

function setAuthInfo() {
    const info = document.getElementById('authInfo');
    const userBadge = document.getElementById('authUserBadge');
    const usernameLabel = document.getElementById('authUsernameLabel');
    const logoutBtn = document.getElementById('logoutBtn');
    if (!info) {
        return;
    }
    if (!authenticatedUsername && authHeader.startsWith('Basic ')) {
        try {
            const decoded = atob(authHeader.substring(6));
            const separatorIndex = decoded.indexOf(':');
            if (separatorIndex > 0) {
                authenticatedUsername = decoded.substring(0, separatorIndex);
                localStorage.setItem('budgetUsername', authenticatedUsername);
            }
        } catch (error) {
            authenticatedUsername = '';
        }
    }

    if (authHeader) {
        if (userBadge) {
            userBadge.hidden = false;
        }
        if (logoutBtn) {
            logoutBtn.hidden = false;
        }
        if (usernameLabel) {
            usernameLabel.textContent = authenticatedUsername || 'sconosciuto';
        }
        info.textContent = `Utente autenticato: ${authenticatedUsername || 'sconosciuto'} (Basic Auth attiva)`;
    } else {
        if (userBadge) {
            userBadge.hidden = true;
        }
        if (logoutBtn) {
            logoutBtn.hidden = true;
        }
        if (usernameLabel) {
            usernameLabel.textContent = 'utente';
        }
        info.textContent = 'Non autenticato';
    }
}

function appointmentStorageKey() {
    return `budgetAppointments:${authenticatedUsername || 'guest'}`;
}

function loadAppointments() {
    try {
        const raw = localStorage.getItem(appointmentStorageKey());
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        return {};
    }
}

function saveAppointments(appointments) {
    localStorage.setItem(appointmentStorageKey(), JSON.stringify(appointments));
}

function renderAppointmentList(year, month) {
    const list = document.getElementById('calendarEventList');
    if (!list) {
        return;
    }
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const appointments = loadAppointments();

    const rows = Object.entries(appointments)
        .filter(([dateKey]) => dateKey.startsWith(monthPrefix))
        .sort(([a], [b]) => a.localeCompare(b));

    list.innerHTML = '';
    if (rows.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Nessun appuntamento nel mese corrente';
        list.appendChild(li);
        return;
    }

    rows.forEach(([dateKey, titles]) => {
        const li = document.createElement('li');
        const normalizedTitles = Array.isArray(titles) ? titles : [];
        li.textContent = `${dateKey}: ${normalizedTitles.join(', ')}`;
        list.appendChild(li);
    });
}

function logout() {
    authHeader = '';
    authenticatedUsername = '';
    localStorage.removeItem('budgetAuthHeader');
    localStorage.removeItem('budgetUsername');
    setAuthInfo();

    const balance = document.getElementById('balance');
    if (balance) {
        balance.textContent = '0.00 EUR';
    }
    const debtList = document.getElementById('debtList');
    if (debtList) {
        debtList.innerHTML = '';
    }
    const subscriptionList = document.getElementById('subscriptionList');
    if (subscriptionList) {
        subscriptionList.innerHTML = '';
    }
    const ledger = document.getElementById('ledgerBody');
    if (ledger) {
        ledger.innerHTML = '';
    }
    const monthlyBody = document.getElementById('monthlyBody');
    if (monthlyBody) {
        monthlyBody.innerHTML = '';
    }
    const flexiaList = document.getElementById('flexiaList');
    if (flexiaList) {
        flexiaList.innerHTML = '';
    }
    renderCalendar();
}

function renderCalendar() {
    const title = document.getElementById('calendarTitle');
    const grid = document.getElementById('calendarGrid');
    if (!title || !grid) {
        return;
    }

    const now = new Date();
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const today = now.getDate();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekStart = (firstDayOfMonth.getDay() + 6) % 7;
    const weekdayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const appointments = loadAppointments();

    title.textContent = now.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    grid.innerHTML = '';

    weekdayNames.forEach((weekday) => {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell header';
        cell.textContent = weekday;
        grid.appendChild(cell);
    });

    for (let i = 0; i < weekStart; i += 1) {
        const empty = document.createElement('div');
        empty.className = 'calendar-cell empty';
        grid.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const cell = document.createElement('div');
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        cell.className = isCurrentMonth && day === today ? 'calendar-cell today' : 'calendar-cell';
        cell.textContent = String(day);

        const dailyAppointments = appointments[dateKey];
        if (Array.isArray(dailyAppointments) && dailyAppointments.length > 0) {
            const dot = document.createElement('span');
            dot.className = 'calendar-event-dot';
            cell.appendChild(dot);
            cell.title = dailyAppointments.join(', ');
        }

        grid.appendChild(cell);
    }

    renderAppointmentList(year, month);
}

function updateClock() {
    const clock = document.getElementById('liveClock');
    if (!clock) {
        return;
    }
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('it-IT');
}

async function postJson(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Richiesta non riuscita');
    }
}

async function deleteRequest(url) {
    const response = await fetch(url, {
        method: 'DELETE',
        headers: authHeaders()
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Eliminazione non riuscita');
    }
}

function initPixelStars() {
    const layer = document.getElementById('pixelStarsLayer');
    if (!layer) {
        return;
    }

    const classes = ['star-yellow', 'star-blue', 'star-pink', 'star-green', 'star-orange'];
    const starCount = 8;

    for (let index = 0; index < starCount; index += 1) {
        const star = document.createElement('div');
        star.className = `pixel-star-sprite ${classes[index % classes.length]}`;
        layer.appendChild(star);

        const direction = Math.random() > 0.5 ? 1 : -1;
        const trail = [];
        const trailLength = 3;
        for (let trailIndex = 0; trailIndex < trailLength; trailIndex += 1) {
            const trailStar = document.createElement('div');
            trailStar.className = `pixel-star-sprite pixel-star-trail ${classes[index % classes.length]}`;
            layer.appendChild(trailStar);
            trail.push({
                element: trailStar,
                distance: 14 + trailIndex * 12,
                phaseOffset: 0.22 + trailIndex * 0.12,
                scale: 0.35 - trailIndex * 0.06
            });
        }

        movingStars.push({
            element: star,
            trail,
            x: Math.random() * Math.max(50, window.innerWidth - 120),
            baseY: Math.random() * Math.max(120, window.innerHeight - 220) + 40,
            speed: 1.1 + Math.random() * 1.8,
            direction,
            phase: Math.random() * Math.PI * 2,
            waveAmplitude: 10 + Math.random() * 20,
            secondaryAmplitude: 4 + Math.random() * 10,
            waveFrequency: 0.05 + Math.random() * 0.04
        });
    }

    const tick = () => {
        const maxX = window.innerWidth - 80;
        const maxY = window.innerHeight - 70;

        movingStars.forEach((starState) => {
            starState.x += starState.speed * starState.direction;
            starState.phase += starState.waveFrequency;

            if (starState.x <= -80) {
                starState.x = maxX + 60;
            } else if (starState.x >= maxX + 60) {
                starState.x = -80;
            }

            const y = clamp(
                starState.baseY
                + Math.sin(starState.phase) * starState.waveAmplitude
                + Math.sin(starState.phase * 2.3) * starState.secondaryAmplitude,
                10,
                maxY
            );

            starState.element.style.transform = `translate(${starState.x}px, ${y}px)`;

            starState.trail.forEach((trailState) => {
                const trailX = starState.x - trailState.distance * starState.direction;
                const trailY = clamp(
                    starState.baseY
                    + Math.sin(starState.phase - trailState.phaseOffset) * starState.waveAmplitude * 0.8
                    + Math.sin((starState.phase - trailState.phaseOffset) * 2.3) * starState.secondaryAmplitude * 0.8,
                    10,
                    maxY
                );
                trailState.element.style.transform = `translate(${trailX}px, ${trailY}px) scale(${trailState.scale})`;
            });

            if (Math.random() < 0.0025) {
                starState.element.classList.add('bounce');
                setTimeout(() => starState.element.classList.remove('bounce'), 450);
            }
        });

        window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
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

function parseMonthInput(value) {
    return value;
}

function parseMoney(inputValue) {
    return Number.parseFloat(inputValue);
}

function registerMoneyForm(formId, endpoint) {
    document.getElementById(formId).addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.target;
        await postJson(endpoint, {
            description: form.description.value,
            amount: parseMoney(form.amount.value)
        });
        form.reset();
        await refreshDashboard();
    });
}

async function refreshDashboard() {
    if (!authHeader) {
        setAuthInfo();
        return;
    }

    const response = await fetch(api.dashboard, { headers: authHeaders() });
    if (!response.ok) {
        if (response.status === 401) {
            logout();
            document.getElementById('authInfo').textContent = 'Credenziali non valide';
            return;
        }
        throw new Error('Errore dashboard');
    }
    const data = await response.json();

    document.getElementById('balance').textContent = Number(data.currentBalance).toFixed(2) + ' EUR';

    const debtList = document.getElementById('debtList');
    debtList.innerHTML = '';
    data.debts.forEach((debt) => {
        const li = document.createElement('li');
        const text = document.createElement('span');
        text.textContent = `${debt.label} (${debt.startMonth} -> ${debt.endMonth}) rata/mese: ${Number(debt.monthlyInstallment || 0).toFixed(2)} EUR, residuo: ${Number(debt.remaining).toFixed(2)} EUR`;
        const button = document.createElement('button');
        button.className = 'danger-btn';
        button.textContent = 'Elimina';
        button.addEventListener('click', async () => {
            const confirmed = window.confirm(`Vuoi eliminare il debito "${debt.label}"?`);
            if (!confirmed) {
                return;
            }
            await deleteRequest(`${api.deleteDebt}/${encodeURIComponent(debt.label)}`);
            showToast(`Debito "${debt.label}" eliminato.`);
            await refreshDashboard();
        });
        li.appendChild(text);
        li.appendChild(button);
        debtList.appendChild(li);
    });

    const subscriptionList = document.getElementById('subscriptionList');
    subscriptionList.innerHTML = '';
    (data.subscriptions || []).forEach((subscription) => {
        const li = document.createElement('li');
        const text = document.createElement('span');
        text.textContent = `${subscription.label}: ${Number(subscription.amount).toFixed(2)} EUR`;
        const button = document.createElement('button');
        button.className = 'danger-btn';
        button.textContent = 'Elimina';
        button.addEventListener('click', async () => {
            const confirmed = window.confirm(`Vuoi eliminare l'abbonamento "${subscription.label}"?`);
            if (!confirmed) {
                return;
            }

            const label = subscription.label;
            if (pendingSubscriptionDeletes.has(label)) {
                return;
            }

            const timeoutId = setTimeout(async () => {
                pendingSubscriptionDeletes.delete(label);
                await deleteRequest(`${api.deleteSubscription}/${encodeURIComponent(label)}`);
                showToast(`Miao! Abbonamento "${label}" eliminato.`);
                await refreshDashboard();
            }, 5000);

            pendingSubscriptionDeletes.set(label, timeoutId);
            showToast(
                `Abbonamento "${label}" in eliminazione...`,
                'Annulla',
                () => {
                    const pending = pendingSubscriptionDeletes.get(label);
                    if (pending) {
                        clearTimeout(pending);
                        pendingSubscriptionDeletes.delete(label);
                        showToast(`Operazione annullata per "${label}".`);
                    }
                }
            );
        });
        li.appendChild(text);
        li.appendChild(button);
        subscriptionList.appendChild(li);
    });

    const flexiaList = document.getElementById('flexiaList');
    flexiaList.innerHTML = '';
    const flexiaData = data.flexiaByMonth || data.flexia || {};
    const flexiaEntries = Object.entries(flexiaData).sort(([a], [b]) => a.localeCompare(b));
    const flexiaInfo = document.getElementById('flexiaInfo');
    if (flexiaEntries.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Nessun valore flexia impostato';
        flexiaList.appendChild(li);
        if (flexiaInfo) {
            flexiaInfo.textContent = 'Nessun valore flexia impostato';
        }
    } else {
        flexiaEntries.forEach(([month, amount]) => {
            const li = document.createElement('li');
            const text = document.createElement('span');
            text.textContent = `${month}: ${Number(amount).toFixed(2)} EUR`;
            const button = document.createElement('button');
            button.className = 'danger-btn';
            button.textContent = 'Elimina';
            button.addEventListener('click', async () => {
                const confirmed = window.confirm(`Vuoi eliminare la flexia del mese ${month}?`);
                if (!confirmed) {
                    return;
                }
                await deleteRequest(`${api.deleteFlexia}/${encodeURIComponent(month)}`);
                if (flexiaInfo) {
                    flexiaInfo.textContent = `Flexia eliminata per ${month}`;
                }
                showToast(`Flexia eliminata per ${month}.`);
                await refreshDashboard();
            });
            li.appendChild(text);
            li.appendChild(button);
            flexiaList.appendChild(li);
        });
        if (flexiaInfo) {
            const latest = flexiaEntries[flexiaEntries.length - 1];
            flexiaInfo.textContent = `Ultima flexia salvata: ${latest[0]} -> ${Number(latest[1]).toFixed(2)} EUR`;
        }
    }

    const ledger = document.getElementById('ledgerBody');
    ledger.innerHTML = '';
    data.latestEntries.forEach((entry) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.description}</td>
            <td>${Number(entry.delta).toFixed(2)}</td>
            <td>${Number(entry.balanceAfter).toFixed(2)}</td>
            <td>${entry.source}</td>
        `;
        ledger.appendChild(row);
    });

    const monthlyBody = document.getElementById('monthlyBody');
    monthlyBody.innerHTML = '';
    const months = new Set([
        ...Object.keys(data.monthlyIncomes || {}),
        ...Object.keys(data.monthlyExpenses || {})
    ]);
    [...months].sort().forEach((month) => {
        const row = document.createElement('tr');
        const income = Number((data.monthlyIncomes || {})[month] || 0);
        const expense = Number((data.monthlyExpenses || {})[month] || 0);
        row.innerHTML = `
            <td>${month}</td>
            <td>${income.toFixed(2)}</td>
            <td>${expense.toFixed(2)}</td>
        `;
        monthlyBody.appendChild(row);
    });

}

registerMoneyForm('incomeForm', api.income);
registerMoneyForm('expenseForm', api.expense);

document.getElementById('debtForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    await postJson(api.debt, {
        label: form.label.value,
        totalAmount: parseMoney(form.totalAmount.value),
        startMonth: parseMonthInput(form.startMonth.value),
        durationMonths: Number.parseInt(form.durationMonths.value, 10)
    });
    form.reset();
    await refreshDashboard();
});

document.getElementById('flexiaForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const flexiaInfo = document.getElementById('flexiaInfo');
    const yearMonth = parseMonthInput(form.yearMonth.value);
    const amount = parseMoney(form.amount.value);
    await postJson(api.flexia, {
        yearMonth,
        amount
    });
    if (flexiaInfo) {
        flexiaInfo.textContent = `Salvato: ${yearMonth} -> ${Number(amount).toFixed(2)} EUR`;
    }
    showToast(`Flexia salvata per ${yearMonth}.`);
    form.reset();
    await refreshDashboard();
});

document.getElementById('subscriptionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    await postJson(api.subscription, {
        label: form.label.value,
        amount: parseMoney(form.amount.value)
    });
    form.reset();
    await refreshDashboard();
});

document.getElementById('closeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    await postJson(api.closeMonth, {
        yearMonth: parseMonthInput(form.yearMonth.value)
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await refreshDashboard();
});

document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);
document.getElementById('logoutBtn').addEventListener('click', logout);

document.getElementById('calendarEventForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const dateValue = form.date.value;
    const titleValue = form.title.value.trim();
    if (!dateValue || !titleValue) {
        return;
    }

    const appointments = loadAppointments();
    const existing = Array.isArray(appointments[dateValue]) ? appointments[dateValue] : [];
    appointments[dateValue] = [...existing, titleValue];
    saveAppointments(appointments);
    form.reset();
    renderCalendar();
});

document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const normalizedUsername = form.username.value.trim().toLowerCase();
    const token = btoa(`${normalizedUsername}:${form.password.value}`);
    authHeader = `Basic ${token}`;
    authenticatedUsername = normalizedUsername;
    localStorage.setItem('budgetAuthHeader', authHeader);
    localStorage.setItem('budgetUsername', authenticatedUsername);
    setAuthInfo();
    renderCalendar();
    await refreshDashboard();
});

document.getElementById('createUserForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const info = document.getElementById('createUserInfo');
    const previousAuth = authHeader;
    try {
        // La creazione utente e pubblica: invio senza Authorization.
        authHeader = '';
        await postJson(api.createUser, {
            username: form.username.value,
            password: form.password.value,
            email: form.email.value
        });
        authHeader = previousAuth;
        info.textContent = 'Utente creato correttamente.';
        form.reset();
    } catch (error) {
        authHeader = previousAuth;
        info.textContent = 'Creazione utente fallita: ' + error.message;
    }
});

setAuthInfo();
renderCalendar();
updateClock();
setInterval(updateClock, 1000);
initPixelStars();
refreshDashboard();

