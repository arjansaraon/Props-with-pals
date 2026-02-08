/**
 * Shared domain types for Props-With-Pals
 * Single source of truth for core entity types used across components
 */

/**
 * Prop interface for display across all views
 */
export interface Prop {
  id: string;
  questionText: string;
  options: string[];
  pointValue: number;
  correctOptionIndex: number | null;
  status?: string;
  order?: number;
}

/**
 * Player information
 */
export interface Player {
  id: string;
  name: string;
  totalPoints: number;
  joinedAt: string;
  isCaptain: boolean;
  recoveryUrl?: string;
}

/**
 * Initial pick data passed from server
 */
export interface InitialPick {
  propId: string;
  selectedOptionIndex: number;
}

/**
 * State for tracking which pick is currently being submitted
 */
export interface SubmittingState {
  propId: string;
  index: number;
}
