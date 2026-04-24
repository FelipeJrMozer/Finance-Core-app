# Fase 2 — Marca, identidade visual e tipografia

## Contexto

O sistema web usa a marca **"Pilar Financeiro"** com logo em diamante, tipografia Inter, paleta Ocean Blue (`hsl(199, 89%, 48%)`), Roboto Mono / JetBrains Mono para números financeiros, micro-interações específicas (button-press scale 0.95, hover-elevate, card-hover-lift) e um sistema de 8 acentos via `data-theme`. O mobile hoje se chama "Finance Core", usa "Azul Oceano #0096C7" e tem 7 presets diferentes. **Resultado: parecem dois produtos.**

## Tarefas

### 2.1 Renomear e re-marcar

- **Nome do app**: trocar "Finance Core" por **"Pilar Financeiro"** em:
  - `app.json` → `name`, `slug`, `scheme`
  - Cabeçalhos visíveis (login, register, splash, header da home)
  - Textos legais (`legal-terms.tsx`, `legal-privacy.tsx`, `lgpd.tsx`)
- **Bundle ID**: NÃO trocar (`com.pilarfinanceiro.app` ou o atual). Mudar bundle quebra builds.
- **Logo**: pedir ao designer/usuário o `logo-diamond.png` do web (`client/public/logo-diamond.png`). Colocar em `assets/images/logo-diamond.png`. Substituir todos os usos do logo atual.
- **Splash screen**: cor de fundo `#0096C7`, logo diamante centralizado.
- **Tipografia da marca**: "Pilar" em peso 700, "Financeiro" em peso 300 (mesma quebra do web).

### 2.2 Tokens de cor: alinhar com web (HSL)

O web usa **CSS variables HSL** com 8 acentos. O mobile usa hex em `constants/colors.ts`. **Mantenha hex no mobile** (RN não usa CSS), mas os valores precisam casar exatamente.

Atualizar `constants/colors.ts`:

```ts
export const ACCENT_PRESETS = [
  { id: 'ocean',     label: 'Ocean Blue',        primary: '#0EA5E9' /* hsl(199 89% 48%) */, primaryDark: '#0369A1', primaryLight: '#7DD3FC', primaryOnDark: '#38BDF8' },
  { id: 'indigo',    label: 'Indigo',            primary: '#6366F1' /* hsl(239 84% 67%) */, ...},
  { id: 'green',     label: 'Verde Esmeralda',   primary: '#10B981', ...},
  { id: 'blue',      label: 'Azul Royal',        primary: '#3B82F6', ...},
  { id: 'purple',    label: 'Roxo',              primary: '#A855F7', ...},
  { id: 'orange',    label: 'Laranja',           primary: '#F97316', ...},
  { id: 'red',       label: 'Vermelho',          primary: '#EF4444', ...},
  { id: 'neutral',   label: 'Neutro',            primary: '#64748B', ...},
];
```

Os IDs dos presets precisam ser exatamente: `ocean | indigo | green | blue | purple | orange | red | neutral` para o `/api/preferences` sincronizar entre web e mobile (hoje há inconsistência: mobile tem `royalblue` mas web tem `blue`).

**Cor de texto / superfície / borda** — usar HSL escuro/claro idêntico ao web:

```ts
light: {
  background: '#F8FAFC',     // hsl(210 40% 98%)
  surface:    '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  border:     '#E2E8F0',
  text:       '#0F172A',
  textSecondary: '#64748B',
  textTertiary:  '#94A3B8',
  card:       '#FFFFFF',
  destructive:'#DC2626',     // hsl(0 72% 51%)
  success:    '#059669',     // hsl(160 84% 39%)
  warning:    '#D97706',
},
dark: {
  background: '#0B1220',     // hsl(222 30% 7%)
  surface:    '#111827',
  surfaceElevated: '#1F2937',
  border:     '#1F2937',
  text:       '#F1F5F9',     // hsl(210 40% 95%)
  textSecondary: '#94A3B8',
  textTertiary:  '#64748B',
  card:       '#111827',
  destructive:'#F87171',
  success:    '#34D399',
  warning:    '#FBBF24',
},
```

### 2.3 Tipografia financeira (tabular nums)

O web usa `.font-financial` (Roboto Mono ou JetBrains Mono) em todos os valores monetários — isso garante alinhamento de colunas em tabelas de transações e listas de investimentos.

**Mobile**:
- Adicionar font Roboto Mono via `expo-font`:
  ```ts
  // app/_layout.tsx
  import { useFonts, RobotoMono_400Regular, RobotoMono_500Medium, RobotoMono_700Bold } from '@expo-google-fonts/roboto-mono';
  ```
- Criar componente `<Money value={123.45} />` em `components/Money.tsx` que aplica `fontFamily: 'RobotoMono_500Medium'` + `fontVariant: ['tabular-nums']` + cor automática (income/expense/neutral) e formata com `formatBRL`.
- Substituir todas as ocorrências de `<Text>{formatBRL(...)}</Text>` por `<Money value={...} />` em:
  - `(tabs)/index.tsx`, `(tabs)/transactions.tsx`, `(tabs)/reports.tsx`, `(tabs)/investments.tsx`
  - `components/TransactionItem.tsx`, `components/SummaryCard.tsx`, `components/BudgetProgress.tsx`
  - Telas de detalhe (`account/[id]`, `card/[id]`, `investment/[id]`, `goal/[id]`, `transaction/[id]`)

### 2.4 Estrutura do menu "Mais": espelhar a sidebar do web

O web organiza a sidebar em seções: **Principal**, **MEI/ME/Freelancer**, **Controle Pessoal**, **Investimentos**, **Imposto de Renda**, **Configurações**.

Reorganizar `(tabs)/more.tsx` (e `(more)/_layout.tsx`) com **exatamente** essas seções (em pt-BR):

```
PRINCIPAL
  • Dashboard            → /(tabs)
  • Lançamentos          → /(tabs)/transactions
  • Contas               → /(more)/accounts
  • Cartões              → /(more)/cards
  • Orçamentos           → /(more)/budgets
  • Metas                → /(more)/goals
  • Contas a pagar       → /(more)/bills
  • Recorrências         → /(more)/recurring         (Fase 1)

CONTROLE PESSOAL
  • Saúde Financeira     → /(more)/health-score
  • Patrimônio           → /(more)/net-worth          (Fase 6)
  • Categorias           → /(more)/categories         (Fase 6)
  • Regras               → /(more)/categorization-rules
  • Sinking Funds        → /(more)/sinking-funds
  • Família              → /(more)/familia
  • Lançamentos pendentes→ /(more)/pending-transactions
  • Captura automática   → /(more)/captura-bancaria

INVESTIMENTOS
  • Carteira             → /(tabs)/investments
  • Relatórios           → /(more)/investment-report
  • Watchlist            → /(more)/watchlist          (Fase 3)
  • Alertas de preço     → /(more)/price-alerts       (Fase 3)
  • Calendário dividendos→ /(more)/dividend-calendar  (Fase 3)
  • Comparador de ações  → /(more)/stock-comparator   (Fase 3)
  • Importar nota corret.→ /(more)/brokerage-import   (Fase 6)
  • Cripto               → /(more)/crypto             (Fase 3)

IMPOSTO DE RENDA
  • Painel IRPF          → /(more)/taxes              (Fase 4)
  • DARF                 → /(more)/darf               (Fase 4)
  • Calendário fiscal    → /(more)/tax-calendar       (Fase 4)
  • Exportar IRPF        → /(more)/irpf-export        (Fase 4)

MEI / ME / FREELANCER
  • Dashboard PJ         → /(more)/pj
  • Receitas             → /(more)/pj/receitas
  • Despesas             → /(more)/pj/despesas
  • Clientes             → /(more)/pj/clientes
  • DAS                  → /(more)/pj/das
  • DASN-SIMEI           → /(more)/pj/dasn-simei
  • Pró-labore           → /(more)/pj/retiradas
  • Notas fiscais        → /(more)/pj/notas-fiscais
  • Fluxo de caixa       → /(more)/pj/fluxo-caixa
  • Saúde do negócio     → /(more)/pj/saude-negocio

FERRAMENTAS
  • IA Pilar             → /chat
  • Simuladores          → /(more)/simulators
  • Alertas personalizados→ /(more)/custom-alerts
  • Educação financeira  → /(more)/education          (Fase 6)

CONFIGURAÇÕES
  • Configurações        → /(more)/settings
  • Assinatura           → /(more)/subscriptions
  • Sessões              → /(more)/sessions
  • Indicação            → /(more)/referral
  • Privacidade & LGPD   → /(more)/lgpd
```

Usar `<SectionHeader>` (já existe) entre cada seção. Toda linha deve ter ícone Lucide-equivalente do web (mapear via `@expo/vector-icons` Feather/Material). Itens marcados "(Fase X)" ficam ocultos até a fase ser executada.

### 2.5 Micro-interações e elevação

Implementar utilitários em `components/ui/Pressable.tsx`:

```tsx
// PressableScale: aplica scale 0.96 no press (equiv. .button-press do web)
// PressableElevate: muda backgroundColor para colors.surfaceElevated no press
```

Substituir `TouchableOpacity` por:
- **Botões primários/CTA**: `PressableScale`
- **Itens de lista clicáveis** (transações, contas, cartões): `PressableElevate`
- **Cards de estatística no dashboard**: ambos (scale + elevate)

Adicionar prop `haptic="light" | "medium" | "heavy"` que dispara `Haptics.impactAsync()` no `onPress` (já temos `expo-haptics`).

### 2.6 Cards: sombra/borda alinhadas

Web usa `shadow-sm` + `border-card-border` + `rounded-xl` (12px radius).

Atualizar `constants/colors.ts`:
```ts
radius: { card: 12, cardLg: 16, button: 8, chip: 999 }
```

E em todo `<View style={{ borderRadius: ... }}>` usar `colors.radius.card`. Sombra:
```ts
shadow: {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 2,
}
```

### 2.7 Ícones: alinhar biblioteca

Web usa `lucide-react` (~340 ícones). Mobile usa `@expo/vector-icons` (Feather/Material). Mapear ícones críticos numa tabela em `utils/icons.ts`:

```ts
export const ICONS = {
  dashboard:   { lib: 'Feather',   name: 'home' },
  transaction: { lib: 'Feather',   name: 'list' },
  account:     { lib: 'Feather',   name: 'credit-card' },
  card:        { lib: 'Feather',   name: 'credit-card' },
  goal:        { lib: 'Feather',   name: 'target' },
  budget:      { lib: 'Feather',   name: 'pie-chart' },
  investment:  { lib: 'Feather',   name: 'trending-up' },
  ai:          { lib: 'MaterialCommunityIcons', name: 'robot' },
  ...
};
```

Substituir todos os `<Feather name="..." />` espalhados por `<Icon name="dashboard" />` (componente novo que lê o map).

## Definition of Done

- [ ] Splash, login, header e título do app mostram **"Pilar Financeiro"** com logo em diamante.
- [ ] 8 acentos disponíveis em Configurações, IDs idênticos ao web (testar mudança no web → reflete no mobile em 30s via `/api/preferences`).
- [ ] Todo valor monetário usa `<Money>` com tabular nums (visualmente: colunas alinhadas em listas).
- [ ] Menu "Mais" reorganizado nas 7 seções acima, na ordem exata.
- [ ] Botões CTA têm scale animation no press; itens de lista têm elevate animation.
- [ ] Cards usam `radius.card = 12px`, sombra suave, borda 1px de `colors.border`.
- [ ] Tipografia da marca: "Pilar" 700 + "Financeiro" 300 (no header e splash).
- [ ] Dark mode permanece funcional após todas as mudanças.
