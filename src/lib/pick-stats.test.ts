import { describe, it, expect } from 'vitest';
import { computePerPropStats, computePoolSummary } from './pick-stats';

function makeProp(overrides: {
  id: string;
  questionText?: string;
  options?: string[];
  correctOptionIndex?: number | null;
}) {
  return {
    id: overrides.id,
    questionText: overrides.questionText ?? `Question ${overrides.id}`,
    options: overrides.options ?? ['Option A', 'Option B'],
    correctOptionIndex: overrides.correctOptionIndex ?? null,
  };
}

describe('computePerPropStats', () => {
  it('returns empty map for no props', () => {
    const result = computePerPropStats([], []);
    expect(result.size).toBe(0);
  });

  it('handles props with no picks', () => {
    const props = [makeProp({ id: 'p1' })];
    const result = computePerPropStats([], props);

    const stats = result.get('p1')!;
    expect(stats.totalPicks).toBe(0);
    expect(stats.optionCounts).toEqual([0, 0]);
    expect(stats.mostPopularPercent).toBe(0);
    expect(stats.correctCount).toBeNull();
  });

  it('counts picks per option correctly', () => {
    const props = [makeProp({ id: 'p1', options: ['A', 'B', 'C'] })];
    const picks = [
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 1 },
      { propId: 'p1', selectedOptionIndex: 2 },
    ];

    const result = computePerPropStats(picks, props);
    const stats = result.get('p1')!;

    expect(stats.totalPicks).toBe(4);
    expect(stats.optionCounts).toEqual([2, 1, 1]);
    expect(stats.mostPopularIndex).toBe(0);
    expect(stats.mostPopularPercent).toBe(50);
  });

  it('computes correctCount for resolved props', () => {
    const props = [makeProp({ id: 'p1', options: ['A', 'B'], correctOptionIndex: 1 })];
    const picks = [
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 1 },
    ];

    const result = computePerPropStats(picks, props);
    const stats = result.get('p1')!;

    expect(stats.correctCount).toBe(1);
  });

  it('handles single player (100% on one option)', () => {
    const props = [makeProp({ id: 'p1', options: ['A', 'B'] })];
    const picks = [{ propId: 'p1', selectedOptionIndex: 0 }];

    const result = computePerPropStats(picks, props);
    const stats = result.get('p1')!;

    expect(stats.totalPicks).toBe(1);
    expect(stats.mostPopularPercent).toBe(100);
    expect(stats.optionCounts).toEqual([1, 0]);
  });

  it('ignores picks with out-of-range option index', () => {
    const props = [makeProp({ id: 'p1', options: ['A', 'B'] })];
    const picks = [
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 5 }, // out of range
      { propId: 'p1', selectedOptionIndex: -1 }, // negative
    ];

    const result = computePerPropStats(picks, props);
    const stats = result.get('p1')!;

    expect(stats.totalPicks).toBe(3); // all counted as picks
    expect(stats.optionCounts).toEqual([1, 0]); // but only valid index counted
  });

  it('handles multiple props independently', () => {
    const props = [
      makeProp({ id: 'p1', options: ['A', 'B'] }),
      makeProp({ id: 'p2', options: ['X', 'Y', 'Z'] }),
    ];
    const picks = [
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 1 },
      { propId: 'p2', selectedOptionIndex: 2 },
      { propId: 'p2', selectedOptionIndex: 2 },
      { propId: 'p2', selectedOptionIndex: 0 },
    ];

    const result = computePerPropStats(picks, props);

    expect(result.get('p1')!.totalPicks).toBe(2);
    expect(result.get('p1')!.mostPopularPercent).toBe(50); // tie at 1 each, first wins
    expect(result.get('p2')!.totalPicks).toBe(3);
    expect(result.get('p2')!.mostPopularIndex).toBe(2);
    expect(result.get('p2')!.mostPopularPercent).toBe(67);
  });
});

describe('computePoolSummary', () => {
  it('returns all nulls when no props have picks', () => {
    const props = [makeProp({ id: 'p1' })];
    const statsMap = computePerPropStats([], props);
    const summary = computePoolSummary(statsMap, props);

    expect(summary.mostAgreed).toBeNull();
    expect(summary.mostDivisive).toBeNull();
    expect(summary.biggestUpset).toBeNull();
  });

  it('identifies most agreed prop', () => {
    const props = [
      makeProp({ id: 'p1', questionText: 'Easy one', options: ['A', 'B'] }),
      makeProp({ id: 'p2', questionText: 'Split one', options: ['X', 'Y'] }),
    ];
    const picks = [
      // p1: everyone picks A (100%)
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      // p2: split (50/50)
      { propId: 'p2', selectedOptionIndex: 0 },
      { propId: 'p2', selectedOptionIndex: 1 },
    ];

    const statsMap = computePerPropStats(picks, props);
    const summary = computePoolSummary(statsMap, props);

    expect(summary.mostAgreed).toEqual({
      questionText: 'Easy one',
      optionText: 'A',
      percent: 100,
    });
  });

  it('identifies most divisive prop', () => {
    const props = [
      makeProp({ id: 'p1', questionText: 'Clear winner', options: ['A', 'B'] }),
      makeProp({ id: 'p2', questionText: 'Even split', options: ['X', 'Y', 'Z'] }),
    ];
    const picks = [
      // p1: 3 vs 1 (75%)
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 1 },
      // p2: 2 vs 2 vs 2 (33%)
      { propId: 'p2', selectedOptionIndex: 0 },
      { propId: 'p2', selectedOptionIndex: 0 },
      { propId: 'p2', selectedOptionIndex: 1 },
      { propId: 'p2', selectedOptionIndex: 1 },
      { propId: 'p2', selectedOptionIndex: 2 },
      { propId: 'p2', selectedOptionIndex: 2 },
    ];

    const statsMap = computePerPropStats(picks, props);
    const summary = computePoolSummary(statsMap, props);

    expect(summary.mostDivisive).toEqual({
      questionText: 'Even split',
      percent: 33,
    });
  });

  it('identifies biggest upset', () => {
    const props = [
      makeProp({
        id: 'p1',
        questionText: 'The upset',
        options: ['Popular Wrong', 'Correct Answer'],
        correctOptionIndex: 1,
      }),
    ];
    const picks = [
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 1 },
    ];

    const statsMap = computePerPropStats(picks, props);
    const summary = computePoolSummary(statsMap, props);

    expect(summary.biggestUpset).toEqual({
      questionText: 'The upset',
      popularOption: 'Popular Wrong',
      correctOption: 'Correct Answer',
      popularPercent: 75,
    });
  });

  it('returns null for biggestUpset when popular pick was correct', () => {
    const props = [
      makeProp({
        id: 'p1',
        options: ['A', 'B'],
        correctOptionIndex: 0,
      }),
    ];
    const picks = [
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 1 },
    ];

    const statsMap = computePerPropStats(picks, props);
    const summary = computePoolSummary(statsMap, props);

    expect(summary.biggestUpset).toBeNull();
  });

  it('returns null for biggestUpset when no props are resolved', () => {
    const props = [
      makeProp({ id: 'p1', options: ['A', 'B'], correctOptionIndex: null }),
    ];
    const picks = [
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 1 },
    ];

    const statsMap = computePerPropStats(picks, props);
    const summary = computePoolSummary(statsMap, props);

    expect(summary.biggestUpset).toBeNull();
  });

  it('picks the most confident upset when multiple exist', () => {
    const props = [
      makeProp({
        id: 'p1',
        questionText: 'Small upset',
        options: ['Wrong', 'Right'],
        correctOptionIndex: 1,
      }),
      makeProp({
        id: 'p2',
        questionText: 'Big upset',
        options: ['Wrong', 'Right'],
        correctOptionIndex: 1,
      }),
    ];
    const picks = [
      // p1: 60% wrong
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 0 },
      { propId: 'p1', selectedOptionIndex: 1 },
      { propId: 'p1', selectedOptionIndex: 1 },
      // p2: 80% wrong
      { propId: 'p2', selectedOptionIndex: 0 },
      { propId: 'p2', selectedOptionIndex: 0 },
      { propId: 'p2', selectedOptionIndex: 0 },
      { propId: 'p2', selectedOptionIndex: 0 },
      { propId: 'p2', selectedOptionIndex: 1 },
    ];

    const statsMap = computePerPropStats(picks, props);
    const summary = computePoolSummary(statsMap, props);

    expect(summary.biggestUpset!.questionText).toBe('Big upset');
    expect(summary.biggestUpset!.popularPercent).toBe(80);
  });
});
