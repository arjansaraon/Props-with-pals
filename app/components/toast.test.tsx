import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast, ToastProvider, useToast } from './toast';

// Test component that uses the toast hook
function TestComponent() {
  const { showToast, toasts } = useToast();

  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>
        Show Success
      </button>
      <button onClick={() => showToast('Error message', 'error')}>
        Show Error
      </button>
      <button onClick={() => showToast('Info message', 'info')}>
        Show Info
      </button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
}

describe('Toast component', () => {
  describe('Toast rendering', () => {
    it('renders success toast with green styling', () => {
      render(
        <Toast
          id="1"
          message="Success!"
          type="success"
          onDismiss={() => {}}
        />
      );

      expect(screen.getByText('Success!')).toBeInTheDocument();
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-green');
    });

    it('renders error toast with red styling', () => {
      render(
        <Toast
          id="2"
          message="Error!"
          type="error"
          onDismiss={() => {}}
        />
      );

      expect(screen.getByText('Error!')).toBeInTheDocument();
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-red');
    });

    it('renders info toast with blue styling', () => {
      render(
        <Toast
          id="3"
          message="Info!"
          type="info"
          onDismiss={() => {}}
        />
      );

      expect(screen.getByText('Info!')).toBeInTheDocument();
      const toast = screen.getByRole('alert');
      expect(toast.className).toContain('bg-blue');
    });

    it('calls onDismiss when close button clicked', () => {
      const onDismiss = vi.fn();

      render(
        <Toast
          id="1"
          message="Test"
          type="success"
          onDismiss={onDismiss}
        />
      );

      const closeButton = screen.getByRole('button', { name: /dismiss/i });
      fireEvent.click(closeButton);

      expect(onDismiss).toHaveBeenCalledWith('1');
    });
  });

  describe('ToastProvider and useToast', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows toast when showToast is called', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

      fireEvent.click(screen.getByText('Show Success'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('auto-dismisses toast after 3 seconds', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Fast-forward 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });

    it('can show multiple toasts', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('removes specific toast when dismissed', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Success'));
      fireEvent.click(screen.getByText('Show Error'));

      // Find and click the dismiss button for the first toast
      const dismissButtons = screen.getAllByRole('button', { name: /dismiss/i });
      fireEvent.click(dismissButtons[0]);

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });
  });
});
