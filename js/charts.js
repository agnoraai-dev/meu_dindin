/* ==========================================================================
   RENDERIZAÇÃO E ATUALIZAÇÃO DE GRÁFICOS (charts.js)
   ========================================================================== */

let evolutionChart = null;
let categoryChart = null;

// Configuração de fonte padrão global para os gráficos
const chartFontConfig = {
  family: "'Outfit', 'Plus Jakarta Sans', sans-serif",
  size: 11
};

/**
 * Inicializa os gráficos vazios ou com configurações base.
 */
export function initCharts() {
  const evolutionCtx = document.getElementById('chart-evolution')?.getContext('2d');
  const categoriesCtx = document.getElementById('chart-categories')?.getContext('2d');

  if (evolutionCtx) {
    evolutionChart = new Chart(evolutionCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: chartFontConfig,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: '#151f32',
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            displayColors: true,
            titleFont: { family: "'Outfit', sans-serif", weight: 'bold' },
            bodyFont: { family: "'Outfit', sans-serif" }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'transparent'
            },
            ticks: {
              color: '#64748b',
              font: chartFontConfig
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'transparent'
            },
            ticks: {
              color: '#64748b',
              font: chartFontConfig,
              callback: function(value) {
                return 'R$ ' + value.toLocaleString('pt-BR');
              }
            }
          }
        }
      }
    });
  }

  if (categoriesCtx) {
    categoryChart = new Chart(categoriesCtx, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: chartFontConfig,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: '#151f32',
            titleColor: '#f8fafc',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: function(context) {
                const value = context.raw;
                return ` R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
              }
            }
          }
        }
      }
    });
  }
}

/**
 * Atualiza os dados dos dois gráficos com base nas transações atuais.
 */
export function updateCharts(transactions, categories, currentMonth, currentYear) {
  updateEvolutionChart(transactions, currentMonth, currentYear);
  updateCategoryChart(transactions, categories, currentMonth, currentYear);
}

/**
 * Gráfico 1: Evolução Financeira Mensal (Últimos 6 meses até o mês selecionado)
 */
function updateEvolutionChart(transactions, currentMonth, currentYear) {
  if (!evolutionChart) return;

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  
  // Monta uma lista dos últimos 6 meses cronológicos retroativos
  const targetMonths = [];
  let tempMonth = currentMonth;
  let tempYear = currentYear;
  
  for (let i = 5; i >= 0; i--) {
    const targetM = (tempMonth - i + 12) % 12;
    // Ajusta o ano se voltamos no tempo antes de Janeiro
    const yearOffset = Math.floor((tempMonth - i) / 12);
    const targetY = tempYear + yearOffset;
    
    targetMonths.push({
      monthNum: targetM,
      year: targetY,
      label: `${monthNames[targetM]} / ${targetY.toString().substring(2)}`
    });
  }

  // Agrega valores das transações para cada mês da lista
  const incomeData = Array(6).fill(0);
  const expenseData = Array(6).fill(0);

  transactions.forEach(t => {
    const txDate = new Date(t.date + 'T00:00:00');
    const txM = txDate.getMonth();
    const txY = txDate.getFullYear();

    // Procura se a transação cai em algum dos 6 meses listados
    const matchIndex = targetMonths.findIndex(tm => tm.monthNum === txM && tm.year === txY);
    if (matchIndex !== -1) {
      if (t.type === 'income') {
        incomeData[matchIndex] += Number(t.value);
      } else {
        expenseData[matchIndex] += Number(t.value);
      }
    }
  });

  const labels = targetMonths.map(tm => tm.label);
  
  // Cria degradê sofisticado para o preenchimento das áreas sob as curvas
  const ctx = evolutionChart.ctx;
  
  const incGradient = ctx.createLinearGradient(0, 0, 0, 300);
  incGradient.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
  incGradient.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

  const expGradient = ctx.createLinearGradient(0, 0, 0, 300);
  expGradient.addColorStop(0, 'rgba(244, 63, 94, 0.16)');
  expGradient.addColorStop(1, 'rgba(244, 63, 94, 0.00)');

  evolutionChart.data.labels = labels;
  evolutionChart.data.datasets = [
    {
      label: 'Receitas',
      data: incomeData,
      borderColor: '#10b981',
      borderWidth: 3,
      backgroundColor: incGradient,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#10b981',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#10b981',
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 2,
    },
    {
      label: 'Despesas',
      data: expenseData,
      borderColor: '#f43f5e',
      borderWidth: 3,
      backgroundColor: expGradient,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#f43f5e',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 1,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: '#f43f5e',
      pointHoverBorderColor: '#ffffff',
      pointHoverBorderWidth: 2,
    }
  ];

  evolutionChart.update();
}

/**
 * Gráfico 2: Despesas por Categoria do Mês Corrente
 */
function updateCategoryChart(transactions, categories, currentMonth, currentYear) {
  if (!categoryChart) return;

  // Filtra apenas despesas do mês selecionado
  const monthlyExpenses = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    const d = new Date(t.date + 'T00:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Agrupa valores por ID de categoria
  const catSums = {};
  monthlyExpenses.forEach(t => {
    const catId = t.category || 'c-outros';
    catSums[catId] = (catSums[catId] || 0) + Number(t.value);
  });

  const labels = [];
  const data = [];
  const colors = [];

  // Mapeia categorias cadastradas com valores acumulados
  Object.keys(catSums).forEach(catId => {
    const catObj = categories.find(c => c.id === catId);
    const catName = catObj ? catObj.name : 'Outros';
    const catColor = catObj ? catObj.color : '#64748b';

    labels.push(catName);
    data.push(catSums[catId]);
    colors.push(catColor);
  });

  // Estado vazio do gráfico de categorias
  if (data.length === 0) {
    categoryChart.data.labels = ['Sem Gastos'];
    categoryChart.data.datasets = [{
      data: [1],
      backgroundColor: ['rgba(255,255,255,0.06)'],
      borderWidth: 1,
      borderColor: '#151f32'
    }];
  } else {
    categoryChart.data.labels = labels;
    categoryChart.data.datasets = [{
      data: data,
      backgroundColor: colors,
      borderWidth: 2,
      borderColor: '#0f1626', // Combina com o fundo do card
      hoverOffset: 4
    }];
  }

  categoryChart.update();
}
