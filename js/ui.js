/* ==========================================================================
   CONTROLE DE INTERFACE E RENDERIZAÇÃO DOM (ui.js)
   ========================================================================== */

import * as State from './state.js';
import * as Charts from './charts.js';

// Período de visualização ativo (Inicia no mês/ano atual do sistema)
const initialDate = new Date();
let currentMonth = initialDate.getMonth();
let currentYear = initialDate.getFullYear();

// Categoria ativa na visualização de abas
let activeCategoryTab = 'expense';

// ==========================================================================
// AUXILIARES DE FORMATAÇÃO (BRL & Datas)
// ==========================================================================

export function formatCurrency(value) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function getAccountTypeName(type) {
  const types = {
    checking: 'Conta Corrente',
    savings: 'Poupança / Investimento',
    credit: 'Cartão de Crédito',
    cash: 'Dinheiro'
  };
  return types[type] || 'Outra';
}

function getFrequencyName(freq) {
  const freqs = {
    weekly: 'Semanal',
    monthly: 'Mensal',
    yearly: 'Anual'
  };
  return freqs[freq] || 'Recorrente';
}

export function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Retorna as iniciais ou primeiro caractere do nome
function getAvatarLetters(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

// ==========================================================================
// MANIPULAÇÃO DE MODAIS
// ==========================================================================

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Evita rolagem de fundo
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Configura fechamento genérico para todos os modais da página
export function setupModalCloseListeners() {
  document.querySelectorAll('.btn-close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = btn.closest('.modal-overlay');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });

  // Fecha clicando fora da caixa
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

// ==========================================================================
// ROTEAMENTO SINGLE PAGE APP (SPA)
// ==========================================================================

export function initNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-item, .bottom-nav .bottom-nav-item, .link-view-all');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      
      e.preventDefault();
      const targetView = link.getAttribute('data-view') || link.getAttribute('data-nav');
      if (targetView) {
        switchView(targetView);
      }
    });
  });
}

export function switchView(viewId) {
  // Oculta todas as views
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
  });

  // Mostra a view alvo
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Atualiza botões ativos na navegação
  document.querySelectorAll('.sidebar-nav .nav-item, .bottom-nav .bottom-nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Força atualização da view específica ao entrar nela
  updateActiveView(viewId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateActiveView(viewId) {
  const appData = State.loadData();
  
  if (viewId === 'dashboard') {
    renderDashboard(appData);
  } else if (viewId === 'transactions') {
    renderTransactions(appData);
  } else if (viewId === 'budgets') {
    renderBudgets(appData);
    renderGoals(appData);
  } else if (viewId === 'accounts-categories') {
    renderAccountsAndCategories(appData);
  } else if (viewId === 'recurring') {
    renderRecurring(appData);
  }
}

// ==========================================================================
// RENDERIZAÇÃO DAS TELAS E ELEMENTOS
// ==========================================================================

export function renderAll() {
  const data = State.loadData();
  
  // Bloqueio comercial por licença ativa
  if (data.licenseStatus !== 'active') {
    toggleActivationScreen(true);
    return;
  } else {
    toggleActivationScreen(false);
  }

  const currentViewId = document.querySelector('.app-view.active')?.id.replace('view-', '') || 'dashboard';
  updateActiveView(currentViewId);
  updatePeriodLabel();
  populateDropdowns();
  renderUserProfile(data);
}

/**
 * 1. Preenche todos os inputs <select> do sistema com categorias e contas reais
 */
export function populateDropdowns() {
  const data = State.loadData();
  const catSelects = ['tx-category', 'filter-category', 'budget-category', 'recurring-category'];
  const accSelects = ['tx-account', 'filter-account', 'recurring-account'];

  // Limpa e repopula categorias
  catSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Salva o valor atualmente selecionado para não perdê-lo
    const currentVal = select.value;
    select.innerHTML = selectId.includes('filter') ? '<option value="all">Todas</option>' : '';
    
    // Filtra apenas despesas para orçamentos
    const filteredCats = selectId.includes('budget') 
      ? data.categories.filter(c => c.type === 'expense') 
      : data.categories;

    filteredCats.forEach(cat => {
      const typeLabel = cat.type === 'income' ? '(Receita)' : '(Despesa)';
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.innerText = `${cat.name} ${selectId.includes('budget') ? '' : typeLabel}`;
      select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
  });

  // Limpa e repopula contas
  accSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentVal = select.value;
    select.innerHTML = selectId.includes('filter') ? '<option value="all">Todas as Contas</option>' : '';
    
    data.accounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.innerText = `${acc.name} (${formatCurrency(acc.balance)})`;
      select.appendChild(opt);
    });

    if (currentVal) select.value = currentVal;
  });
}

/**
 * 2. Atualiza os dados do Dashboard (Métricas, Gráficos, Transações Recentes, Alertas)
 */
function renderDashboard(data) {
  // Filtra transações do mês e ano selecionados
  const monthlyTxs = data.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // A. Métricas Rápidas
  let totalIncome = 0;
  let totalExpenses = 0;

  monthlyTxs.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.value;
    } else {
      totalExpenses += t.value;
    }
  });

  // Saldo geral somando o saldo real de todas as contas cadastradas
  const totalBalance = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Calcula taxa de poupança / poupado no mês
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Injeta nos cards
  const elBalance = document.getElementById('dash-total-balance');
  const elIncome = document.getElementById('dash-total-income');
  const elExpenses = document.getElementById('dash-total-expenses');
  const elSavings = document.getElementById('dash-savings-rate');
  const elProgress = document.getElementById('dash-savings-progress');

  if (elBalance) elBalance.innerText = formatCurrency(totalBalance);
  if (elIncome) elIncome.innerText = formatCurrency(totalIncome);
  if (elExpenses) elExpenses.innerText = formatCurrency(totalExpenses);
  if (elSavings) elSavings.innerText = `${savingsRate}%`;
  if (elProgress) elProgress.style.width = `${Math.min(100, savingsRate)}%`;

  // B. Transações Recentes (últimos 6 lançamentos gerais)
  const sortedTxs = [...data.transactions]
    .sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'))
    .slice(0, 6);

  const recentListContainer = document.getElementById('dash-recent-transactions');
  if (recentListContainer) {
    recentListContainer.innerHTML = '';
    
    if (sortedTxs.length === 0) {
      recentListContainer.innerHTML = '<div class="empty-state">Nenhuma transação cadastrada.</div>';
    } else {
      sortedTxs.forEach(t => {
        const cat = data.categories.find(c => c.id === t.category);
        const acc = data.accounts.find(a => a.id === t.account);
        
        const catName = cat ? cat.name : 'Sem Categoria';
        const catColor = cat ? cat.color : '#64748b';
        const catIcon = cat ? cat.icon : 'help-circle';
        const accName = acc ? acc.name : 'N/A';

        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.innerHTML = `
          <div class="tx-info">
            <div class="tx-icon-wrapper" style="background-color: ${catColor}15; color: ${catColor};">
              <i data-lucide="${catIcon}"></i>
            </div>
            <div class="tx-details">
              <span class="tx-title">${escapeHTML(t.description)}</span>
              <div class="tx-meta">
                <span>${escapeHTML(catName)}</span>
                <span>${escapeHTML(accName)}</span>
                <span>${formatDate(t.date)}</span>
              </div>
            </div>
          </div>
          <div class="tx-amount ${t.type === 'income' ? 'emerald-color' : 'rose-color'}">
            ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.value)}
          </div>
        `;
        recentListContainer.appendChild(item);
      });
    }
  }

  // C. Painel de Alertas Dinâmicos (Orçamentos Criticos e Contas Recorrentes Próximas)
  renderDashboardAlerts(data, monthlyTxs);

  // D. Atualização de Gráficos
  Charts.updateCharts(data.transactions, data.categories, currentMonth, currentYear);
  
  // Recarrega Lucide
  lucide.createIcons();
}

/**
 * 2.1 Renderiza os alertas e widgets inteligentes no Dashboard
 */
function renderDashboardAlerts(data, monthlyTxs) {
  const alertsContainer = document.getElementById('dash-alerts-container');
  if (!alertsContainer) return;
  
  alertsContainer.innerHTML = '';
  const alertElements = [];

  // Alerta de Contas no Vermelho (Saldo total negativo)
  data.accounts.forEach(acc => {
    if (acc.balance < 0 && acc.type !== 'credit') {
      alertElements.push(`
        <div class="alert-widget danger">
          <i data-lucide="alert-triangle" class="alert-widget-icon"></i>
          <div class="alert-widget-content">
            <div class="alert-widget-title">Conta no vermelho</div>
            <div class="alert-widget-desc">A conta <strong>${escapeHTML(acc.name)}</strong> está com saldo negativo de <strong>${formatCurrency(acc.balance)}</strong>.</div>
          </div>
        </div>
      `);
    }
  });

  // Alerta de Orçamentos Estourados ou Quase Limite (>85%)
  data.budgets.forEach(bud => {
    const cat = data.categories.find(c => c.id === bud.category);
    if (!cat) return;

    // Calcula os gastos da categoria
    const spent = monthlyTxs
      .filter(t => t.type === 'expense' && t.category === bud.category)
      .reduce((sum, t) => sum + t.value, 0);

    const percent = bud.amount > 0 ? (spent / bud.amount) * 100 : 0;

    if (percent >= 100) {
      alertElements.push(`
        <div class="alert-widget danger">
          <i data-lucide="shield-alert" class="alert-widget-icon"></i>
          <div class="alert-widget-content">
            <div class="alert-widget-title">Orçamento Estourado</div>
            <div class="alert-widget-desc">O limite de <strong>${formatCurrency(bud.amount)}</strong> para <strong>${escapeHTML(cat.name)}</strong> foi ultrapassado (Gasto: ${formatCurrency(spent)}).</div>
          </div>
        </div>
      `);
    } else if (percent >= 80) {
      alertElements.push(`
        <div class="alert-widget warning">
          <i data-lucide="alert-circle" class="alert-widget-icon"></i>
          <div class="alert-widget-content">
            <div class="alert-widget-title">Orçamento Limite</div>
            <div class="alert-widget-desc">Gastou <strong>${percent.toFixed(0)}%</strong> do seu orçamento de <strong>${escapeHTML(cat.name)}</strong> (${formatCurrency(spent)} de ${formatCurrency(bud.amount)}).</div>
          </div>
        </div>
      `);
    }
  });

  // Próximas Contas Recorrentes a Vencer nos próximos 7 dias
  const today = new Date();
  const next7Days = new Date();
  next7Days.setDate(today.getDate() + 7);

  data.recurring.forEach(rec => {
    const nextDate = new Date(rec.nextDate + 'T00:00:00');
    if (nextDate >= today && nextDate <= next7Days) {
      const daysLeft = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
      const alertType = rec.type === 'expense' ? 'warning' : 'info';
      const alertTitle = rec.type === 'expense' ? 'Despesa Recorrente Próxima' : 'Receita Recorrente Próxima';

      alertElements.push(`
        <div class="alert-widget ${alertType}">
          <i data-lucide="calendar" class="alert-widget-icon"></i>
          <div class="alert-widget-content">
            <div class="alert-widget-title">${alertTitle}</div>
            <div class="alert-widget-desc"><strong>${escapeHTML(rec.description)}</strong> no valor de <strong>${formatCurrency(rec.value)}</strong> vence em ${daysLeft} dias (${formatDate(rec.nextDate)}).</div>
          </div>
        </div>
      `);
    }
  });

  if (alertElements.length === 0) {
    alertsContainer.innerHTML = `
      <div class="empty-state" style="padding: 24px;">
        <i data-lucide="check-circle" style="color: var(--color-emerald); width: 32px; height: 32px; margin-bottom: 8px;"></i>
        <p>Saúde financeira estável. Nenhum alerta crítico.</p>
      </div>
    `;
  } else {
    alertElements.forEach(html => {
      alertsContainer.innerHTML += html;
    });
  }
}

/**
 * 3. Renderiza a tabela de Transações (com filtros e busca de texto)
 */
function renderTransactions(data) {
  const searchVal = document.getElementById('filter-search')?.value.toLowerCase() || '';
  const typeVal = document.getElementById('filter-type')?.value || 'all';
  const catVal = document.getElementById('filter-category')?.value || 'all';
  const accVal = document.getElementById('filter-account')?.value || 'all';

  const tbody = document.getElementById('transactions-list-tbody');
  const emptyState = document.getElementById('transactions-empty-state');
  if (!tbody) return;

  tbody.innerHTML = '';

  // Filtra de acordo com os inputs e a busca
  const filtered = data.transactions.filter(t => {
    // Busca textual
    const matchesSearch = t.description.toLowerCase().includes(searchVal);
    // Tipo (receita/despesa)
    const matchesType = typeVal === 'all' || t.type === typeVal;
    // Categoria
    const matchesCat = catVal === 'all' || t.category === catVal;
    // Conta
    const matchesAcc = accVal === 'all' || t.account === accVal;
    
    // Mostra transações de qualquer período que correspondam aos filtros de pesquisa
    return matchesSearch && matchesType && matchesCat && matchesAcc;
  });

  // Ordena por data decrescente (mais recentes primeiro)
  filtered.sort((a, b) => new Date(b.date + 'T00:00:00') - new Date(a.date + 'T00:00:00'));

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
  } else {
    emptyState.style.display = 'none';

    filtered.forEach(t => {
      const cat = data.categories.find(c => c.id === t.category);
      const acc = data.accounts.find(a => a.id === t.account);
      
      const catColor = cat ? cat.color : '#64748b';
      const catName = cat ? cat.name : 'Outros';
      const accName = acc ? acc.name : 'N/A';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-label="Data">${formatDate(t.date)}</td>
        <td data-label="Descrição">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>${escapeHTML(t.description)}</span>
            ${t.isRecurring ? '<i data-lucide="repeat" style="width: 13px; height: 13px; color: var(--text-muted);" title="Recorrente"></i>' : ''}
          </div>
        </td>
        <td data-label="Categoria">
          <span class="cell-category" style="background-color: ${catColor}15; color: ${catColor};">
            ${escapeHTML(catName)}
          </span>
        </td>
        <td data-label="Conta">${escapeHTML(accName)}</td>
        <td data-label="Valor" class="${t.type === 'income' ? 'emerald-color' : 'rose-color'} text-highlight" style="text-align: right; font-weight: 700;">
          ${t.type === 'income' ? '+' : '-'} ${formatCurrency(t.value)}
        </td>
        <td data-label="Ações">
          <div class="cell-actions">
            <button class="btn-table-action edit" data-id="${t.id}" title="Editar"><i data-lucide="edit-3"></i></button>
            <button class="btn-table-action delete" data-id="${t.id}" title="Excluir"><i data-lucide="trash"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Vincula cliques de edição e exclusão
    tbody.querySelectorAll('.btn-table-action.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openEditTransactionModal(id);
      });
    });

    tbody.querySelectorAll('.btn-table-action.delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm("Tem certeza que deseja excluir este lançamento?")) {
          State.deleteTransaction(id);
        }
      });
    });
  }

  lucide.createIcons();
}

/**
 * 4. Renderiza a aba de Orçamentos com limites e progresso
 */
function renderBudgets(data) {
  const container = document.getElementById('budgets-container');
  if (!container) return;

  container.innerHTML = '';

  // Filtra despesas do período ativo para calcular o progresso
  const monthlyExpenses = data.transactions.filter(t => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Calcula os consolidados diários, mensais e anuais
  let dailyBudgetSum = 0;
  let monthlyBudgetSum = 0;
  let yearlyBudgetSum = 0;

  data.budgets.forEach(b => {
    if (b.period === 'daily') dailyBudgetSum += b.amount;
    if (b.period === 'monthly') monthlyBudgetSum += b.amount;
    if (b.period === 'yearly') yearlyBudgetSum += b.amount;
  });

  const elDaily = document.getElementById('budget-summary-daily');
  const elMonthly = document.getElementById('budget-summary-monthly');
  const elYearly = document.getElementById('budget-summary-yearly');

  if (elDaily) elDaily.innerText = `${formatCurrency(dailyBudgetSum)} / dia`;
  if (elMonthly) elMonthly.innerText = `${formatCurrency(monthlyBudgetSum)} / mês`;
  if (elYearly) elYearly.innerText = `${formatCurrency(yearlyBudgetSum)} / ano`;

  if (data.budgets.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum orçamento configurado ainda.</div>';
    return;
  }

  data.budgets.forEach(b => {
    const cat = data.categories.find(c => c.id === b.category);
    if (!cat) return;

    // Calcula despesa acumulada na categoria
    const spent = monthlyExpenses
      .filter(t => t.category === b.category)
      .reduce((sum, t) => sum + t.value, 0);

    const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    
    // Cor da barra de progresso baseada na porcentagem
    let progressColor = 'var(--color-emerald)';
    let statusText = 'Dentro do planejado';
    let statusClass = 'emerald-color';

    if (percent >= 100) {
      progressColor = 'var(--color-rose)';
      statusText = 'Orçamento estourado!';
      statusClass = 'rose-color';
    } else if (percent >= 80) {
      progressColor = 'var(--color-amber)';
      statusText = 'Atenção, próximo do limite';
      statusClass = 'amber-color';
    }

    const card = document.createElement('div');
    card.className = 'budget-card';
    card.innerHTML = `
      <div class="budget-card-header">
        <div class="budget-card-title">
          <div class="budget-category-icon" style="background-color: ${cat.color}15; color: ${cat.color};">
            <i data-lucide="${cat.icon}"></i>
          </div>
          <span class="budget-card-name">${escapeHTML(cat.name)}</span>
        </div>
        <span class="budget-period-badge">${getFrequencyName(b.period)}</span>
      </div>

      <div class="budget-values">
        <div>
          <span class="budget-actual">${formatCurrency(spent)}</span>
          <span class="budget-limit"> gasto</span>
        </div>
        <span class="budget-limit">Meta: ${formatCurrency(b.amount)}</span>
      </div>

      <div class="budget-progress-container">
        <div class="progress-bar-large">
          <div class="progress-bar-large-fill" style="width: ${Math.min(100, percent)}%; background-color: ${progressColor};"></div>
        </div>
        <div class="budget-percent-info">
          <span class="budget-status-text ${statusClass}">${statusText}</span>
          <span>${percent.toFixed(0)}%</span>
        </div>
      </div>

      <div class="modal-footer" style="margin-top: 0; padding-top: 12px; border: none;">
        <button class="btn btn-secondary btn-sm edit-budget" data-id="${b.id}"><i data-lucide="edit-2"></i></button>
        <button class="btn btn-danger btn-sm delete-budget" data-id="${b.id}"><i data-lucide="trash"></i></button>
      </div>
    `;
    container.appendChild(card);
  });

  // Eventos de CRUD dos orçamentos
  container.querySelectorAll('.edit-budget').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openEditBudgetModal(id);
    });
  });

  container.querySelectorAll('.delete-budget').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Excluir este planejamento de orçamento?")) {
        State.deleteBudget(id);
      }
    });
  });

  lucide.createIcons();
}

/**
 * 5. Renderiza Contas e Categorias
 */
function renderAccountsAndCategories(data) {
  // A. Renderiza Contas
  const accountsContainer = document.getElementById('accounts-container');
  if (accountsContainer) {
    accountsContainer.innerHTML = '';
    
    if (data.accounts.length === 0) {
      accountsContainer.innerHTML = '<div class="empty-state">Nenhuma conta cadastrada.</div>';
    } else {
      data.accounts.forEach(acc => {
        let accIcon = 'landmark';
        if (acc.type === 'credit') accIcon = 'credit-card';
        if (acc.type === 'cash') accIcon = 'banknote';
        if (acc.type === 'savings') accIcon = 'piggy-bank';

        const item = document.createElement('div');
        item.className = 'account-card';
        item.innerHTML = `
          <div class="account-details">
            <div class="account-icon-wrapper">
              <i data-lucide="${accIcon}"></i>
            </div>
            <div>
              <div class="account-name-text">${escapeHTML(acc.name)}</div>
              <div class="account-type-text">${getAccountTypeName(acc.type)}</div>
            </div>
          </div>
          <div class="account-balance-actions">
            <div class="account-balance-value ${acc.balance < 0 ? 'rose-color' : ''}">${formatCurrency(acc.balance)}</div>
            <div class="cell-actions">
              <button class="btn-table-action edit-account" data-id="${acc.id}"><i data-lucide="edit-3"></i></button>
              <button class="btn-table-action delete-account" data-id="${acc.id}"><i data-lucide="trash"></i></button>
            </div>
          </div>
        `;
        accountsContainer.appendChild(item);
      });
    }
  }

  // B. Renderiza Categorias (baseado na aba ativa: despesa/receita)
  const categoriesContainer = document.getElementById('categories-container');
  if (categoriesContainer) {
    categoriesContainer.innerHTML = '';
    
    const filteredCats = data.categories.filter(c => c.type === activeCategoryTab);
    
    if (filteredCats.length === 0) {
      categoriesContainer.innerHTML = '<div class="empty-state">Nenhuma categoria registrada.</div>';
    } else {
      filteredCats.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
          <div class="category-main">
            <div class="category-icon-indicator" style="background-color: ${cat.color}15; color: ${cat.color};">
              <i data-lucide="${cat.icon}"></i>
            </div>
            <span class="category-name-span">${escapeHTML(cat.name)}</span>
          </div>
          <div class="cell-actions">
            <button class="btn-table-action edit-category" data-id="${cat.id}"><i data-lucide="edit-3"></i></button>
            <button class="btn-table-action delete-category" data-id="${cat.id}"><i data-lucide="trash"></i></button>
          </div>
        `;
        categoriesContainer.appendChild(card);
      });
    }
  }

  // Vincula ouvintes de abas
  document.querySelectorAll('.category-tabs .tab-item').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.category-tabs .tab-item').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategoryTab = tab.getAttribute('data-tab');
      renderAccountsAndCategories(data);
    });
  });

  // Ouvintes de Conta CRUD
  accountsContainer?.querySelectorAll('.edit-account').forEach(btn => {
    btn.addEventListener('click', () => openEditAccountModal(btn.getAttribute('data-id')));
  });

  accountsContainer?.querySelectorAll('.delete-account').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Confirmar a exclusão desta conta? Isso desvinculará seus lançamentos históricos.")) {
        State.deleteAccount(id);
      }
    });
  });

  // Ouvintes de Categoria CRUD
  categoriesContainer?.querySelectorAll('.edit-category').forEach(btn => {
    btn.addEventListener('click', () => openEditCategoryModal(btn.getAttribute('data-id')));
  });

  categoriesContainer?.querySelectorAll('.delete-category').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Confirmar exclusão desta categoria? Lançamentos e orçamentos vinculados perderão a classificação.")) {
        State.deleteCategory(id);
      }
    });
  });

  lucide.createIcons();
}

/**
 * 6. Renderiza agenda de contas recorrentes
 */
function renderRecurring(data) {
  const container = document.getElementById('recurring-container');
  if (!container) return;

  container.innerHTML = '';

  if (data.recurring.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum agendamento recorrente cadastrado.</div>';
    return;
  }

  data.recurring.forEach(rec => {
    const cat = data.categories.find(c => c.id === rec.category);
    const acc = data.accounts.find(a => a.id === rec.account);

    const catName = cat ? cat.name : 'Outros';
    const accName = acc ? acc.name : 'N/A';

    const card = document.createElement('div');
    card.className = `recurring-card ${rec.type}`;
    card.innerHTML = `
      <div class="recurring-header">
        <div class="recurring-info-group">
          <span class="recurring-name">${escapeHTML(rec.description)}</span>
          <span class="recurring-category-badge">${escapeHTML(catName)}</span>
        </div>
        <div class="recurring-amount ${rec.type === 'income' ? 'emerald-color' : 'rose-color'}">
          ${rec.type === 'income' ? '+' : '-'} ${formatCurrency(rec.value)}
        </div>
      </div>

      <div>
        <span class="recurring-frequency-badge">${getFrequencyName(rec.frequency)}</span>
      </div>

      <div class="recurring-meta-row">
        <div class="recurring-meta-item">
          <span class="recurring-meta-label">Próximo Lançamento</span>
          <span class="recurring-meta-val">${formatDate(rec.nextDate)}</span>
        </div>
        <div class="recurring-meta-item">
          <span class="recurring-meta-label">Debitar Em</span>
          <span class="recurring-meta-val">${escapeHTML(accName)}</span>
        </div>
      </div>

      <div class="recurring-footer-actions">
        <span class="recurring-auto-badge">
          <i data-lucide="${rec.autoProcess ? 'check-circle' : 'circle'}"></i>
          ${rec.autoProcess ? 'Auto-processar ligado' : 'Lançamento manual'}
        </span>
        <div class="cell-actions">
          <button class="btn btn-secondary btn-sm edit-recurring" data-id="${rec.id}"><i data-lucide="edit-2"></i></button>
          <button class="btn btn-danger btn-sm delete-recurring" data-id="${rec.id}"><i data-lucide="trash"></i></button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Listeners
  container.querySelectorAll('.edit-recurring').forEach(btn => {
    btn.addEventListener('click', () => openEditRecurringModal(btn.getAttribute('data-id')));
  });

  container.querySelectorAll('.delete-recurring').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Tem certeza que deseja cancelar esta recorrência?")) {
        State.deleteRecurring(id);
      }
    });
  });

  lucide.createIcons();
}

// ==========================================================================
// SELEÇÃO DE PERÍODO & CABEÇALHO
// ==========================================================================

function updatePeriodLabel() {
  const label = document.getElementById('current-period-label');
  if (!label) return;

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  label.innerText = `${months[currentMonth]} ${currentYear}`;
}

export function configurePeriodNavigation() {
  document.getElementById('btn-prev-month')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updatePeriodLabel();
    renderAll();
  });

  document.getElementById('btn-next-month')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    updatePeriodLabel();
    renderAll();
  });
}

// ==========================================================================
// ABERTURA DE MODAIS DE EDIÇÃO E CARREGAMENTO DE DADOS NOS FORMULÁRIOS
// ==========================================================================

// --- Transações ---
function openEditTransactionModal(id) {
  const data = State.loadData();
  const tx = data.transactions.find(t => t.id === id);
  if (!tx) return;

  document.getElementById('modal-transaction-title').innerText = 'Editar Lançamento';
  document.getElementById('tx-id').value = tx.id;
  document.getElementById('tx-description').value = tx.description;
  document.getElementById('tx-value').value = tx.value;
  document.getElementById('tx-date').value = tx.date;
  document.getElementById('tx-category').value = tx.category || '';
  document.getElementById('tx-account').value = tx.account || '';
  document.getElementById('tx-is-recurring').checked = !!tx.isRecurring;

  // Atualiza radio segmentado
  const radio = document.querySelector(`input[name="tx-type"][value="${tx.type}"]`);
  if (radio) radio.checked = true;

  openModal('modal-transaction');
}

export function openNewTransactionModal() {
  document.getElementById('modal-transaction-title').innerText = 'Novo Lançamento';
  document.getElementById('form-transaction').reset();
  document.getElementById('tx-id').value = '';
  // Inicializa com a data de hoje formatada
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  openModal('modal-transaction');
}

// --- Contas ---
function openEditAccountModal(id) {
  const data = State.loadData();
  const acc = data.accounts.find(a => a.id === id);
  if (!acc) return;

  document.getElementById('modal-account-title').innerText = 'Editar Conta';
  document.getElementById('account-id').value = acc.id;
  document.getElementById('account-name').value = acc.name;
  document.getElementById('account-type').value = acc.type;
  document.getElementById('account-balance').value = acc.type === 'credit' ? Math.abs(acc.balance) : acc.balance;

  openModal('modal-account');
}

export function openNewAccountModal() {
  document.getElementById('modal-account-title').innerText = 'Nova Conta Financeira';
  document.getElementById('form-account').reset();
  document.getElementById('account-id').value = '';
  openModal('modal-account');
}

// --- Categorias ---
function openEditCategoryModal(id) {
  const data = State.loadData();
  const cat = data.categories.find(c => c.id === id);
  if (!cat) return;

  document.getElementById('modal-category-title').innerText = 'Editar Categoria';
  document.getElementById('category-id').value = cat.id;
  document.getElementById('category-name').value = cat.name;
  document.getElementById('category-type').value = cat.type;
  document.getElementById('category-color').value = cat.color;
  document.getElementById('category-icon').value = cat.icon;

  openModal('modal-category');
}

export function openNewCategoryModal() {
  document.getElementById('modal-category-title').innerText = 'Nova Categoria';
  document.getElementById('form-category').reset();
  document.getElementById('category-id').value = '';
  openModal('modal-category');
}

// --- Orçamentos ---
function openEditBudgetModal(id) {
  const data = State.loadData();
  const bud = data.budgets.find(b => b.id === id);
  if (!bud) return;

  document.getElementById('modal-budget-title').innerText = 'Editar Orçamento';
  document.getElementById('budget-id').value = bud.id;
  document.getElementById('budget-category').value = bud.category || '';
  document.getElementById('budget-period').value = bud.period;
  document.getElementById('budget-amount').value = bud.amount;

  openModal('modal-budget');
}

export function openNewBudgetModal() {
  document.getElementById('modal-budget-title').innerText = 'Configurar Limite de Orçamento';
  document.getElementById('form-budget').reset();
  document.getElementById('budget-id').value = '';
  openModal('modal-budget');
}

// --- Lançamentos Recorrentes ---
function openEditRecurringModal(id) {
  const data = State.loadData();
  const rec = data.recurring.find(r => r.id === id);
  if (!rec) return;

  document.getElementById('modal-recurring-title').innerText = 'Editar Lançamento Recorrente';
  document.getElementById('recurring-id').value = rec.id;
  document.getElementById('recurring-description').value = rec.description;
  document.getElementById('recurring-value').value = rec.value;
  document.getElementById('recurring-type').value = rec.type;
  document.getElementById('recurring-frequency').value = rec.frequency;
  document.getElementById('recurring-category').value = rec.category || '';
  document.getElementById('recurring-account').value = rec.account || '';
  document.getElementById('recurring-start-date').value = rec.startDate;
  document.getElementById('recurring-auto-process').checked = !!rec.autoProcess;

  openModal('modal-recurring');
}

export function openNewRecurringModal() {
  document.getElementById('modal-recurring-title').innerText = 'Cadastrar Lançamento Recorrente';
  document.getElementById('form-recurring').reset();
  document.getElementById('recurring-id').value = '';
  document.getElementById('recurring-start-date').value = new Date().toISOString().split('T')[0];
  openModal('modal-recurring');
}

// ==========================================================================
// SEÇÃO DE SINCRONIZAÇÃO EM NUVEM (GOOGLE SHEETS)
// ==========================================================================

export function openCloudSyncModal() {
  const data = State.loadData();
  const inputUrl = document.getElementById('sync-url-input');
  if (inputUrl) {
    inputUrl.value = data.syncUrl || '';
  }
  
  // Atualiza as labels iniciais de sync
  updateCloudSyncStatusTexts(data.syncUrl ? (data.lastSynced ? 'connected' : 'syncing') : 'disconnected');
  
  openModal('modal-cloud-sync');
}

function updateCloudSyncStatusTexts(status, details = '') {
  const badge = document.getElementById('cloud-sync-status-text');
  const lastSyncText = document.getElementById('cloud-last-sync-val');
  const btnDisconnect = document.getElementById('btn-cloud-disconnect');
  const btnSyncNow = document.getElementById('btn-cloud-sync-now');
  const btnSaveConnect = document.getElementById('btn-cloud-save-connect');
  const data = State.loadData();

  if (badge) {
    let label = 'Desconectado';
    if (status === 'connected') label = 'Conectado';
    if (status === 'syncing') label = details || 'Sincronizando...';
    if (status === 'error') label = details || 'Erro de Conexão';

    badge.innerText = label;
    badge.className = `status-badge ${status}`;
  }

  if (lastSyncText) {
    lastSyncText.innerText = data.lastSynced 
      ? new Date(data.lastSynced).toLocaleString('pt-BR') 
      : 'Nunca sincronizado';
  }

  // Se tem URL, mostra opções de Sync Manual e Desconexão
  if (data.syncUrl) {
    if (btnDisconnect) btnDisconnect.style.display = 'inline-flex';
    if (btnSyncNow) btnSyncNow.style.display = 'inline-flex';
    if (btnSaveConnect) btnSaveConnect.innerHTML = '<i data-lucide="link"></i> Atualizar URL';
  } else {
    if (btnDisconnect) btnDisconnect.style.display = 'none';
    if (btnSyncNow) btnSyncNow.style.display = 'none';
    if (btnSaveConnect) btnSaveConnect.innerHTML = '<i data-lucide="link"></i> Conectar Planilha';
  }
  
  lucide.createIcons();
}

export function initCloudSyncUI() {
  // 1. Ouvinte para abrir o modal de sincronização pelo ícone do topo
  document.getElementById('btn-cloud-sync-status')?.addEventListener('click', (e) => {
    e.preventDefault();
    openCloudSyncModal();
  });

  // 2. Ouvinte de Copiar Script Template
  document.getElementById('btn-copy-script')?.addEventListener('click', () => {
    const codeArea = document.getElementById('apps-script-code-template');
    if (codeArea) {
      codeArea.select();
      navigator.clipboard.writeText(codeArea.value).then(() => {
        const btn = document.getElementById('btn-copy-script');
        const oldHtml = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="check"></i> Copiado!';
        lucide.createIcons();
        setTimeout(() => {
          btn.innerHTML = oldHtml;
          lucide.createIcons();
        }, 2000);
      });
    }
  });

  // 3. Ouvinte de Conectar Planilha (Salvar URL)
  document.getElementById('btn-cloud-save-connect')?.addEventListener('click', async () => {
    const url = document.getElementById('sync-url-input').value.trim();
    if (!url) {
      alert("Por favor, cole uma URL válida do Google Apps Script!");
      return;
    }
    
    await State.setSyncUrl(url);
  });

  // 4. Ouvinte de Sincronizar Agora (Forçar GET/POST)
  document.getElementById('btn-cloud-sync-now')?.addEventListener('click', async () => {
    await State.checkCloudSync(true); // força push/pull
  });

  // 5. Ouvinte de Desconexão Cloud
  document.getElementById('btn-cloud-disconnect')?.addEventListener('click', () => {
    if (confirm("Deseja desconectar a planilha em nuvem? Seus dados continuarão salvos localmente.")) {
      State.disconnectCloud();
      const inputUrl = document.getElementById('sync-url-input');
      if (inputUrl) inputUrl.value = '';
    }
  });

  // 6. Inscreve-se nas notificações de status da nuvem
  State.subscribeSyncStatus(({ status, details }) => {
    // A. Atualiza o ícone de nuvem no Topbar
    const btn = document.getElementById('btn-cloud-sync-status');
    const icon = document.getElementById('cloud-status-icon');
    
    if (btn && icon) {
      btn.className = 'btn-icon'; // Limpa classes antigas
      
      if (status === 'disconnected') {
        btn.classList.add('cloud-status-disconnected');
        icon.setAttribute('data-lucide', 'cloud-off');
      } else if (status === 'syncing') {
        btn.classList.add('cloud-status-syncing');
        icon.setAttribute('data-lucide', 'cloud');
      } else if (status === 'connected') {
        btn.classList.add('cloud-status-connected');
        icon.setAttribute('data-lucide', 'cloud');
      } else if (status === 'error') {
        btn.classList.add('cloud-status-error');
        icon.setAttribute('data-lucide', 'cloud-lightning');
      }
    }

    // B. Atualiza os textos no Modal
    updateCloudSyncStatusTexts(status, details);
  });
}

// ==========================================================================
// SEÇÃO DE METAS FINANCEIRAS DE POUPANÇA (SAVINGS GOALS UI)
// ==========================================================================

export function renderGoals(data) {
  const container = document.getElementById('goals-container');
  if (!container) return;

  container.innerHTML = '';

  const goals = data.goals || [];

  // Cálculos Consolidados
  let totalTarget = 0;
  let totalSaved = 0;
  let totalSuggestedMonthly = 0;

  const today = new Date();

  if (goals.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhum objetivo ou meta de poupança cadastrada ainda. Planeje seus sonhos!</div>';
    
    // Zera os resumos
    document.getElementById('goal-summary-target').innerText = formatCurrency(0);
    document.getElementById('goal-summary-saved').innerText = formatCurrency(0);
    document.getElementById('goal-summary-suggested').innerText = `${formatCurrency(0)} / mês`;
    return;
  }

  goals.forEach(g => {
    totalTarget += g.targetValue;
    totalSaved += g.currentValue;

    // Cálculo da Parcela Mensal Sugerida
    const targetDate = new Date(g.deadline + 'T00:00:00');
    // Diferença em meses (simples)
    let monthsLeft = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
    if (monthsLeft <= 0) monthsLeft = 1;

    const leftToSave = Math.max(0, g.targetValue - g.currentValue);
    const suggestedMonthly = leftToSave > 0 ? (leftToSave / monthsLeft) : 0;
    totalSuggestedMonthly += suggestedMonthly;

    const percent = g.targetValue > 0 ? (g.currentValue / g.targetValue) * 100 : 0;

    // Formata o prazo restante de forma amigável
    let timeText = '';
    if (monthsLeft === 1) {
      timeText = 'vence no próximo mês';
    } else if (monthsLeft > 1) {
      timeText = `faltam ${monthsLeft} meses`;
    } else {
      timeText = 'prazo esgotado';
    }

    const card = document.createElement('div');
    card.className = 'budget-card';
    card.style.borderLeft = `4px solid ${g.color}`;
    card.innerHTML = `
      <div class="budget-card-header">
        <div class="budget-card-title">
          <div class="budget-category-icon" style="background-color: ${g.color}15; color: ${g.color};">
            <i data-lucide="${g.icon}"></i>
          </div>
          <span class="budget-card-name">${escapeHTML(g.name)}</span>
        </div>
        <span class="budget-period-badge" style="background-color: ${g.color}15; color: ${g.color};">${timeText}</span>
      </div>

      <div class="budget-values">
        <div>
          <span class="budget-actual" style="color: var(--color-emerald); font-size: 1.35rem;">${formatCurrency(g.currentValue)}</span>
          <span class="budget-limit" style="font-size: 0.8rem;"> guardados</span>
        </div>
        <span class="budget-limit">Alvo: ${formatCurrency(g.targetValue)}</span>
      </div>

      <div class="budget-progress-container">
        <div class="progress-bar-large">
          <div class="progress-bar-large-fill" style="width: ${Math.min(100, percent)}%; background-color: ${g.color}; box-shadow: 0 0 8px ${g.color}80;"></div>
        </div>
        <div class="budget-percent-info" style="margin-bottom: 12px;">
          <span class="budget-status-text" style="color: var(--text-secondary); font-size: 0.78rem;">
            ${suggestedMonthly > 0 
              ? `Economize <strong>${formatCurrency(suggestedMonthly)}/mês</strong>` 
              : '🎉 Meta alcançada com sucesso!'}
          </span>
          <span style="font-weight: 700;">${percent.toFixed(0)}%</span>
        </div>
      </div>

      <!-- Ajustes Rápidos e CRUD -->
      <div class="modal-footer" style="margin-top: 0; padding-top: 12px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm deposit-goal" data-id="${g.id}" title="Depositar na Poupança" style="border-color: var(--color-emerald); color: var(--color-emerald); padding: 6px 12px;"><i data-lucide="plus"></i> Poupado</button>
          <button class="btn btn-secondary btn-sm withdraw-goal" data-id="${g.id}" title="Resgatar Valor" style="padding: 6px 12px;"><i data-lucide="minus"></i> Retirar</button>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm edit-goal" data-id="${g.id}" style="padding: 6px;"><i data-lucide="edit-2"></i></button>
          <button class="btn btn-danger btn-sm delete-goal" data-id="${g.id}" style="padding: 6px;"><i data-lucide="trash"></i></button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Atualiza os resumos da tela
  document.getElementById('goal-summary-target').innerText = formatCurrency(totalTarget);
  document.getElementById('goal-summary-saved').innerText = formatCurrency(totalSaved);
  document.getElementById('goal-summary-suggested').innerText = `${formatCurrency(totalSuggestedMonthly)} / mês`;

  // Ouvintes de Clique de Ações nas Metas
  container.querySelectorAll('.deposit-goal').forEach(btn => {
    btn.addEventListener('click', () => {
      openAdjustGoalModal(btn.getAttribute('data-id'), 'deposit');
    });
  });

  container.querySelectorAll('.withdraw-goal').forEach(btn => {
    btn.addEventListener('click', () => {
      openAdjustGoalModal(btn.getAttribute('data-id'), 'withdraw');
    });
  });

  container.querySelectorAll('.edit-goal').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditGoalModal(btn.getAttribute('data-id'));
    });
  });

  container.querySelectorAll('.delete-goal').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Deseja mesmo excluir esta meta de poupança?")) {
        State.deleteGoal(id);
      }
    });
  });

  lucide.createIcons();
}

// Configura a navegação interna de abas deslizantes na tela de Orçamentos
export function configureBudgetsAndGoalsNavigation() {
  const tabExpenses = document.getElementById('tab-budgets-expenses');
  const tabGoals = document.getElementById('tab-budgets-goals');
  const contExpenses = document.getElementById('subview-budgets-expenses-container');
  const contGoals = document.getElementById('subview-budgets-goals-container');

  if (tabExpenses && tabGoals && contExpenses && contGoals) {
    tabExpenses.addEventListener('click', () => {
      tabGoals.classList.remove('active');
      tabExpenses.classList.add('active');
      contGoals.style.display = 'none';
      contExpenses.style.display = 'block';
    });

    tabGoals.addEventListener('click', () => {
      tabExpenses.classList.remove('active');
      tabGoals.classList.add('active');
      contExpenses.style.display = 'none';
      contGoals.style.display = 'block';
      
      // Força a renderização
      const data = State.loadData();
      renderGoals(data);
    });
  }
}

// --- CONTROLE DE MODAIS DAS METAS ---

function openEditGoalModal(id) {
  const data = State.loadData();
  const goal = data.goals.find(g => g.id === id);
  if (!goal) return;

  document.getElementById('modal-goal-title').innerText = 'Editar Meta';
  document.getElementById('goal-id').value = goal.id;
  document.getElementById('goal-name').value = goal.name;
  document.getElementById('goal-target').value = goal.targetValue;
  document.getElementById('goal-current').value = goal.currentValue;
  document.getElementById('goal-deadline').value = goal.deadline;
  document.getElementById('goal-color').value = goal.color;
  document.getElementById('goal-icon').value = goal.icon;

  openModal('modal-goal');
}

export function openNewGoalModal() {
  document.getElementById('modal-goal-title').innerText = 'Nova Meta Financeira';
  document.getElementById('form-goal').reset();
  document.getElementById('goal-id').value = '';
  document.getElementById('goal-color').value = '#10b981';
  document.getElementById('goal-icon').value = 'piggy-bank';
  
  // Data padrão em 6 meses
  const future = new Date();
  future.setMonth(future.getMonth() + 6);
  document.getElementById('goal-deadline').value = future.toISOString().split('T')[0];

  openModal('modal-goal');
}

function openAdjustGoalModal(id, type) {
  document.getElementById('adjust-goal-id').value = id;
  document.getElementById('form-goal-adjust').reset();
  
  const radio = document.querySelector(`input[name="adjust-type"][value="${type}"]`);
  if (radio) radio.checked = true;

  document.getElementById('modal-goal-adjust-title').innerText = type === 'deposit' 
    ? 'Depositar na Poupança' 
    : 'Resgatar da Poupança';

  openModal('modal-goal-adjust');
}

export function renderUserProfile(data) {
  const userName = data.userName || 'Usuário';
  
  // 1. Iniciais do Avatar
  const avatarEl = document.querySelector('.sidebar .avatar');
  if (avatarEl) {
    avatarEl.innerText = getAvatarLetters(userName);
  }
  
  // 2. Nome na Sidebar
  const nameEl = document.querySelector('.sidebar .user-name');
  if (nameEl) {
    nameEl.innerText = userName;
  }
  
  // 3. Saudação na Topbar (primeiro nome)
  const welcomeTitle = document.getElementById('welcome-title');
  if (welcomeTitle) {
    const firstName = userName.split(' ')[0] || 'Visitante';
    welcomeTitle.innerText = `Olá, ${firstName}`;
  }

  // 4. Tipo de Licença no Perfil (Sidebar Footer)
  const roleEl = document.querySelector('.sidebar .user-role');
  if (roleEl) {
    if (data.licenseStatus === 'active') {
      const plans = {
        web_subscription: 'Assinatura Web 🌐',
        desktop_lifetime: 'Desktop Vitalício 🐷',
        desktop_update_pass: 'Passe de Atualizações 🔄'
      };
      roleEl.innerText = plans[data.licensePlan] || 'Licença Ativa ✅';
      roleEl.style.color = '#10b981'; // Cor verde neon para licença ativa
      roleEl.style.textShadow = '0 0 8px rgba(16, 185, 129, 0.4)';
    } else {
      roleEl.innerText = 'Meu Planejador Financeiro';
      roleEl.style.color = '';
      roleEl.style.textShadow = '';
    }
  }
}

export function openProfileModal() {
  const data = State.loadData();
  const userName = data.userName || 'Usuário';
  document.getElementById('profile-name').value = userName;
  openModal('modal-profile');
}

// ==========================================================================
// CONTROLE DO TOUR DE BOAS-VINDAS (ONBOARDING CAROUSEL)
// ==========================================================================

let currentOnboardingSlide = 0;
const totalOnboardingSlides = 4;

export function initOnboardingUI() {
  const btnNext = document.getElementById('btn-onboarding-next');
  const btnSkip = document.getElementById('btn-onboarding-skip');
  
  if (btnNext) {
    btnNext.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentOnboardingSlide < totalOnboardingSlides - 1) {
        currentOnboardingSlide++;
        updateOnboardingSlide();
      } else {
        finishOnboarding();
      }
    });
  }
  
  if (btnSkip) {
    btnSkip.addEventListener('click', (e) => {
      e.preventDefault();
      finishOnboarding();
    });
  }
}

function updateOnboardingSlide() {
  const container = document.getElementById('onboarding-container');
  if (container) {
    container.style.transform = `translateX(-${25 * currentOnboardingSlide}%)`;
  }
  
  const dots = document.querySelectorAll('#onboarding-dots .onboarding-dot');
  dots.forEach((dot, index) => {
    if (index === currentOnboardingSlide) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  const btnNext = document.getElementById('btn-onboarding-next');
  if (btnNext) {
    const textSpan = btnNext.querySelector('span');
    const icon = btnNext.querySelector('i');
    if (currentOnboardingSlide === totalOnboardingSlides - 1) {
      if (textSpan) textSpan.innerText = 'Começar Jornada!';
      if (icon) icon.style.display = 'none';
    } else {
      if (textSpan) textSpan.innerText = 'Avançar';
      if (icon) icon.style.display = '';
    }
  }
}

function finishOnboarding() {
  closeModal('modal-onboarding');
  State.updateOnboardingSeen(true);
  
  const data = State.loadData();
  renderUserProfile(data);
  
  // Sinaliza que o usuário está no fluxo inicial para disparar o tour na tela
  window.isOnboardingFlow = true;
  
  setTimeout(() => {
    openProfileModal();
  }, 300);
}

export function showOnboardingIfNeeded() {
  const data = State.loadData();
  if (!data.hasSeenTour) {
    currentOnboardingSlide = 0;
    updateOnboardingSlide();
    openModal('modal-onboarding');
  }
}

// ==========================================================================
/* CONTROLE DO TOUR INTERATIVO DE TELAS (SPOTLIGHT SCREEN TOUR) */
// ==========================================================================

let currentTourStep = 0;
const tourSteps = [
  {
    target: '#welcome-title',
    title: 'Olá e Boas-vindas!',
    body: 'Este é o seu **Cabeçalho Principal**. Aqui você sempre verá uma saudação personalizada com o seu nome e acompanhará o período de visualização ativo.',
    view: 'dashboard'
  },
  {
    target: '.sidebar-nav',
    title: 'Navegação Completa',
    body: 'Este é o **Menu Lateral**. Por aqui você navega instantaneamente pelas áreas de Dashboard, Transações, Orçamentos, Contas & Categorias e Recorrências. Vamos passar por cada uma!',
    view: 'dashboard'
  },
  {
    target: '.filter-panel',
    title: 'Tela de Transações e Filtros',
    body: 'Na tela de **Transações**, você tem o controle absoluto. Use este painel de **Filtros Avançados** para buscar lançamentos por descrição, tipo (Receita/Despesa), categoria ou conta em segundos.',
    view: 'transactions'
  },
  {
    target: '.category-tabs',
    title: 'Configurar Orçamento',
    body: 'Na aba **Orçamentos**, defina limites mensais de gastos para categorias específicas. As barras de progresso mudam de cor (Verde, Amarela, Vermelha) alertando você sobre o consumo saudável de despesas!',
    view: 'budgets'
  },
  {
    target: '#tab-budgets-goals',
    title: 'Metas e Poupanças',
    body: 'Na aba **Objetivos de Poupança (Metas)**, você planeja sonhos (ex: Viagem ou Reserva de Emergência). Lançando aportes rápidos (+ Poupado) ou (-) Retirar, o app recalcula a cota mensal recomendada automaticamente!',
    view: 'budgets'
  },
  {
    target: '#btn-add-account',
    title: 'Cadastrar Nova Conta',
    body: 'Na tela de **Contas & Categorias**, adicione todos os locais onde guarda dinheiro (Contas Correntes, Poupanças ou Dinheiro Físico) simplesmente clicando em **"Nova Conta"**.',
    view: 'accounts-categories'
  },
  {
    target: '#accounts-container',
    title: 'Controle de Cartão de Crédito',
    body: 'Para **Controlar seu Cartão de Crédito**, cadastre uma conta com o tipo **"Cartão de Crédito"** e informe seu saldo devedor atual (em valor negativo). Novos lançamentos associados a este cartão atualizarão o saldo de forma dinâmica!',
    view: 'accounts-categories'
  },
  {
    target: '#btn-add-category',
    title: 'Cadastrar Categoria',
    body: 'Crie novos marcadores em **"Nova Categoria"**. Defina se classifica Receitas ou Despesas, escolha uma cor vibrante e um ícone exclusivo Lucide para deixar seus relatórios de rosca impecáveis.',
    view: 'accounts-categories'
  },
  {
    target: '.danger-zone-card',
    title: 'Resetar Configurações',
    body: 'Esta é a **Zona de Perigo**. Se quiser limpar seus lançamentos de demonstração para começar com saldos zerados, ou resetar o aplicativo nuclearmente para as configurações em branco, faça-o aqui de forma simples.',
    view: 'accounts-categories'
  },
  {
    target: '#btn-new-recurring',
    title: 'Cadastrar Conta Recorrente',
    body: 'Na aba **Contas Recorrentes**, clique em **"Cadastrar Recorrente"** para agendar compromissos fixos (Netflix, Aluguel). Ao abrir o app, o Meu Dindin analisa se a data de vencimento passou e realiza o lançamento automático!',
    view: 'recurring'
  },
  {
    target: 'none',
    title: 'Fim do Tour!',
    body: '🎉 **Parabéns!** Você concluiu o tour completo pelo seu Meu Dindin e está pronto para dominar sua vida financeira local e offline com extrema privacidade!<br><br>Caso tenha qualquer dúvida ou precise de suporte, entre em contato pelo e-mail:<br><strong style="color:var(--color-indigo); font-size:1.05rem;">agnoraai@gmail.com</strong>',
    view: 'dashboard'
  }
];

export function startInteractiveScreenTour() {
  currentTourStep = 0;
  
  // Cria overlay de escurecimento se não existir
  let overlay = document.getElementById('tour-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tour-overlay';
    document.body.appendChild(overlay);
  }
  overlay.className = 'active';

  // Cria card de informações do tour
  let tooltipCard = document.getElementById('tour-tooltip-card');
  if (!tooltipCard) {
    tooltipCard = document.createElement('div');
    tooltipCard.id = 'tour-tooltip-card';
    document.body.appendChild(tooltipCard);
  }

  showTourStep(0);
}

function showTourStep(index) {
  // Remove destaque de qualquer passo anterior
  document.querySelectorAll('.tour-highlighted-element').forEach(el => {
    el.classList.remove('tour-highlighted-element');
  });

  if (index < 0 || index >= tourSteps.length) {
    endInteractiveScreenTour();
    return;
  }

  currentTourStep = index;
  const step = tourSteps[index];

  // Troca de tela dinamicamente se necessário
  const currentViewId = document.querySelector('.app-view.active')?.id.replace('view-', '') || 'dashboard';
  if (step.view && step.view !== currentViewId) {
    switchView(step.view);
  }

  // Lógica reativa de alternância de abas deslizantes na tela de Orçamentos
  if (step.view === 'budgets') {
    if (step.target === '#tab-budgets-goals') {
      const goalsTab = document.getElementById('tab-budgets-goals');
      if (goalsTab) goalsTab.click();
    } else {
      const expensesTab = document.getElementById('tab-budgets-expenses');
      if (expensesTab) expensesTab.click();
    }
  }

  // Localiza e destaca o elemento alvo
  setTimeout(() => {
    const targetEl = step.target !== 'none' ? document.querySelector(step.target) : null;
    const tooltipCard = document.getElementById('tour-tooltip-card');
    
    if (targetEl && tooltipCard) {
      targetEl.classList.add('tour-highlighted-element');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Atualiza o conteúdo do card
      tooltipCard.innerHTML = `
        <div class="tour-tooltip-header">
          <h4>${step.title}</h4>
          <button class="tour-tooltip-close" id="btn-tour-close">&times;</button>
        </div>
        <p class="tour-tooltip-body">${step.body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/"(.*?)"/g, '<strong>"$1"</strong>')}</p>
        <div class="tour-tooltip-footer">
          <span class="tour-tooltip-progress">Passo ${index + 1} de ${tourSteps.length}</span>
          <div class="tour-tooltip-buttons">
            <button class="btn-tour btn-tour-back" id="btn-tour-back" style="${index === 0 ? 'display:none;' : ''}">Voltar</button>
            <button class="btn-tour btn-tour-next" id="btn-tour-next">${index === tourSteps.length - 1 ? 'Concluir' : 'Avançar'}</button>
          </div>
        </div>
      `;

      // Ouvintes de clique dos botões do card
      document.getElementById('btn-tour-close')?.addEventListener('click', endInteractiveScreenTour);
      document.getElementById('btn-tour-back')?.addEventListener('click', () => showTourStep(currentTourStep - 1));
      document.getElementById('btn-tour-next')?.addEventListener('click', () => {
        if (currentTourStep === tourSteps.length - 1) {
          endInteractiveScreenTour();
        } else {
          showTourStep(currentTourStep + 1);
        }
      });

      // Posiciona o card flutuante inteligentemente perto do elemento (usando coordenadas de viewport/fixed)
      const rect = targetEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      let top, left;

      // Usaremos position: fixed para alinhar de forma robusta e reativa
      tooltipCard.style.position = 'fixed';

      if (step.target === '.sidebar-nav' || rect.left < 100) {
        // Se estiver no canto esquerdo da tela (como a barra lateral), posiciona o tooltip à direita!
        left = rect.right + 20;
        // Centraliza verticalmente em relação ao elemento alvo (card tem ~240px de altura, então half é 120px)
        top = rect.top + (rect.height / 2) - 120;
      } else {
        // Posicionamento padrão (abaixo do elemento)
        top = rect.bottom + 15;
        left = rect.left + (rect.width / 2) - 160; // Centralizado horizontalmente
        
        // Se for muito abaixo na viewport, posiciona acima do elemento
        if (rect.bottom + 250 > viewportHeight) {
          top = rect.top - 240;
        }
      }
      
      // Limites de segurança rígidos para evitar que o card fique fora da tela (incluindo sobreposição com title bar)
      // O topo mínimo é 80px para dar espaçamento de segurança contra a barra de título no Desktop/Electron
      top = Math.max(80, top);
      // Evita cortar o fundo do card abaixo da tela
      top = Math.min(viewportHeight - 260, top);
      // Re-garante que não ficou menor que 80px após a restrição inferior
      top = Math.max(80, top);

      // Ajusta limites horizontais
      if (left + 330 > viewportWidth) {
        left = viewportWidth - 340;
      }
      left = Math.max(20, left);

      tooltipCard.style.top = `${top}px`;
      tooltipCard.style.left = `${left}px`;
      tooltipCard.style.transform = 'none';
      tooltipCard.style.display = 'flex';
    } else if (tooltipCard) {
      // Posicionamento central fixo para mensagem de fim de tour
      tooltipCard.innerHTML = `
        <div class="tour-tooltip-header">
          <h4>${step.title}</h4>
          <button class="tour-tooltip-close" id="btn-tour-close">&times;</button>
        </div>
        <p class="tour-tooltip-body">${step.body}</p>
        <div class="tour-tooltip-footer">
          <span class="tour-tooltip-progress">Passo ${index + 1} de ${tourSteps.length}</span>
          <div class="tour-tooltip-buttons">
            <button class="btn-tour btn-tour-back" id="btn-tour-back" style="${index === 0 ? 'display:none;' : ''}">Voltar</button>
            <button class="btn-tour btn-tour-next" id="btn-tour-next">${index === tourSteps.length - 1 ? 'Concluir' : 'Avançar'}</button>
          </div>
        </div>
      `;
      document.getElementById('btn-tour-close')?.addEventListener('click', endInteractiveScreenTour);
      document.getElementById('btn-tour-back')?.addEventListener('click', () => showTourStep(currentTourStep - 1));
      document.getElementById('btn-tour-next')?.addEventListener('click', () => {
        if (currentTourStep === tourSteps.length - 1) {
          endInteractiveScreenTour();
        } else {
          showTourStep(currentTourStep + 1);
        }
      });
      
      tooltipCard.style.top = '50%';
      tooltipCard.style.left = '50%';
      tooltipCard.style.transform = 'translate(-50%, -50%)';
      tooltipCard.style.position = 'fixed';
      tooltipCard.style.display = 'flex';
    }
  }, 200);
}

export function endInteractiveScreenTour() {
  document.querySelectorAll('.tour-highlighted-element').forEach(el => {
    el.classList.remove('tour-highlighted-element');
  });

  const overlay = document.getElementById('tour-overlay');
  if (overlay) overlay.classList.remove('active');

  const tooltipCard = document.getElementById('tour-tooltip-card');
  if (tooltipCard) tooltipCard.style.display = 'none';

  // Volta para a tela inicial (Dashboard) de forma amigável
  switchView('dashboard');
}

/**
 * Controla a visibilidade da tela de ativação.
 */
export function toggleActivationScreen(show) {
  const screen = document.getElementById('activation-screen');
  if (!screen) return;

  if (show) {
    screen.classList.remove('hidden');
    document.body.classList.add('unlicensed');
  } else {
    screen.classList.add('hidden');
    document.body.classList.remove('unlicensed');
  }
}

/**
 * Inicializa os escutadores do formulário de ativação de licença.
 */
export function initActivationUI() {
  const form = document.getElementById('form-activation');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('activation-email');
    const submitBtn = document.getElementById('btn-activate');
    const alertBox = document.getElementById('activation-error');
    const alertText = document.getElementById('activation-error-text');

    if (!emailInput || !submitBtn || !alertBox || !alertText) return;

    // Coloca o botão em estado de loading
    submitBtn.classList.add('btn-loading');
    alertBox.classList.add('hidden');

    const result = await State.verifyLicense(emailInput.value);

    // Remove estado de loading
    submitBtn.classList.remove('btn-loading');

    if (result.success) {
      // Licença válida! Desbloqueia e renderiza
      toggleActivationScreen(false);
      renderAll();
      
      // Abre o onboarding se necessário
      showOnboardingIfNeeded();
    } else {
      // Exibe mensagem de erro
      alertText.innerText = result.message;
      alertBox.classList.remove('hidden');
    }
  });

  // Garante que o Lucide crie os ícones da tela de ativação
  if (typeof lucide !== 'undefined') {
    lucide.createIcons({
      attrs: {
        class: 'lucide-icon'
      },
      nameAttr: 'data-lucide'
    });
  }
}

// --- IMPORTADOR INTELIGENTE ---
let extractedTransactions = [];

export function initSmartImportUI() {
  const btnTrigger = document.getElementById('btn-smart-import-trigger');
  if (!btnTrigger) return;

  btnTrigger.addEventListener('click', () => {
    document.getElementById('paste-text-area').value = '';
    document.getElementById('import-preview-section').style.display = 'none';
    document.getElementById('import-preview-body').innerHTML = '';
    
    document.querySelectorAll('.import-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.import-tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector('.import-tab-btn[data-tab="tab-upload-file"]').classList.add('active');
    document.getElementById('tab-upload-file').classList.add('active');
    
    openModal('modal-smart-import');
  });

  document.querySelectorAll('.import-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.import-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.import-tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  const btnSelectFile = document.getElementById('btn-select-file');
  const fileInput = document.getElementById('file-smart-import');
  
  btnSelectFile?.addEventListener('click', () => fileInput.click());
  
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleSmartImportFile(file);
    e.target.value = '';
  });

  const dragZone = document.getElementById('drag-drop-zone');
  if (dragZone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dragZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dragZone.classList.add('dragover');
      }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      dragZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dragZone.classList.remove('dragover');
      }, false);
    });
    
    dragZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      if (file) handleSmartImportFile(file);
    }, false);
  }

  const btnProcessText = document.getElementById('btn-process-pasted-text');
  btnProcessText?.addEventListener('click', () => {
    const text = document.getElementById('paste-text-area').value;
    if (!text.trim()) {
      alert("Por favor, cole algum texto de comprovante antes de processar.");
      return;
    }
    const parsed = parseTextReceipt(text);
    renderImportPreview(parsed);
  });

  const chkSelectAll = document.getElementById('chk-import-select-all');
  chkSelectAll?.addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('.chk-import-item').forEach(chk => {
      chk.checked = checked;
    });
  });

  document.getElementById('btn-cancel-import')?.addEventListener('click', () => {
    closeModal('modal-smart-import');
  });

  document.getElementById('btn-save-imported')?.addEventListener('click', () => {
    const rows = document.querySelectorAll('#import-preview-body tr');
    let savedCount = 0;
    
    rows.forEach(row => {
      const chk = row.querySelector('.chk-import-item');
      if (chk && chk.checked) {
        const idx = chk.getAttribute('data-index');
        const date = row.querySelector('.import-tx-date').value;
        const description = row.querySelector('.import-tx-desc').value;
        const type = row.querySelector('.import-tx-type').value;
        const value = Number(row.querySelector('.import-tx-value').value);
        const account = row.querySelector('.import-tx-account').value;
        const category = row.querySelector('.import-tx-category').value;
        
        if (!description || isNaN(value) || value <= 0 || !account || !category) {
          return;
        }
        
        State.addTransaction({
          description,
          value,
          date,
          type,
          category,
          account,
          isRecurring: false
        });
        savedCount++;
      }
    });
    
    if (savedCount > 0) {
      alert(`${savedCount} transações importadas com sucesso!`);
      closeModal('modal-smart-import');
    } else {
      alert("Nenhuma transação selecionada ou dados de preenchimento inválidos.");
    }
  });
}

function handleSmartImportFile(file) {
  const reader = new FileReader();
  const extension = file.name.split('.').pop().toLowerCase();
  
  reader.onload = (e) => {
    const text = e.target.result;
    let parsed = [];
    
    if (extension === 'ofx') {
      parsed = parseOFX(text);
    } else if (extension === 'csv') {
      parsed = parseCSV(text);
    } else {
      alert("Extensão de arquivo não suportada. Escolha um arquivo .OFX ou .CSV.");
      return;
    }
    
    renderImportPreview(parsed);
  };
  
  reader.readAsText(file);
}

function renderImportPreview(txs) {
  extractedTransactions = txs;
  const container = document.getElementById('import-preview-body');
  const countEl = document.getElementById('import-count');
  const sectionEl = document.getElementById('import-preview-section');
  
  if (!container) return;
  container.innerHTML = '';
  
  if (txs.length === 0) {
    sectionEl.style.display = 'none';
    alert("Nenhuma transação válida identificada.");
    return;
  }
  
  countEl.innerText = txs.length;
  sectionEl.style.display = 'block';
  
  const data = State.loadData();
  const accounts = data.accounts;
  const categories = data.categories;
  
  txs.forEach((tx, idx) => {
    const row = document.createElement('tr');
    
    let accountOptionsHtml = '';
    accounts.forEach((acc, aIdx) => {
      const selected = aIdx === 0 ? 'selected' : '';
      accountOptionsHtml += `<option value="${acc.id}" ${selected}>${escapeHTML(acc.name)}</option>`;
    });
    if (accounts.length === 0) {
      accountOptionsHtml = '<option value="">Sem contas cadastradas</option>';
    }
    
    const filteredCats = categories.filter(c => c.type === tx.type);
    let categoryOptionsHtml = '';
    filteredCats.forEach((cat, cIdx) => {
      const selected = cIdx === 0 ? 'selected' : '';
      categoryOptionsHtml += `<option value="${cat.id}" ${selected}>${escapeHTML(cat.name)}</option>`;
    });
    if (filteredCats.length === 0) {
      categoryOptionsHtml = '<option value="">Sem categorias</option>';
    }
    
    row.innerHTML = `
      <td><input type="checkbox" class="chk-import-item" data-index="${idx}" checked></td>
      <td><input type="date" class="form-input import-tx-date" data-index="${idx}" value="${tx.date}"></td>
      <td><input type="text" class="form-input import-tx-desc" data-index="${idx}" value="${escapeHTML(tx.description)}"></td>
      <td>
        <select class="form-input import-tx-type" data-index="${idx}">
          <option value="expense" ${tx.type === 'expense' ? 'selected' : ''}>Despesa</option>
          <option value="income" ${tx.type === 'income' ? 'selected' : ''}>Receita</option>
        </select>
      </td>
      <td><input type="number" step="0.01" class="form-input import-tx-value" data-index="${idx}" value="${tx.value}"></td>
      <td><select class="form-input import-tx-account" data-index="${idx}">${accountOptionsHtml}</select></td>
      <td><select class="form-input import-tx-category" data-index="${idx}">${categoryOptionsHtml}</select></td>
    `;
    
    const typeSelect = row.querySelector('.import-tx-type');
    const catSelect = row.querySelector('.import-tx-category');
    typeSelect.addEventListener('change', (e) => {
      const newType = e.target.value;
      const catsOfType = categories.filter(c => c.type === newType);
      let newOptionsHtml = '';
      catsOfType.forEach((cat, cIdx) => {
        const selected = cIdx === 0 ? 'selected' : '';
        newOptionsHtml += `<option value="${cat.id}" ${selected}>${escapeHTML(cat.name)}</option>`;
      });
      if (catsOfType.length === 0) {
        newOptionsHtml = '<option value="">Sem categorias</option>';
      }
      catSelect.innerHTML = newOptionsHtml;
      extractedTransactions[idx].type = newType;
    });
    
    container.appendChild(row);
  });
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

export function parseOFX(text) {
  const transactions = [];
  const blocks = text.split(/<STMTTRN>/i);
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split(/<\/STMTTRN>/i)[0];
    
    const typeMatch = block.match(/<TRNTYPE>(.*)/i);
    const dateMatch = block.match(/<DTPOSTED>(.*)/i);
    const amtMatch = block.match(/<TRNAMT>(.*)/i);
    const memoMatch = block.match(/<MEMO>(.*)/i) || block.match(/<NAME>(.*)/i);
    
    if (amtMatch && dateMatch) {
      const dateStr = dateMatch[1].trim();
      const amtStr = amtMatch[1].trim();
      const memoStr = memoMatch ? memoMatch[1].trim() : 'Transação Importada';
      
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const date = `${year}-${month}-${day}`;
      
      const value = Math.abs(parseFloat(amtStr));
      const type = parseFloat(amtStr) < 0 ? 'expense' : 'income';
      
      transactions.push({
        date,
        description: cleanOFXMemo(memoStr),
        value,
        type
      });
    }
  }
  return transactions;
}

function cleanOFXMemo(memo) {
  return memo.replace(/<\/?[^>]+(>|$)/g, "").trim();
}

export function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const header = lines[0];
  const separator = header.includes(';') ? ';' : ',';
  const headers = header.split(separator).map(h => h.trim().toLowerCase());
  
  const dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
  const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('memo') || h.includes('detalhe') || h.includes('historico') || h.includes('histórico'));
  const valIdx = headers.findIndex(h => h.includes('valor') || h.includes('value') || h.includes('quant') || h.includes('amount') || h.includes('pago'));
  
  if (dateIdx === -1 || descIdx === -1 || valIdx === -1) {
    return parseCSVLinesFallback(lines, separator);
  }
  
  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitCSVLine(lines[i], separator);
    if (cols.length <= Math.max(dateIdx, descIdx, valIdx)) continue;
    
    const dateStr = cols[dateIdx].trim();
    const descStr = cols[descIdx].trim();
    const valStr = cols[valIdx].trim();
    
    if (!dateStr || !descStr || !valStr) continue;
    
    const date = parseDateStr(dateStr);
    const valueRaw = parseValueStr(valStr);
    if (isNaN(valueRaw)) continue;
    
    const value = Math.abs(valueRaw);
    const type = valueRaw < 0 ? 'expense' : 'income';
    
    transactions.push({
      date,
      description: descStr,
      value,
      type
    });
  }
  return transactions;
}

function splitCSVLine(line, separator) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

function parseCSVLinesFallback(lines, separator) {
  const transactions = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], separator);
    if (cols.length < 3) continue;
    
    const date = parseDateStr(cols[0]);
    const val = parseValueStr(cols[2]);
    if (date && !isNaN(val)) {
      transactions.push({
        date,
        description: cols[1],
        value: Math.abs(val),
        type: val < 0 ? 'expense' : 'income'
      });
    }
  }
  return transactions;
}

export function parseDateStr(str) {
  str = str.replace(/\//g, '-').trim();
  const parts = str.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (parts[2].length === 2) {
      return `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return new Date().toISOString().split('T')[0];
}

export function parseValueStr(str) {
  str = str.replace(/[R\$\s]/gi, '').trim();
  const commaIdx = str.lastIndexOf(',');
  const dotIdx = str.lastIndexOf('.');
  if (commaIdx > dotIdx) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (dotIdx > commaIdx) {
    str = str.replace(/,/g, '');
  } else if (commaIdx !== -1 && dotIdx === -1) {
    str = str.replace(',', '.');
  }
  return parseFloat(str);
}

export function parseTextReceipt(text) {
  const lines = text.split('\n');
  let value = null;
  let date = null;
  let description = null;
  let type = 'expense';
  
  const valuePatterns = [
    /(?:valor|valor pago|valor cobrado|valor transferido|total|total pago|quantia)[\s:=$]*R?\$?\s*([0-9.,]+)/i,
    /R\$\s*([0-9.,]+)/i,
    /([0-9.,]+)\s*R\$/i
  ];
  
  for (const pattern of valuePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsedVal = parseValueStr(match[1]);
      if (!isNaN(parsedVal) && parsedVal > 0) {
        value = parsedVal;
        break;
      }
    }
  }
  
  const datePatterns = [
    /(?:data|data do pagamento|data da transação|realizado em|data\/hora|vencimento)[\s:=$]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{2,4})/i,
    /(?:data|data do pagamento|data da transação|realizado em|data\/hora|vencimento)[\s:=$]*([0-9]{4}[/-][0-9]{2}[/-][0-9]{2})/i,
    /([0-9]{2}\/[0-9]{2}\/[0-9]{2,4})/
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      date = parseDateStr(match[1]);
      break;
    }
  }
  if (!date) {
    date = new Date().toISOString().split('T')[0];
  }
  
  const descPatterns = [
    /(?:destinatário|recebido por|recebedor|pago a|beneficiário|estabelecimento|para|pagamento de|remetente|enviado por|recebido de|pagador|origem)[\s:=$]+([^\n\r]+)/i,
    /(?:nome)[\s:=$]+([^\n\r]+)/i
  ];
  
  for (const pattern of descPatterns) {
    const match = text.match(pattern);
    if (match && match[1].trim()) {
      description = match[1].trim();
      break;
    }
  }
  
  if (!description) {
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.length > 3 && cleanLine.length < 50 && !cleanLine.includes('R$') && !cleanLine.includes(':') && !/\d{5,}/.test(cleanLine)) {
        description = cleanLine;
        break;
      }
    }
  }
  if (!description) {
    description = "Comprovante Importado";
  }
  
  const incomeKeywords = [/recebido/i, /reembolso/i, /estorno/i, /salário/i, /salario/i, /recebimento/i, /transferência recebida/i, /pix recebido/i];
  for (const kw of incomeKeywords) {
    if (kw.test(text)) {
      type = 'income';
      break;
    }
  }
  
  if (value) {
    return [{
      date,
      description,
      value,
      type
    }];
  }
  
  return [];
}

