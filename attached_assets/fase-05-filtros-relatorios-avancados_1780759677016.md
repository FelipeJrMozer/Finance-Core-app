# Fase 5 — Filtros e relatórios avançados

## Contexto

`(tabs)/transactions.tsx` tem só 3 filtros (mês, tipo, conta). `(tabs)/reports.tsx` tem cashflow 6m + sazonalidade básica. O web tem filtros completos (categoria, tag, data range, valor range, isPaid, isFixed, isSubscription) e relatórios profundos (DRE, fluxo projetado 90d, Pareto, anomalias, calendário).

## Endpoints

```
GET /api/reports/dre                      receita - despesa por categoria, mês a mês
GET /api/reports/cash-flow                fluxo histórico
GET /api/reports/cash-flow-projection     projeção 30/60/90d (regressão linear)
GET /api/reports/monthly-comparison       MoM + YoY
GET /api/reports/health-dashboard         indicadores agregados
GET /api/reports/financial-calendar       todas movimentações futuras
GET /api/reports/upcoming-events          próximos eventos
GET /api/reports/spending-patterns        padrões + anomalias z-score
GET /api/reports/expense-forecast         previsão ML
GET /api/reports/market-comparison        carteira vs índices
GET /api/reports/executive-dashboard      visão consolidada
GET /api/dashboard/metrics                métricas brutas
GET /api/insights/anomalies               anomalias por categoria
GET /api/insights/monthly-recap           recap do mês
GET /api/insights/emergency-fund          status reserva
GET /api/transactions/stats/monthly       estatísticas
```

## Tarefas

### 5.1 Filtros avançados em `(tabs)/transactions.tsx`

Adicionar botão **funil** no header que abre `BottomSheet` com:

```
┌─ Filtros ────────────────────┐
│ Categorias    [chips multi]  │
│ Tags          [chips multi]  │
│ Período       [date range]   │
│ Valor mín     [input R$]     │
│ Valor máx     [input R$]     │
│ Status        ◯Pago ◯Pendente│
│ ☐ Recorrente  ☐ Assinatura   │
│ ☐ Arquivada                  │
│ ────────────────────────     │
│ [Limpar]   [Aplicar (12)]    │
└──────────────────────────────┘
```

Implementação:
- Estado local `filters` no componente, persistido em `AsyncStorage` por wallet (`tx-filters:${walletId}`).
- Badge no botão funil mostra contador de filtros ativos.
- Filtros aplicados como query params em `GET /api/transactions?categoryIds=a,b&tagIds=c&dateFrom=&dateTo=&minAmount=&maxAmount=&isPaid=&isFixed=&isSubscription=&includeArchived=`.
- Manter os chips atuais (mês, tipo, conta) acima da lista — operam em conjunto.
- Botão "Exportar CSV" usa os filtros aplicados para compor o CSV.

### 5.2 Reformular `(tabs)/reports.tsx` em 4 abas

```
┌─────────────────────────────────────────┐
│ Visão Geral  Fluxo  Categorias  Insights│
└─────────────────────────────────────────┘
```

**Aba Visão Geral** (atualizar):
- Card hero: receita / despesa / saldo do mês com **comparação MoM e YoY** (`/api/reports/monthly-comparison`)
- Sazonalidade ano-a-ano (já corrigido na Fase 1)
- "Top 5 categorias" (BarChart) — `/api/reports/spending-patterns`

**Aba Fluxo** (NOVA):
- Cashflow histórico 12m (LineChart com 2 linhas: receita verde, despesa vermelha) — `/api/reports/cash-flow?months=12`
- Cashflow projetado 30/60/90 dias (área sombreada com IC 90%) — `/api/reports/cash-flow-projection`
- Card "Fim de mês previsto": saldo no último dia do mês corrente

**Aba Categorias** (NOVA):
- Donut chart por categoria com % e valor
- Lista abaixo: cada categoria com barra de progresso vs orçamento (se houver)
- Análise de Pareto: card "20% das categorias = X% dos gastos" (calcular Lorenz local com base nos dados)
- Variação por categoria mês-a-mês (heatmap simples 12m × top 8 categorias)

**Aba Insights** (NOVA):
- Card "Anomalias deste mês": lista de gastos atípicos (z-score > 2) — `/api/insights/anomalies`
- Card "Reserva de emergência": % do alvo (3–6 meses de despesa fixa) — `/api/insights/emergency-fund`
- Card "Recap de [Mês anterior]" — `/api/insights/monthly-recap?month=` (3 highlights, 1 alerta)
- Card "Previsão para próximo mês" — `/api/reports/expense-forecast` (valor + IC)
- Card "Sua carteira vs IBOV" — `/api/reports/market-comparison`

### 5.3 Tela de DRE — `(more)/dre.tsx` (nova)

- Tabela mensal: linhas = categorias hierárquicas, colunas = últimos 6 meses
- Linha de totais (receita / despesa / resultado)
- Filtro de período (3m, 6m, 12m, ano corrente, ano anterior)
- Export PDF/CSV

### 5.4 Calendário financeiro — `(more)/financial-calendar.tsx` (nova)

- Calendário mensal (componente custom usando `react-native-calendars` ou similar)
- Cada dia mostra dot colorido se houver:
  - Verde: recebimento previsto
  - Vermelho: pagamento (bill, fatura, recorrência)
  - Azul: dividendo
  - Amarelo: DARF/DAS
- Tap em dia → bottom sheet com lista de eventos daquele dia
- Endpoint: `GET /api/reports/financial-calendar?from=&to=` + `GET /api/reports/upcoming-events`

### 5.5 Hidden Fees / Taxas escondidas — `(more)/hidden-fees.tsx` (nova)

- Análise de transações cuja descrição contenha palavras-chave: "tarifa", "anuidade", "manutenção", "ted", "doc", "saque", "iof", "juros", "multa", "spread"
- Lista agrupada por banco/cartão com total cobrado nos últimos 12 meses
- Card "Total pago em taxas: R$ X" + sugestão de migração para banco digital

### 5.6 Comparativo mensal — `(more)/monthly-comparison.tsx` (nova)

- Tabela: 12 meses × indicadores (receita, despesa, saldo, taxa de poupança, despesa por categoria top 5)
- Sparkline ao lado de cada linha
- Endpoint: `/api/reports/monthly-comparison?months=12`

## Definition of Done

- [ ] BottomSheet de filtros com 8 critérios funcionais; contador no badge do funil.
- [ ] Aba Fluxo mostra projeção 30/60/90d com regressão do servidor.
- [ ] Aba Categorias mostra donut + Pareto + heatmap.
- [ ] Aba Insights mostra anomalias, emergency fund, recap e forecast.
- [ ] Telas DRE, Calendário financeiro, Hidden Fees, Monthly Comparison criadas e linkadas no menu da Fase 2.
- [ ] Export CSV respeita filtros aplicados.
