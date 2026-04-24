# Fase 7 — Simuladores: paridade total com o web

## Contexto

Web tem ~17 simuladores em telas dedicadas (rotas próprias). Mobile tem 12 num grid (`(more)/simulators.tsx`), com nomes parcialmente diferentes. Vamos alinhar a lista, adicionar os faltantes e padronizar visual/UX.

## Lista oficial (mesma do web, mesma ordem)

| # | Nome no menu | Tela mobile | Status |
|---|--------------|-------------|--------|
| 1 | Juros Compostos | `simulators/compound-interest.tsx` | ✅ existe |
| 2 | Meta de Poupança | `simulators/savings-goal.tsx` | ✅ existe |
| 3 | Aportes Mensais | `simulators/monthly-contributions.tsx` | ❌ FALTA |
| 4 | Empréstimo (PRICE/SAC) | `simulators/loan.tsx` | ✅ |
| 5 | Reserva de Emergência | `simulators/emergency-fund.tsx` | ✅ |
| 6 | Financiamento Imóvel | `simulators/home-financing.tsx` | ✅ |
| 7 | Financiamento Veículo | `simulators/vehicle-financing.tsx` | ✅ |
| 8 | Renda Fixa (CDB/LCI/LCA/Tesouro) | `simulators/fixed-income.tsx` | ❌ FALTA (web tem `FixedIncomeSimulator.tsx`) |
| 9 | IPCA vs CDI | `simulators/inflation.tsx` | ⚠️ existe como "IPCA vs CDI" — renomear para "Inflação vs CDI" |
| 10 | Imposto de Renda | `simulators/irpf.tsx` | ✅ |
| 11 | Independência Financeira (FIRE) | `simulators/fire.tsx` | ✅ |
| 12 | Previdência Privada (PGBL/VGBL) | `simulators/private-pension.tsx` | ✅ |
| 13 | FGTS | `simulators/fgts.tsx` | ❌ FALTA |
| 14 | 13º Salário | `simulators/13th-salary.tsx` | ❌ FALTA |
| 15 | Aluguel vs Compra | `simulators/rent-vs-buy.tsx` | ❌ FALTA (web tem `RentVsBuySimulator.tsx`) |
| 16 | Custo Real do Cartão | `simulators/credit-card-cost.tsx` | ✅ (mobile-only — manter) |
| 17 | Portabilidade | `simulators/portability.tsx` | ✅ (mobile-only — manter) |
| 18 | Dividend Yield | `simulators/dividend-yield.tsx` | ❌ FALTA (web tem `DividendYieldSimulator.tsx`) |
| 19 | Aposentadoria | `simulators/retirement.tsx` | ❌ FALTA (web tem `RetirementSimulator.tsx`, distinto de FIRE) |
| 20 | Meta Financeira | `simulators/financial-goal.tsx` | ❌ FALTA (web tem `FinancialGoalSimulator.tsx`) |

## Tarefas

### 7.1 Refatorar `(more)/simulators.tsx`

- Substituir grid plano por **agrupamentos com `<SectionHeader>`**:

```
RENDA FIXA & POUPANÇA
  • Juros Compostos
  • Meta de Poupança
  • Aportes Mensais
  • Renda Fixa (CDB/LCI/LCA/Tesouro)
  • Reserva de Emergência

CRÉDITO & DÍVIDA
  • Empréstimo (PRICE/SAC)
  • Financiamento Imóvel
  • Financiamento Veículo
  • Custo Real do Cartão
  • Portabilidade

IMPOSTOS & APOSENTADORIA
  • Imposto de Renda
  • Previdência Privada
  • FGTS
  • 13º Salário
  • Aposentadoria
  • Independência Financeira (FIRE)

INVESTIMENTOS
  • Inflação vs CDI
  • Dividend Yield

DECISÕES
  • Aluguel vs Compra
  • Meta Financeira
```

- Cada item: ícone Lucide + título + 1 linha de subtítulo explicando o que faz.

### 7.2 Padrão de tela de simulador

Toda tela individual deve seguir este layout:

```
┌── Header (←  Nome do Simulador  ⓘ) ──────┐
│                                          │
│  HERO RESULT (resultado principal)       │
│  R$ 1.234.567,89  ←─ tabular nums        │
│  badge: "em 30 anos com aporte de R$X"   │
│                                          │
│  BARRA DE INPUTS                         │
│  Aporte inicial    [R$ ____]             │
│  Aporte mensal     [R$ ____]             │
│  Taxa anual        [____%]               │
│  Período           [_anos_]              │
│                                          │
│  GRÁFICO (LineChart ou BarChart)         │
│                                          │
│  TABELA RESUMO                           │
│  Total investido    R$ X                 │
│  Juros ganhos       R$ Y (verde)         │
│  Total final        R$ Z                 │
│                                          │
│  [Salvar como meta] [Compartilhar]       │
└──────────────────────────────────────────┘
```

- Inputs em formulário react-hook-form com Zod validation.
- Recálculo em tempo real (debounce 300ms).
- "Salvar como meta" cria `POST /api/goals` com targetAmount = resultado e deadline = hoje + período.
- "Compartilhar" gera PNG do hero+gráfico via `react-native-view-shot` e abre share sheet.

### 7.3 Implementar os 7 simuladores faltantes

Cada um com fórmula matemática **idêntica à do web** (consultar arquivo em `client/src/pages/<NomeSimulador>.tsx` para portar a lógica):

#### Aportes Mensais
- Inputs: aporte mensal, taxa anual, anos
- Output: valor final acumulado, total investido, juros
- Fórmula: `FV = P × ((1+i)^n − 1)/i` onde i = taxa/12, n = meses

#### Renda Fixa
- Inputs: tipo (CDB/LCI/LCA/Tesouro IPCA+/Selic/Prefixado), valor, prazo, taxa, % CDI (se CDB)
- Calcula IR regressivo (22.5/20/17.5/15%) para CDB e Tesouro
- LCI/LCA isentos de IR
- Compara líquido vs CDI puro

#### FGTS
- Inputs: salário bruto, anos trabalhados, saldo atual estimado
- Calcula depósito mensal (8% do salário), rendimento (TR + 3% a.a.) e simulação saque-aniversário vs rescisão

#### 13º Salário
- Inputs: salário bruto, dependentes IR, mês admissão
- Calcula 1ª parcela (50% bruto), 2ª parcela (com INSS + IR descontados)
- Mostra valor líquido na conta em dezembro

#### Aluguel vs Compra
- Inputs: valor do imóvel, entrada, taxa financiamento, prazo, aluguel mensal, valorização anual estimada, rendimento alternativo (CDI)
- Compara em N anos: patrimônio acumulado se comprar (imóvel - dívida) vs patrimônio se alugar e investir a diferença
- LineChart com 2 linhas até 30 anos

#### Dividend Yield
- Inputs: valor investido, DY anual esperado, anos, reinvestimento (sim/não), crescimento DY anual
- Output: dividendos mensais, total recebido, patrimônio final (se reinvestir)

#### Aposentadoria
- Inputs: idade atual, idade aposentadoria, renda desejada, expectativa de vida, taxa de retorno antes/depois, inflação
- Output: quanto precisa juntar até aposentar (FV do passivo) e aporte mensal necessário
- Diferente do FIRE pois considera fase de desacumulação

#### Meta Financeira
- Inputs: objetivo (texto), valor, prazo, aporte inicial, taxa anual
- Output: aporte mensal necessário
- Atalho "Salvar como meta" pré-preenchido

### 7.4 Renomear "IPCA vs CDI" → "Inflação vs CDI"

Em `simulators/inflation.tsx` (ou equivalente atual):
- Trocar título visível
- Manter rota antiga como redirect para não quebrar deep links

## Definition of Done

- [ ] 20 simuladores listados, agrupados em 5 seções.
- [ ] Os 7 simuladores faltantes implementados com fórmulas idênticas ao web.
- [ ] Layout padrão (hero + inputs + gráfico + resumo + ações) aplicado a todas as telas.
- [ ] "Salvar como meta" funcional em todos os simuladores que faz sentido (Juros Compostos, Aportes, Meta Financeira, Aluguel vs Compra, FIRE, Aposentadoria).
- [ ] "Compartilhar" gera PNG e abre share sheet.
