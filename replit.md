# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── finance-core/       # React Native + Expo mobile app (Finance Core)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/finance-core` (`@workspace/finance-core`)

React Native + Expo (managed workflow) personal finance mobile app targeting Google Play and Apple App Store.

- **Tech**: Expo Router, Context API, AsyncStorage, TypeScript
- **Theme**: "Azul Oceano" (`#0096C7`) default accent; 7 presets
- **API**: Connects to production backend at `https://pilarfinanceiro.replit.app` (set in `.env.local`)
  - All requests use `Accept: application/json` + `Authorization: Bearer <token>` headers
  - `EXPO_PUBLIC_API_URL` env var controls the backend URL
- **Auth** (`context/AuthContext.tsx`):
  - `POST /api/auth/login` → `{ user, accessToken, refreshToken }`
  - `POST /api/auth/register` → `{ user }` (no tokens, auto-login follows)
  - `POST /api/auth/refresh` → `{ accessToken }` (keeps existing refresh token)
  - `GET /api/auth/user` — validates session on boot
- **API Service** (`services/api.ts`): token refresh queue, retry on 401, all HTTP methods with proper headers
- **FinanceContext** (`context/FinanceContext.tsx`): Only loads when `isAuthenticated=true`; resets on logout
  - Budget: `month`+`year` as ints in API → converted to `"YYYY-MM"` string internally
  - Investment: `purchasePrice` field in API → `avgPrice` in mobile context
  - Goal: no `color` in API → generated deterministically from name hash
  - Goal contribution: `POST /api/goals/:id/contribute` endpoint
  - Settings: `PATCH /api/settings` → full settings sync
  - Tags, Notifications, Categories all loaded from API
- **FinanceContext computed values**: `monthlyIncome`, `monthlyExpenses`, `prevMonthIncome`, `prevMonthExpenses` — both current and previous month computed from the `transactions` array for real trend percentages
- **AI Chat** (`app/chat.tsx`): Uses real `POST /api/ai/chat` with `{ message, messages, context }`. Passes conversation history and financial context (totalBalance, monthlyIncome, monthlyExpenses, netResult, healthScore). Renders markdown responses (bold `**text**`, bullet points `* item`). Powered by Groq via the production backend.
- **Month Navigation Pattern** (shared across Transactions, Budgets, Reports, Card/Fatura):
  - `< Month Year >` nav bar with "Atual" badge for current month
  - Clicking the month label resets to current month; right chevron disabled at current month
  - Helper functions `addMonths(ym, delta)` and `getMonthLabel(ym)` defined locally in each screen
- **Screens**:
  - Dashboard: HealthGauge, Upcoming Bills, Weekly Chart, QuickActions; "Ver análise →" links to full health-score screen; SummaryCards use real MoM trends
  - Transactions: month nav + type filter chips + account filter + search + summary row + CSV export button (Share API)
  - Budgets: month navigation + total spent/limit summary bar; "+" add button only shown for current month
  - Reports: month nav in header; all calculations filtered by selected month; cashflow chart shows 6-month history
  - Investments (stocks, FIIs, REITs, ETFs, crypto, fixed income)
  - AI Chat (connects to real `/api/ai/chat` endpoint with context + history)
  - Mais → reorganized: FERRAMENTAS (Saúde Financeira, Simuladores, Relatório Investimentos, PJ/MEI, IA) + GESTÃO (Metas, Contas, Lançamentos Pendentes, Alertas, Planos) + ORÇAMENTOS + CONFIGURAÇÕES
- **New Screens** (all navigable from `/(more)/`):
  - `health-score.tsx`: SVG gauge 0–100, os 5 pilares com barras de progresso, histórico 6 meses (LineChart), recomendações baseadas em dados locais ou API
  - `simulators.tsx`: grid com 12 simuladores — Juros Compostos, Meta de Poupança, Empréstimo, Reserva de Emergência, Financiamento Imóvel (PRICE/SAC), Financiamento Veículo, IPCA vs CDI, Imposto de Renda, FIRE, Previdência Privada, Custo Real do Cartão, Portabilidade
  - `investment-report.tsx`: 3 abas — Dividendos (BarChart), Performance (benchmark vs CDI/IBOV), Histórico (LineChart patrimonial)
  - `custom-alerts.tsx`: alertas personalizados com AsyncStorage (5 tipos: gasto por categoria, saldo mínimo, fatura, meta, vencimento)
  - `pending-transactions.tsx`: filtra `transactions` onde `isPaid === false`; link para detalhe de cada transação
  - `pj/index.tsx`: dashboard PJ/MEI com receitas/despesas do mês via `services/pj.ts`, limite anual MEI (R$81k) com bar de progresso, próximo DAS pendente, grid 9 atalhos
  - `pj/receitas.tsx`: lista `listPjRevenues({month})` com totais Recebido/Pendente, MonthNavigator + RefreshControl
  - `pj/despesas.tsx`: lista `listPjExpenses({month})` com breakdown por categoria + total dedutível, MonthNavigator
  - `pj/clientes.tsx`: cadastro de clientes PJ com AsyncStorage
  - `pj/das.tsx`: lista `listPjDas({year})` com filtros (todos/pendente/atrasado/pago), copiar barCode, marcar como pago via `markPjDasPaid`
  - `pj/dasn-simei.tsx`: `getDasnSimeiSummary({year})` com fallback para agregar por revenues; bar chart 12 meses; botões "Gerar planilha DASN" + "Abrir Portal DASN-SIMEI" (https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/); checklist em AsyncStorage
  - `pj/retiradas.tsx`: registro de pró-labore + INSS automático (11% sobre salário mínimo)
- **Phase 4 — IRPF, DARF e MEI completo (Abr 2026)**:
  - **services/tax.ts**: cliente completo `/api/tax/*` — `getMonthlyTaxes`, `getTaxJournal`, `getAnnualTax`, `calculateDarf`, `getDarfHistory`, `markDarfPaid`, `exportIrpfDec` (binário), `downloadIrpfDec`, `getIrpfGuide` (+ `getIrpfGuidePdf`), `runTaxOptimizer`, `getTaxCalendar`, `getAccumulatedLosses`, `listCryptoTaxTransactions`, `configureTaxAlert` + CRUD de `tax-incomes` e `tax-deductions`. Tipos TS exportados (`AnnualTaxSummary`, `MonthlyTaxSummary`, `DarfCalculation`, `TaxAlertType`, etc.).
  - **services/pj.ts**: cliente `/api/pj/*` — accounts/tags/revenues/expenses/das (CRUD + mark-paid) + `getDasnSimeiSummary`. Tipos `PjRevenue`, `PjExpense`, `PjDas`, `DasStatus`, `DasnSimeiSummary`.
  - **`(more)/taxes.tsx`** — Painel IRPF: hero "Precisa entregar IRPF? SIM/NÃO/Talvez" via `getAnnualTax`, próximo DARF mensal, atalhos (Calcular DARF/Histórico/Calendário/Exportar/Rendimentos/Deduções), histórico DARFs, prejuízo acumulado por tipo de ativo.
  - **`(more)/darf.tsx`** — Lista `getDarfHistory` com filtros (todos/pendente/pago/atrasado), expand inline com linha digitável e Pix copia-e-cola (`expo-clipboard`), `markDarfPaid` otimista, share via `expo-sharing`.
  - **`(more)/tax-calendar.tsx`** — Chips por mês a partir de `getTaxCalendar(year)`.
  - **`(more)/irpf-export.tsx`** — Seletor de ano, baixa `.DEC` binário (fetch → Blob → base64 via FileReader → `FileSystem.writeAsStringAsync({encoding:Base64})` em `cacheDirectory` → `Sharing.shareAsync`), guia PDF, otimizador `runTaxOptimizer`. Usa `expo-file-system/legacy`.
  - **`(more)/tax-incomes.tsx` / `tax-deductions.tsx`** — `CrudScreen` genérica reusada com filtragem por ano + modal de form.
  - **`(more)/custom-alerts.tsx`** — Bloco "Ativar alertas fiscais" idempotente (POST `/api/tax/alerts/configure` ×3 para `mei-revenue-80`, `das-due-day-20`, `irpf-deadline`; flag `pf_tax_alerts_seeded` em AsyncStorage).
  - **`(more)/_layout.tsx`** registra `taxes`, `darf`, `tax-calendar`, `irpf-export`, `tax-incomes`, `tax-deductions`.
  - **`utils/icons.ts`** estendido com aliases kebab-case (`export`, `income`, `deduction`, `copy`, `share`, `check-circle`, `chevron-down`, `file-text`, `calendar`, `external`, `refresh`, `trending-down`, `trending-up`).
  - **Backend remoto fixo** em `services/api.ts` → `https://pilar-financeiro.replit.app` (fallback)
- **New Reusable Components**:
  - `components/SectionHeader.tsx`: header de seção com título, ícone opcional e ação
  - `components/EmptyState.tsx`: tela de estado vazio com ícone, título, descrição e botão de ação
  - `components/MonthNavigator.tsx`: navegação de mês com chevrons e label formatado
- **Credit Card Features** (`app/card/`):
  - `card/[id].tsx` — detail: Fatura, Parcelas, Detalhes tabs
  - Fatura tab: month navigation with **"Aberta"** badge (current month, primary color) or **"Fechada"** badge (past month, gray)
  - **Billing cycle (ciclo de faturamento)**: Invoice periods use real billing cycles based on `card.closingDay`, NOT calendar months. e.g. closing day 10 → March invoice = Feb 11–Mar 10. Implemented via `getBillingPeriod(closingDay, displayMonth)` and `getCurrentInvoiceMonth(closingDay, now)` helpers in both `FinanceContext.tsx` and `card/[id].tsx`.
  - `card.used` is computed from the CURRENT OPEN billing cycle only (not all-time expenses)
  - Invoice summary shows billing period range ("11 Fev → 10 Mar") and due date
  - `card/add.tsx` — add/edit credit card form with live card preview
- **Account Features** (`app/account/`):
  - `account/add.tsx` — add/edit; `account/[id].tsx` — detail with stats
- **Notifications** (`app/(more)/notifications.tsx`): Lists API notifications with read/dismiss; badge count in Mais tab
- **Phase 7 — Captura automática de transações (Abr 2026)**:
  - **Android (notification listener nativo)**: `plugins/withNotificationListener.js` (Expo config plugin) injeta no `AndroidManifest.xml` o `FinanceNotificationService` (extends `NotificationListenerService`) e o `FinanceSmsReceiver` (`android.provider.Telephony.SMS_RECEIVED`), além das permissões `BIND_NOTIFICATION_LISTENER_SERVICE`, `RECEIVE_SMS` e `READ_SMS`. Os arquivos Kotlin ficam em `plugins/kotlin/` e são copiados para `android/app/src/main/java/<pkg>/notificationlistener/` durante o `expo prebuild`. O serviço filtra ~16 apps de banco (Nubank, Itaú, Bradesco, Santander, BB, Caixa, Inter, C6, BTG, XP, Sicredi, PicPay, Mercado Pago, PagSeguro, Stone, Méliuz) **e** exige presença de `R$` + palavra-chave de transação (compra/débito/pix/etc.) para evitar lixo. POST direto pra `/api/pending-transactions` com `source: 'notification' | 'sms'` + `rawText` — backend (`SMSBankingDetector`) parseia valor/tipo/banco/comerciante.
  - **Tela de onboarding** (`app/(more)/captura-bancaria.tsx`): Android exibe explicação + botão "Ativar captura automática" que abre direto `android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS` via `expo-intent-launcher` (fallback `Linking.openSettings`); iOS exibe aviso de restrição da Apple + número WhatsApp (env `EXPO_PUBLIC_WHATSAPP_NUMBER`, default `5511999999999`) com botão `wa.me/<num>?text=`. Ambas as plataformas linkam pra `pending-transactions`.
  - **services/notificationCapture.ts**: helpers `openNotificationListenerSettings()`, `onAppForeground()` (re-checa permissão ao voltar do Settings), `SUPPORTED_BANKS`, `openWhatsApp()`.
  - **Menu**: novo item "Captura automática" em `(tabs)/more.tsx` (testID `menu-captura`) entre Lançamentos Pendentes e Dívidas.
  - **Dev Client obrigatório**: `expo-dev-client` instalado. O listener nativo **não funciona no Expo Go** — exige build de desenvolvimento (`eas build --profile development --platform android`). `eas.json` já tem `EXPO_PUBLIC_API_URL` em todos os 3 perfis.
  - **iOS**: captura automática impossível (API privada). Usa WhatsApp como única via no iPhone.
- **Phase 4 — Pix QR scanner, SMS share import, sazonalidade & offline (Abr 2026)**:
  - **QR Scanner** (`app/scan.tsx` + `utils/pixDecoder.ts`): usa `expo-camera` para ler QR; `decodePixCode` parseia EMV BR Code TLV (tag 26 chave Pix, 54 valor, 59 nome, 60 cidade, 62.05 txid) e **valida CRC16/CCITT-FALSE da tag 63** + exige consumo total do payload + ao menos 1 dado útil; rejeita códigos malformados/tampered devolvendo `null`. `extractNFeKey` capta chave NFe de 44 dígitos. Após leitura válida, redireciona para `/transaction/add` com prefill (type/description/amount/notes/accountId).
  - **SMS Share Import** (`app/share-import.tsx` + `utils/smsParser.ts`): registra `android.intent.action.SEND` (text/plain) no `app.json` para o app aparecer no menu Compartilhar do Android; `parseBankSms` extrai valor/tipo/banco/cartão para Pix (qualquer banco), Nubank, Itaú, padrões genéricos de cartão/débito/crédito. `parseBRL` é locale-aware (BR `1.234,56` e US `1234.56`). Como não há módulo nativo dedicado, a tela ingere o texto por 3 vias: deep-link `?text=`, leitura automática do clipboard ao montar (heurística "R$"), e `TextInput` para colar manualmente. Tela de ajuda em `app/(more)/sms-import-help.tsx`. **Pendente**: módulo nativo (custom expo plugin ou `expo-share-intent` em dev build) para receber `Intent.EXTRA_TEXT` diretamente — hoje o usuário copia e o app detecta no clipboard.
  - **Shortcuts (Android)**: `app.json` declara `shortcuts` quick-expense, quick-income, scan-pix.
  - **iOS Camera**: `NSCameraUsageDescription` + `usesNonExemptEncryption=false` + plugin `expo-camera`.
  - **Banner offline** (`components/OfflineBanner.tsx`): polling 8s via `expo-network`; aparece somente quando `isConnected/isInternetReachable === false`. Montado no topo do dashboard.
  - **QuickAdd → última conta usada**: `QuickTransactionModal` lê/escreve `quickAdd:lastAccountId` em AsyncStorage; `scan` e `share-import` reusam a mesma chave para preencher o `accountId` na criação.
  - **Sazonalidade no Reports** (aba Visão Geral): chips com top-4 categorias por variação % do mês corrente vs média dos últimos 6 meses (verde se ↓, vermelho se ↑, neutro se ±5%); filtro mínimo R$30 para evitar ruído.
  - **services/dashboard.ts**: cliente para `GET /api/mobile/dashboard-summary` + `POST .../invalidate`. Endpoint ainda pendente no backend; chamada falha silenciosamente e o dashboard segue agregando localmente.
  - **transaction/add.tsx**: aceita `type/description/amount/notes/accountId` via query params (consumido por scan e share-import).
- **Phase 3 — Server-side search & installments (Apr 2026)**:
  - `searchTransactionsRemote(q, signal)` na FinanceContext usa `GET /api/transactions/search?q=` com `AbortController` para cancelar buscas obsoletas
  - `transactions.tsx`: input de busca dispara debounce de 400ms; quando ativo (≥2 chars) os resultados remotos são mesclados com o cache local e os filtros de mês/tipo/conta são desativados (texto explicativo). Spinner inline no input enquanto busca.
  - `getInstallments(transactionId)` na FinanceContext usa `GET /api/transactions/:id/installments` (200; mapeia `installmentNumber/amount/date/isPaid`)
  - `transaction/[id].tsx` exibe lista de parcelas reais quando `installments > 1`. `useEffect` posicionado antes do early-return para evitar violação de hooks.
  - `transformTransaction` agora mapeia `isSubscription`, `isArchived`, `installmentId`, `installmentTotalAmount` (campos antes ignorados)
- **Backend pendente (não implementado no mobile, endpoints retornam HTML SPA fallback ou 401 inconsistente)**:
  - ❌ `GET/POST /api/bills` — retorna 401 mesmo com token válido (`vary: X-Wallet-Id`); tela `(more)/bills.tsx` mantém o código atual mas exibirá empty state em produção até backend ser corrigido
  - ❌ `GET /api/cards/:id/invoices` — não existe; faturas continuam sendo computadas localmente a partir de `transactions` filtradas pelo ciclo do cartão
  - ❌ `GET /api/alerts` — não existe; `(more)/custom-alerts.tsx` permanece local-only via AsyncStorage
  - ❌ `GET /api/mobile/dashboard-summary` — não existe; dashboard continua agregando localmente a partir de `transactions/cards/accounts`
  - ❌ `POST /api/devices/register` — não existe; push tokens não são enviados ao backend, notificações são apenas locais
  - ❌ `GET /api/preferences` — não existe; `ThemeContext` já tolera silenciosamente
  - ❌ `GET /api/upcoming-bills`, `GET /api/recurring` — não existem; widget "Próximos Vencimentos" mostra apenas faturas de cartão

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- `src/routes/auth.ts` — demo auth: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`
- `src/routes/preferences.ts` — `GET/PUT /api/preferences` persists accent/theme to `preferences.json`
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
