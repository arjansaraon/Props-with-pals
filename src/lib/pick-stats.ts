/**
 * Pure functions for computing pick popularity statistics.
 * No database access — operates on pre-fetched data.
 */

export interface PropPickStats {
  totalPicks: number;
  optionCounts: number[];
  mostPopularIndex: number;
  mostPopularPercent: number; // 0-100, 0 if no picks
  correctCount: number | null; // null if prop unresolved
}

export interface PoolPickSummary {
  mostAgreed: {
    questionText: string;
    optionText: string;
    percent: number;
  } | null;
  mostDivisive: {
    questionText: string;
    percent: number; // the top pick's percent (lower = more divisive)
  } | null;
  biggestUpset: {
    questionText: string;
    popularOption: string;
    correctOption: string;
    popularPercent: number;
  } | null;
}

interface PickRow {
  propId: string;
  selectedOptionIndex: number;
}

interface PropInfo {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number | null;
}

/**
 * Compute per-prop pick statistics from raw pick data.
 */
export function computePerPropStats(
  allPicks: PickRow[],
  propsList: PropInfo[],
): Map<string, PropPickStats> {
  // Group picks by propId
  const picksByProp = new Map<string, PickRow[]>();
  for (const pick of allPicks) {
    const existing = picksByProp.get(pick.propId);
    if (existing) {
      existing.push(pick);
    } else {
      picksByProp.set(pick.propId, [pick]);
    }
  }

  const statsMap = new Map<string, PropPickStats>();

  for (const prop of propsList) {
    const propPicks = picksByProp.get(prop.id) ?? [];
    const totalPicks = propPicks.length;
    const optionCounts = new Array<number>(prop.options.length).fill(0);

    for (const pick of propPicks) {
      if (pick.selectedOptionIndex >= 0 && pick.selectedOptionIndex < optionCounts.length) {
        optionCounts[pick.selectedOptionIndex]++;
      }
    }

    // Find most popular option
    let mostPopularIndex = 0;
    let maxCount = 0;
    for (let i = 0; i < optionCounts.length; i++) {
      if (optionCounts[i] > maxCount) {
        maxCount = optionCounts[i];
        mostPopularIndex = i;
      }
    }

    const mostPopularPercent = totalPicks > 0
      ? Math.round((maxCount / totalPicks) * 100)
      : 0;

    // Correct count (only if prop is resolved)
    const correctCount = prop.correctOptionIndex !== null
      ? optionCounts[prop.correctOptionIndex] ?? 0
      : null;

    statsMap.set(prop.id, {
      totalPicks,
      optionCounts,
      mostPopularIndex,
      mostPopularPercent,
      correctCount,
    });
  }

  return statsMap;
}

/**
 * Compute pool-level summary highlights from per-prop stats.
 */
export function computePoolSummary(
  statsMap: Map<string, PropPickStats>,
  propsList: PropInfo[],
): PoolPickSummary {
  // Only consider props that have at least 1 pick
  const propsWithPicks = propsList.filter((p) => {
    const stats = statsMap.get(p.id);
    return stats && stats.totalPicks > 0;
  });

  if (propsWithPicks.length === 0) {
    return { mostAgreed: null, mostDivisive: null, biggestUpset: null };
  }

  // Most agreed: highest mostPopularPercent
  let mostAgreedProp: PropInfo | null = null;
  let highestPercent = -1;
  for (const prop of propsWithPicks) {
    const stats = statsMap.get(prop.id)!;
    if (stats.mostPopularPercent > highestPercent) {
      highestPercent = stats.mostPopularPercent;
      mostAgreedProp = prop;
    }
  }

  // Most divisive: lowest mostPopularPercent (most evenly split)
  let mostDivisiveProp: PropInfo | null = null;
  let lowestPercent = 101;
  for (const prop of propsWithPicks) {
    const stats = statsMap.get(prop.id)!;
    if (stats.mostPopularPercent < lowestPercent) {
      lowestPercent = stats.mostPopularPercent;
      mostDivisiveProp = prop;
    }
  }

  // Biggest upset: resolved prop where most popular pick was wrong,
  // with the highest confidence (highest mostPopularPercent among upsets)
  let biggestUpsetProp: PropInfo | null = null;
  let upsetPercent = -1;
  for (const prop of propsWithPicks) {
    if (prop.correctOptionIndex === null) continue;
    const stats = statsMap.get(prop.id)!;
    if (stats.mostPopularIndex !== prop.correctOptionIndex && stats.mostPopularPercent > upsetPercent) {
      upsetPercent = stats.mostPopularPercent;
      biggestUpsetProp = prop;
    }
  }

  const mostAgreed = mostAgreedProp
    ? {
        questionText: mostAgreedProp.questionText,
        optionText: mostAgreedProp.options[statsMap.get(mostAgreedProp.id)!.mostPopularIndex],
        percent: highestPercent,
      }
    : null;

  const mostDivisive = mostDivisiveProp
    ? {
        questionText: mostDivisiveProp.questionText,
        percent: lowestPercent,
      }
    : null;

  const biggestUpset = biggestUpsetProp
    ? {
        questionText: biggestUpsetProp.questionText,
        popularOption: biggestUpsetProp.options[statsMap.get(biggestUpsetProp.id)!.mostPopularIndex],
        correctOption: biggestUpsetProp.options[biggestUpsetProp.correctOptionIndex!],
        popularPercent: upsetPercent,
      }
    : null;

  return { mostAgreed, mostDivisive, biggestUpset };
}
