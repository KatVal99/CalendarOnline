(() => {
    let calendarCursor = new Date();
    let appointmentsByDate = {};

    function mapEventsByDate(events) {
        const result = {};
        (events || []).forEach((event) => {
            const key = event.date;
            if (!result[key]) {
                result[key] = [];
            }
            result[key].push(event);
        });
        return result;
    }

    async function loadAppointmentsForMonth() {
        const authState = BudgetApp.getAuthState();
        if (!authState.authHeader) {
            appointmentsByDate = {};
            return;
        }

        const year = calendarCursor.getFullYear();
        const month = calendarCursor.getMonth() + 1;
        try {
            const response = await fetch(
                `${BudgetApp.api.calendarEvents}?year=${year}&month=${month}`,
                { headers: BudgetApp.authHeaders(false) }
            );
            if (!response.ok) {
                if (response.status === 401) {
                    BudgetApp.logout();
                    return;
                }
                // Se il backend calendario non e disponibile, non blocchiamo la dashboard.
                appointmentsByDate = {};
                return;
            }

            const events = await response.json();
            appointmentsByDate = mapEventsByDate(events);
        } catch (error) {
            appointmentsByDate = {};
        }
    }

    async function removeAppointment(eventId) {
        await BudgetApp.deleteRequest(`${BudgetApp.api.calendarEvents}/${eventId}`);
        await loadAppointmentsForMonth();
    }

    function renderAppointmentList(year, month) {
        const list = document.getElementById('calendarEventList');
        if (!list) {
            return;
        }
        const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        const rows = Object.entries(appointmentsByDate)
            .filter(([dateKey]) => dateKey.startsWith(monthPrefix))
            .sort(([a], [b]) => a.localeCompare(b));

        list.innerHTML = '';
        if (rows.length === 0) {
            const li = document.createElement('li');
            li.className = 'calendar-event-empty';
            li.textContent = 'Nessun appuntamento stellare nel mese corrente';
            list.appendChild(li);
            return;
        }

        rows.forEach(([dateKey, events]) => {
            const normalizedEvents = Array.isArray(events) ? events : [];
            normalizedEvents.forEach((event) => {
                const li = document.createElement('li');
                li.className = 'calendar-event-list-item';

                const star = document.createElement('span');
                star.className = 'calendar-event-star';
                star.setAttribute('aria-hidden', 'true');

                const content = document.createElement('div');
                content.className = 'calendar-event-content';

                const date = document.createElement('span');
                date.className = 'calendar-event-date';
                date.textContent = dateKey;

                const text = document.createElement('strong');
                text.className = 'calendar-event-title';
                text.textContent = event.title;

                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'calendar-event-remove';
                removeButton.textContent = 'Elimina';
                removeButton.addEventListener('click', async () => {
                    await removeAppointment(event.id);
                    renderCalendar();
                    BudgetApp.showToast(`Appuntamento eliminato: ${event.title}`);
                });

                content.appendChild(date);
                content.appendChild(text);
                content.appendChild(removeButton);
                li.appendChild(star);
                li.appendChild(content);
                list.appendChild(li);
            });
        });
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
        title.textContent = firstDayOfMonth.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
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

            const dailyAppointments = appointmentsByDate[dateKey];
            if (Array.isArray(dailyAppointments) && dailyAppointments.length > 0) {
                const dot = document.createElement('span');
                dot.className = 'calendar-event-dot';
                cell.appendChild(dot);
                cell.title = dailyAppointments.map((item) => item.title).join(', ');
            }

            grid.appendChild(cell);
        }

        renderAppointmentList(year, month);
    }

    function updateTotals(snapshot) {
        const balance = document.getElementById('balance');
        const subscriptionsTotal = document.getElementById('subscriptionsTotal');
        const debtsTotal = document.getElementById('debtsTotal');

        if (balance) {
            balance.textContent = `${Number(snapshot.currentBalance || 0).toFixed(2)} EUR`;
        }
        if (subscriptionsTotal) {
            subscriptionsTotal.textContent = `${Number(snapshot.monthlySubscriptionsTotal || 0).toFixed(2)} EUR`;
        }
        if (debtsTotal) {
            const totalDebtInstallments = (snapshot.debts || [])
                .reduce((sum, debt) => sum + Number(debt.monthlyInstallment || 0), 0);
            debtsTotal.textContent = `${totalDebtInstallments.toFixed(2)} EUR`;
        }
    }

    function renderLedger(entries) {
        const ledger = document.getElementById('ledgerBody');
        if (!ledger) {
            return;
        }
        ledger.innerHTML = '';
        (entries || []).forEach((entry) => {
            const row = document.createElement('tr');
            const isDeletable = entry.source === 'EXPENSE' || entry.source === 'INCOME';
            let deleteCell = '<td></td>';
            if (isDeletable && entry.eventId) {
                const btn = document.createElement('button');
                btn.className = 'danger-btn';
                btn.textContent = 'Elimina';
                btn.style.cssText = 'width:auto;padding:4px 8px;font-size:12px';
                btn.addEventListener('click', async () => {
                    const label = entry.source === 'EXPENSE' ? 'spesa' : 'entrata';
                    const confirmed = window.confirm(`Vuoi eliminare questa ${label}? Il saldo verrà aggiornato.`);
                    if (!confirmed) { return; }
                    const endpoint = entry.source === 'EXPENSE'
                        ? `${BudgetApp.api.deleteExpense}/${encodeURIComponent(entry.eventId)}`
                        : `${BudgetApp.api.deleteIncome}/${encodeURIComponent(entry.eventId)}`;
                    await BudgetApp.deleteRequest(endpoint);
                    BudgetApp.showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} eliminata.`);
                    await refreshDashboard();
                });
                const td = document.createElement('td');
                td.appendChild(btn);
                deleteCell = td.outerHTML;
            }
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.description}</td>
                <td>${Number(entry.delta).toFixed(2)}</td>
                <td>${Number(entry.balanceAfter).toFixed(2)}</td>
                <td>${entry.source}</td>
                ${deleteCell}
            `;
            ledger.appendChild(row);
        });
    }

    async function refreshDashboard() {
        const snapshot = await BudgetApp.fetchDashboard();
        if (!snapshot) {
            return;
        }
        updateTotals(snapshot);
        renderLedger(snapshot.latestEntries || []);
    }

    function bindCalendarForm() {
        const form = document.getElementById('calendarEventForm');
        if (!form) {
            return;
        }
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const dateValue = form.date.value;
            const titleValue = form.title.value.trim();
            if (!dateValue || !titleValue) {
                return;
            }
            await BudgetApp.postJson(BudgetApp.api.calendarEvents, {
                date: dateValue,
                title: titleValue
            });
            form.reset();

            // Naviga automaticamente al mese dell'evento appena aggiunto
            const parts = dateValue.split('-');
            calendarCursor = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);

            await loadAppointmentsForMonth();

            renderCalendar();
            BudgetApp.showToast(`Evento salvato per ${dateValue}.`);
        });

        document.getElementById('calendarPrev')?.addEventListener('click', async () => {
            calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
            await loadAppointmentsForMonth();
            renderCalendar();
        });

        document.getElementById('calendarNext')?.addEventListener('click', async () => {
            calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
            await loadAppointmentsForMonth();
            renderCalendar();
        });
    }

    async function init() {
        bindCalendarForm();
        document.getElementById('refreshBtn')?.addEventListener('click', refreshDashboard);

        document.getElementById('purgeMonthlyCloseBtn')?.addEventListener('click', async () => {
            const confirmed = window.confirm(
                '⚠️ Questo eliminerà tutte le chiusure mese dal tuo saldo.\n' +
                'I movimenti manuali (spese/entrate) restano intatti.\n\n' +
                'Continuare?'
            );
            if (!confirmed) { return; }
            const response = await fetch(BudgetApp.api.closeMonth, {
                method: 'DELETE',
                headers: BudgetApp.authHeaders(false)
            });
            const info = document.getElementById('purgeInfo');
            if (response.ok) {
                const data = await response.json();
                const msg = `✓ Eliminate ${data.count} chiusure mese. Il saldo è stato ricalcolato.`;
                if (info) { info.textContent = msg; }
                BudgetApp.showToast(msg);
                await refreshDashboard();
            } else {
                BudgetApp.showErrorModal(response.status, 'Errore durante l\'eliminazione');
            }
        });

        window.addEventListener('budget:login', refreshDashboard);
        window.addEventListener('budget:login', renderCalendar);
        window.addEventListener('budget:logout', renderCalendar);

        await loadAppointmentsForMonth();
        renderCalendar();
        await refreshDashboard();
    }

    document.addEventListener('DOMContentLoaded', init);
})();

