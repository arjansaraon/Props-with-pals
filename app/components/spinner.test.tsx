import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner';

describe('Spinner component', () => {
  it('renders with default size (md)', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('w-6', 'h-6');
  });

  it('renders with small size', () => {
    render(<Spinner size="sm" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  it('renders with large size', () => {
    render(<Spinner size="lg" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('has accessible screen reader text', () => {
    render(<Spinner />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toHaveClass('sr-only');
  });

  it('applies custom className', () => {
    render(<Spinner className="text-blue-600" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('text-blue-600');
  });

  it('has animation class', () => {
    render(<Spinner />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('animate-spin');
  });
});
