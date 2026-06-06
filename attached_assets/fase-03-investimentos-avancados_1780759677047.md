# Fase 3 — Investimentos avançados

## Contexto

O web tem ~25 telas/análises de investimento. O mobile tem só carteira + relatório (3 abas). Esta fase fecha o gap nas funcionalidades mais críticas: análise de risco, dividendos, alertas e watchlist.

## Endpoints já prontos no backend

```
GET  /api/portfolios                              CRUD
GET  /api/investments/analytics/xirr              XIRR Newton-Raphson
GET  /api/portfolio/risk-analysis                 vol, sharpe, alpha, beta
GET  /api/portfolio/drawdown                      max drawdown peak-to-trough
GET  /api/portfolio/correlation-analysis          matriz de correlação Pearson
GET  /api/portfolio/sector-analysis               concentração por setor
GET  /api/portfolio/optimizer                     fronteira eficiente Markowitz
GET  /api/portfolio/sortino                       Sortino ratio
GET  /api/portfolio/beta                          beta vs IBOV
GET  /api/portfolio/benchmarking                  vs CDI / IBOV / IPCA
POST /api/portfolio/rebalance                     sugestão de rebalanceamento
GET  /api/portfolio/suggested-allocations         por perfil (conservador/moderado/agressivo)
GET  /api/portfolio/twr                           Time-Weighted Return
GET  /api/portfolio/mwr                           Money-Weighted Return
GET  /api/dividend-calendar/upcoming              dividendos próximos 90 dias
GET  /api/dividend-calendar/dashboard             agregado (yield 12m, total recebido)
GET  /api/investments/dividends                   histórico de dividendos
GET  /api/dividends                               CRUD
POST /api/dividends                               registrar pagamento
GET  /api/watchlist                               CRUD
POST /api/watchlist
DELETE /api/watchlist/:id
GET  /api/price-alerts                            CRUD
POST /api/price-alerts
PUT  /api/price-alerts/:id
DELETE /api/price-alerts/:id
POST /api/price-alerts/check                      força avaliação manual
GET  /api/stock-comparator/available              tickers disponíveis
POST /api/stock-comparator/compare                compara N tickers
GET  /api/fundamental-analysis/:ticker            P/L, P/VP, ROE, ROIC, dividend yield
GET  /api/fundamental-analysis/ranking/:indicator
GET  /api/stock-scorecard/:ticker                 score 0-100 baseado em fundamentos
GET  /api/stock-scorecard/ranking/top
GET  /api/crypto-holdings                         CRUD cripto separado
POST /api/crypto-holdings
PATCH /api/crypto-holdings/:id
DELETE /api/crypto-holdings/:id
```

## Tarefas

### 3.1 Reformular `(tabs)/investments.tsx` em 4 abas

```
┌──────────────────────────────────────────┐
│ ◀ Carteira  Análise  Dividendos  Cripto │
└──────────────────────────────────────────┘
```

**Aba Carteira** (já existe, manter):
- Lista de ativos com Money component, variação %, lucro/prejuízo
- Botão "+" → `investment/add`
- Filtro por tipo (Ações, FIIs, ETFs, Renda Fixa, Cripto)

**Aba Análise** (NOVA):
- Card grande no topo: **Patrimônio total** + variação % (TWR 30d/90d/1a)
- Linha de tempo (LineChart) do patrimônio mensal últimos 12m via `/api/portfolio/twr?period=1y`
- Card "Alocação atual" (PieChart por classe: Ações/FIIs/RF/Cripto/Caixa)
- Card "Sugestão de rebalanceamento": consome `/api/portfolio/rebalance`, mostra deltas tipo "Vender R$ 800 em FIIs / Comprar R$ 800 em Ações"
- Card "Risco da carteira": volatilidade anualizada, Sharpe ratio, Sortino, Beta vs IBOV — todos vindos de `/api/portfolio/risk-analysis` + `/api/portfolio/sortino` + `/api/portfolio/beta`
- Card "Drawdown máximo": peak-to-trough % e período (`/api/portfolio/drawdown`)
- Card "Performance vs benchmarks" (BarChart): retorno 12m da carteira vs CDI vs IBOV vs IPCA via `/api/portfolio/benchmarking`

**Aba Dividendos** (NOVA, substituir tab atual de "Dividendos" do investment-report):
- Card no topo: **Recebido em 12m** (Money), Yield Yearly, próximo pagamento previsto
- Calendário visual (chips por mês) com totais — `/api/dividend-calendar/dashboard`
- Lista "Próximos 90 dias" via `/api/dividend-calendar/upcoming`: ativo, data ex/data pgto, valor estimado
- Botão "+ Registrar dividendo" → modal com `POST /api/dividends`
- Histórico filtrável por ano

**Aba Cripto** (NOVA, separada porque schema é diferente):
- Lista via `GET /api/crypto-holdings` (campos: symbol, quantity, averagePrice, currentPrice, exchange)
- Adicionar/editar via modal
- Variação 24h em tempo real (se backend já retornar)
- Card resumo: "Total cripto em R$" + "% da carteira total"

### 3.2 Watchlist — nova tela `(more)/watchlist.tsx`

- Lista de tickers acompanhados (não comprados): `GET /api/watchlist`
- Cada item: ticker, nome, preço atual, variação % (D-1), botão "★ Remover"
- Botão "+" abre modal: input ticker, busca no `/api/stock-comparator/available`, confirma → `POST /api/watchlist { ticker }`
- Tap no item → mostra mini-card com fundamentals via `GET /api/fundamental-analysis/:ticker`

### 3.3 Alertas de preço — nova tela `(more)/price-alerts.tsx`

- Lista de alertas via `GET /api/price-alerts`: ticker, condição (`acima de R$ X` / `abaixo de R$ Y` / `variação % maior que Z`), status (ativo/disparado)
- Botão "+" → modal: ticker (autocomplete), tipo de condição, valor alvo
- Trigger manual "Verificar agora" → `POST /api/price-alerts/check` (útil para QA)
- Quando alerta dispara, criar `Notification` local (`expo-notifications`) com link para `MarketAssetDetail`

### 3.4 Comparador de ações — nova tela `(more)/stock-comparator.tsx`

- Input multi-select de até 5 tickers (autocomplete via `/api/stock-comparator/available`)
- Botão "Comparar" → `POST /api/stock-comparator/compare { tickers: [...] }`
- Tabela horizontal com: P/L, P/VP, ROE, ROIC, DY, Margem Líquida, CAGR 5a, Beta
- Highlight verde no melhor valor, vermelho no pior, por linha
- Tap em ticker → `MarketAssetDetail`

### 3.5 Scorecard e fundamentos por ativo — `(more)/stock-detail/[ticker].tsx`

- Hero: ticker, nome, setor, preço atual, variação D-1
- Card "Score Pilar" (gauge 0–100) via `/api/stock-scorecard/:ticker`
- Card "Fundamentos" via `/api/fundamental-analysis/:ticker` (10 indicadores em grid 2 colunas)
- Card "Histórico de dividendos" (BarChart 5 anos)
- Botão "★ Adicionar à watchlist" / "🔔 Criar alerta" / "+ Adicionar à carteira"

### 3.6 Importar de portfólios separados

- `GET /api/portfolios` lista carteiras alternativas (ex.: "Aposentadoria", "Especulação")
- Em `(tabs)/investments.tsx`, header com seletor de portfólio (similar ao seletor de wallet)
- Investimentos filtrados por `portfolioId`. CRUD em `(more)/portfolios.tsx` (nova).

## Definition of Done

- [ ] Aba "Análise" do `(tabs)/investments.tsx` mostra TWR, alocação, risco, drawdown e benchmark vindos do servidor.
- [ ] Aba "Dividendos" lista próximos 90 dias e total recebido bate com web.
- [ ] Aba "Cripto" usa `/api/crypto-holdings` (não mais o `/api/investments` com type='crypto').
- [ ] Watchlist, Price Alerts, Stock Comparator e Stock Detail funcionais.
- [ ] Disparo de price alert gera notificação local no dispositivo.
- [ ] Seletor de portfólio funciona quando o usuário tem mais de uma carteira.
- [ ] Todos os cálculos batem com o web (testar com mesmo usuário em paralelo).
