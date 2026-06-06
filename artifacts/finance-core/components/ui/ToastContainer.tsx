import React, { useState, useEffect, useCallback } from 'react';
import { _subscribeToast, type ToastEvent } from '@/utils/toast';
import { Toast, type ToastConfig } from './Toast';

export function ToastContainer() {
  const [state, setState] = useState<{ visible: boolean; config: ToastConfig }>({
    visible: false,
    config: { message: '' },
  });

  const hide = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    return _subscribeToast((event: ToastEvent) => {
      setState({
        visible: true,
        config: { message: event.message, type: event.type, duration: event.duration },
      });
    });
  }, []);

  return <Toast {...state.config} visible={state.visible} onHide={hide} />;
}
