# 💰 Meu Dindin - Painel Financeiro Pessoal Premium

> **Seu gerenciador financeiro 100% offline e seguro, com sincronização em nuvem opcional.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Demo-Vercel-informational?logo=vercel)](https://meu-dindin-three.vercel.app)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34C26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)

---

## ✨ Sobre o Projeto

**Meu Dindin** é um painel financeiro pessoal moderno, premium e minimalista desenvolvido com HTML, CSS e JavaScript vanilla. Ele oferece uma solução completa para gestão de finanças pessoais com interface intuitiva, gráficos interativos e sincronização opcional com Google Sheets.

### 🎯 Características Principais

- 📊 **Dashboard Inteligente** - Visualize sua saúde financeira em tempo real
- 💳 **Gerenciamento de Contas** - Múltiplas contas bancárias, cartões e carteiras
- 📋 **Transações Detalhadas** - Registre receitas e despesas com categorias personalizadas
- 💰 **Orçamentos & Metas** - Estabeleça limites de gastos e objetivos de poupança
- 📅 **Contas Recorrentes** - Controle de assinaturas, salários fixos e parcelamentos
- 📈 **Gráficos Avançados** - Evolução financeira, distribuição de despesas
- ☁️ **Sincronização Cloud** - Backup automático em Google Sheets
- 🔐 **100% Offline & Seguro** - Seus dados armazenados localmente no navegador
- 📱 **Responsivo** - Funciona perfeitamente em desktop e mobile
- 🎨 **Design Premium** - Interface moderna com glassmorphism e animações suaves

---

## 🚀 Como Usar

### 1. Acesso Rápido
Visite a aplicação em: **[meu-dindin-three.vercel.app](https://meu-dindin-three.vercel.app)**

### 2. Instalação Local

#### Pré-requisitos
- Node.js (opcional, apenas para servidor local)
- Git

#### Passos

```bash
# Clone o repositório
git clone https://github.com/agnoraai-dev/meu_dindin.git
cd meu_dindin

# Opção A: Com HTTP Server
npm install
npm run dev

# Opção B: Abra o arquivo index.html diretamente no navegador
# Clique duplo em: index.html
```

Acesse `http://localhost:3000` (ou a porta configurada)

---

## 📖 Estrutura do Projeto

```
meu_dindin/
├── index.html              # Arquivo principal da aplicação
├── package.json            # Dependências do projeto
├── README.md              # Este arquivo
├── LICENSE.md             # Licença MIT
│
├── css/
│   └── styles.css         # Estilos gerais e componentes
│
├── js/
│   ├── app.js             # Lógica principal da aplicação
│   ├── storage.js         # Gerenciamento de dados (LocalStorage)
│   ├── cloud-sync.js      # Sincronização com Google Sheets
│   ├── analytics.js       # Cálculos e estatísticas
│   └── charts.js          # Gráficos com Chart.js
│
├── images/
│   └── logo.png          # Logo da marca
│
├── docs/
│   └── SETUP.md          # Guia de configuração avançada
│
├── marketing/
│   └── ...               # Materiais promocionais
│
└── api/
    └── ...               # Endpoints auxiliares (se aplicável)
```

---

## 🎨 Funcionalidades Detalhadas

### 📊 Dashboard
- **Saldo Consolidado** - Soma de todas as contas
- **Receitas Totais** - Ganhos mensais
- **Despesas Totais** - Gastos mensais
- **Taxa de Poupança** - Percentual de economia
- **Gráficos Interativos** - Evolução mensal e distribuição por categoria
- **Transações Recentes** - Últimos lançamentos
- **Alertas Inteligentes** - Contas a vencer e orçamentos em risco

### 💳 Gerenciar Contas
- Criar/editar/deletar contas
- Tipos suportados: Conta Corrente, Poupança, Cartão de Crédito, Dinheiro em Espécie
- Saldo inicial personalizável
- Atualização automática de saldos

### 📋 Transações
- Registrar receitas e despesas
- Categorias personalizáveis com cores e ícones
- Filtros avançados: tipo, categoria, conta, período
- Busca por descrição
- Marcar como recorrente
- Editar/deletar lançamentos
- Exportar/importar dados em JSON

### 🎯 Orçamentos
- **Limites de Gastos**: Defina limites diários, mensais ou anuais por categoria
- **Metas de Poupança**: Estabeleça objetivos financeiros (viagem, emergência, etc.)
- **Progresso Visual**: Barras de progresso e alertas quando próximo do limite
- **Análise de Cumprimento**: Acompanhe o sucesso de suas metas

### 📅 Contas Recorrentes
- Registre assinaturas (Netflix, Spotify, etc.)
- Receitas fixas (salário, aluguel recebido, etc.)
- Auto-lançamento automático
- Frequência: Semanal, Mensal, Anual
- Controle de próximos vencimentos

### ☁️ Sincronização em Nuvem
- Backup automático em Google Sheets
- Sincronização bidirecional
- Geração de abas legíveis na planilha
- Sem necessidade de autenticação adicional

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Design responsivo com Flexbox e Grid
- **JavaScript Vanilla** - Sem dependências pesadas

### Bibliotecas
- **Chart.js** - Gráficos interativos
- **Lucide Icons** - Ícones modernos via SVG
- **Google Fonts** - Tipografia (Outfit, Plus Jakarta Sans)
- **Supabase.js** - Integração com backend (opcional)

### Armazenamento
- **LocalStorage** - Dados persistentes no navegador
- **Google Sheets API** - Sincronização em nuvem

---

## 🔐 Segurança & Privacidade

✅ **Dados 100% Locais** - Todos os dados são armazenados no LocalStorage do seu navegador  
✅ **Sem Servidores** - Nenhuma informação é enviada a servidores não autorizados  
✅ **Sincronização Opcional** - Você controla se quer usar Google Sheets  
✅ **Backup Seguro** - Exporte seus dados a qualquer momento  
✅ **HTTPS Only** - Conexão segura garantida

---

## 📱 Responsividade

- ✅ Desktop (1920px+)
- ✅ Laptop (1024px - 1920px)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (320px - 768px)

Navegação intuitiva com:
- Sidebar em desktop
- Bottom navigation em mobile
- Componentes adaptativos

---

## 💾 Backup & Exportação

### Exportar Dados
```javascript
// Os dados são exportados em formato JSON
// Clique em "Exportar Dados" na seção de Transações
// Um arquivo será baixado: meu-dindin-backup.json
```

### Importar Dados
```javascript
// Para restaurar, selecione o arquivo JSON salvo
// Clique em "Importar Dados" e escolha o arquivo
// Os dados serão restaurados automaticamente
```

---

## 🎓 Como Usar a Sincronização em Nuvem

### Passo 1: Preparar Google Drive
1. Acesse [Google Drive](https://drive.google.com)
2. Crie uma nova planilha em branco
3. Vá até **Extensões** > **Apps Script**

### Passo 2: Adicionar Script
1. Copie o código fornecido na interface do Meu Dindin
2. Cole no Google Apps Script
3. Clique em **Salvar** (ícone de disquete)

### Passo 3: Fazer Deploy
1. Clique em **Implantar** > **Nova implantação**
2. Selecione **App da web**
3. Configure para executar como sua conta
4. Copie a URL gerada

### Passo 4: Conectar no Meu Dindin
1. Clique no ícone de nuvem (canto superior direito)
2. Cole a URL do Google Apps Script
3. Clique em **Conectar Planilha**
4. Sincronize seus dados!

---

## 🐛 Troubleshooting

### Dados não aparecem após atualizar página
- Verifique se o LocalStorage está habilitado no seu navegador
- Tente fazer um refresh (Ctrl+F5)
- Importe os dados via backup

### Sincronização não funciona
- Verifique se a URL do Google Apps Script está correta
- Confirme se o script foi publicado como "Web App"
- Tente fazer deploy novamente

### Gráficos não aparecem
- Certifique-se que tem dados no período selecionado
- Limpe o cache do navegador
- Tente em outro navegador

---

## 📞 Suporte & Contribuição

### Reportar Bugs
Abra uma [Issue](https://github.com/agnoraai-dev/meu_dindin/issues) descrevendo o problema.

### Sugestões de Features
Sua sugestão é bem-vinda! Comente em [Discussions](https://github.com/agnoraai-dev/meu_dindin/discussions)

### Contribuir
1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença **MIT** - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes.

---

## 👥 Autores

- **Carlos Oliveira** - Desenvolvedor Principal
- **Antigravity** - Co-Criador

---

## 🙏 Agradecimentos

- Google Fonts pela tipografia
- Chart.js pelos gráficos
- Lucide Icons pelos ícones
- Comunidade de desenvolvedores

---

## 📊 Estatísticas do Projeto

![GitHub stars](https://img.shields.io/github/stars/agnoraai-dev/meu_dindin?style=social)
![GitHub forks](https://img.shields.io/github/forks/agnoraai-dev/meu_dindin?style=social)
![GitHub issues](https://img.shields.io/github/issues/agnoraai-dev/meu_dindin)

---

## 🔮 Roadmap Futuro

- [ ] App Mobile nativo (React Native)
- [ ] Integração com APIs de bancos brasileiros
- [ ] Sistema de categorização inteligente com IA
- [ ] Relatórios PDF avançados
- [ ] Dark mode melhorado
- [ ] Suporte para múltiplas moedas
- [ ] Sincronização em tempo real
- [ ] Sistema de notificações push

---

## 📧 Contato

Dúvidas ou feedback? Entre em contato:
- Email: [contato@meudindin.com.br](mailto:contato@meudindin.com.br)
- Twitter: [@meudindin](https://twitter.com/meudindin)
- Website: [meu-dindin-three.vercel.app](https://meu-dindin-three.vercel.app)

---

## ⭐ Gostou do Projeto?

Se você achou útil, deixe uma ⭐ no repositório! Isso nos motiva a continuar desenvolvendo.

**Meu Dindin** - *Controle suas finanças com segurança e elegância.* 💪💰
