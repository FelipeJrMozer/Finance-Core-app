export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastEvent {
  message: string;
  type: ToastType;
  duration?: number;
}

type Listener = (event: ToastEvent) => void;

const listeners: Listener[] = [];

function emit(event: ToastEvent) {
  listeners.forEach((l) => {
    try { l(event); } catch {}
  });
}

export function _subscribeToast(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export const toast = {
  success: (message: string, duration?: number) => emit({ message, type: 'success', duration }),
  error: (message: string, duration?: number) => emit({ message, type: 'error', duration }),
  info: (message: string, duration?: number) => emit({ message, type: 'info', duration }),
  warning: (message: string, duration?: number) => emit({ message, type: 'warning', duration }),
};
