# Fase 10 — Configurações sincronizadas, alertas server-side e notificações push

## Contexto

A última camada para deixar mobile e web realmente sincronizados em todos os aspectos: alertas, push notifications, sessões, biometria, configurações por usuário, exportação/backup.

Hoje:
- Custom alerts são **local-only** (AsyncStorage) — usuário cria no mobile, não aparece no web e vice-versa
- Push notifications: serviço existe mas tokens não chegam ao backend (`/api/devices/register` não estava sendo chamado)
- Settings: parcialmente sincronizado, faltam vários toggles
- Backup: existe `services/backup.ts` mas não está conectado a uma tela acionável

## Tarefas

### 10.1 Migrar custom alerts para `/api/alert-rules` (CRUD server-side)

Endpoints prontos:
```
GET    /api/alert-rules
POST   /api/alert-rules
PATCH  /api/alert-rules/:id
DELETE /api/alert-rules/:id
GET    /api/alert-rules/evaluate     dispara avaliação manual
GET    /api/alerts                   alertas disparados (histórico)
```

- Reescrever `(more)/custom-alerts.tsx` consumindo esses endpoints (não mais AsyncStorage).
- Tipos suportados (mesmos do web):
  - `spending_by_category`: `{ categoryId, threshold, period: 'month' | 'week' }`
  - `min_balance`: `{ accountId, threshold }`
  - `card_invoice`: `{ cardId, daysBefore }`
  - `goal_deadline`: `{ goalId, daysBefore }`
  - `bill_due`: `{ daysBefore }`
  - `mei_revenue_limit`: `{ percentageThreshold }` (Fase 4)
  - `tax_due`: `{ daysBefore }` (Fase 4)
  - `price_alert`: `{ ticker, condition, value }` (Fase 3)
- Migration helper: na primeira abertura após o update, ler alertas do AsyncStorage e fazer `POST` para o backend, depois limpar o storage local.

### 10.2 Push notifications end-to-end

`services/devices.ts` já tem o esqueleto (`POST /api/devices/register`). Confirmar:

- Em `app/_layout.tsx`, depois de autenticar, chamar:
  ```ts
  await Notifications.requestPermissionsAsync();
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerDevice({ pushToken: tokenData.data, platform: Platform.OS, deviceModel: Device.modelName });
  ```
- Salvar `deviceId` retornado pelo backend em `secureStorage` para deregistrar no logout (`DELETE /api/devices/:id`).
- Listener `Notifications.addNotificationReceivedListener` → atualiza badge count.
- Listener `Notifications.addNotificationResponseReceivedListener` → deep link para tela relevante (`alert.tsx`, `transaction/[id]`, etc.).

Em `(more)/sessions.tsx` (já existe, mostra sessões web/mobile ativas), adicionar aba "Dispositivos" com lista de devices registrados e botão "Remover".

### 10.3 Settings completo — `(more)/settings.tsx`

Hoje a tela tem 940 linhas. Garantir que **todas** as configs do `/api/settings` estejam expostas com toggle/select:

```
APARÊNCIA
  • Modo                 [Sistema / Claro / Escuro]
  • Cor de destaque      [grid 8 acentos]
  • Mostrar valores      [toggle]                    ← já sincroniza

PREFERÊNCIAS REGIONAIS
  • Moeda                [BRL / USD / EUR]
  • Idioma               [Português (BR)]
  • Formato data         [DD/MM/AAAA / MM/DD/YYYY]
  • Primeiro dia semana  [Dom / Seg]

NOTIFICAÇÕES
  • Notificações por e-mail        [toggle]
  • Relatórios mensais             [toggle]
  • Alertas de orçamento           [toggle]
  • Alertas de DARF                [toggle]
  • Resumo semanal                 [toggle]
  • Push notifications no dispositivo [toggle, abre system settings]

MÓDULOS HABILITADOS
  • Contas a pagar (Bills)         [toggle]
  • Sinking Funds                  [toggle]
  • Módulo PJ/MEI                  [toggle]
  • Investimentos                  [toggle]
  • Imposto de Renda               [toggle]

SEGURANÇA
  • Biometria para abrir o app     [toggle]          ← usa expo-local-authentication
  • Trocar PIN/Senha               [link]
  • Sessões ativas                 [link → sessions]

DADOS
  • Exportar para CSV              [link]
  • Exportar JSON (backup)         [link → /api/backup/json]
  • Exportar PDF                   [link → /api/backup/export-pdf]
  • Importar SMS Help              [link]
  • Captura automática             [link]

PRIVACIDADE
  • LGPD: meus dados               [link → /api/user/export-data]
  • Esconder valores na splash     [toggle]
  • Excluir minha conta            [link destrutivo]

SOBRE
  • Versão do app                  [texto]
  • Termos de uso                  [link]
  • Política de privacidade        [link]
  • Contato DPO                    [link]
  • Suporte (WhatsApp)             [link]
```

Cada toggle de notificação salva via `PATCH /api/settings { ... }`. Cada toggle de módulo salva via `PATCH /api/settings { billsEnabled, ... }` e a UI dos menus respeita esses flags.

### 10.4 Biometria

`services/biometric.ts` já existe (39 linhas). Garantir:
- Setting "Biometria para abrir o app" controla a tela `(auth)/unlock.tsx`
- Se ativada e o `expo-local-authentication` reportar suporte: ao abrir o app já autenticado, exibir prompt de Face ID / Touch ID antes de revelar o conteúdo
- Botão "Usar PIN" como fallback
- 3 tentativas falhas → desloga forçado

### 10.5 Backup acionável

- Criar `(more)/backup.tsx`:
  - Botão "Baixar JSON (backup completo)" → `GET /api/backup/json`, salvar em `FileSystem.documentDirectory`, abrir share sheet
  - Botão "Exportar PDF anual" → seletor de ano + `GET /api/backup/export-pdf?year=`
  - Card "Backup automático na nuvem": link explicativo (mostra que o backend já mantém histórico)
  - Linkar a partir de Configurações → Dados

### 10.6 Sincronia bidirecional de preferências (refino)

Hoje `ThemeContext` faz polling a cada 30s do `/api/preferences`. Quando o usuário muda algo no mobile, faz `pushRemotePrefs` imediatamente. Refinar:

- Ao receber notification `prefs_updated` do backend (push silenciosa), forçar `fetchRemotePrefs()` imediatamente
- Reduzir polling para 60s
- Adicionar toast discreto "Tema sincronizado do navegador" quando uma mudança remota for aplicada

### 10.7 Indicação (Referral)

`services/referral.ts` existe e `(more)/referral.tsx` também. Garantir:
- Mostrar código do usuário com botão Copiar
- Botão "Compartilhar" abre share sheet com link `https://pilarfinanceiro.app/r/<code>`
- Lista de indicações feitas (pendente / convertido)
- Card de gamificação: "Você ganha 1 mês grátis a cada 3 indicações convertidas"

### 10.8 Sessões e dispositivos

Em `(more)/sessions.tsx`:
- Aba "Sessões web" via `/api/user/sessions`
- Aba "Dispositivos mobile" via `/api/devices` (criar GET no backend se não existir)
- Cada item: nome (Chrome/macOS/iPhone 15), última atividade, IP cidade, ícone
- Botão "Encerrar sessão" → `DELETE /api/user/sessions/:id` ou `/api/devices/:id`
- Botão grande "Encerrar todas as outras" → loop em todas exceto a atual

### 10.9 Recursos LGPD completos

`(more)/lgpd.tsx` (308 linhas) — verificar que tem:
- Card "Meus dados" → `GET /api/user/export-data` (download JSON)
- Card "Histórico de consentimentos" → `GET /api/user/consents`
- Card "Atualizar consentimento" → cards com versão atual de Termos/Política
- Card "Excluir minha conta" (botão destrutivo) → `POST /api/user/delete-account` com confirmação dupla + senha
- Link "Contato com DPO" para `(more)/contato-dpo.tsx` (criar se faltar)

### 10.10 Sentry / Crash reporting (opcional)

Instalar `sentry-expo` e:
- Configurar DSN via env `EXPO_PUBLIC_SENTRY_DSN`
- Capturar crashes não tratados
- Capturar `notifyError` chamados como breadcrumbs
- Ignorar em desenvolvimento

## Definition of Done

- [ ] Custom alerts criados no mobile aparecem no web (e vice-versa) em até 60s.
- [ ] Push notifications funcionam: criar transação no web → notificação chega no mobile.
- [ ] Settings expõe todos os 25+ toggles, cada um salvando via `/api/settings` ou `/api/preferences`.
- [ ] Biometria funcional + fallback PIN + lockout em 3 tentativas.
- [ ] Backup JSON + PDF baixáveis e compartilháveis.
- [ ] Sessões/dispositivos lista web + mobile com botão de revogar.
- [ ] Indicação compartilha link e mostra contagem.
- [ ] LGPD permite exportar dados e excluir conta com confirmação dupla.
- [ ] (Opcional) Sentry capturando crashes em prod.

---

## Conclusão do pacote

Após as 10 fases:

- Cálculos no mobile = web (Health Score, faturas, PM ponderado, sazonalidade).
- Marca **Pilar Financeiro** consistente (logo, paleta, tipografia, micro-interações).
- Investimentos profundos paritários (XIRR, TWR, drawdown, watchlist, alertas, dividend calendar).
- IRPF/DARF/MEI completos com geração de arquivo importável.
- Filtros e relatórios avançados (DRE, calendário, Pareto, anomalias).
- Telas faltantes cobertas (Net Worth, Categorias CRUD, Brokerage Import, Arquivados, Educação).
- 20 simuladores idênticos ao web.
- Performance pronta para 5.000+ transações com offline-first.
- UX premium (skeletons, toasts, haptics, transições).
- Sincronia total via `/api/settings`, `/api/preferences`, `/api/alert-rules`, push notifications e biometria.

O mobile passa a ser uma extensão fiel do web, não um produto à parte.
