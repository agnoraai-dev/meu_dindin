/* ==========================================================================
   ASSISTENTE FINANCEIRO COM IA — CHAT COMERCIAL (chat.js)
   ========================================================================== */

import * as State from './state.js';

// ==========================================================================
// CONFIGURAÇÃO DA API PROXY
// ==========================================================================

const API_CHAT_URL = '/api/chat';
const MAX_HISTORY_LENGTH = 20;

// ==========================================================================
// ESTADO DO CHAT EM MEMÓRIA
// ==========================================================================

let chatHistory = [];
let isOpen = false;
let isTyping = false;

// Referências DOM (inicializadas em initChatUI)
let chatPanel, chatMessages, chatInput, chatFab, chatBadge;

// ==========================================================================
// INICIALIZAÇÃO E EVENT LISTENERS
// ==========================================================================

export function initChatUI() {
  chatFab = document.getElementById('chat-fab');
  chatPanel = document.getElementById('chat-panel');
  chatMessages = document.getElementById('chat-messages');
  chatInput = document.getElementById('chat-input');
  chatBadge = document.getElementById('chat-fab-badge');

  // FAB — abrir/fechar chat
  chatFab?.addEventListener('click', toggleChat);

  // Header — fechar chat
  document.getElementById('chat-close-btn')?.addEventListener('click', () => {
    if (isOpen) toggleChat();
  });

  // Header — limpar histórico
  document.getElementById('chat-clear-btn')?.addEventListener('click', clearChatHistory);

  // Input — enviar mensagem
  document.getElementById('chat-send-btn')?.addEventListener('click', handleSend);

  // Input — Enter para enviar (Shift+Enter para nova linha)
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Auto-resize do textarea
  chatInput?.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  });

  // Mensagem de boas-vindas
  addAssistantMessage(
    'Olá! Sou seu **Analista Financeiro Estratégico** 🎯\n\n' +
    'Posso analisar seus dados financeiros, diagnosticar sua saúde financeira e sugerir planos de ação personalizados.\n\n' +
    'Como posso te ajudar hoje?\n' +
    '- "Analise minha saúde financeira"\n' +
    '- "Onde posso cortar gastos?"\n' +
    '- "Como está meu orçamento este mês?"'
  );
}

// ==========================================================================
// CONTROLE DO PAINEL (ABRIR/FECHAR)
// ==========================================================================

export function toggleChat() {
  isOpen = !isOpen;

  chatPanel?.classList.toggle('active', isOpen);
  chatFab?.classList.toggle('active', isOpen);

  // Esconde badge ao abrir
  if (isOpen && chatBadge) {
    chatBadge.classList.remove('visible');
  }

  if (isOpen) {
    setTimeout(() => chatInput?.focus(), 300);
    scrollToBottom();
  }
}

// ==========================================================================
// ENVIO DE MENSAGEM
// ==========================================================================

function handleSend() {
  const text = chatInput?.value.trim();
  if (!text || isTyping) return;

  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendMessage(text);
}

async function sendMessage(userText) {
  // Renderiza mensagem do usuário
  renderMessage('user', userText);

  // Constrói o contexto financeiro em tempo real
  const financialContext = buildFinancialContext();

  // Adiciona ao histórico antes do envio
  chatHistory.push({
    role: 'user',
    parts: [{ text: userText }]
  });

  // Limita o tamanho do histórico
  if (chatHistory.length > MAX_HISTORY_LENGTH) {
    chatHistory = chatHistory.slice(-MAX_HISTORY_LENGTH);
  }

  // Exibe indicador de digitação
  showTyping(true);

  try {
    const response = await fetch(API_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: chatHistory,
        financialContext: financialContext
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    const assistantText = data.text || 'Desculpe, não consegui gerar uma resposta no momento.';

    // Adiciona resposta ao histórico
    chatHistory.push({
      role: 'model',
      parts: [{ text: assistantText }]
    });

    showTyping(false);
    renderMessage('assistant', assistantText);

  } catch (error) {
    showTyping(false);
    console.error('Erro ao conectar com assistente:', error);

    let errorMsg = '❌ **Erro ao conectar com o assistente.**';
    if (error.message?.includes('quota') || error.message?.includes('RATE_LIMIT') || error.message?.includes('solicitações')) {
      errorMsg = '⏳ **Limite de uso temporário atingido.** Aguarde alguns instantes e tente novamente.';
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      errorMsg = '🌐 **Sem conexão com a internet.** Verifique sua rede e tente novamente.';
    } else {
      errorMsg += `\n\n\`${error.message}\``;
    }

    // Remove última mensagem do histórico (a que falhou)
    chatHistory.pop();
    addSystemMessage(errorMsg);
  }
}

// ==========================================================================
// CONSTRUTOR DE CONTEXTO FINANCEIRO (ANONIMIZADO)
// ==========================================================================

function buildFinancialContext() {
  const data = State.loadData();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Filtra transações do mês corrente
  const monthlyTxs = data.transactions.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  let totalIncome = 0;
  let totalExpenses = 0;
  const expensesByCategory = {};
  const incomeByCategory = {};

  monthlyTxs.forEach(t => {
    const cat = data.categories.find(c => c.id === t.category);
    const catName = cat ? cat.name : 'Outros';

    if (t.type === 'income') {
      totalIncome += t.value;
      incomeByCategory[catName] = (incomeByCategory[catName] || 0) + t.value;
    } else {
      totalExpenses += t.value;
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + t.value;
    }
  });

  const totalBalance = data.accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const savingsRate = totalIncome > 0
    ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1)
    : '0.0';

  let ctx = `📊 CONTEXTO FINANCEIRO ATUAL DO USUÁRIO (${monthNames[currentMonth]}/${currentYear}):\n\n`;

  // --- Contas ---
  ctx += `💰 CONTAS CADASTRADAS:\n`;
  if (data.accounts.length === 0) {
    ctx += `- Nenhuma conta cadastrada\n`;
  } else {
    const typeNames = { checking: 'Conta Corrente', savings: 'Poupança/Investimento', credit: 'Cartão de Crédito', cash: 'Dinheiro Físico' };
    data.accounts.forEach(acc => {
      ctx += `- ${typeNames[acc.type] || 'Outra'}: R$ ${acc.balance.toFixed(2)}\n`;
    });
    ctx += `- SALDO TOTAL CONSOLIDADO: R$ ${totalBalance.toFixed(2)}\n`;
  }

  // --- Resumo Mensal ---
  ctx += `\n📅 RESUMO DO MÊS CORRENTE:\n`;
  ctx += `- Receitas totais: R$ ${totalIncome.toFixed(2)}\n`;
  ctx += `- Despesas totais: R$ ${totalExpenses.toFixed(2)}\n`;
  ctx += `- Saldo líquido do mês: R$ ${(totalIncome - totalExpenses).toFixed(2)}\n`;
  ctx += `- Taxa de poupança: ${savingsRate}%\n`;

  // --- Despesas por Categoria ---
  const expEntries = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
  if (expEntries.length > 0) {
    ctx += `\n📉 DESPESAS POR CATEGORIA (mês corrente):\n`;
    expEntries.forEach(([cat, value]) => {
      const pct = totalIncome > 0 ? (value / totalIncome * 100).toFixed(1) : '?';
      const flag = totalIncome > 0 && (value / totalIncome * 100) > 15 ? ' ⚠️ PONTO DE ATENÇÃO (>15% da renda)' : '';
      ctx += `- ${cat}: R$ ${value.toFixed(2)} (${pct}% da renda)${flag}\n`;
    });
  }

  // --- Receitas por Categoria ---
  const incEntries = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]);
  if (incEntries.length > 0) {
    ctx += `\n📈 RECEITAS POR FONTE:\n`;
    incEntries.forEach(([cat, value]) => {
      ctx += `- ${cat}: R$ ${value.toFixed(2)}\n`;
    });
  }

  // --- Orçamentos ---
  if (data.budgets.length > 0) {
    ctx += `\n🎯 ORÇAMENTOS CONFIGURADOS:\n`;
    const periodNames = { daily: 'Diário', monthly: 'Mensal', yearly: 'Anual' };
    data.budgets.forEach(b => {
      const cat = data.categories.find(c => c.id === b.category);
      const catName = cat ? cat.name : 'Outros';
      const spent = monthlyTxs
        .filter(t => t.type === 'expense' && t.category === b.category)
        .reduce((sum, t) => sum + t.value, 0);
      const pct = b.amount > 0 ? (spent / b.amount * 100).toFixed(0) : '0';
      const status = pct >= 100 ? '🔴 ESTOURADO' : pct >= 80 ? '🟡 LIMITE' : '🟢 OK';
      ctx += `- ${catName} (${periodNames[b.period]}): R$ ${spent.toFixed(2)} / R$ ${b.amount.toFixed(2)} (${pct}%) ${status}\n`;
    });
  }

  // --- Metas ---
  if (data.goals.length > 0) {
    ctx += `\n🏆 METAS DE POUPANÇA:\n`;
    data.goals.forEach(g => {
      const pct = g.targetValue > 0 ? (g.currentValue / g.targetValue * 100).toFixed(0) : '0';
      ctx += `- ${g.name}: R$ ${g.currentValue.toFixed(2)} / R$ ${g.targetValue.toFixed(2)} (${pct}%) — Prazo: ${g.deadline || 'Sem prazo'}\n`;
    });
  }

  // --- Contas Recorrentes ---
  if (data.recurring.length > 0) {
    ctx += `\n🔄 CONTAS RECORRENTES ATIVAS:\n`;
    const typeNames = { income: 'Receita', expense: 'Despesa' };
    const freqNames = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' };
    data.recurring.forEach(rec => {
      ctx += `- ${rec.description} (${typeNames[rec.type]}, ${freqNames[rec.frequency]}): R$ ${rec.value.toFixed(2)} — Próximo vencimento: ${rec.nextDate || 'N/A'}\n`;
    });
  }

  // --- Estatísticas gerais ---
  ctx += `\n📋 ESTATÍSTICAS GERAIS:\n`;
  ctx += `- Total de transações registradas: ${data.transactions.length}\n`;
  ctx += `- Total de categorias: ${data.categories.length}\n`;
  ctx += `- Total de contas: ${data.accounts.length}\n`;

  return ctx;
}

// ==========================================================================
// RENDERIZAÇÃO DE MENSAGENS
// ==========================================================================

function renderMessage(role, content) {
  if (!chatMessages) return;

  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${role}`;

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'chat-bubble';

  if (role === 'assistant' || role === 'system') {
    bubbleEl.innerHTML = parseMarkdown(content);
  } else {
    bubbleEl.textContent = content;
  }

  // Timestamp
  const timeEl = document.createElement('span');
  timeEl.className = 'chat-time';
  timeEl.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  msgEl.appendChild(bubbleEl);
  msgEl.appendChild(timeEl);
  chatMessages.appendChild(msgEl);

  scrollToBottom();
}

function addAssistantMessage(content) {
  renderMessage('assistant', content);
}

function addSystemMessage(content) {
  renderMessage('system', content);
}

// ==========================================================================
// INDICADOR DE DIGITAÇÃO
// ==========================================================================

function showTyping(show) {
  isTyping = show;
  let typingEl = document.getElementById('chat-typing');

  if (show) {
    if (!typingEl) {
      typingEl = document.createElement('div');
      typingEl.id = 'chat-typing';
      typingEl.className = 'chat-message assistant';
      typingEl.innerHTML = `
        <div class="chat-bubble typing-indicator">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      `;
      chatMessages?.appendChild(typingEl);
    }
    scrollToBottom();
  } else if (typingEl) {
    typingEl.remove();
  }
}

// ==========================================================================
// PARSER DE MARKDOWN BÁSICO
// ==========================================================================

function parseMarkdown(text) {
  if (!text) return '';

  let html = escapeHTML(text);

  // Headers (## e ###) — antes de processar negrito
  html = html.replace(/^### (.+)$/gm, '<h4 class="chat-md-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="chat-md-h3">$1</h3>');

  // [Diagnóstico], [Plano de Ação], [Alerta] — tags especiais
  html = html.replace(/\[Diagnóstico\]/gi, '<span class="chat-tag tag-diagnostico">📋 Diagnóstico</span>');
  html = html.replace(/\[Plano de Ação\]/gi, '<span class="chat-tag tag-plano">🎯 Plano de Ação</span>');
  html = html.replace(/\[Alerta\]/gi, '<span class="chat-tag tag-alerta">⚠️ Alerta</span>');

  // Negrito: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Itálico: *text* (não precedido por *)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Código inline: `text`
  html = html.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');

  // Listas com - (traço)
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul class="chat-list">${match}</ul>`);

  // Listas numeradas
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Quebras de linha
  html = html.replace(/\n/g, '<br>');

  // Remove <br> redundantes antes/depois de blocos
  html = html.replace(/<br>\s*(<ul|<h3|<h4|<\/ul>)/g, '$1');
  html = html.replace(/(<\/ul>|<\/h3>|<\/h4>)\s*<br>/g, '$1');

  return html;
}

function escapeHTML(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================================================
// AUXILIARES
// ==========================================================================

function scrollToBottom() {
  if (chatMessages) {
    setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
  }
}

function clearChatHistory() {
  chatHistory = [];
  if (chatMessages) {
    chatMessages.innerHTML = '';
  }
  addAssistantMessage(
    '🔄 Histórico limpo! Estou pronto para uma nova análise.\n\n' +
    'Pergunte-me sobre suas finanças a qualquer momento.'
  );
}
