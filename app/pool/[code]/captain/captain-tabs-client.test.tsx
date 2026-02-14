import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaptainTabsClient } from './captain-tabs-client';
import {
  createMockProp,
  createMockPlayer,
  defaultComponentProps,
  createPropsWithStatus,
  createPropsWithData,
  mockFetchResponse,
} from './__tests__/test-utils';

// Mock next/navigation
const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: mockPush,
  }),
}));

// Mock toast hook
const mockShowToast = vi.fn();
vi.mock('@/app/hooks/use-toast', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location for participant links
Object.defineProperty(window, 'location', {
  value: {
    host: 'localhost:3000',
    protocol: 'http:',
  },
  writable: true,
});

describe('CaptainTabsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===================
  // RENDERING TESTS
  // ===================
  describe('rendering', () => {
    it('renders three tabs: Admin, My Picks, Players', () => {
      render(<CaptainTabsClient {...defaultComponentProps} />);

      expect(screen.getByRole('tab', { name: 'Admin' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'My Picks' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Players' })).toBeInTheDocument();
    });

    it('defaults to Admin tab being active', () => {
      render(<CaptainTabsClient {...defaultComponentProps} />);

      const adminTab = screen.getByRole('tab', { name: 'Admin' });
      expect(adminTab).toHaveAttribute('data-state', 'active');
    });
  });

  // ===================
  // TAB NAVIGATION TESTS
  // ===================
  describe('tab navigation', () => {
    it('switches to My Picks tab when clicked', async () => {
      const user = userEvent.setup();
      render(<CaptainTabsClient {...defaultComponentProps} />);

      await user.click(screen.getByRole('tab', { name: 'My Picks' }));

      expect(screen.getByRole('tab', { name: 'My Picks' })).toHaveAttribute('data-state', 'active');
    });

    it('switches to Players tab when clicked', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ players: [] }));

      render(<CaptainTabsClient {...defaultComponentProps} />);

      await user.click(screen.getByRole('tab', { name: 'Players' }));

      expect(screen.getByRole('tab', { name: 'Players' })).toHaveAttribute('data-state', 'active');
    });

    it('switches back to Admin tab when clicked', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValueOnce(mockFetchResponse({ players: [] }));

      render(<CaptainTabsClient {...defaultComponentProps} />);

      await user.click(screen.getByRole('tab', { name: 'Players' }));
      await user.click(screen.getByRole('tab', { name: 'Admin' }));

      expect(screen.getByRole('tab', { name: 'Admin' })).toHaveAttribute('data-state', 'active');
    });
  });

  // ===================
  // ADMIN TAB TESTS
  // ===================
  describe('Admin Tab', () => {
    // Note: Pool status badge and action buttons (Lock Pool, Complete Pool)
    // are now in the page header via PoolStatusAction component, not in AdminTab

    describe('add prop form', () => {
      describe('collapsible behavior', () => {
        it('shows "Add Prop" button when form is collapsed (default state)', () => {
          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          expect(screen.getByRole('button', { name: /^add prop$/i })).toBeInTheDocument();
          expect(screen.queryByPlaceholderText(/who will score/i)).not.toBeInTheDocument();
        });

        it('expands form when "Add Prop" button is clicked', async () => {
          const user = userEvent.setup();
          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          expect(screen.getByText('Add New Prop')).toBeInTheDocument();
          expect(screen.getByPlaceholderText(/who will score/i)).toBeInTheDocument();
        });

        it('collapses form after successful submission', async () => {
          const user = userEvent.setup();
          mockFetch.mockResolvedValueOnce(mockFetchResponse({ success: true }));
          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          // Open form
          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          // Fill and submit
          await user.type(screen.getByPlaceholderText(/who will score/i), 'Test?');
          await user.type(screen.getByPlaceholderText('Option 1'), 'A');
          await user.type(screen.getByPlaceholderText('Option 2'), 'B');
          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          await waitFor(() => {
            expect(screen.queryByPlaceholderText(/who will score/i)).not.toBeInTheDocument();
          });
          expect(screen.getByRole('button', { name: /^add prop$/i })).toBeInTheDocument();
        });

        it('hides add prop button when pool is locked', () => {
          render(<CaptainTabsClient {...createPropsWithStatus('locked')} />);

          expect(screen.queryByRole('button', { name: /^add prop$/i })).not.toBeInTheDocument();
          expect(screen.queryByText('Add New Prop')).not.toBeInTheDocument();
        });
      });

      describe('form inputs', () => {
        it('shows two option inputs by default', async () => {
          const user = userEvent.setup();
          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          expect(screen.getByPlaceholderText('Option 1')).toBeInTheDocument();
          expect(screen.getByPlaceholderText('Option 2')).toBeInTheDocument();
        });

        it('allows adding more options', async () => {
          const user = userEvent.setup();
          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));
          await user.click(screen.getByRole('button', { name: /add option/i }));

          expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument();
        });

        it('allows removing options when more than 2 exist', async () => {
          const user = userEvent.setup();
          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          // Add a third option first
          await user.click(screen.getByRole('button', { name: /add option/i }));
          expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument();

          // Now remove buttons should be visible
          const removeButtons = screen.getAllByRole('button').filter(btn =>
            btn.querySelector('svg.lucide-trash-2')
          );
          expect(removeButtons.length).toBeGreaterThan(0);
        });

        it('shows point value input defaulting to 10', async () => {
          const user = userEvent.setup();
          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          const pointInput = screen.getByDisplayValue('10');
          expect(pointInput).toBeInTheDocument();
        });
      });

      describe('form submission', () => {
        it('submits form with correct payload', async () => {
          const user = userEvent.setup();
          mockFetch.mockResolvedValueOnce(mockFetchResponse({ success: true }));

          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));
          await user.type(screen.getByPlaceholderText(/who will score/i), 'Test Question?');
          await user.type(screen.getByPlaceholderText('Option 1'), 'Option A');
          await user.type(screen.getByPlaceholderText('Option 2'), 'Option B');
          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
              '/api/pools/ABC123/props',
              expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                  questionText: 'Test Question?',
                  options: ['Option A', 'Option B'],
                  pointValue: 10,
                }),
              })
            );
          });
        });

        it('clears form on successful submission', async () => {
          const user = userEvent.setup();
          mockFetch.mockResolvedValueOnce(mockFetchResponse({ success: true }));
          mockFetch.mockResolvedValueOnce(mockFetchResponse({ success: true }));

          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          const questionInput = screen.getByPlaceholderText(/who will score/i);
          await user.type(questionInput, 'Test Question?');
          await user.type(screen.getByPlaceholderText('Option 1'), 'Option A');
          await user.type(screen.getByPlaceholderText('Option 2'), 'Option B');
          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          // Form collapses, reopen to verify it's cleared
          await waitFor(() => {
            expect(screen.queryByPlaceholderText(/who will score/i)).not.toBeInTheDocument();
          });

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));
          expect(screen.getByPlaceholderText(/who will score/i)).toHaveValue('');
        });

        it('shows success toast on successful submission', async () => {
          const user = userEvent.setup();
          mockFetch.mockResolvedValueOnce(mockFetchResponse({ success: true }));

          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));
          await user.type(screen.getByPlaceholderText(/who will score/i), 'Test Question?');
          await user.type(screen.getByPlaceholderText('Option 1'), 'Option A');
          await user.type(screen.getByPlaceholderText('Option 2'), 'Option B');
          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith('Prop added successfully', 'success');
          });
        });

        it('shows error message on failed submission', async () => {
          const user = userEvent.setup();
          mockFetch.mockResolvedValueOnce(mockFetchResponse({ message: 'Invalid prop' }, false, 400));

          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));
          await user.type(screen.getByPlaceholderText(/who will score/i), 'Test');
          await user.type(screen.getByPlaceholderText('Option 1'), 'A');
          await user.type(screen.getByPlaceholderText('Option 2'), 'B');
          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          await waitFor(() => {
            expect(screen.getByText('Invalid prop')).toBeInTheDocument();
          });
        });

        it('keeps form open on failed submission', async () => {
          const user = userEvent.setup();
          mockFetch.mockResolvedValueOnce(mockFetchResponse({ message: 'Invalid prop' }, false, 400));

          render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

          await user.click(screen.getByRole('button', { name: /^add prop$/i }));
          await user.type(screen.getByPlaceholderText(/who will score/i), 'Test');
          await user.type(screen.getByPlaceholderText('Option 1'), 'A');
          await user.type(screen.getByPlaceholderText('Option 2'), 'B');
          await user.click(screen.getByRole('button', { name: /^add prop$/i }));

          await waitFor(() => {
            expect(screen.getByText('Invalid prop')).toBeInTheDocument();
          });

          // Form should still be visible
          expect(screen.getByPlaceholderText(/who will score/i)).toBeInTheDocument();
        });
      });
    });

    describe('props list', () => {
      it('renders list of props with question and point value', () => {
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('open', {
              propsList: [createMockProp({ questionText: 'Who wins?', pointValue: 15 })],
            })}
          />
        );

        expect(screen.getByText('Who wins?')).toBeInTheDocument();
        expect(screen.getByText('15 pts')).toBeInTheDocument();
      });

      it('shows "No props yet" message when list is empty', () => {
        render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

        expect(screen.getByText(/no props yet/i)).toBeInTheDocument();
      });

      it('shows "No props" warning above Add Prop button', () => {
        render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

        const warning = screen.getByText(/no props yet/i);
        const addButton = screen.getByRole('button', { name: /^add prop$/i });

        // Warning should come before button in DOM (DOCUMENT_POSITION_FOLLOWING = 4)
        expect(warning.compareDocumentPosition(addButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });

      it('shows resolve buttons on locked pool for unresolved props', () => {
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('locked', {
              propsList: [createMockProp({ correctOptionIndex: null })],
            })}
          />
        );

        expect(screen.getAllByRole('button', { name: /mark correct/i })).toHaveLength(2); // One per option
      });

      it('shows "Correct" badge for resolved options', () => {
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('locked', {
              propsList: [createMockProp({ correctOptionIndex: 0 })],
            })}
          />
        );

        expect(screen.getByText('Correct')).toBeInTheDocument();
      });

      it('shows "Resolved" indicator for resolved props', () => {
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('locked', {
              propsList: [createMockProp({ correctOptionIndex: 0 })],
            })}
          />
        );

        expect(screen.getByText('Resolved')).toBeInTheDocument();
      });
    });

    // Note: handleLockPool tests removed - functionality moved to PoolStatusAction component

    describe('handleResolve', () => {
      it('calls POST /api/pools/[code]/props/[propId]/resolve after confirmation', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce(mockFetchResponse({ success: true }));

        render(
          <CaptainTabsClient
            {...createPropsWithStatus('locked', {
              propsList: [createMockProp({ id: 'prop-123', correctOptionIndex: null })],
            })}
          />
        );

        // Click "Mark Correct" to open confirmation dialog
        const markCorrectButtons = screen.getAllByRole('button', { name: /mark correct/i });
        await user.click(markCorrectButtons[0]);

        // Click "Confirm" in the dialog
        const confirmButton = await screen.findByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/pools/ABC123/props/prop-123/resolve',
            expect.objectContaining({
              method: 'POST',
              body: JSON.stringify({ correctOptionIndex: 0 }),
            })
          );
        });
      });

      it('shows success toast on success', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce(mockFetchResponse({ success: true }));

        render(
          <CaptainTabsClient
            {...createPropsWithStatus('locked', {
              propsList: [createMockProp({ correctOptionIndex: null })],
            })}
          />
        );

        // Click "Mark Correct" to open confirmation dialog
        const markCorrectButtons = screen.getAllByRole('button', { name: /mark correct/i });
        await user.click(markCorrectButtons[0]);

        // Click "Confirm" in the dialog
        const confirmButton = await screen.findByRole('button', { name: /confirm/i });
        await user.click(confirmButton);

        await waitFor(() => {
          expect(mockShowToast).toHaveBeenCalledWith('Prop resolved! Points have been awarded.', 'success');
        });
      });
    });
  });

  // ===================
  // MY PICKS TAB TESTS
  // ===================
  describe('My Picks Tab', () => {
    describe('status alerts', () => {
      it('does not show locked alert when pool status is locked (picks still allowed)', async () => {
        const user = userEvent.setup();
        render(<CaptainTabsClient {...createPropsWithStatus('locked', { propsList: [createMockProp()] })} />);

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.queryByText(/this pool is locked/i)).not.toBeInTheDocument();
      });

      it('shows completed alert when pool status is completed', async () => {
        const user = userEvent.setup();
        render(<CaptainTabsClient {...createPropsWithStatus('completed', { propsList: [createMockProp()] })} />);

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.getByText(/check the leaderboard/i)).toBeInTheDocument();
      });
    });

    describe('props display', () => {
      it('shows "No props" message when propsList is empty', async () => {
        const user = userEvent.setup();
        render(<CaptainTabsClient {...createPropsWithStatus('open')} />);

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.getByText(/no props have been added/i)).toBeInTheDocument();
      });

      it('renders prop cards with question and points', async () => {
        const user = userEvent.setup();
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('open', {
              propsList: [createMockProp({ questionText: 'Who scores first?', pointValue: 20 })],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.getByText('Who scores first?')).toBeInTheDocument();
        expect(screen.getByText('20 pts')).toBeInTheDocument();
      });

      it('highlights selected pick', async () => {
        const user = userEvent.setup();
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('open', {
              propsList: [createMockProp({ id: 'prop-1' })],
              initialPicks: [{ propId: 'prop-1', selectedOptionIndex: 0 }],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.getByText('Your pick')).toBeInTheDocument();
      });
    });

    describe('handlePick', () => {
      it('does nothing when pool is completed', async () => {
        const user = userEvent.setup();
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('completed', {
              propsList: [createMockProp()],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        const optionButton = screen.getByRole('button', { name: /team a/i });
        await user.click(optionButton);

        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('calls POST /api/pools/[code]/picks with correct payload', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce(mockFetchResponse({ success: true }));

        render(
          <CaptainTabsClient
            {...createPropsWithStatus('open', {
              propsList: [createMockProp({ id: 'prop-1' })],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        const optionButton = screen.getByRole('button', { name: /team a/i });
        await user.click(optionButton);

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/pools/ABC123/picks',
            expect.objectContaining({
              method: 'POST',
              credentials: 'include',
              body: JSON.stringify({ propId: 'prop-1', selectedOptionIndex: 0 }),
            })
          );
        });
      });

      it('does NOT show "Pick saved!" toast on success (removed per UX spec)', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce(mockFetchResponse({ success: true }));

        render(
          <CaptainTabsClient
            {...createPropsWithStatus('open', {
              propsList: [createMockProp()],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        const optionButton = screen.getByRole('button', { name: /team a/i });
        await user.click(optionButton);

        // Wait for the pick to be processed
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalled();
        });

        // "Pick saved!" toast should NOT appear (UX improvement)
        expect(mockShowToast).not.toHaveBeenCalledWith('Pick saved!', 'success');
      });

      it('optimistically updates UI before API response', async () => {
        const user = userEvent.setup();
        // Delay the fetch response
        mockFetch.mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(() => resolve(mockFetchResponse({ success: true })), 100))
        );

        render(
          <CaptainTabsClient
            {...createPropsWithStatus('open', {
              propsList: [createMockProp()],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        const optionButton = screen.getByRole('button', { name: /team a/i });
        await user.click(optionButton);

        // During saving, a spinner is shown instead of "Your pick"
        // The button should have selected styling (border-primary) immediately
        expect(optionButton).toHaveClass('border-primary');
        // And should show the loading spinner
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });

    describe('resolved props', () => {
      it('shows correct answer with green styling', async () => {
        const user = userEvent.setup();
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('locked', {
              propsList: [createMockProp({ correctOptionIndex: 0 })],
              initialPicks: [{ propId: 'prop-1', selectedOptionIndex: 0 }],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.getByText('Correct')).toBeInTheDocument();
      });

      it('shows wrong pick with "Wrong" label', async () => {
        const user = userEvent.setup();
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('locked', {
              propsList: [createMockProp({ correctOptionIndex: 1 })],
              initialPicks: [{ propId: 'prop-1', selectedOptionIndex: 0 }],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.getByText('Wrong')).toBeInTheDocument();
      });

      it('disables pick buttons when pool is completed', async () => {
        const user = userEvent.setup();
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('completed', {
              propsList: [createMockProp()],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        const optionButton = screen.getByRole('button', { name: /team a/i });
        expect(optionButton).toBeDisabled();
      });
    });

    describe('progress tracker', () => {
      it('shows progress when pool is open', async () => {
        const user = userEvent.setup();
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('open', {
              propsList: [createMockProp(), createMockProp({ id: 'prop-2' })],
              initialPicks: [{ propId: 'prop-1', selectedOptionIndex: 0 }],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.getByText(/1 of 2 answered/i)).toBeInTheDocument();
      });

      it('hides progress when pool is completed', async () => {
        const user = userEvent.setup();
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('completed', {
              propsList: [createMockProp()],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.queryByText(/of \d+ answered/i)).not.toBeInTheDocument();
      });

      it('shows "All picks completed" when complete', async () => {
        const user = userEvent.setup();
        render(
          <CaptainTabsClient
            {...createPropsWithStatus('open', {
              propsList: [createMockProp({ id: 'prop-1' })],
              initialPicks: [{ propId: 'prop-1', selectedOptionIndex: 0 }],
            })}
          />
        );

        await user.click(screen.getByRole('tab', { name: 'My Picks' }));

        expect(screen.getByText(/all picks completed/i)).toBeInTheDocument();
      });
    });
  });

  // ===================
  // PLAYERS TAB TESTS
  // ===================
  describe('Players Tab', () => {
    describe('lazy loading', () => {
      it('does not load participants on initial render', () => {
        render(<CaptainTabsClient {...defaultComponentProps} />);

        expect(mockFetch).not.toHaveBeenCalledWith(
          expect.stringContaining('/players'),
          expect.anything()
        );
      });

      it('loads participants when tab is selected', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce(mockFetchResponse({ players: [] }));

        render(<CaptainTabsClient {...defaultComponentProps} />);

        await user.click(screen.getByRole('tab', { name: 'Players' }));

        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/pools/ABC123/players',
            expect.objectContaining({ credentials: 'include' })
          );
        });
      });

      it('shows loading spinner while fetching', async () => {
        const user = userEvent.setup();
        mockFetch.mockImplementationOnce(
          () => new Promise((resolve) => setTimeout(() => resolve(mockFetchResponse({ players: [] })), 100))
        );

        render(<CaptainTabsClient {...defaultComponentProps} />);

        await user.click(screen.getByRole('tab', { name: 'Players' }));

        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      it('does not refetch when already loaded', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce(mockFetchResponse({ players: [] }));

        render(<CaptainTabsClient {...defaultComponentProps} />);

        await user.click(screen.getByRole('tab', { name: 'Players' }));
        await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

        await user.click(screen.getByRole('tab', { name: 'Admin' }));
        await user.click(screen.getByRole('tab', { name: 'Players' }));

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('players list', () => {
      it('shows "No players" when list is empty', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce(mockFetchResponse({ players: [] }));

        render(<CaptainTabsClient {...defaultComponentProps} />);

        await user.click(screen.getByRole('tab', { name: 'Players' }));

        await waitFor(() => {
          expect(screen.getByText(/no players have joined/i)).toBeInTheDocument();
        });
      });

      it('renders player names and points', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce(
          mockFetchResponse({
            players: [createMockPlayer({ name: 'John Doe', totalPoints: 50 })],
          })
        );

        render(<CaptainTabsClient {...defaultComponentProps} />);

        await user.click(screen.getByRole('tab', { name: 'Players' }));

        await waitFor(() => {
          expect(screen.getByText('John Doe')).toBeInTheDocument();
          expect(screen.getByText('50 pts')).toBeInTheDocument();
        });
      });

      it('shows Captain badge for captain player', async () => {
        const user = userEvent.setup();
        mockFetch.mockResolvedValueOnce(
          mockFetchResponse({
            players: [createMockPlayer({ name: 'Captain Jane', isCaptain: true })],
          })
        );

        render(<CaptainTabsClient {...defaultComponentProps} />);

        await user.click(screen.getByRole('tab', { name: 'Players' }));

        await waitFor(() => {
          expect(screen.getByText('Captain')).toBeInTheDocument();
        });
      });
    });
  });
});
