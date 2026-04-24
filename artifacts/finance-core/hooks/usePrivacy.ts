import { useTheme } from '@/context/ThemeContext';
import { setHideBalances } from '@/services/userPrivacy';
import { useCallback } from 'react';

/**
 * Bridge entre o estado local de "valuesVisible" do ThemeContext e a preferência
 * remota `hideBalances` do backend. Mantém a API simples para os consumidores.
 */
export function usePrivacy() {
  const { valuesVisible, toggleValuesVisible, maskValue } = useTheme();
  const hideBalances = !valuesVisible;

  const toggle = useCallback(() => {
    toggleValuesVisible();
    // Sincroniza com o backend (silent fail tolerado)
    setHideBalances(!hideBalances === true);
  }, [hideBalances, toggleValuesVisible]);

  const mask = useCallback(
    (value: string | number) => maskValue(typeof value === 'number' ? String(value) : value),
    [maskValue]
  );

  return {
    hideBalances,
    isVisible: valuesVisible,
    toggle,
    maskValue: mask,
  };
}
