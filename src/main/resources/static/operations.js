(() => {
    const PAGE_SIZE = 5;
    const pagerState = {
        ledger: 0,
        debt: 0,
        subscription: 0,
        flexia: 0
    };

    function sumDebtInstallments(debts) {
        return (debts || []).reduce((sum, debt) => sum + Number(debt.monthlyInstallment || 0), 0);
    }

    function paginate(items, page) {
        const normalized = Array.isArray(items) ? items : [];
        const totalPages = Math.max(1, Math.ceil(normalized.length / PAGE_SIZE));
        const safePage = Math.max(0, Math.min(page, totalPages - 1));
        const start = safePage * PAGE_SIZE;
        return {
            page: safePage,
            totalPages,
            rows: normalized.slice(start, start + PAGE_SIZE),
            totalItems: normalized.length,
            start: normalized.length === 0 ? 0 : start + 1,
            end: Math.min(start + PAGE_SIZE, normalized.length)
        };
    }

    function updatePager(name, result) {
        pagerState[name] = result.page;
        const info = document.getElementById(`${name}PagerInfo`);
        const prev = document.getElementById(`${name}PrevBtn`);
        const next = document.getElementById(`${name}NextBtn`);
        if (info) {
            info.textContent = result.totalItems === 0
                ? 'Nessun elemento'
                : `Righe ${result.start}-${result.end} di ${result.totalItems} · Pagina ${result.page + 1}/${result.totalPages}`;
        }
        if (prev) {
            prev.disabled = result.page === 0;
        }
        if (next) {
            next.disabled = result.page >= result.totalPages - 1;
        }
    }

    function bindPagerButtons() {
        [
            ['ledger', refreshOperations],
            ['debt', refreshOperations],
            ['subscription', refreshOperations],
            ['flexia', refreshOperations]
        ].forEach(([name, refresh]) => {
            document.getElementById(`${name}PrevBtn`)?.addEventListener('click', async () => {
                pagerState[name] -= 1;
                await refresh();
            });
            document.getElementById(`${name}NextBtn`)?.addEventListener('click', async () => {
                pagerState[name] += 1;
                await refresh();
            });
        });
    }

    function renderMonthCloseStatus(snapshot) {
        const status = document.getElementById('monthCloseStatus');
        if (!status) {
            return;
        }
        if (snapshot.currentMonthClosed) {
            status.className = 'month-close-status ok';
            status.textContent = `✓ Chiusura ${new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })} applicata`;
        } else {
            status.className = 'month-close-status pending';
            status.textContent = '⏳ Chiusura mese in attesa';
        }
    }

    function renderDebtList(debts) {
        const debtList = document.getElementById('debtList');
        const debtsInlineTotal = document.getElementById('debtsInlineTotal');
        const debtsTotal = document.getElementById('debtsTotal');
        if (!debtList) {
            return;
        }
        debtList.innerHTML = '';

        const result = paginate(debts || [], pagerState.debt);
        result.rows.forEach((debt) => {
            const tr = document.createElement('tr');
            const details = `${debt.label} (${debt.startMonth} → ${debt.endMonth}) residuo: ${Number(debt.remaining).toFixed(2)} EUR`;
            tr.innerHTML = `
                <td>${details}</td>
                <td>${Number(debt.monthlyInstallment || 0).toFixed(2)} EUR</td>
                <td></td>
            `;
            const button = document.createElement('button');
            button.className = 'danger-btn';
            button.style.cssText = 'width:auto;padding:4px 8px;font-size:12px';
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
            tr.lastElementChild.appendChild(button);
            debtList.appendChild(tr);
        });
        updatePager('debt', result);

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

        const result = paginate(subscriptions || [], pagerState.subscription);
        result.rows.forEach((subscription) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${subscription.label}</td>
                <td>${Number(subscription.amount).toFixed(2)} EUR</td>
                <td></td>
            `;
            const button = document.createElement('button');
            button.className = 'danger-btn';
            button.style.cssText = 'width:auto;padding:4px 8px;font-size:12px';
            button.textContent = 'Elimina';
            button.addEventListener('click', async () => {
                const confirmed = window.confirm(`Vuoi eliminare l'abbonamento "${subscription.label}"?`);
                if (!confirmed) {
                    return;
                }
                const label = subscription.label;
                await BudgetApp.deleteRequest(`${BudgetApp.api.deleteSubscription}/${encodeURIComponent(label)}`);
                BudgetApp.showToast(`Abbonamento "${label}" eliminato.`);
                await refreshOperations();
            });
            tr.lastElementChild.appendChild(button);
            subscriptionList.appendChild(tr);
        });
        updatePager('subscription', result);

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
        const result = paginate(flexiaEntries, pagerState.flexia);

        if (result.totalItems === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="3">Nessun valore flexia impostato</td>';
            flexiaList.appendChild(tr);
            if (flexiaInfo) {
                flexiaInfo.textContent = 'Nessun valore flexia impostato';
            }
            updatePager('flexia', result);
            return;
        }

        result.rows.forEach(([month, amount]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${month}</td>
                <td>${Number(amount).toFixed(2)} EUR</td>
                <td></td>
            `;
            const button = document.createElement('button');
            button.className = 'danger-btn';
            button.style.cssText = 'width:auto;padding:4px 8px;font-size:12px';
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
            tr.lastElementChild.appendChild(button);
            flexiaList.appendChild(tr);
        });
        updatePager('flexia', result);

        if (flexiaInfo) {
            const latest = flexiaEntries[flexiaEntries.length - 1];
            flexiaInfo.textContent = `Ultima flexia salvata: ${latest[0]} → ${Number(latest[1]).toFixed(2)} EUR`;
        }
    }

    function renderLedger(entries) {
        const tbody = document.getElementById('ledgerBody');
        if (!tbody) {
            return;
        }
        tbody.innerHTML = '';
        const result = paginate(entries || [], pagerState.ledger);
        result.rows.forEach((entry) => {
            const row = document.createElement('tr');
            const isDeletable = entry.source === 'EXPENSE' || entry.source === 'INCOME';
            row.innerHTML = `
                <td>${entry.date}</td>
                <td>${entry.description}</td>
                <td>${Number(entry.delta).toFixed(2)}</td>
                <td>${Number(entry.balanceAfter).toFixed(2)}</td>
                <td>${entry.source}</td>
                <td></td>
            `;
            if (isDeletable && entry.eventId) {
                const button = document.createElement('button');
                button.className = 'danger-btn';
                button.style.cssText = 'width:auto;padding:4px 8px;font-size:12px';
                button.textContent = 'Elimina';
                button.addEventListener('click', async () => {
                    const label = entry.source === 'EXPENSE' ? 'spesa' : 'entrata';
                    const confirmed = window.confirm(`Vuoi eliminare questa ${label}? Il saldo verrà aggiornato.`);
                    if (!confirmed) {
                        return;
                    }
                    const endpoint = entry.source === 'EXPENSE'
                        ? `${BudgetApp.api.deleteExpense}/${encodeURIComponent(entry.eventId)}`
                        : `${BudgetApp.api.deleteIncome}/${encodeURIComponent(entry.eventId)}`;
                    await BudgetApp.deleteRequest(endpoint);
                    BudgetApp.showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} eliminata.`);
                    await refreshOperations();
                });
                row.lastElementChild.appendChild(button);
            }
            tbody.appendChild(row);
        });
        updatePager('ledger', result);
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
        renderMonthCloseStatus(snapshot);
        renderDebtList(snapshot.debts || []);
        renderSubscriptionList(snapshot.subscriptions || [], snapshot.monthlySubscriptionsTotal || 0);
        renderFlexiaList(snapshot);
        renderLedger(snapshot.latestEntries || []);
    }

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
            pagerState.ledger = 0;
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
            pagerState.debt = 0;
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
                flexiaInfo.textContent = `Salvato: ${yearMonth} → ${Number(amount).toFixed(2)} EUR`;
            }
            BudgetApp.showToast(`Flexia salvata per ${yearMonth}.`);
            form.reset();
            pagerState.flexia = 0;
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
            pagerState.subscription = 0;
            await refreshOperations();
        });
    }

    function init() {
        bindForms();
        bindPagerButtons();
        window.addEventListener('budget:login', refreshOperations);
        window.addEventListener('budget:logout', refreshOperations);
        refreshOperations();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
