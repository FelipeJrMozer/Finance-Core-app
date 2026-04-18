import { apiDelete } from './api';

/**
 * LGPD — solicita exclusão definitiva da conta no servidor.
 * Após sucesso, o caller deve limpar tokens locais e voltar para login.
 */
export async function deleteAccount(): Promise<void> {
  await apiDelete('/api/user/me');
}
