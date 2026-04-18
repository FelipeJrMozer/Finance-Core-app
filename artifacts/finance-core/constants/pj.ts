// Constantes oficiais do MEI (vigência 2025).
// Fonte: Lei Complementar 123/2006 + Resolução CGSN reajustes.

export const MEI_LIMITE_ANUAL = 81000;
export const MEI_LIMITE_PROPORCIONAL_MES = 6750; // 81000 / 12

export type MeiCategoria =
  | 'comercio_industria'
  | 'servicos'
  | 'comercio_servicos'
  | 'caminhoneiro';

export interface MeiDasInfo {
  id: MeiCategoria;
  label: string;
  amount: number;
}

// Valor fixo mensal do DAS-MEI por categoria de atividade (R$).
// NÃO é percentual sobre o faturamento — o DAS é VALOR FIXO.
export const MEI_DAS_2025: Record<MeiCategoria, MeiDasInfo> = {
  comercio_industria: {
    id: 'comercio_industria',
    label: 'Comércio / Indústria',
    amount: 76.9,
  },
  servicos: {
    id: 'servicos',
    label: 'Serviços',
    amount: 80.9,
  },
  comercio_servicos: {
    id: 'comercio_servicos',
    label: 'Comércio + Serviços',
    amount: 81.9,
  },
  caminhoneiro: {
    id: 'caminhoneiro',
    label: 'MEI Caminhoneiro',
    amount: 188.69,
  },
};

export const MEI_DAS_DEFAULT_CATEGORIA: MeiCategoria = 'comercio_industria';

export const MEI_DAS_LIST: MeiDasInfo[] = [
  MEI_DAS_2025.comercio_industria,
  MEI_DAS_2025.servicos,
  MEI_DAS_2025.comercio_servicos,
  MEI_DAS_2025.caminhoneiro,
];

/**
 * Calcula o limite proporcional do MEI para empresas abertas no meio do ano.
 * @param mesesRestantesNoAno número de meses (1..12) restantes no ano de abertura.
 */
export function meiLimiteProporcional(mesesRestantesNoAno: number): number {
  const meses = Math.max(0, Math.min(12, Math.floor(mesesRestantesNoAno)));
  return MEI_LIMITE_PROPORCIONAL_MES * meses;
}
