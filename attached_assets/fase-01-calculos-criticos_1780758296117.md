# Fase 1 — Cálculos críticos e integração com endpoints existentes

## Contexto

O app mobile Finance Core (Expo + React Native) hoje calcula vários números **localmente a partir de `transactions` em memória**, em vez de consumir endpoints já prontos no backend. Isso causa divergência com o sistema web. Esta fase resolve só o essencial — depois disso o agente pode evoluir features novas sem propagar bugs.

## Repositório alvo

`https://github.com/FelipeJrMozer/Finance-Core-app` — branch `main`, pacote `artifacts/finance-core`.

## Tarefas

### 1.1 Health Score real (NÃO usar fórmula simplificada local)

**Problema atual** (`context/FinanceContext.tsx`):
```ts
const savingsRate = monthlyIncome > 0 ? Math.max(0, netResult / monthlyIncome) : 0;
const healthScore = Math.min(100, Math.round(savingsRate * 100));
```
Isto considera só taxa de poupança. O web calcula com 5 pilares (controle de gastos, taxa de poupança, ratio de dívida, progresso de metas, diversificação).

**Correção**:
- Em `services/healthScore.ts` (já existe e chama `GET /api/health-score/current`), expandir o tipo de retorno para incluir os 5 pilares (`spendingControl`, `savingsRate`, `debtRatio`, `goalProgress`, `diversification`) cada um com `score` (0–100) e `weight`.
- Em `FinanceContext`, criar `serverHealthScore: number | null` setado por `useEffect` que chama `getHealthScoreCurrent()` ao montar e a cada mutation relevante (transação criada/excluída, meta atualizada).
- Expor via `useFinance()` ambos: `healthScore` (server) e `healthScoreLocal` (fallback offline).
- A tela `(more)/health-score.tsx` já mostra "5 pilares" — substituir os pilares mockados pelos do servidor.

### 1.2 Faturas de cartão via `/api/card-invoices` (parar de computar local)

**Problema**: `computedCreditCards` em `FinanceContext` calcula `card.used` filtrando `transactions` pelo billing cycle local. Isso ignora estornos, parcelamento de fatura e pagamentos antecipados que o backend processa.

**Correção**:
- Criar `services/cardInvoices.ts` com:
  - `listInvoices(cardId?: string, month?: string)` → `GET /api/card-invoices?cardId=&month=`
  - `getInvoice(id)` → `GET /api/card-invoices/:id`
  - `getInvoiceDetails(id)` → `GET /api/card-invoices/:id/details` (lista de transações)
  - `payInvoice(id, accountId, amount)` → `POST /api/card-invoices/:id/pay`
  - `earlyPayment(id, amount)` → `POST /api/card-invoices/:id/early-payment`
  - `installInvoice(id, installments, fee)` → `POST /api/card-invoices/:id/install`
- Refatorar `app/card/[id].tsx` aba **Fatura**: usar `useEffect` carregando `getInvoiceDetails` por mês selecionado em vez do filtro local. Manter o `MonthNavigator` e badges Aberta/Fechada.
- Manter `computedCreditCards.used` localmente APENAS como fallback quando o endpoint falhar (ex.: offline). Marcar com `_source: 'local' | 'server'` para debug.
- Adicionar botões "Pagar fatura" (abre modal pedindo conta) e "Antecipar pagamento" e "Parcelar fatura" (slider de 2–12x).

### 1.3 Lista de Lançamentos com paginação real

**Problema**: `loadAll` chama `GET /api/transactions` sem pagination. Para usuários com >500 transações, congela o app.

**Correção**:
- Trocar para `GET /api/transactions?limit=200&offset=0&order=desc` na carga inicial.
- Adicionar `loadMoreTransactions()` no FinanceContext que faz fetch incremental e mescla por `id`.
- Em `(tabs)/transactions.tsx`, ao chegar perto do fim do scroll (`onEndReached`), chamar `loadMoreTransactions()`.
- O endpoint `/api/transactions` já aceita `limit` e `offset`; só usar.

### 1.4 Bills funcionando

**Problema**: O mobile relatou que `GET /api/bills` retorna 401 mesmo com token válido (problema de header `vary: X-Wallet-Id`).

**Correção**:
- Em `services/bills.ts` (criar), montar fetch com `Accept: application/json`, `Authorization: Bearer <token>` e — se houver workspace — header `X-Wallet-Id: <walletId>` ALÉM do query param `?walletId=`.
- Endpoints: `GET /api/bills`, `POST /api/bills`, `PATCH /api/bills/:id`, `PATCH /api/bills/:id/pay` (body `{ accountId, paidDate }`), `DELETE /api/bills/:id`.
- Em `(more)/bills.tsx`, listar via React Query/local state, mostrar próximas 30 dias, atrasadas em vermelho, com ação "Pagar" (abre modal de conta) e "Editar".
- Verificar se `settings.billsEnabled === true` para habilitar a tela; senão mostrar onboarding "Ative em Configurações".

### 1.5 Recurring (recorrências) e Upcoming Bills

**Endpoints prontos no web**:
- `GET /api/recurring` (lista todas as recorrências)
- `POST /api/recurring`
- `GET /api/upcoming-bills` (próximos 30/60/90 dias)

**Correção**:
- Criar `services/recurring.ts` com CRUD.
- Substituir o widget "Próximos Vencimentos" do dashboard (que só mostra faturas de cartão) por chamada a `GET /api/upcoming-bills?days=30` que já consolida bills + faturas + recorrências.
- Criar tela `(more)/recurring.tsx` listando recorrências com ícone de tipo (renda/despesa), valor, dia do mês e ação "Pausar/Ativar" e "Excluir".

### 1.6 Investimentos: ler `purchasePrice` corretamente E expor performance real

**Problema**: `transformInvestment` lê `raw.purchasePrice ?? raw.averagePrice`. Web já usa `averagePrice` recalculado pelo PM ponderado a cada compra/venda. Quando há `investment-transactions`, `averagePrice` muda e o mobile mostra valor antigo.

**Correção**:
- Criar `services/investmentTransactions.ts`:
  - `list(investmentId?)` → `GET /api/investment-transactions`
  - `add(payload)` → `POST /api/investment-transactions`
  - `update(id, payload)` → `PATCH /api/investment-transactions/:id`
  - `remove(id)` → `DELETE /api/investment-transactions/:id`
- Em `app/investment/[id].tsx`, mostrar histórico de compras/vendas, permitir adicionar nova movimentação (modal), e exibir o **PM atual** (que é `averagePrice` do servidor).
- Após cada `POST/PATCH/DELETE` em investment-transactions, chamar `loadAll()` para reler `/api/investments` (o backend recalcula PM).
- Em `(tabs)/investments.tsx`, no card de cada ativo: além de "qtd × preço atual", mostrar:
  - Custo total (`qtd × averagePrice`)
  - Variação % (current/avg − 1) em verde/vermelho
  - Lucro/prejuízo absoluto em R$

### 1.7 Sazonalidade no Reports — usar ano anterior, não 6 meses

**Problema atual** (`(tabs)/reports.tsx`): chips de sazonalidade comparam mês corrente vs média de 6 meses. Sazonalidade real precisa ser **mês corrente vs mesmo mês do ano anterior**.

**Correção**:
- Calcular: para cada categoria, despesa do mês selecionado vs despesa do mesmo mês 12 meses atrás.
- Se não houver 12 meses de histórico, mostrar chip neutro com "—" e tooltip "Histórico insuficiente".
- Manter filtro de mínimo R$ 30 para evitar ruído.

### 1.8 Dashboard summary agregado (parar de computar tudo no cliente)

**Problema**: `(tabs)/index.tsx` agrega tudo localmente a partir de `transactions/cards/accounts`. O endpoint `GET /api/mobile/dashboard-summary` já consolida no servidor (com cache).

**Correção**:
- Em `services/dashboard.ts` (já existe), o tipo `DashboardSummary` precisa cobrir: `totalBalance`, `monthlyIncome`, `monthlyExpenses`, `prevMonthIncome`, `prevMonthExpenses`, `netWorth`, `cashBalance`, `totalInvestments`, `totalCreditUsed`, `weeklyChart` (7 pontos), `upcomingBills`, `topCategories`.
- Em `(tabs)/index.tsx`, usar `useEffect` que chama `getDashboardSummary()` na montagem + a cada mutation relevante. Mostrar dados do servidor; cair no cálculo local só se a chamada falhar.
- Quando o usuário pull-to-refresh: `POST /api/mobile/dashboard-summary/invalidate` e refazer o GET.

## Definition of Done

- [ ] Health Score na tela `(more)/health-score.tsx` mostra exatamente o mesmo valor do web (testar com mesmo usuário logado simultaneamente).
- [ ] Fatura do cartão na aba "Fatura" reflete pagamentos parciais e parcelamento de fatura feitos no web (sem precisar fechar/reabrir o app).
- [ ] Lista de lançamentos carrega < 1s mesmo com 1.000+ transações (paginação ativa).
- [ ] Tela Bills lista contas a pagar do servidor (não fica em empty state quando deveria ter dados).
- [ ] Próximos Vencimentos no dashboard mostra bills + faturas + recorrências (não apenas cartões).
- [ ] Detalhe de investimento mostra PM ponderado correto após adicionar nova compra.
- [ ] Chips de sazonalidade do Reports usam ano-a-ano, não 6 meses.
- [ ] Dashboard carrega via `dashboard-summary` (verificar no Network log do dev tools).
- [ ] Todos os 8 itens passam em `pnpm --filter @workspace/finance-core run typecheck` sem novos erros.
