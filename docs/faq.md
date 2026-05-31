# ❓ FAQ - Perguntas Frequentes | Meu Dindin

Bem-vindo à central de dúvidas do **Meu Dindin**! Este documento foi estruturado para ajudar você a aproveitar ao máximo todas as funcionalidades e recursos de segurança do seu novo aplicativo de controle financeiro.

---

## 📌 1. Visão Geral e Privacidade

### O que é o "Meu Dindin"?
O **Meu Dindin** é um organizador financeiro pessoal premium para computador. Projetado com um visual moderno e elegante (*Glassmorphism*), ele oferece controle completo sobre suas contas, despesas, receitas, limites de gastos mensais e metas de poupança para a realização dos seus sonhos.

### Meus dados financeiros estão seguros? Onde eles ficam salvos?
**Sim, totalmente seguros e privados.** O Meu Dindin adota a filosofia *Local-First* (Primeiro Local). Isso significa que todas as suas informações financeiras ficam armazenadas de forma segura e criptografada diretamente no seu computador. Nenhum servidor externo ou empresa terceirizada tem acesso aos seus dados. Eles pertencem unicamente a você!

### O aplicativo funciona totalmente offline?
**Sim!** O Meu Dindin foi desenhado para funcionar de forma 100% offline. Você pode registrar suas despesas, criar metas e gerenciar seu dinheiro sem precisar de nenhuma conexão com a internet. Caso você decida ativar a sincronização em nuvem com o seu Google Sheets, o aplicativo enviará as atualizações automaticamente assim que você se conectar à internet.

---

## ⚙️ 2. Uso do Aplicativo & Funcionalidades

### Como funciona o Lançamento Automático de Despesas Recorrentes?
Se você tem contas fixas mensais (como assinaturas de streaming, aluguel ou parcelas), você pode cadastrá-las na aba de **Recorrências**. 
Toda vez que você abrir o aplicativo, o sistema verifica de forma inteligente se alguma dessas contas venceu enquanto o app estava fechado e realiza o lançamento automático dela na conta bancária correspondente. Assim, seus saldos estarão sempre em dia sem que você precise lembrar de lançar as contas fixas manualmente!

### Como funciona a aba "Metas de Poupança"?
Na aba **Orçamentos & Metas**, você pode planejar a realização de objetivos de curto ou longo prazo (como uma viagem, a compra de um carro ou a criação de uma reserva de emergência):
1. Crie uma nova meta definindo o valor total do objetivo e o mês/ano limite.
2. O aplicativo calcula na hora a **parcela sugerida para economizar por mês** até o prazo final.
3. Use os botões rápidos **Poupado (+)** e **Retirar (-)** diretamente no card para registrar os depósitos ou resgates que você fizer na vida real.
4. O progresso visual e a meta mensal sugerida se reajustam automaticamente!

### Por que a barra de Orçamento mudou de cor?
O sistema de alertas visuais avisa de forma simples a saúde do seu limite de gastos do mês:
- **Verde**: Gastos abaixo de 80% do limite planejado para a categoria.
- **Amarelo**: Gastos entre 80% e 100% do limite (nível de atenção).
- **Vermelho**: Limite ultrapassado. Um banner de alerta também será exibido no topo do seu Dashboard para alertar sobre o estouro.

---

## ☁️ 3. Sincronização em Nuvem (Google Sheets)

### Como configurar a sincronização com o Google Sheets?
1. Clique no ícone de **Nuvem/Sincronização** no canto superior direito do aplicativo.
2. Siga o passo a passo exibido na tela para colar o código de integração no Apps Script de uma planilha nova no seu próprio Google Drive e publicá-la.
3. Cole a URL gerada e crie uma **Chave de Acesso** (senha personalizada) forte no formulário do aplicativo.
4. Clique em **Salvar e Sincronizar**. O aplicativo configurará toda a sua planilha automaticamente.

### O que é a "Chave de Acesso" e como ela protege meus dados?
A **Chave de Acesso** é um token de segurança de uso exclusivo seu. Na primeira sincronização, o Meu Dindin grava essa chave na sua própria planilha do Google. A partir desse momento, qualquer celular ou computador que tente se conectar a essa planilha precisa informar a mesma chave. Se a chave estiver incorreta, o Google bloqueia o acesso na hora, garantindo proteção total contra acessos externos não autorizados.

### Como o aplicativo gerencia conflitos ao usar em mais de um computador?
O Meu Dindin compara os horários de atualização dos dados. Se os dados da nuvem forem mais recentes do que os do seu computador local, ele atualiza a sua tela (processo de *Pull*). Se as alterações do computador forem mais recentes, ele atualiza a nuvem (processo de *Push*). Tudo de forma silenciosa e inteligente.

---

## 🛠️ 4. Backup, Importação e Resolução de Problemas

### Como fazer um backup dos meus dados?
No painel de configurações, você tem a opção de **Exportar Dados (Backup JSON)**. Isso gera e baixa um arquivo de segurança no seu computador contendo todas as suas contas, transações e metas. Guarde esse arquivo em um local seguro.

### Como posso restaurar meus dados a partir de um backup?
Use a opção **Importar Dados (JSON)**, selecione o arquivo gerado anteriormente e clique em confirmar. O Meu Dindin substituirá instantaneamente a base de dados local pelas informações do backup, atualizando todos os seus saldos, gráficos e metas na hora.

### O aplicativo exibe uma mensagem de "Chave de Acesso Inválida". O que fazer?
Isso acontece se a senha configurada no aplicativo estiver diferente da senha salva na sua planilha do Google.
1. Abra a sua planilha do Google no navegador.
2. Acesse a aba chamada `_STATE_` e verifique o valor da célula `C1`.
3. Se quiser definir uma nova senha, basta apagar o conteúdo dessa célula `C1`, retornar ao aplicativo Meu Dindin, digitar a nova senha no campo de sincronização e salvar. O sistema registrará a nova senha automaticamente.
