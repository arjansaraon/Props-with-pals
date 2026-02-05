// Test utilities and mock factories for captain-tabs-client tests

export interface MockProp {
  id: string;
  questionText: string;
  options: string[];
  pointValue: number;
  correctOptionIndex: number | null;
  status: string;
  order: number;
}

export interface MockParticipant {
  id: string;
  name: string;
  secret: string;
  totalPoints: number;
  joinedAt: string;
  isCaptain: boolean;
}

export interface MockInitialPick {
  propId: string;
  selectedOptionIndex: number;
}

// Factory functions
export function createMockProp(overrides?: Partial<MockProp>): MockProp {
  return {
    id: 'prop-1',
    questionText: 'Who will win the game?',
    options: ['Team A', 'Team B'],
    pointValue: 10,
    correctOptionIndex: null,
    status: 'active',
    order: 1,
    ...overrides,
  };
}

export function createMockParticipant(overrides?: Partial<MockParticipant>): MockParticipant {
  return {
    id: 'participant-1',
    name: 'Test User',
    secret: 'test-secret-123',
    totalPoints: 0,
    joinedAt: new Date().toISOString(),
    isCaptain: false,
    ...overrides,
  };
}

export function createMockInitialPick(overrides?: Partial<MockInitialPick>): MockInitialPick {
  return {
    propId: 'prop-1',
    selectedOptionIndex: 0,
    ...overrides,
  };
}

// Default props for CaptainTabsClient component
export const defaultComponentProps = {
  code: 'ABC123',
  poolStatus: 'open',
  propsList: [] as MockProp[],
  initialPicks: [] as MockInitialPick[],
  secret: 'captain-secret-456',
};

// Helper to create props with specific pool status
export function createPropsWithStatus(
  status: 'open' | 'locked' | 'completed',
  overrides?: Partial<typeof defaultComponentProps>
) {
  return {
    ...defaultComponentProps,
    poolStatus: status,
    ...overrides,
  };
}

// Helper to create props with mock data
export function createPropsWithData(overrides?: Partial<typeof defaultComponentProps>) {
  return {
    ...defaultComponentProps,
    propsList: [
      createMockProp({ id: 'prop-1', questionText: 'First question?', order: 1 }),
      createMockProp({ id: 'prop-2', questionText: 'Second question?', order: 2 }),
    ],
    ...overrides,
  };
}

// Mock fetch response helper
export function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

// Mock fetch error helper
export function mockFetchError(message = 'Network error') {
  return Promise.reject(new Error(message));
}
