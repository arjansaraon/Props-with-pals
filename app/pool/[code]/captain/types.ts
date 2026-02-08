// Shared types for captain dashboard components
// Re-export shared domain types for backwards compatibility
export type { Prop, Player, InitialPick, SubmittingState } from '@/app/types/domain';

// Import types for use in this file's interfaces
import type { Prop, InitialPick } from '@/app/types/domain';

/**
 * Props for the CaptainTabsClient component
 */
export interface CaptainTabsClientProps {
  code: string;
  poolStatus: string;
  propsList: Prop[];
  initialPicks: InitialPick[];
}

/**
 * Form state for adding a new prop
 */
export interface AddPropFormState {
  questionText: string;
  options: string[];
  pointValue: string;
}
