(() => {
    function renderTable(snapshot) {
        const monthlyBody = document.getElementById('monthlyBody');
        if (!monthlyBody) {
            return;
        }
        monthlyBody.innerHTML = '';
        const months = new Set([
            ...Object.keys(snapshot.monthlyIncomes || {}),
            ...Object.keys(snapshot.monthlyExpenses || {})
        ]);
        [...months].sort().forEach((month) => {
            const income = Number((snapshot.monthlyIncomes || {})[month] || 0);
            const expense = Number((snapshot.monthlyExpenses || {})[month] || 0);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${month}</td>
                <td>${income.toFixed(2)}</td>
                <td>${expense.toFixed(2)}</td>
            `;
            monthlyBody.appendChild(row);
        });
    }

    function renderChart(snapshot) {
        const chart = document.getElementById('barChart');
        if (!chart) {
            return;
        }
        chart.innerHTML = '';

        const months = new Set([
            ...Object.keys(snapshot.monthlyIncomes || {}),
            ...Object.keys(snapshot.monthlyExpenses || {})
        ]);
        const orderedMonths = [...months].sort();
        const maxValue = orderedMonths.reduce((max, month) => {
            const income = Number((snapshot.monthlyIncomes || {})[month] || 0);
            const expense = Number((snapshot.monthlyExpenses || {})[month] || 0);
            return Math.max(max, income, expense, 1);
        }, 1);

        orderedMonths.forEach((month) => {
            const income = Number((snapshot.monthlyIncomes || {})[month] || 0);
            const expense = Number((snapshot.monthlyExpenses || {})[month] || 0);
            const group = document.createElement('div');
            group.className = 'bar-group';
            group.innerHTML = `
                <div class="bars">
                    <div class="bar income" style="height:${(income / maxValue) * 180}px" title="Entrate ${income.toFixed(2)} EUR"></div>
                    <div class="bar expense" style="height:${(expense / maxValue) * 180}px" title="Spese ${expense.toFixed(2)} EUR"></div>
                </div>
                <div class="bar-label">${month}</div>
                <div class="bar-value">E ${income.toFixed(0)} / S ${expense.toFixed(0)}</div>
            `;
            chart.appendChild(group);
        });
    }

    function updateSummary(snapshot) {
        const balance = document.getElementById('reportBalance');
        const subscriptions = document.getElementById('reportSubscriptions');
        const debts = document.getElementById('reportDebts');
        const months = document.getElementById('reportMonths');

        if (balance) {
            balance.textContent = `${Number(snapshot.currentBalance || 0).toFixed(2)} EUR`;
        }
        if (subscriptions) {
            subscriptions.textContent = `${Number(snapshot.monthlySubscriptionsTotal || 0).toFixed(2)} EUR`;
        }
        if (debts) {
            const totalDebtInstallments = (snapshot.debts || []).reduce((sum, debt) => sum + Number(debt.monthlyInstallment || 0), 0);
            debts.textContent = `${totalDebtInstallments.toFixed(2)} EUR`;
        }
        if (months) {
            const distinctMonths = new Set([
                ...Object.keys(snapshot.monthlyIncomes || {}),
                ...Object.keys(snapshot.monthlyExpenses || {})
            ]);
            months.textContent = String(distinctMonths.size);
        }
    }

    async function refreshReport() {
        const snapshot = await BudgetApp.fetchDashboard();
        if (!snapshot) {
            return;
        }
        renderChart(snapshot);
        renderTable(snapshot);
        updateSummary(snapshot);
    }

    function init() {
        window.addEventListener('budget:login', refreshReport);
        window.addEventListener('budget:logout', refreshReport);
        refreshReport();
    }

    document.addEventListener('DOMContentLoaded', init);
})();

