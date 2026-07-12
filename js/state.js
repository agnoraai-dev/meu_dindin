/* ==========================================================================
   GERENCIADOR DE ESTADO E PERSISTÊNCIA (state.js)
   ========================================================================== */

const STORAGE_KEY = 'antigravity_meudindin_data';

// URL da API de Validação de Licenças.
// IMPORTANTE: Substitua pelo seu domínio definitivo da Vercel.
const PROD_VERCEL_URL = 'https://meu-dindin-three.vercel.app'; 

const isDesktop = typeof window !== 'undefined' && 
  (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' || window.location.protocol === 'file:');

const LICENSE_API_URL = isDesktop ? `${PROD_VERCEL_URL}/api/validate` : '/api/validate';

// Estado global em memória
let state = {
  userName: 'Usuário',
  hasSeenTour: false,
  licenseEmail: '',
  licenseStatus: 'inactive',
  licensePlan: '',
  transactions: [],
  categories: [],
  accounts: [],
  budgets: [],
  recurring: [],
  goals: [], // Metas financeiras de poupança
  syncUrl: '',
  syncToken: '', // Chave de segurança para sincronização
  lastUpdated: new Date().toISOString(),
  lastSynced: null
};

// Listeners para notificar a UI de alterações
const stateListeners = [];
const syncListeners = []; // Para monitorar o status de sincronização (syncing, connected, disconnected, error)

export function subscribeState(callback) {
  stateListeners.push(callback);
}

export function subscribeSyncStatus(callback) {
  syncListeners.push(callback);
}

export function dispatchSyncStatus(status, details = '') {
  syncListeners.forEach(listener => listener({ status, details }));
}

let syncTimeout = null;
let isSyncingInProgress = false;

function notifyStateChanged() {
  state.lastUpdated = new Date().toISOString();
  saveData();
  stateListeners.forEach(listener => listener(state));
  
  // Se houver URL configurada, enfileira a sincronização automática
  if (state.syncUrl && !isSyncingInProgress) {
    triggerDebouncedSync();
  }
}

// ==========================================================================
// PERSISTÊNCIA BÁSICA (LOCALSTORAGE)
// ==========================================================================

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
      
      // Migração de esquema para bancos antigos
      if (!state.goals) {
        state.goals = [];
      }
      
      if (!state.userName) {
        state.userName = 'Usuário';
      }

      if (state.syncToken === undefined) {
        state.syncToken = '';
      }

      if (state.hasSeenTour === undefined) {
        state.hasSeenTour = false;
      }

      if (state.licenseEmail === undefined) {
        state.licenseEmail = '';
      }

      if (state.licenseStatus === undefined) {
        state.licenseStatus = 'inactive';
      }

      if (state.licensePlan === undefined) {
        state.licensePlan = '';
      }
      
      // Auto-processa lançamentos recorrentes agendados
      processRecurring();
      return state;
    }
  } catch (e) {
    console.error("Erro ao carregar localStorage:", e);
  }
  
  // Se estiver vazio, inicializa com dados demonstrativos (Mock Data)
  initMockData();
  return state;
}

export function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Erro ao salvar localStorage:", e);
  }
}

export function resetAllData(keepTemplates = true) {
  if (keepTemplates) {
    // Apaga transações, orçamentos, agendamentos e metas
    state.transactions = [];
    state.budgets = [];
    state.recurring = [];
    state.goals = [];
    
    // Mantém as contas mas zera o saldo de todas elas
    state.accounts.forEach(a => {
      a.balance = 0;
    });
  } else {
    // Apaga absolutamente tudo para começar 100% limpo
    state.transactions = [];
    state.categories = [];
    state.accounts = [];
    state.budgets = [];
    state.recurring = [];
    state.goals = [];
  }
  
  state.lastUpdated = new Date().toISOString();
  saveData();
  notifyStateChanged();
}

// ==========================================================================
// IMPORTAÇÃO / EXPORTAÇÃO
// ==========================================================================

export function exportToJSON() {
  return JSON.stringify(state, null, 2);
}

export function importFromJSON(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    if (
      Array.isArray(imported.transactions) &&
      Array.isArray(imported.categories) &&
      Array.isArray(imported.accounts) &&
      Array.isArray(imported.budgets) &&
      Array.isArray(imported.recurring)
    ) {
      state = imported;
      notifyStateChanged();
      return true;
    }
  } catch (e) {
    console.error("Erro ao importar JSON:", e);
  }
  return false;
}

// ==========================================================================
// GERADORES DE IDS ÚNICOS E DATA RELATIVA
// ==========================================================================

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);
}

function getRelativeDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// ==========================================================================
// METODOS CRUD (Lançamentos, Contas, Categorias, Orçamentos, Recorrentes)
// ==========================================================================

// --- TRANSAÇÕES ---
export function addTransaction(tx) {
  const newTx = {
    id: generateId(),
    description: tx.description,
    value: Number(tx.value),
    date: tx.date,
    type: tx.type, // 'income' ou 'expense'
    category: tx.category,
    account: tx.account,
    isRecurring: !!tx.isRecurring
  };
  state.transactions.push(newTx);
  
  // Atualiza saldo da conta
  updateAccountBalanceOnTransaction(tx.account, Number(tx.value), tx.type, 'add');
  
  notifyStateChanged();
  return newTx;
}

export function updateTransaction(id, updated) {
  const index = state.transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    const oldTx = state.transactions[index];
    
    // Desfaz o saldo antigo
    updateAccountBalanceOnTransaction(oldTx.account, oldTx.value, oldTx.type, 'remove');
    
    // Atualiza transação
    state.transactions[index] = {
      ...oldTx,
      description: updated.description,
      value: Number(updated.value),
      date: updated.date,
      type: updated.type,
      category: updated.category,
      account: updated.account,
      isRecurring: !!updated.isRecurring
    };
    
    // Aplica o novo saldo
    updateAccountBalanceOnTransaction(updated.account, Number(updated.value), updated.type, 'add');
    
    notifyStateChanged();
    return state.transactions[index];
  }
  return null;
}

export function deleteTransaction(id) {
  const index = state.transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    const oldTx = state.transactions[index];
    // Desfaz o saldo
    updateAccountBalanceOnTransaction(oldTx.account, oldTx.value, oldTx.type, 'remove');
    
    state.transactions.splice(index, 1);
    notifyStateChanged();
    return true;
  }
  return false;
}

function updateAccountBalanceOnTransaction(accountId, value, type, action) {
  const acc = state.accounts.find(a => a.id === accountId);
  if (!acc) return;
  
  const numericVal = Number(value);
  if (action === 'add') {
    if (type === 'income') {
      acc.balance += numericVal;
    } else {
      acc.balance -= numericVal;
    }
  } else if (action === 'remove') {
    // Ação inversa para desfazer
    if (type === 'income') {
      acc.balance -= numericVal;
    } else {
      acc.balance += numericVal;
    }
  }
}

// --- CONTAS ---
export function addAccount(acc) {
  const newAcc = {
    id: generateId(),
    name: acc.name,
    type: acc.type, // 'checking', 'savings', 'credit', 'cash'
    balance: acc.type === 'credit' ? -Math.abs(Number(acc.balance)) : Number(acc.balance)
  };
  state.accounts.push(newAcc);
  notifyStateChanged();
  return newAcc;
}

export function updateAccount(id, updated) {
  const acc = state.accounts.find(a => a.id === id);
  if (acc) {
    acc.name = updated.name;
    acc.type = updated.type;
    acc.balance = updated.type === 'credit' ? -Math.abs(Number(updated.balance)) : Number(updated.balance);
    notifyStateChanged();
    return acc;
  }
  return null;
}

export function deleteAccount(id) {
  const index = state.accounts.findIndex(a => a.id === id);
  if (index !== -1) {
    // Opcional: Remove ou transfere transações associadas.
    // Para simplificar, manteremos as transações mas podemos limpar seu ID de conta.
    state.transactions.forEach(t => {
      if (t.account === id) t.account = null;
    });
    state.recurring.forEach(r => {
      if (r.account === id) r.account = null;
    });
    state.accounts.splice(index, 1);
    notifyStateChanged();
    return true;
  }
  return false;
}

// --- CATEGORIAS ---
export function addCategory(cat) {
  const newCat = {
    id: generateId(),
    name: cat.name,
    type: cat.type, // 'income' ou 'expense'
    color: cat.color || '#6366f1',
    icon: cat.icon || 'help-circle'
  };
  state.categories.push(newCat);
  notifyStateChanged();
  return newCat;
}

export function updateCategory(id, updated) {
  const cat = state.categories.find(c => c.id === id);
  if (cat) {
    cat.name = updated.name;
    cat.type = updated.type;
    cat.color = updated.color;
    cat.icon = updated.icon;
    notifyStateChanged();
    return cat;
  }
  return null;
}

export function deleteCategory(id) {
  const index = state.categories.findIndex(c => c.id === id);
  if (index !== -1) {
    // Limpa das transações/orçamentos associados
    state.transactions.forEach(t => {
      if (t.category === id) t.category = null;
    });
    state.budgets.forEach(b => {
      if (b.category === id) b.category = null;
    });
    state.recurring.forEach(r => {
      if (r.category === id) r.category = null;
    });
    state.categories.splice(index, 1);
    notifyStateChanged();
    return true;
  }
  return false;
}

// --- ORÇAMENTOS ---
export function addBudget(bud) {
  // Evita duplicar orçamento para a mesma categoria no mesmo período
  const exists = state.budgets.find(b => b.category === bud.category && b.period === bud.period);
  if (exists) {
    exists.amount = Number(bud.amount);
    notifyStateChanged();
    return exists;
  }
  
  const newBud = {
    id: generateId(),
    category: bud.category,
    period: bud.period, // 'daily', 'monthly', 'yearly'
    amount: Number(bud.amount)
  };
  state.budgets.push(newBud);
  notifyStateChanged();
  return newBud;
}

export function updateBudget(id, updated) {
  const bud = state.budgets.find(b => b.id === id);
  if (bud) {
    bud.category = updated.category;
    bud.period = updated.period;
    bud.amount = Number(updated.amount);
    notifyStateChanged();
    return bud;
  }
  return null;
}

export function deleteBudget(id) {
  const index = state.budgets.findIndex(b => b.id === id);
  if (index !== -1) {
    state.budgets.splice(index, 1);
    notifyStateChanged();
    return true;
  }
  return false;
}

// --- DESPESAS RECORRENTES ---
export function addRecurring(rec) {
  const newRec = {
    id: generateId(),
    description: rec.description,
    value: Number(rec.value),
    type: rec.type,
    frequency: rec.frequency, // 'weekly', 'monthly', 'yearly'
    category: rec.category,
    account: rec.account,
    startDate: rec.startDate,
    nextDate: rec.startDate, // Inicialmente coincide com a data de início
    autoProcess: !!rec.autoProcess,
    lastProcessedDate: null
  };
  state.recurring.push(newRec);
  notifyStateChanged();
  return newRec;
}

export function updateRecurring(id, updated) {
  const rec = state.recurring.find(r => r.id === id);
  if (rec) {
    rec.description = updated.description;
    rec.value = Number(updated.value);
    rec.type = updated.type;
    rec.frequency = updated.frequency;
    rec.category = updated.category;
    rec.account = updated.account;
    rec.startDate = updated.startDate;
    rec.autoProcess = !!updated.autoProcess;
    
    // Se a data de início mudou e nunca processou, atualiza nextDate
    if (!rec.lastProcessedDate) {
      rec.nextDate = updated.startDate;
    }
    
    notifyStateChanged();
    return rec;
  }
  return null;
}

export function deleteRecurring(id) {
  const index = state.recurring.findIndex(r => r.id === id);
  if (index !== -1) {
    state.recurring.splice(index, 1);
    notifyStateChanged();
    return true;
  }
  return false;
}

// ==========================================================================
// METAS FINANCEIRAS DE POUPANÇA (SAVINGS GOALS CRUD)
// ==========================================================================

export function addGoal(g) {
  const newGoal = {
    id: generateId(),
    name: g.name,
    targetValue: Number(g.targetValue),
    currentValue: Number(g.currentValue),
    deadline: g.deadline,
    color: g.color || '#6366f1',
    icon: g.icon || 'piggy-bank'
  };
  state.goals.push(newGoal);
  notifyStateChanged();
  return newGoal;
}

export function updateGoal(id, updated) {
  const goal = state.goals.find(g => g.id === id);
  if (goal) {
    goal.name = updated.name;
    goal.targetValue = Number(updated.targetValue);
    goal.currentValue = Number(updated.currentValue);
    goal.deadline = updated.deadline;
    goal.color = updated.color;
    goal.icon = updated.icon;
    notifyStateChanged();
    return goal;
  }
  return null;
}

export function adjustGoalBalance(id, value, type) {
  const goal = state.goals.find(g => g.id === id);
  if (goal) {
    const amount = Number(value);
    if (type === 'deposit') {
      goal.currentValue += amount;
    } else if (type === 'withdraw') {
      goal.currentValue = Math.max(0, goal.currentValue - amount);
    }
    notifyStateChanged();
    return goal;
  }
  return null;
}

export function deleteGoal(id) {
  const index = state.goals.findIndex(g => g.id === id);
  if (index !== -1) {
    state.goals.splice(index, 1);
    notifyStateChanged();
    return true;
  }
  return false;
}

export function updateUserName(newName) {
  state.userName = newName;
  notifyStateChanged();
  return state.userName;
}

export function updateOnboardingSeen(seen) {
  state.hasSeenTour = seen;
  notifyStateChanged();
  return state.hasSeenTour;
}

export function updateSyncToken(token) {
  state.syncToken = token;
  saveData();
}


/**
 * Lógica Dinâmica de Autoprocessamento de Contas Recorrentes:
 * Verifica se a data atual ultrapassou o `nextDate` e cria transações correspondentes.
 */
export function processRecurring() {
  const todayStr = new Date().toISOString().split('T')[0];
  let stateUpdated = false;

  state.recurring.forEach(rec => {
    if (!rec.autoProcess) return;

    let next = new Date(rec.nextDate + 'T00:00:00');
    const today = new Date(todayStr + 'T00:00:00');

    // Executa loop caso tenha acumulado múltiplos períodos vencidos sem abrir o app
    while (next <= today) {
      const dateStr = next.toISOString().split('T')[0];
      
      // Cria a transação correspondente
      const newTx = {
        id: generateId(),
        description: `[Auto] ${rec.description}`,
        value: rec.value,
        date: dateStr,
        type: rec.type,
        category: rec.category,
        account: rec.account,
        isRecurring: true
      };
      
      state.transactions.push(newTx);
      updateAccountBalanceOnTransaction(rec.account, rec.value, rec.type, 'add');

      // Atualiza datas
      rec.lastProcessedDate = dateStr;
      
      // Incrementa a data com base na frequência
      if (rec.frequency === 'weekly') {
        next.setDate(next.getDate() + 7);
      } else if (rec.frequency === 'monthly') {
        next.setMonth(next.getMonth() + 1);
      } else if (rec.frequency === 'yearly') {
        next.setFullYear(next.getFullYear() + 1);
      }
      
      rec.nextDate = next.toISOString().split('T')[0];
      stateUpdated = true;
    }
  });

  if (stateUpdated) {
    saveData();
  }
}

// ==========================================================================
// DADOS DEMONSTRATIVOS INICIAIS (MOCK DATA)
// ==========================================================================

function initMockData() {
  state.userName = 'Usuário';
  state.hasSeenTour = false;
  state.syncToken = '';
  // 1. Categorias Padrão
  const cSalario = { id: 'c-salario', name: 'Salário', type: 'income', color: '#10b981', icon: 'briefcase' };
  const cInvest = { id: 'c-invest', name: 'Investimentos', type: 'income', color: '#06b6d4', icon: 'trending-up' };
  const cFree = { id: 'c-freelance', name: 'Freelance', type: 'income', color: '#6366f1', icon: 'gift' };
  
  const cAliment = { id: 'c-alimentacao', name: 'Alimentação', type: 'expense', color: '#fb7185', icon: 'utensils' };
  const cAluguel = { id: 'c-casa', name: 'Casa & Aluguel', type: 'expense', color: '#3b82f6', icon: 'home' };
  const cLazer = { id: 'c-lazer', name: 'Lazer & Cinema', type: 'expense', color: '#fbbf24', icon: 'clapperboard' };
  const cTransp = { id: 'c-transporte', name: 'Transporte', type: 'expense', color: '#2dd4bf', icon: 'car' };
  const cSaude = { id: 'c-saude', name: 'Saúde & Farmácia', type: 'expense', color: '#f43f5e', icon: 'heart-pulse' };
  const cEduc = { id: 'c-educacao', name: 'Educação', type: 'expense', color: '#a855f7', icon: 'graduation-cap' };

  state.categories = [cSalario, cInvest, cFree, cAliment, cAluguel, cLazer, cTransp, cSaude, cEduc];

  // O aplicativo começa completamente limpo (zerado) de dados
  state.accounts = [];
  state.budgets = [];
  state.recurring = [];
  state.goals = [];
  state.transactions = [];

  saveData();
}

export function loadDemoMockData() {
  // 1. Zerar absolutamente tudo para evitar duplicados
  state.transactions = [];
  state.categories = [];
  state.accounts = [];
  state.budgets = [];
  state.recurring = [];
  state.goals = [];
  
  // 2. Recriar categorias padrão usando o método exposto
  const cSalario = addCategory({ name: 'Salário', type: 'income', color: '#10b981', icon: 'briefcase' });
  const cInvest = addCategory({ name: 'Investimentos', type: 'income', color: '#06b6d4', icon: 'trending-up' });
  const cFree = addCategory({ name: 'Freelance', type: 'income', color: '#6366f1', icon: 'gift' });
  
  const cAliment = addCategory({ name: 'Alimentação', type: 'expense', color: '#fb7185', icon: 'utensils' });
  const cAluguel = addCategory({ name: 'Casa & Aluguel', type: 'expense', color: '#3b82f6', icon: 'home' });
  const cLazer = addCategory({ name: 'Lazer & Cinema', type: 'expense', color: '#fbbf24', icon: 'clapperboard' });
  const cTransp = addCategory({ name: 'Transporte', type: 'expense', color: '#2dd4bf', icon: 'car' });
  const cSaude = addCategory({ name: 'Saúde & Farmácia', type: 'expense', color: '#f43f5e', icon: 'heart-pulse' });
  const cEduc = addCategory({ name: 'Educação', type: 'expense', color: '#a855f7', icon: 'graduation-cap' });

  // 3. Cadastrar contas com saldos iniciais de partida
  const accNubank = addAccount({ name: 'Nubank (Corrente)', type: 'checking', balance: 2450.00 });
  const accPoupanca = addAccount({ name: 'Caixa Poupança', type: 'savings', balance: 12000.00 });
  const accCarteira = addAccount({ name: 'Carteira (Dinheiro)', type: 'cash', balance: 150.00 });
  const accMastercard = addAccount({ name: 'Mastercard Nubank', type: 'credit', balance: -850.00 });

  // 4. Cadastrar orçamentos por categoria
  addBudget({ category: cAliment.id, period: 'monthly', amount: 800.00 });
  addBudget({ category: cLazer.id, period: 'monthly', amount: 300.00 });
  addBudget({ category: cTransp.id, period: 'monthly', amount: 400.00 });

  // 5. Cadastrar metas de poupança (prazos no futuro usando dias negativos)
  addGoal({ name: 'Reserva de Emergência', targetValue: 15000.00, currentValue: 12000.00, deadline: getRelativeDate(-180), color: '#10b981', icon: 'shield' });
  addGoal({ name: 'Viagem para Buenos Aires', targetValue: 6000.00, currentValue: 2400.00, deadline: getRelativeDate(-240), color: '#3b82f6', icon: 'plane' });

  // 6. Cadastrar recorrências
  addRecurring({
    description: 'Assinatura Netflix',
    value: 55.90,
    type: 'expense',
    frequency: 'monthly',
    category: cLazer.id,
    account: accMastercard.id,
    startDate: getRelativeDate(15),
    autoProcess: true
  });
  addRecurring({
    description: 'Aluguel Apartamento',
    value: 1200.00,
    type: 'expense',
    frequency: 'monthly',
    category: cAluguel.id,
    account: accNubank.id,
    startDate: getRelativeDate(10),
    autoProcess: true
  });

  // 7. Cadastrar transações com datas realistas nos últimos 15 dias para gráficos perfeitos
  addTransaction({ description: 'Salário Mensal', value: 4500.00, date: getRelativeDate(15), type: 'income', category: cSalario.id, account: accNubank.id });
  addTransaction({ description: 'Freelance Website UI', value: 850.00, date: getRelativeDate(5), type: 'income', category: cFree.id, account: accNubank.id });
  addTransaction({ description: 'Rendimento Poupança', value: 72.50, date: getRelativeDate(2), type: 'income', category: cInvest.id, account: accPoupanca.id });

  addTransaction({ description: 'Aluguel Mensal', value: 1200.00, date: getRelativeDate(10), type: 'expense', category: cAluguel.id, account: accNubank.id });
  addTransaction({ description: 'Supermercado Mensal', value: 345.90, date: getRelativeDate(8), type: 'expense', category: cAliment.id, account: accMastercard.id });
  addTransaction({ description: 'Combustível Posto Shell', value: 180.00, date: getRelativeDate(7), type: 'expense', category: cTransp.id, account: accMastercard.id });
  addTransaction({ description: 'Jantar em Casal', value: 120.00, date: getRelativeDate(5), type: 'expense', category: cLazer.id, account: accMastercard.id });
  addTransaction({ description: 'Uber para Reunião', value: 24.50, date: getRelativeDate(4), type: 'expense', category: cTransp.id, account: accCarteira.id });
  addTransaction({ description: 'Cinema & Pipoca', value: 65.00, date: getRelativeDate(3), type: 'expense', category: cLazer.id, account: accCarteira.id });
  addTransaction({ description: 'Farmácia de Manipulação', value: 89.90, date: getRelativeDate(2), type: 'expense', category: cSaude.id, account: accMastercard.id });
  addTransaction({ description: 'Curso de Finanças Online', value: 199.90, date: getRelativeDate(1), type: 'expense', category: cEduc.id, account: accMastercard.id });

  state.userName = 'Carlos Oliveira';
  state.hasSeenTour = true;
  notifyStateChanged();
}

// ==========================================================================
// INTEGRAÇÃO DE SINCRONIZAÇÃO EM NUVEM (GOOGLE APPS SCRIPT)
// ==========================================================================

export function triggerDebouncedSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  
  dispatchSyncStatus('syncing', 'Sincronização pendente...');
  syncTimeout = setTimeout(() => {
    pushToCloud();
  }, 2500); // Debounce de 2.5 segundos para acumular edições rápidas
}

export async function setSyncUrl(url) {
  state.syncUrl = url;
  state.lastUpdated = new Date().toISOString();
  saveData();
  
  if (!url) {
    state.lastSynced = null;
    saveData();
    dispatchSyncStatus('disconnected');
    return;
  }
  
  // Realiza a primeira sincronização / conexão imediata
  await checkCloudSync(true);
}

export function disconnectCloud() {
  state.syncUrl = '';
  state.lastSynced = null;
  saveData();
  dispatchSyncStatus('disconnected');
  notifyStateChanged();
}

/**
 * Verifica se há novos dados na nuvem e resolve quem é o mais atualizado.
 * @param {boolean} forcePush força o envio do estado local para a planilha
 */
export async function checkCloudSync(forcePush = false) {
  if (!state.syncUrl) {
    dispatchSyncStatus('disconnected');
    return;
  }

  isSyncingInProgress = true;
  dispatchSyncStatus('syncing', 'Buscando dados na nuvem...');

  try {
    const response = await fetch(state.syncUrl);
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }
    
    const result = await response.json();
    const remoteLastUpdated = result.lastUpdated;
    const remoteState = result.state;

    // Caso A: Planilha recém-criada (sem dados na nuvem) ou forçar envio
    if (!remoteState || forcePush) {
      await pushToCloud();
      return;
    }

    // Caso B: Dados da nuvem são mais recentes -> Overwrite local
    const localTime = new Date(state.lastUpdated).getTime();
    const remoteTime = new Date(remoteLastUpdated).getTime();

    if (remoteTime > localTime) {
      dispatchSyncStatus('syncing', 'Nuvem mais recente. Atualizando local...');
      
      // Preserva a URL de sincronização local atual
      const currentUrl = state.syncUrl;
      state = remoteState;
      state.syncUrl = currentUrl;
      
      saveData();
      isSyncingInProgress = false;
      
      // Dispara renderização geral na UI
      stateListeners.forEach(listener => listener(state));
      dispatchSyncStatus('connected', 'Sincronizado da Nuvem.');
    } 
    // Caso C: Local é mais recente -> Faz Push para a nuvem
    else if (localTime > remoteTime) {
      dispatchSyncStatus('syncing', 'Local mais recente. Atualizando nuvem...');
      await pushToCloud();
    } 
    // Caso D: Já estão em perfeita sincronia
    else {
      isSyncingInProgress = false;
      dispatchSyncStatus('connected', 'Sincronizado.');
    }
  } catch (error) {
    console.error("Erro na sincronização:", error);
    isSyncingInProgress = false;
    dispatchSyncStatus('error', error.message || 'Falha de conexão');
  }
}

/**
 * Envia o estado completo local para a planilha em nuvem.
 */
export async function pushToCloud() {
  if (!state.syncUrl) return;

  isSyncingInProgress = true;
  dispatchSyncStatus('syncing', 'Enviando dados para a nuvem...');

  try {
    state.lastUpdated = new Date().toISOString();
    saveData();

    // IMPORTANTE: Não enviamos o Header Content-Type para evitar requisições OPTIONS prévias (CORS)
    const response = await fetch(state.syncUrl, {
      method: 'POST',
      body: JSON.stringify({
        lastUpdated: state.lastUpdated,
        state: state
      })
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    state.lastSynced = new Date().toISOString();
    saveData();
    
    isSyncingInProgress = false;
    dispatchSyncStatus('connected', 'Sincronizado e salvo na nuvem.');
  } catch (error) {
    console.error("Erro ao fazer upload dos dados:", error);
    isSyncingInProgress = false;
    dispatchSyncStatus('error', 'Falha ao salvar na nuvem.');
  }
}

/**
 * Valida a licença do e-mail do usuário usando o endpoint serverless na Vercel.
 */
export async function verifyLicense(email) {
  if (!email || !email.includes('@')) {
    return { success: false, message: 'Por favor, insira um e-mail válido.' };
  }

  try {
    const url = `${LICENSE_API_URL}?email=${encodeURIComponent(email.trim().toLowerCase())}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro na validação (${response.status})`);
    }

    const data = await response.json();
    if (data.active) {
      state.licenseEmail = email.trim().toLowerCase();
      state.licenseStatus = 'active';
      state.licensePlan = data.plan_type || '';
      notifyStateChanged();
      return { success: true, message: 'Licença ativada com sucesso!' };
    } else {
      state.licenseStatus = data.plan_type ? data.status || 'inactive' : 'inactive';
      state.licensePlan = data.plan_type || '';
      notifyStateChanged();
      return { success: false, message: data.message || 'Licença inativa ou não cadastrada.' };
    }
  } catch (err) {
    console.error('Erro de validação de licença:', err);
    return { success: false, message: 'Não foi possível conectar ao servidor de ativação. Verifique sua internet.' };
  }
}

/**
 * Validação em segundo plano (silent) executada no boot do aplicativo para prevenir chargebacks.
 * Caso o usuário esteja offline, a validação é pulada permitindo o funcionamento local.
 */
export async function checkBackgroundLicense() {
  if (!state.licenseEmail) return;

  try {
    const url = `${LICENSE_API_URL}?email=${encodeURIComponent(state.licenseEmail)}`;
    const response = await fetch(url);
    if (!response.ok) return; // Se o servidor de licenças falhar (ex: 500 ou offline), não bloqueia

    const data = await response.json();
    const oldStatus = state.licenseStatus;
    const oldPlan = state.licensePlan;
    
    if (data.active) {
      state.licenseStatus = 'active';
      state.licensePlan = data.plan_type || '';
    } else {
      state.licenseStatus = data.status || 'inactive';
      state.licensePlan = data.plan_type || '';
    }

    if (oldStatus !== state.licenseStatus || oldPlan !== state.licensePlan) {
      notifyStateChanged();
    }
  } catch (err) {
    // Offline silencioso: respeita o funcionamento Local-First do app
    console.warn('Verificação de licença em segundo plano falhou (usuário offline):', err.message);
  }
}

