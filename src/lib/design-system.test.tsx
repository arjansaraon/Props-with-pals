import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

// ─── Token Tests (parse globals.css) ────────────────────────────────────────

const globalsPath = path.resolve(__dirname, '../../app/globals.css');
const globalsCss = fs.readFileSync(globalsPath, 'utf-8');

function getTokenValue(token: string): string | null {
  // Match "--token: value;" in :root block
  const regex = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*([^;]+);`);
  const match = globalsCss.match(regex);
  return match ? match[1].trim() : null;
}

describe('Design System Tokens', () => {
  it('uses neutral background (#F8FAFC), not blue-tinted', () => {
    expect(getTokenValue('--background')).toBe('#F8FAFC');
  });

  it('uses deeper primary blue (#2563EB)', () => {
    expect(getTokenValue('--primary')).toBe('#2563EB');
  });

  it('uses indigo secondary (#6366F1)', () => {
    expect(getTokenValue('--secondary')).toBe('#6366F1');
  });

  it('uses indigo accent (#EEF2FF)', () => {
    expect(getTokenValue('--accent')).toBe('#EEF2FF');
  });

  it('uses indigo accent-foreground (#4338CA)', () => {
    expect(getTokenValue('--accent-foreground')).toBe('#4338CA');
  });

  it('uses primary-matching ring (#2563EB)', () => {
    expect(getTokenValue('--ring')).toBe('#2563EB');
  });

  it('uses tighter radius (0.625rem)', () => {
    expect(getTokenValue('--radius')).toBe('0.625rem');
  });

  it('does not hardcode old blue-tinted background (#F0F7FF) in body/html', () => {
    // The old value should not appear as a hardcoded background-color
    // It's OK if it appears in comments, but not in active CSS rules
    const bodyHtmlSection = globalsCss.replace(/\/\*[\s\S]*?\*\//g, ''); // strip comments
    const hardcodedOldBg = bodyHtmlSection.match(/background-color:\s*#F0F7FF/i);
    expect(hardcodedOldBg).toBeNull();
  });

  it('defines shadow custom properties', () => {
    expect(getTokenValue('--shadow-sm')).toBeTruthy();
    expect(getTokenValue('--shadow-md')).toBeTruthy();
    expect(getTokenValue('--shadow-lg')).toBeTruthy();
  });
});

// ─── Component Tests (render and check classes) ─────────────────────────────

// We test client components that can be rendered with Testing Library.
// Server components (page.tsx files) are verified via build + manual checks.

describe('PlayerPicksView', () => {
  // Dynamic import to avoid issues with module resolution at parse time
  async function renderPlayerPicksView() {
    const { PlayerPicksView } = await import(
      '@/app/pool/[code]/player/[participantId]/player-picks-view'
    );
    return render(
      <PlayerPicksView
        code="test-code"
        playerName="TestPlayer"
        totalPoints={42}
        props={[
          {
            id: 'prop-1',
            questionText: 'Who will win?',
            options: ['Team A', 'Team B'],
            pointValue: 10,
            correctOptionIndex: null,
            selectedOptionIndex: 0,
          },
        ]}
        stats={{ correct: 1, wrong: 0, pending: 1, unanswered: 0 }}
      />
    );
  }

  describe('Shadow Hierarchy', () => {
    it('header card uses shadow-lg', async () => {
      const { container } = await renderPlayerPicksView();
      // First Card is the header
      const cards = container.querySelectorAll('[class*="shadow-"]');
      const headerCard = cards[0];
      expect(headerCard.className).toContain('shadow-lg');
    });

    it('prop cards use shadow-md (not shadow-lg)', async () => {
      const { container } = await renderPlayerPicksView();
      const cards = container.querySelectorAll('[class*="shadow-"]');
      // Second card onwards are prop cards
      const propCard = cards[1];
      expect(propCard.className).toContain('shadow-md');
      expect(propCard.className).not.toContain('shadow-lg');
    });
  });

  describe('Option States', () => {
    it('correct answer has emerald border and bg', async () => {
      const { PlayerPicksView } = await import(
        '@/app/pool/[code]/player/[participantId]/player-picks-view'
      );
      const { container } = render(
        <PlayerPicksView
          code="test-code"
          playerName="TestPlayer"
          totalPoints={42}
          props={[
            {
              id: 'prop-1',
              questionText: 'Who will win?',
              options: ['Team A', 'Team B'],
              pointValue: 10,
              correctOptionIndex: 0,
              selectedOptionIndex: 1,
            },
          ]}
          stats={{ correct: 0, wrong: 1, pending: 0, unanswered: 0 }}
        />
      );
      // Option divs use border-2 (Cards use border)
      const optionDivs = container.querySelectorAll('[class*="border-2"]');
      const correctOption = optionDivs[0];
      expect(correctOption.className).toContain('border-emerald-500');
      expect(correctOption.className).toContain('bg-emerald-50');
    });

    it('selected unresolved pick uses bg-primary/10', async () => {
      const { container } = await renderPlayerPicksView();
      // Option divs use border-2 (Cards use border)
      const optionDivs = container.querySelectorAll('[class*="border-2"]');
      const selectedOption = optionDivs[0];
      expect(selectedOption.className).toContain('bg-primary/10');
      expect(selectedOption.className).not.toContain('bg-accent');
    });
  });

  describe('Typography', () => {
    it('heading has tracking-tight', async () => {
      await renderPlayerPicksView();
      const heading = screen.getByText("TestPlayer's Picks");
      expect(heading.className).toContain('tracking-tight');
    });

    it('point values use font-mono', async () => {
      await renderPlayerPicksView();
      const pointsEl = screen.getByText('10 pts');
      expect(pointsEl.className).toContain('font-mono');
    });

    it('total points display uses font-mono', async () => {
      await renderPlayerPicksView();
      const totalPoints = screen.getByText(/42 total points/);
      expect(totalPoints.className).toContain('font-mono');
    });
  });
});

describe('Button Variants', () => {
  async function renderButton(variant: string) {
    const { Button } = await import('@/app/components/ui/button');
    return render(<Button variant={variant as any}>Test</Button>);
  }

  it('variant="success" renders emerald classes', async () => {
    const { container } = await renderButton('success');
    const button = container.querySelector('button')!;
    expect(button.className).toContain('bg-emerald-600');
    expect(button.className).toContain('hover:bg-emerald-700');
    expect(button.className).toContain('text-white');
  });

  it('variant="warning" renders amber classes', async () => {
    const { container } = await renderButton('warning');
    const button = container.querySelector('button')!;
    expect(button.className).toContain('bg-amber-600');
    expect(button.className).toContain('hover:bg-amber-700');
    expect(button.className).toContain('text-white');
  });
});

describe('PicksView', () => {
  async function renderPicksView() {
    const { PicksView } = await import('@/app/components/picks-view');
    const myPicks = new Map([['prop-1', 0]]);
    return render(
      <PicksView
        poolStatus="open"
        propsList={[
          {
            id: 'prop-1',
            questionText: 'Who will win?',
            options: ['Team A', 'Team B'],
            pointValue: 10,
            correctOptionIndex: null,
            category: null,
          },
        ]}
        myPicks={myPicks}
        submitting={null}
        pickError={null}
        pickedCount={1}
        allPicked={false}
        progressPercent={50}
        handlePick={() => {}}
      />
    );
  }

  it('selected option uses bg-primary/10 (not bg-primary/5)', async () => {
    const { container } = await renderPicksView();
    const selectedButton = container.querySelector('[class*="border-primary"]')!;
    expect(selectedButton.className).toContain('bg-primary/10');
    expect(selectedButton.className).not.toContain('bg-primary/5');
  });
});

describe('LeaderboardStats', () => {
  async function renderLeaderboardStats() {
    const { LeaderboardStats } = await import(
      '@/app/pool/[code]/leaderboard/leaderboard-stats'
    );
    return render(
      <LeaderboardStats
        summary={{
          mostAgreed: {
            questionText: 'Who will win the Super Bowl?',
            optionText: 'Team A',
            percent: 80,
          },
          mostDivisive: {
            questionText: 'MVP?',
            percent: 35,
          },
          biggestUpset: null,
        }}
        perPropStats={[
          {
            propId: 'prop-1',
            questionText: 'Who will win?',
            options: ['Team A', 'Team B'],
            correctOptionIndex: 0,
            category: null,
            stats: {
              totalPicks: 10,
              optionCounts: [8, 2],
              mostPopularIndex: 0,
              mostPopularPercent: 80,
              correctCount: 8,
            },
          },
        ]}
      />
    );
  }

  describe('Shadow Hierarchy', () => {
    it('summary card uses shadow-md (not shadow-lg)', async () => {
      const { container } = await renderLeaderboardStats();
      const cards = container.querySelectorAll('[class*="shadow-"]');
      for (const card of cards) {
        expect(card.className).toContain('shadow-md');
        expect(card.className).not.toContain('shadow-lg');
      }
    });
  });

  describe('Typography', () => {
    it('percent values in badges contain numbers', async () => {
      await renderLeaderboardStats();
      // Verify the agreed badge renders with the percent
      const agreedBadge = screen.getByText(/80%/);
      expect(agreedBadge).toBeTruthy();
    });
  });
});
