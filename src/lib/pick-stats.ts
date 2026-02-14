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
  // Pair each prop with its stats, filtering to props with at least 1 pick
  const propsWithStats = propsList
    .map((p) => ({ prop: p, stats: statsMap.get(p.id) }))
    .filter((x): x is { prop: PropInfo; stats: PropPickStats } =>
      !!x.stats && x.stats.totalPicks > 0);

  if (propsWithStats.length === 0) {
    return { mostAgreed: null, mostDivisive: null, biggestUpset: null };
  }

  // Most agreed: highest mostPopularPercent
  let mostAgreed: PoolPickSummary['mostAgreed'] = null;
  let highestPercent = -1;
  for (const { prop, stats } of propsWithStats) {
    if (stats.mostPopularPercent > highestPercent) {
      highestPercent = stats.mostPopularPercent;
      mostAgreed = {
        questionText: prop.questionText,
        optionText: prop.options[stats.mostPopularIndex],
        percent: stats.mostPopularPercent,
      };
    }
  }

  // Most divisive: lowest mostPopularPercent (most evenly split)
  let mostDivisive: PoolPickSummary['mostDivisive'] = null;
  let lowestPercent = 101;
  for (const { prop, stats } of propsWithStats) {
    if (stats.mostPopularPercent < lowestPercent) {
      lowestPercent = stats.mostPopularPercent;
      mostDivisive = {
        questionText: prop.questionText,
        percent: stats.mostPopularPercent,
      };
    }
  }

  // Biggest upset: resolved prop where most popular pick was wrong,
  // with the highest confidence (highest mostPopularPercent among upsets)
  let biggestUpset: PoolPickSummary['biggestUpset'] = null;
  let upsetPercent = -1;
  for (const { prop, stats } of propsWithStats) {
    if (prop.correctOptionIndex === null) continue;
    if (stats.mostPopularIndex !== prop.correctOptionIndex && stats.mostPopularPercent > upsetPercent) {
      upsetPercent = stats.mostPopularPercent;
      biggestUpset = {
        questionText: prop.questionText,
        popularOption: prop.options[stats.mostPopularIndex],
        correctOption: prop.options[prop.correctOptionIndex],
        popularPercent: stats.mostPopularPercent,
      };
    }
  }

  return { mostAgreed, mostDivisive, biggestUpset };
}
