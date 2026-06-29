(() => {
    const pendingSubscriptionDeletes = new Map();

    function sumDebtInstallments(debts) {
        return (debts || []).reduce((sum, debt) => sum + Number(debt.monthlyInstallment || 0), 0);
    }

    function renderDebtList(debts) {
        const debtList = document.getElementById('debtList');
        const debtsInlineTotal = document.getElementById('debtsInlineTotal');
        const debtsTotal = document.getElementById('debtsTotal');
        if (!debtList) {
            return;
        }
        debtList.innerHTML = '';

        (debts || []).forEach((debt) => {
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
                await BudgetApp.deleteRequest(`${BudgetApp.api.deleteDebt}/${encodeURIComponent(debt.label)}`);
                BudgetApp.showToast(`Debito "${debt.label}" eliminato.`);
                await refreshOperations();
            });
            li.appendChild(text);
            li.appendChild(button);
            debtList.appendChild(li);
        });

        const total = sumDebtInstallments(debts).toFixed(2) + ' EUR';
        if (debtsInlineTotal) {
            debtsInlineTotal.textContent = total;
        }
        if (debtsTotal) {
            debtsTotal.textContent = total;
        }
    }

    function renderSubscriptionList(subscriptions, totalAmount) {
        const subscriptionList = document.getElementById('subscriptionList');
        const inlineTotal = document.getElementById('subscriptionsInlineTotal');
        const topTotal = document.getElementById('subscriptionsTotal');
        if (!subscriptionList) {
            return;
        }
        subscriptionList.innerHTML = '';

        (subscriptions || []).forEach((subscription) => {
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
                    await BudgetApp.deleteRequest(`${BudgetApp.api.deleteSubscription}/${encodeURIComponent(label)}`);
                    BudgetApp.showToast(`Abbonamento "${label}" eliminato.`);
                    await refreshOperations();
                }, 3000);
                pendingSubscriptionDeletes.set(label, timeoutId);
                BudgetApp.showToast(`Abbonamento "${label}" in eliminazione...`, 'Annulla', () => {
                    const pending = pendingSubscriptionDeletes.get(label);
                    if (pending) {
                        clearTimeout(pending);
                        pendingSubscriptionDeletes.delete(label);
                        BudgetApp.showToast(`Operazione annullata per "${label}".`);
                    }
                });
            });
            li.appendChild(text);
            li.appendChild(button);
            subscriptionList.appendChild(li);
        });

        const total = `${Number(totalAmount || 0).toFixed(2)} EUR`;
        if (inlineTotal) {
            inlineTotal.textContent = total;
        }
        if (topTotal) {
            topTotal.textContent = total;
        }
    }

    function renderFlexiaList(snapshot) {
        const flexiaList = document.getElementById('flexiaList');
        const flexiaInfo = document.getElementById('flexiaInfo');
        if (!flexiaList) {
            return;
        }
        flexiaList.innerHTML = '';
        const flexiaEntries = Object.entries(snapshot.flexiaByMonth || {}).sort(([a], [b]) => a.localeCompare(b));
        if (flexiaEntries.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nessun valore flexia impostato';
            flexiaList.appendChild(li);
            if (flexiaInfo) {
                flexiaInfo.textContent = 'Nessun valore flexia impostato';
            }
            return;
        }

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
                await BudgetApp.deleteRequest(`${BudgetApp.api.deleteFlexia}/${encodeURIComponent(month)}`);
                if (flexiaInfo) {
                    flexiaInfo.textContent = `Flexia eliminata per ${month}`;
                }
                BudgetApp.showToast(`Flexia eliminata per ${month}.`);
                await refreshOperations();
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

    async function refreshOperations() {
        const snapshot = await BudgetApp.fetchDashboard();
        if (!snapshot) {
            return;
        }
        const balance = document.getElementById('balance');
        if (balance) {
            balance.textContent = `${Number(snapshot.currentBalance || 0).toFixed(2)} EUR`;
        }
        renderDebtList(snapshot.debts || []);
        renderSubscriptionList(snapshot.subscriptions || [], snapshot.monthlySubscriptionsTotal || 0);
        renderFlexiaList(snapshot);
        renderLedger(snapshot.latestEntries || []);
    }

    function renderLedger(entries) {
        const tbody = document.getElementById('ledgerBody');
        if (!tbody) {
            return;
        }
        tbody.innerHTML = '';
        (entries || []).forEach((entry) => {
            const row = document.createElement('tr');
            const isDeletable = entry.source === 'EXPENSE' || entry.source === 'INCOME';
            const deleteCell = isDeletable
                ? `<td><button class="danger-btn" style="width:auto;padding:4px 8px;font-size:12px" onclick="window.__deleteLedgerEntry('${entry.eventId}','${entry.source}')">Elimina</button></td>`
                : '<td></td>';
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.description}</td>
                <td>${Number(entry.delta).toFixed(2)}</td>
                <td>${Number(entry.balanceAfter).toFixed(2)}</td>
                <td>${entry.source}</td>
                ${deleteCell}
            `;
            tbody.appendChild(row);
        });
    }

    window.__deleteLedgerEntry = async (eventId, source) => {
        if (!eventId) {
            return;
        }
        const label = source === 'EXPENSE' ? 'spesa' : 'entrata';
        const confirmed = window.confirm(`Vuoi eliminare questa ${label}? Il saldo verrà aggiornato.`);
        if (!confirmed) {
            return;
        }
        const endpoint = source === 'EXPENSE'
            ? `${BudgetApp.api.deleteExpense}/${encodeURIComponent(eventId)}`
            : `${BudgetApp.api.deleteIncome}/${encodeURIComponent(eventId)}`;
        await BudgetApp.deleteRequest(endpoint);
        BudgetApp.showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} eliminata.`);
        await refreshOperations();
    };

    function registerMoneyForm(formId, endpoint) {
        const form = document.getElementById(formId);
        if (!form) {
            return;
        }
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            await BudgetApp.postJson(endpoint, {
                description: form.description.value,
                amount: BudgetApp.parseMoney(form.amount.value)
            });
            form.reset();
            await refreshOperations();
        });
    }

    function bindForms() {
        registerMoneyForm('incomeForm', BudgetApp.api.income);
        registerMoneyForm('expenseForm', BudgetApp.api.expense);

        document.getElementById('debtForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.target;
            await BudgetApp.postJson(BudgetApp.api.debt, {
                label: form.label.value,
                totalAmount: BudgetApp.parseMoney(form.totalAmount.value),
                startMonth: BudgetApp.parseMonthInput(form.startMonth.value),
                durationMonths: Number.parseInt(form.durationMonths.value, 10)
            });
            form.reset();
            await refreshOperations();
        });

        document.getElementById('flexiaForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.target;
            const yearMonth = BudgetApp.parseMonthInput(form.yearMonth.value);
            const amount = BudgetApp.parseMoney(form.amount.value);
            await BudgetApp.postJson(BudgetApp.api.flexia, { yearMonth, amount });
            const flexiaInfo = document.getElementById('flexiaInfo');
            if (flexiaInfo) {
                flexiaInfo.textContent = `Salvato: ${yearMonth} -> ${Number(amount).toFixed(2)} EUR`;
            }
            BudgetApp.showToast(`Flexia salvata per ${yearMonth}.`);
            form.reset();
            await refreshOperations();
        });

        document.getElementById('subscriptionForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const form = event.target;
            await BudgetApp.postJson(BudgetApp.api.subscription, {
                label: form.label.value,
                amount: BudgetApp.parseMoney(form.amount.value)
            });
            form.reset();
            await refreshOperations();
        });
    }

    function init() {
        bindForms();
        window.addEventListener('budget:login', refreshOperations);
        window.addEventListener('budget:logout', refreshOperations);
        refreshOperations();
    }

    document.addEventListener('DOMContentLoaded', init);
})();

