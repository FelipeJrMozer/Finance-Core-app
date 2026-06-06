# Fase 6 — Telas ausentes (paridade de cobertura)

## Contexto

Mesmo após Fases 3–5, faltam telas operacionais importantes: gestão de categorias com hierarquia, importação de nota de corretagem (PDF), patrimônio (Net Worth) com timeline, telas de itens arquivados (lixeira branda), educação financeira.

## Tarefas

### 6.1 Net Worth (Patrimônio) — `(more)/net-worth.tsx`

- Card hero: **Patrimônio líquido total** com Money grande
- Breakdown:
  - Caixa (`cashBalance`)
  - Investimentos (`totalInvestments`)
  - Outros ativos (futuro: imóveis, veículos)
  - Dívidas: cartão de crédito, financiamentos, empréstimos
- LineChart com evolução mensal últimos 24 meses (consumir `/api/reports/cash-flow` somando `+ investments value snapshot`; backend já calcula no `/api/health-score/history`)
- Sub-página "Outros ativos" com CRUD simples (nome, tipo, valor estimado, data avaliação) — endpoint backend a confirmar/criar (`/api/other-assets`).
- Sub-página "Dívidas" reusa `(more)/debts.tsx` que já existe.

### 6.2 Categorias com CRUD completo — `(more)/categories.tsx`

Hoje só dá pra adicionar via `addCategory` no FinanceContext. Precisa:
- Listar categorias hierárquicas (`parentId`) em árvore expandida — `GET /api/categories`
- Adicionar / editar / arquivar / restaurar / excluir
- Filtrar por tipo (income / expense / both)
- Mover categoria para outro pai (drag handle simples ou seletor)
- Endpoint: `PATCH /api/categories/:id`, `DELETE /api/categories/:id`, `PATCH /api/categories/:id/archive`, `PATCH /api/categories/:id/restore`, `GET /api/categories/archived`

### 6.3 Importação de Nota de Corretagem — `(more)/brokerage-import.tsx`

- Onboarding: explica que o usuário pode anexar PDF de nota de corretagem (Clear, XP, BTG, Rico, Inter etc.)
- `expo-document-picker` para selecionar PDF
- Upload via `POST /api/brokerage-notes/parse` (multipart/form-data) — endpoint backend pode ainda não existir; coordenar com agente do backend para criar
- Resposta: lista de operações detectadas (data, ticker, side, qty, price, fee). Tela mostra cada uma com checkbox "Importar".
- Botão "Importar marcadas" → cria N `POST /api/investment-transactions`

### 6.4 Telas de Arquivados — Soft delete

Web tem `ArchivedAccounts.tsx`, `ArchivedCards.tsx`, `ArchivedCategories.tsx`. Mobile não tem. Criar:

- `(more)/archived/index.tsx`: hub com 3 tabs: Contas / Cartões / Categorias
- Endpoints:
  - `GET /api/accounts/archived`, `PATCH /api/accounts/:id/restore`
  - `GET /api/cards/archived`, `PATCH /api/cards/:id/restore`
  - `GET /api/categories/archived`, `PATCH /api/categories/:id/restore`
- Cada item com botão "Restaurar" e "Excluir definitivamente"

### 6.5 Educação Financeira — `(more)/education.tsx`

Endpoint backend: verificar se existe `/api/education/articles`. Se não existir, criar lista local (JSON em `constants/education.ts`) com 10–20 artigos resumidos:
- "O que é IRPF e quem precisa entregar"
- "Como funcionam dividendos de FIIs"
- "Reserva de emergência: quanto guardar"
- "Diferença entre CDB, LCI e LCA"
- ...

Tela: lista de cards com título + lead + tempo de leitura. Tap abre tela de leitura (Markdown).

### 6.6 Mercado e detalhe de ativo

`Market.tsx` e `MarketAssetDetail.tsx` no web mostram cotações de mercado. Mobile precisa:

- `(more)/market.tsx`: lista de ativos populares (ticker, preço, variação D-1) — `GET /api/market/quotes?tickers=...` (backend a confirmar)
- Tap → `(more)/market/[ticker].tsx`: gráfico, fundamentos, score (já feito na Fase 3.5)

### 6.7 SMS Detector Test — `(more)/sms-detector-test.tsx`

Web tem tela `SMSDetectorTest.tsx`. Mobile pode ter a mesma para QA do parser local:
- Input multiline para colar SMS
- Botão "Testar" → roda `parseBankSms` (já em `utils/smsParser.ts`)
- Mostra resultado parseado + permite enviar para `POST /api/pending-transactions` para teste end-to-end

### 6.8 Patrimônio.tsx do web equivalente

Web tem pasta `client/src/pages/patrimonio/`. Verificar se há subtelas (ex.: `/patrimonio/imoveis`, `/patrimonio/veiculos`). Se houver e tiver endpoints, replicar:
- `(more)/patrimonio/imoveis.tsx`: lista de imóveis com valor de mercado, financiamento associado, avaliação
- `(more)/patrimonio/veiculos.tsx`: idem para veículos

## Definition of Done

- [ ] Tela Net Worth mostra evolução 24m e breakdown por categoria de ativo.
- [ ] Categorias permite CRUD completo + arquivar/restaurar com hierarquia visível.
- [ ] Brokerage Import lê PDF e cria N investment-transactions.
- [ ] Hub de Arquivados restaura/exclui contas, cartões e categorias.
- [ ] Educação financeira com 10+ artigos navegáveis.
- [ ] Market lista ativos populares e abre detalhe.
- [ ] SMS Detector Test funcional para QA.
- [ ] (Opcional) Telas Imóveis/Veículos se backend suportar.
