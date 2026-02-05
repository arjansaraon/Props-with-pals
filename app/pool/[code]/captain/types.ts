// Shared types for captain dashboard components

/**
 * Prop interface for display in captain dashboard
 */
export interface Prop {
  id: string;
  questionText: string;
  options: string[];
  pointValue: number;
  correctOptionIndex: number | null;
  status: string;
  order: number;
}

/**
 * Props for the CaptainTabsClient component
 */
export interface CaptainTabsClientProps {
  code: string;
  poolStatus: string;
  propsList: Prop[];
  initialPicks: InitialPick[];
  secret: string;
}

/**
 * Player information for the Players tab
 */
export interface Player {
  id: string;
  name: string;
  secret: string;
  totalPoints: number;
  joinedAt: string;
  isCaptain: boolean;
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

/**
 * Form state for adding a new prop
 */
export interface AddPropFormState {
  questionText: string;
  options: string[];
  pointValue: string;
}
