/* ==========================================================================
   INICIALIZAÇÃO DO SISTEMA E GERENCIAMENTO DE EVENTOS (app.js)
   ========================================================================== */

import * as State from './state.js';
import * as UI from './ui.js';
import * as Charts from './charts.js';

// Executado ao carregar o aplicativo
window.addEventListener('DOMContentLoaded', () => {
  // 1. Carrega os dados ou inicializa com dados mock
  State.loadData();

  // 1.5. Inicializa os ouvintes da tela de ativação
  UI.initActivationUI();

  // 2. Inicializa o estado dos gráficos
  Charts.initCharts();

  // 3. Configura a navegação SPA
  UI.initNavigation();

  // 4. Configura as ações de troca de mês/ano
  UI.configurePeriodNavigation();

  // 5. Configura o fechamento automático de modais
  UI.setupModalCloseListeners();

  // 5.5 Configura o carrossel e botões do onboarding tour
  UI.initOnboardingUI();

  // 6. Inicializa os controles e assinaturas de sincronização Cloud
  UI.initCloudSyncUI();

  // 6.5 Configura a navegação de abas internas em Orçamentos e Metas
  UI.configureBudgetsAndGoalsNavigation();

  // 7. Inscreve a UI para re-renderizar em qualquer mudança de dados
  State.subscribeState(() => {
    UI.renderAll();
  });

  // 8. Configura os ouvintes de formulários e botões de ação
  setupFormEventListeners();
  setupActionEventListeners();
  setupFilterEventListeners();

  // 9. Primeiro render geral para apresentar a interface povoada (ou tela de ativação)
  UI.renderAll();

  // 9.5 Exibe o Onboarding Tour automaticamente no primeiro acesso
  UI.showOnboardingIfNeeded();

  // 10. Verifica licença e sincronização em segundo plano
  setTimeout(() => {
    State.checkBackgroundLicense();
    State.checkCloudSync();
  }, 1000);
});

// ==========================================================================
// CONFIGURAÇÃO DOS FORMULÁRIOS (SUBMIT CRUD)
// ==========================================================================

function setupFormEventListeners() {
  
  // A. Formulário de Transações
  document.getElementById('form-transaction')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('tx-id').value;
    
    // Captura o tipo do radio button
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    
    const txData = {
      description: document.getElementById('tx-description').value,
      value: document.getElementById('tx-value').value,
      date: document.getElementById('tx-date').value,
      type: type,
      category: document.getElementById('tx-category').value,
      account: document.getElementById('tx-account').value,
      isRecurring: document.getElementById('tx-is-recurring').checked
    };

    if (id) {
      State.updateTransaction(id, txData);
    } else {
      State.addTransaction(txData);
    }

    UI.closeModal('modal-transaction');
  });

  // B. Formulário de Contas
  document.getElementById('form-account')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('account-id').value;
    
    const accData = {
      name: document.getElementById('account-name').value,
      type: document.getElementById('account-type').value,
      balance: document.getElementById('account-balance').value
    };

    if (id) {
      State.updateAccount(id, accData);
    } else {
      State.addAccount(accData);
    }

    UI.closeModal('modal-account');
  });

  // C. Formulário de Categorias
  document.getElementById('form-category')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('category-id').value;
    
    const catData = {
      name: document.getElementById('category-name').value,
      type: document.getElementById('category-type').value,
      color: document.getElementById('category-color').value,
      icon: document.getElementById('category-icon').value
    };

    if (id) {
      State.updateCategory(id, catData);
    } else {
      State.addCategory(catData);
    }

    UI.closeModal('modal-category');
  });

  // D. Formulário de Orçamentos
  document.getElementById('form-budget')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('budget-id').value;
    
    const budData = {
      category: document.getElementById('budget-category').value,
      period: document.getElementById('budget-period').value,
      amount: document.getElementById('budget-amount').value
    };

    if (id) {
      State.updateBudget(id, budData);
    } else {
      State.addBudget(budData);
    }

    UI.closeModal('modal-budget');
  });

  // E. Formulário de Lançamentos Recorrentes
  document.getElementById('form-recurring')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('recurring-id').value;
    
    const recData = {
      description: document.getElementById('recurring-description').value,
      value: document.getElementById('recurring-value').value,
      type: document.getElementById('recurring-type').value,
      frequency: document.getElementById('recurring-frequency').value,
      category: document.getElementById('recurring-category').value,
      account: document.getElementById('recurring-account').value,
      startDate: document.getElementById('recurring-start-date').value,
      autoProcess: document.getElementById('recurring-auto-process').checked
    };

    if (id) {
      State.updateRecurring(id, recData);
    } else {
      State.addRecurring(recData);
    }

    UI.closeModal('modal-recurring');
  });

  // F. Formulário de Metas Financeiras (Goals)
  document.getElementById('form-goal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('goal-id').value;
    
    const goalData = {
      name: document.getElementById('goal-name').value,
      targetValue: document.getElementById('goal-target').value,
      currentValue: document.getElementById('goal-current').value,
      deadline: document.getElementById('goal-deadline').value,
      color: document.getElementById('goal-color').value,
      icon: document.getElementById('goal-icon').value
    };

    if (id) {
      State.updateGoal(id, goalData);
    } else {
      State.addGoal(goalData);
    }

    UI.closeModal('modal-goal');
  });

  // G. Formulário de Ajuste Rápido de Saldo de Metas (Depósito/Retirada)
  document.getElementById('form-goal-adjust')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('adjust-goal-id').value;
    const type = document.querySelector('input[name="adjust-type"]:checked').value;
    const value = document.getElementById('adjust-value').value;

    if (id && value) {
      State.adjustGoalBalance(id, value, type);
    }

    UI.closeModal('modal-goal-adjust');
  });

  // H. Formulário de Personalizar Perfil
  document.getElementById('form-profile')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = document.getElementById('profile-name').value.trim();
    if (newName) {
      State.updateUserName(newName);
    }
    UI.closeModal('modal-profile');

    // Se estiver no fluxo inicial do onboarding, dispara o Tour na Tela!
    if (window.isOnboardingFlow) {
      window.isOnboardingFlow = false;
      setTimeout(() => {
        UI.startInteractiveScreenTour();
      }, 400);
    }
  });
}

// ==========================================================================
// CONFIGURAÇÃO DOS BOTÕES DE AÇÃO RÁPIDA (MODAL TRIGGERS)
// ==========================================================================

function setupActionEventListeners() {
  
  // Botões de Novo Lançamento (Topbar)
  document.getElementById('btn-new-transaction')?.addEventListener('click', () => {
    UI.openNewTransactionModal();
  });

  // Novo Limite de Orçamento
  document.getElementById('btn-new-budget')?.addEventListener('click', () => {
    UI.openNewBudgetModal();
  });

  // Nova Conta
  document.getElementById('btn-add-account')?.addEventListener('click', () => {
    UI.openNewAccountModal();
  });

  // Nova Categoria
  document.getElementById('btn-add-category')?.addEventListener('click', () => {
    UI.openNewCategoryModal();
  });

  // Novo Lançamento Recorrente
  document.getElementById('btn-new-recurring')?.addEventListener('click', () => {
    UI.openNewRecurringModal();
  });

  // Nova Meta Financeira
  document.getElementById('btn-new-goal')?.addEventListener('click', () => {
    UI.openNewGoalModal();
  });

  // Personalizar Perfil (Sidebar Footer)
  document.querySelector('.user-profile')?.addEventListener('click', () => {
    UI.openProfileModal();
  });

  // --- Importar / Exportar / Reset ---
  document.getElementById('btn-export')?.addEventListener('click', () => {
    const json = State.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `MeuDindin_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  const fileInput = document.getElementById('file-import');
  document.getElementById('btn-import-trigger')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const contents = evt.target.result;
      const success = State.importFromJSON(contents);
      if (success) {
        alert("Dados importados com sucesso!");
      } else {
        alert("Erro ao importar arquivo JSON. Certifique-se de que é um formato válido.");
      }
    };
    reader.readAsText(file);
    // Limpa valor do input para permitir re-upload do mesmo arquivo
    e.target.value = '';
  });

  // Ouvintes da Zona de Perigo (Limpeza e Reset do Aplicativo)
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm("ATENÇÃO: Isso apagará todas as suas transações e orçamentos, mas manterá suas contas (com saldo zerado) e categorias para você começar do zero. Deseja prosseguir?")) {
      State.resetAllData(true);
      alert("Lançamentos limpos e contas zeradas com sucesso!");
    }
  });

  document.getElementById('btn-load-demo')?.addEventListener('click', () => {
    if (confirm("Deseja carregar a base de dados de demonstração com contas, metas e transações fictícias pré-configuradas? Isso irá substituir quaisquer dados locais atuais.")) {
      State.loadDemoMockData();
      alert("Base de dados fictícia carregada com sucesso! Você já pode navegar nas telas e gerar capturas de tela.");
    }
  });

  document.getElementById('btn-wipe-transactions')?.addEventListener('click', () => {
    if (confirm("ATENÇÃO: Isso apagará todas as suas transações, metas de orçamento e agendamentos recorrentes. Suas contas (com saldo zerado) e suas categorias cadastradas serão preservadas para você começar a digitar seus dados reais imediatamente. Confirmar?")) {
      State.resetAllData(true);
      alert("Lançamentos limpos e saldos zerados com sucesso!");
    }
  });

  document.getElementById('btn-wipe-nuclear')?.addEventListener('click', () => {
    if (confirm("🚨 ATENÇÃO MÁXIMA: Esta é uma limpeza nuclear irreversível! Ela apagará TODOS os dados, incluindo transações, contas, categorias cadastradas e orçamentos, deixando o aplicativo 100% em branco. Deseja continuar?")) {
      if (confirm("⚠️ CONFIRMAÇÃO FINAL: Tem absoluta certeza que deseja deletar todas as categorias e contas cadastradas? Você terá que recriá-las do zero.")) {
        State.resetAllData(false);
        alert("Aplicativo redefinido completamente para o estado em branco.");
      }
    }
  });
}

// ==========================================================================
// CONFIGURAÇÃO DOS FILTROS DA TELA DE LANÇAMENTOS
// ==========================================================================

function setupFilterEventListeners() {
  const inputs = ['filter-search', 'filter-type', 'filter-category', 'filter-account'];
  
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    const eventType = id.includes('search') ? 'input' : 'change';
    el.addEventListener(eventType, () => {
      // Força a atualização da view de transações
      UI.renderAll();
    });
  });
}
