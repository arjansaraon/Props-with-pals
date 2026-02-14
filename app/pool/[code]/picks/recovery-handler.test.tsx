import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RecoveryHandler } from './recovery-handler';

// Mock next/navigation
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
let mockToken: string | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'token' ? mockToken : null),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RecoveryHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = null;
  });

  it('shows spinner while recovering', () => {
    mockToken = 'valid-token';
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

    render(<RecoveryHandler code="ABC123" />);

    expect(screen.getByText('Restoring your session...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not call fetch when no token is present', () => {
    mockToken = null;

    render(<RecoveryHandler code="ABC123" />);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('POSTs token to /api/pools/[code]/recover', async () => {
    mockToken = 'test-token-123';
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<RecoveryHandler code="MYPOOL" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/pools/MYPOOL/recover',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'test-token-123' }),
        })
      );
    });
  });

  it('redirects to picks page on success (default redirectPath)', async () => {
    mockToken = 'valid-token';
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<RecoveryHandler code="POOL01" />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/pool/POOL01/picks');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('redirects to custom path when redirectPath is provided', async () => {
    mockToken = 'valid-token';
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<RecoveryHandler code="POOL02" redirectPath="/pool/POOL02/captain" />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/pool/POOL02/captain');
    });
  });

  it('shows error message when recovery fails (non-ok response)', async () => {
    mockToken = 'expired-token';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ code: 'INVALID_TOKEN' }),
    });

    render(<RecoveryHandler code="POOL03" />);

    await waitFor(() => {
      expect(screen.getByText('Invalid recovery link. Please ask the captain for a new link.')).toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows error message when fetch throws (network error)', async () => {
    mockToken = 'some-token';
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<RecoveryHandler code="POOL04" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to restore session. Please try again.')).toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
