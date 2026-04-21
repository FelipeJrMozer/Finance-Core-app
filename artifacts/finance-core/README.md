# Finance Core (Expo / React Native)

App mobile do **Pilar Financeiro**, em paridade com o backend hospedado em
`https://pilar-financeiro.replit.app`.

## Stack
- Expo SDK + expo-router (mobile-first iOS/Android, com fallback web)
- React Query para cache/server state
- AsyncStorage + Expo SecureStore para preferências e tokens
- expo-web-browser para checkout do Stripe
- Backend Node/Express compartilhado (vide `artifacts/api-server`)

## Rodando localmente
```bash
pnpm --filter @workspace/finance-core run dev
```

A configuração da API base está em `services/api.ts` — em desenvolvimento usa o
proxy do workspace, em produção bate direto em `pilar-financeiro.replit.app`.

## Recursos cobertos

### Autenticação e sessões
- Login + registro com checkbox **obrigatório** de Termos e Privacidade,
  enviando `termsAccepted/privacyAccepted` + versões dinâmicas vindas do
  backend (`/api/legal/versions`).
- Após login/registro o app envia `POST /api/user/sessions/track` com um
  **`deviceId` estável** persistido em SecureStore.
- Hard-logout: respostas 401 com mensagem **"Sessão encerrada"** ou
  **"Token revogado"** disparam `onAuthFailureCb`, limpam a sessão e
  redirecionam para o login (sem loop de refresh).
- JWT com `sid` é tratado de forma transparente.

### LGPD / Privacidade
- Tela `(more)/lgpd.tsx`: consentimentos por categoria, opt-in/out de
  marketing, exportação de dados (`/api/user/data/export`) e remoção
  de conta (`/api/user/account/delete`).
- Tela `(more)/sessions.tsx`: lista sessões ativas, permite revogar uma ou
  encerrar todas as outras.
- Telas legais `legal-terms.tsx` / `legal-privacy.tsx` carregam o conteúdo
  versionado do backend.
- **Cookie banner** persistente em AsyncStorage (`pf_cookie_consent_v1`)
  exibido no root layout.

### Modo Discreto (mascaramento de valores)
Todos os valores monetários passam por `maskValue()` do `ThemeContext`,
permitindo ocultar saldos com um toque. Coberto em:
Dashboard, Accounts, Cards, Goals, Reports, Bills, Debts, Budgets,
Sinking Funds, Investments, Family, PJ/MEI, Card Analytics e
Investment Report.

### Categorização inteligente
- Tela `(more)/categorization-rules.tsx`: CRUD completo + "testar regra"
  contra transações existentes via `/api/categorization-rules/test`.
- Aplicação automática feita pelo backend ao criar transações.

### Splits de transação
- Modal `TransactionSplitsModal` aberto pelo botão **"Dividir transação"**
  no detalhe de transação (escondido em transferências).
- Validação de soma exata + ação **"Distribuir igualmente"**.
- Persiste via `/api/transaction-splits` e invalida o cache da transação.

### Insights no Dashboard
Componente `InsightsCards` renderizado abaixo de `UpcomingBills`:
- Anomalias de gastos (badge por severidade)
- Recapitulação mensal
- Status do fundo de emergência
Trata erros silenciosamente (não polui a tela se a API estiver offline).

### Indicação (referral)
- Tela `(more)/referral.tsx` mostra o código do usuário e a lista de
  indicados.
- Deep link `?ref=CODIGO` é capturado em `useDeepLinks`, persistido em
  `pf_pending_referral_v1` e aplicado via `/api/referral/apply` assim que o
  usuário se autentica. Idempotente (`pf_applied_referral_v1`).

### Monetização — 5 planos
Tela `(more)/subscriptions.tsx` mostra:
- **ESSENCIAL** (gratuito), **PREMIUM**, **FAMILY**, **PJ**, **INVESTIDOR_PRO**
- Toggle anual com **17% de desconto**
- Banner de **trial de 14 dias** quando aplicável
- Checkout aberto em `expo-web-browser` apontando para a Stripe Session
  retornada pelo backend.

Gating via hook `useFeatureAccess(featureKey)` e componente `FeatureGate`,
aplicado em:
- `chat.tsx` (Assistente IA — PREMIUM+)
- `(tabs)/investments.tsx` (Investimentos — PREMIUM+)
- `(more)/familia.tsx` (Família — FAMILY)
- `(more)/pj/index.tsx` (PJ/MEI — PJ ou FAMILY)

## Estrutura
```
app/            # rotas expo-router
components/     # UI compartilhada (FeatureGate, InsightsCards,
                #   TransactionSplitsModal, CookieBanner, etc.)
context/        # AuthContext, ThemeContext, FinanceContext, WalletContext
hooks/          # useFeatureAccess, useLegalVersions, useDeepLinks, ...
services/       # wrappers tipados das APIs do backend
utils/          # formatters e helpers
```

## Variáveis de ambiente
Nenhum segredo é armazenado no app. As chaves do Stripe e demais credenciais
ficam no backend (`artifacts/api-server`). O app só conhece a base URL pública
da API.
