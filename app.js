const STORAGE_KEY = 'family-finance-mvp-v1';

const defaultData = {
  members: ['Máma', 'Táta'],
  categories: ['Nájem', 'Jídlo', 'Dítě', 'Doprava', 'Zábava', 'Plat'],
  budgets: {},
  transactions: [],
  plannedPayments: []
};

let state = loadState();
const monthFilter = document.getElementById('monthFilter');
monthFilter.value = getCurrentMonth();

const elements = {
  incomeTotal: document.getElementById('incomeTotal'),
  expenseTotal: document.getElementById('expenseTotal'),
  balanceTotal: document.getElementById('balanceTotal'),
  plannedTotal: document.getElementById('plannedTotal'),
  categoryBreakdown: document.getElementById('categoryBreakdown'),
  budgetOverview: document.getElementById('budgetOverview'),
  recentTransactions: document.getElementById('recentTransactions'),
  allTransactions: document.getElementById('allTransactions'),
  budgetList: document.getElementById('budgetList'),
  plannedList: document.getElementById('plannedList'),
  memberList: document.getElementById('memberList'),
  categoryList: document.getElementById('categoryList')
};

bindTabs();
bindForms();
refreshSelects();
render();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...defaultData, ...saved } : structuredClone(defaultData);
  } catch {
    return structuredClone(defaultData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getSelectedMonth() {
  return monthFilter.value || getCurrentMonth();
}

function formatCurrency(value) {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(value || 0);
}

function getMonthTransactions() {
  return state.transactions.filter(item => item.date.startsWith(getSelectedMonth()));
}

function getMonthPlannedPayments() {
  return state.plannedPayments.filter(item => item.dueDate.startsWith(getSelectedMonth()));
}

function bindTabs() {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('openQuickAdd').addEventListener('click', () => {
    document.getElementById('quickDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('quickAddDialog').showModal();
  });

  monthFilter.addEventListener('change', render);
  document.getElementById('seedDemoBtn').addEventListener('click', seedDemoData);
  document.getElementById('clearDataBtn').addEventListener('click', () => {
    if (!confirm('Opravdu smazat všechna data?')) return;
    state = structuredClone(defaultData);
    saveState();
    refreshSelects();
    render();
  });
}

function bindForms() {
  document.getElementById('transactionForm').addEventListener('submit', event => {
    event.preventDefault();
    addTransaction({
      type: getValue('transactionType'),
      title: getValue('transactionTitle'),
      amount: Number(getValue('transactionAmount')),
      category: getValue('transactionCategory'),
      member: getValue('transactionMember'),
      date: getValue('transactionDate'),
      note: getValue('transactionNote')
    });
    event.target.reset();
    document.getElementById('transactionDate').value = new Date().toISOString().slice(0, 10);
  });

  document.getElementById('quickAddForm').addEventListener('submit', event => {
    event.preventDefault();
    addTransaction({
      type: getValue('quickType'),
      title: getValue('quickTitle'),
      amount: Number(getValue('quickAmount')),
      category: getValue('quickCategory'),
      member: getValue('quickMember'),
      date: getValue('quickDate'),
      note: ''
    });
    event.target.reset();
    document.getElementById('quickAddDialog').close();
  });

  document.getElementById('budgetForm').addEventListener('submit', event => {
    event.preventDefault();
    const key = `${getSelectedMonth()}__${getValue('budgetCategory')}`;
    state.budgets[key] = Number(getValue('budgetLimit'));
    saveState();
    render();
    event.target.reset();
  });

  document.getElementById('plannedForm').addEventListener('submit', event => {
    event.preventDefault();
    state.plannedPayments.unshift({
      id: crypto.randomUUID(),
      title: getValue('plannedTitle'),
      amount: Number(getValue('plannedAmount')),
      category: getValue('plannedCategory'),
      dueDate: getValue('plannedDueDate'),
      status: getValue('plannedStatus')
    });
    saveState();
    render();
    event.target.reset();
  });

  document.getElementById('memberForm').addEventListener('submit', event => {
    event.preventDefault();
    state.members.push(getValue('memberName'));
    saveState();
    refreshSelects();
    render();
    event.target.reset();
  });

  document.getElementById('categoryForm').addEventListener('submit', event => {
    event.preventDefault();
    state.categories.push(getValue('categoryName'));
    saveState();
    refreshSelects();
    render();
    event.target.reset();
  });

  document.getElementById('transactionDate').value = new Date().toISOString().slice(0, 10);
}

function getValue(id) {
  return document.getElementById(id).value;
}

function addTransaction(transaction) {
  state.transactions.unshift({ id: crypto.randomUUID(), ...transaction });
  saveState();
  render();
}

function refreshSelects() {
  const categorySelectIds = ['transactionCategory', 'budgetCategory', 'plannedCategory', 'quickCategory'];
  const memberSelectIds = ['transactionMember', 'quickMember'];

  categorySelectIds.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = state.categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  });

  memberSelectIds.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = state.members.map(member => `<option value="${escapeHtml(member)}">${escapeHtml(member)}</option>`).join('');
  });
}

function render() {
  saveState();
  const monthTransactions = getMonthTransactions();
  const monthPlanned = getMonthPlannedPayments();

  const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const plannedUpcoming = monthPlanned.filter(item => item.status === 'upcoming').reduce((sum, item) => sum + item.amount, 0);

  elements.incomeTotal.textContent = formatCurrency(income);
  elements.expenseTotal.textContent = formatCurrency(expense);
  elements.balanceTotal.textContent = formatCurrency(income - expense);
  elements.plannedTotal.textContent = formatCurrency(plannedUpcoming);

  renderCategoryBreakdown(monthTransactions);
  renderBudgetOverview(monthTransactions);
  renderRecentTransactions(monthTransactions);
  renderAllTransactions(monthTransactions);
  renderBudgetList(monthTransactions);
  renderPlannedList(monthPlanned);
  renderMemberList();
  renderCategoryList();
}

function renderCategoryBreakdown(monthTransactions) {
  const grouped = {};
  monthTransactions.filter(t => t.type === 'expense').forEach(item => {
    grouped[item.category] = (grouped[item.category] || 0) + item.amount;
  });

  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    elements.categoryBreakdown.innerHTML = '<p class="muted">Zatím žádné výdaje v tomto měsíci.</p>';
    return;
  }

  const max = entries[0][1] || 1;
  elements.categoryBreakdown.innerHTML = entries.map(([name, amount]) => `
    <div class="card compact">
      <div class="section-header">
        <strong>${escapeHtml(name)}</strong>
        <span>${formatCurrency(amount)}</span>
      </div>
      <div class="progress"><span style="width:${Math.max(8, (amount / max) * 100)}%"></span></div>
    </div>
  `).join('');
}

function renderBudgetOverview(monthTransactions) {
  const expensesByCategory = {};
  monthTransactions.filter(t => t.type === 'expense').forEach(item => {
    expensesByCategory[item.category] = (expensesByCategory[item.category] || 0) + item.amount;
  });

  const rows = state.categories
    .map(category => {
      const key = `${getSelectedMonth()}__${category}`;
      const limit = Number(state.budgets[key] || 0);
      if (!limit) return null;
      const spent = expensesByCategory[category] || 0;
      const percent = Math.min(100, (spent / limit) * 100 || 0);
      return `
        <div class="card compact">
          <div class="section-header">
            <strong>${escapeHtml(category)}</strong>
            <span>${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
          </div>
          <div class="progress"><span style="width:${percent}%"></span></div>
          <small>${spent > limit ? 'Rozpočet překročen' : 'V limitu'}</small>
        </div>
      `;
    })
    .filter(Boolean);

  elements.budgetOverview.innerHTML = rows.length ? rows.join('') : '<p class="muted">Zatím nejsou nastavené žádné rozpočty.</p>';
}

function renderRecentTransactions(monthTransactions) {
  const rows = monthTransactions.slice(0, 5).map(transactionTemplate).join('');
  elements.recentTransactions.innerHTML = rows || '<p class="muted">Zatím žádné transakce.</p>';
}

function renderAllTransactions(monthTransactions) {
  const rows = monthTransactions.map(transactionTemplate).join('');
  elements.allTransactions.innerHTML = rows || '<p class="muted">Zatím žádné transakce.</p>';
  attachDeleteHandlers();
}

function transactionTemplate(item) {
  return `
    <div class="card compact transaction-row">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <div class="meta">${escapeHtml(item.category)} • ${escapeHtml(item.member)} • ${formatDate(item.date)}</div>
        ${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}
      </div>
      <div>
        <strong>${item.type === 'expense' ? '-' : '+'}${formatCurrency(item.amount)}</strong>
        <div><button class="danger" data-delete-transaction="${item.id}">Smazat</button></div>
      </div>
    </div>
  `;
}

function renderBudgetList(monthTransactions) {
  const expensesByCategory = {};
  monthTransactions.filter(t => t.type === 'expense').forEach(item => {
    expensesByCategory[item.category] = (expensesByCategory[item.category] || 0) + item.amount;
  });

  const items = Object.entries(state.budgets)
    .filter(([key]) => key.startsWith(getSelectedMonth()))
    .map(([key, limit]) => {
      const category = key.split('__')[1];
      const spent = expensesByCategory[category] || 0;
      return `
        <div class="card compact budget-row">
          <div>
            <strong>${escapeHtml(category)}</strong>
            <div class="meta">Utraceno ${formatCurrency(spent)} z ${formatCurrency(limit)}</div>
          </div>
          <button class="danger" data-delete-budget="${escapeHtml(key)}">Smazat</button>
        </div>
      `;
    });

  elements.budgetList.innerHTML = items.length ? items.join('') : '<p class="muted">Pro tento měsíc není nastaven žádný rozpočet.</p>';
  attachDeleteHandlers();
}

function renderPlannedList(monthPlanned) {
  const items = monthPlanned.map(item => `
    <div class="card compact planned-row">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <div class="meta">${escapeHtml(item.category)} • splatnost ${formatDate(item.dueDate)}</div>
      </div>
      <div>
        <strong>${formatCurrency(item.amount)}</strong>
        <div class="badge ${escapeHtml(item.status)}">${item.status === 'paid' ? 'Zaplaceno' : 'Čeká'}</div>
        <div><button class="danger" data-delete-planned="${item.id}">Smazat</button></div>
      </div>
    </div>
  `).join('');

  elements.plannedList.innerHTML = items || '<p class="muted">Žádné plánované platby v tomto měsíci.</p>';
  attachDeleteHandlers();
}

function renderMemberList() {
  elements.memberList.innerHTML = state.members.map((member, index) => `
    <div class="card compact member-row">
      <strong>${escapeHtml(member)}</strong>
      <button class="danger" data-delete-member="${index}">Smazat</button>
    </div>
  `).join('');
  attachDeleteHandlers();
}

function renderCategoryList() {
  elements.categoryList.innerHTML = state.categories.map((category, index) => `
    <div class="card compact category-row">
      <strong>${escapeHtml(category)}</strong>
      <button class="danger" data-delete-category="${index}">Smazat</button>
    </div>
  `).join('');
  attachDeleteHandlers();
}

function attachDeleteHandlers() {
  document.querySelectorAll('[data-delete-transaction]').forEach(button => {
    button.onclick = () => {
      state.transactions = state.transactions.filter(item => item.id !== button.dataset.deleteTransaction);
      saveState();
      render();
    };
  });

  document.querySelectorAll('[data-delete-budget]').forEach(button => {
    button.onclick = () => {
      delete state.budgets[button.dataset.deleteBudget];
      saveState();
      render();
    };
  });

  document.querySelectorAll('[data-delete-planned]').forEach(button => {
    button.onclick = () => {
      state.plannedPayments = state.plannedPayments.filter(item => item.id !== button.dataset.deletePlanned);
      saveState();
      render();
    };
  });

  document.querySelectorAll('[data-delete-member]').forEach(button => {
    button.onclick = () => {
      if (state.members.length <= 1) return alert('Musí zůstat alespoň jeden člen.');
      state.members.splice(Number(button.dataset.deleteMember), 1);
      saveState();
      refreshSelects();
      render();
    };
  });

  document.querySelectorAll('[data-delete-category]').forEach(button => {
    button.onclick = () => {
      if (state.categories.length <= 1) return alert('Musí zůstat alespoň jedna kategorie.');
      state.categories.splice(Number(button.dataset.deleteCategory), 1);
      saveState();
      refreshSelects();
      render();
    };
  });
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('cs-CZ').format(new Date(dateString));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function seedDemoData() {
  const month = getSelectedMonth();
  state.transactions = [
    { id: crypto.randomUUID(), type: 'income', title: 'Výplata', amount: 42000, category: 'Plat', member: 'Táta', date: `${month}-05`, note: '' },
    { id: crypto.randomUUID(), type: 'income', title: 'Rodičovský příspěvek', amount: 12000, category: 'Plat', member: 'Máma', date: `${month}-07`, note: '' },
    { id: crypto.randomUUID(), type: 'expense', title: 'Nájem', amount: 16000, category: 'Nájem', member: 'Máma', date: `${month}-08`, note: 'Byt' },
    { id: crypto.randomUUID(), type: 'expense', title: 'Lidl', amount: 3250, category: 'Jídlo', member: 'Máma', date: `${month}-10`, note: '' },
    { id: crypto.randomUUID(), type: 'expense', title: 'Pleny', amount: 980, category: 'Dítě', member: 'Máma', date: `${month}-12`, note: '' },
    { id: crypto.randomUUID(), type: 'expense', title: 'Benzín', amount: 1800, category: 'Doprava', member: 'Táta', date: `${month}-14`, note: '' }
  ];
  state.budgets = {
    [`${month}__Jídlo`]: 10000,
    [`${month}__Dítě`]: 4000,
    [`${month}__Doprava`]: 5000,
    [`${month}__Zábava`]: 3000
  };
  state.plannedPayments = [
    { id: crypto.randomUUID(), title: 'Elektřina', amount: 2500, category: 'Nájem', dueDate: `${month}-20`, status: 'upcoming' },
    { id: crypto.randomUUID(), title: 'Internet', amount: 599, category: 'Nájem', dueDate: `${month}-22`, status: 'upcoming' }
  ];
  saveState();
  refreshSelects();
  render();
}
