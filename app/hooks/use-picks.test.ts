import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePicks } from './use-picks';

// Mock the useToast hook
const mockShowToast = vi.fn();
vi.mock('./use-toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('usePicks', () => {
  const defaultProps = {
    code: 'ABC123',
    initialPicks: [],
    poolStatus: 'open',
    totalProps: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('handlePick', () => {
    it('does NOT show "Pick saved!" toast on successful pick submission', async () => {
      // Arrange: Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePicks(defaultProps));

      // Act: Submit a pick
      await act(async () => {
        await result.current.handlePick('prop-1', 0);
      });

      // Assert: showToast should NOT be called with "Pick saved!"
      // (The feature spec says to remove this toast entirely)
      const pickSavedCalls = mockShowToast.mock.calls.filter(
        ([message]) => message === 'Pick saved!'
      );
      expect(pickSavedCalls).toHaveLength(0);
    });

    it('updates picks state on successful submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const { result } = renderHook(() => usePicks(defaultProps));

      await act(async () => {
        await result.current.handlePick('prop-1', 1);
      });

      expect(result.current.myPicks.get('prop-1')).toBe(1);
      expect(result.current.pickedCount).toBe(1);
    });

    it('reverts pick and sets error on failed submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => usePicks(defaultProps));

      await act(async () => {
        await result.current.handlePick('prop-1', 0);
      });

      // Pick should be reverted (removed since no previous value)
      expect(result.current.myPicks.has('prop-1')).toBe(false);
      expect(result.current.pickErrorPropId).toBe('prop-1');
    });

    it('does not submit picks when pool is not open', async () => {
      const { result } = renderHook(() =>
        usePicks({ ...defaultProps, poolStatus: 'locked' })
      );

      await act(async () => {
        await result.current.handlePick('prop-1', 0);
      });

      // fetch should not be called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('derived state', () => {
    it('calculates allPicked correctly', () => {
      const { result } = renderHook(() =>
        usePicks({
          ...defaultProps,
          totalProps: 2,
          initialPicks: [
            { propId: 'prop-1', selectedOptionIndex: 0 },
            { propId: 'prop-2', selectedOptionIndex: 1 },
          ],
        })
      );

      expect(result.current.allPicked).toBe(true);
      expect(result.current.progressPercent).toBe(100);
    });

    it('calculates progressPercent correctly', () => {
      const { result } = renderHook(() =>
        usePicks({
          ...defaultProps,
          totalProps: 4,
          initialPicks: [{ propId: 'prop-1', selectedOptionIndex: 0 }],
        })
      );

      expect(result.current.progressPercent).toBe(25);
    });
  });
});
