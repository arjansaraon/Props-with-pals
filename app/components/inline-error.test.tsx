import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineError } from './inline-error';

describe('InlineError component', () => {
  it('renders the error message', () => {
    render(<InlineError message="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders with error role for accessibility', () => {
    render(<InlineError message="Error occurred" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not render when message is empty', () => {
    const { container } = render(<InlineError message="" />);

    expect(container.firstChild).toBeNull();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();
    render(<InlineError message="Error" onDismiss={onDismiss} />);

    expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<InlineError message="Error" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByLabelText('Dismiss error'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not show dismiss button when onDismiss is not provided', () => {
    render(<InlineError message="Error" />);

    expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<InlineError message="Error" className="mt-4" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('mt-4');
  });
});
