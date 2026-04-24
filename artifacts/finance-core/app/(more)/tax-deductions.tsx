import React from 'react';
import { CrudScreen } from './tax-incomes';
import {
  listTaxDeductions, createTaxDeduction, updateTaxDeduction, deleteTaxDeduction,
} from '@/services/tax';

const DEDUCTION_TYPES = [
  { id: 'saude',         label: 'Saúde (médicos, planos, hospital)' },
  { id: 'educacao',      label: 'Educação (escola, faculdade)' },
  { id: 'dependente',    label: 'Dependente' },
  { id: 'previdencia',   label: 'Previdência privada (PGBL)' },
  { id: 'pensao',        label: 'Pensão alimentícia judicial' },
  { id: 'livro-caixa',   label: 'Livro-caixa (autônomo)' },
  { id: 'doacao',        label: 'Doação incentivada' },
  { id: 'outro',         label: 'Outra dedução' },
];

export default function TaxDeductionsScreen() {
  return (
    <CrudScreen
      title="Deduções"
      typeOptions={DEDUCTION_TYPES}
      list={listTaxDeductions}
      create={createTaxDeduction as any}
      update={updateTaxDeduction as any}
      remove={deleteTaxDeduction}
      partyLabel="Beneficiário"
      docLabel="CPF/CNPJ do beneficiário"
      mapDoc={(item: any) => ({ doc: item.beneficiaryDoc, name: item.beneficiaryName })}
      buildItem={(common, party) => ({
        ...common,
        beneficiaryDoc: party.doc,
        beneficiaryName: party.name,
      })}
      testIDPrefix="deduction"
    />
  );
}
