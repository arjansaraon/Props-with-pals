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
