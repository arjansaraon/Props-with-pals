import { toast } from "sonner"

export type ToastType = 'success' | 'error' | 'info';

/**
 * Wrapper hook for sonner toast that maintains the same API as the old custom toast
 */
export function useToast() {
  const showToast = (message: string, type: ToastType) => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast.info(message);
        break;
    }
  };

  return { showToast };
}
