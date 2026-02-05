import { describe, it, expect } from 'vitest';
import {
  CreatePoolSchema,
  CreatePropSchema,
  JoinPoolSchema,
  SubmitPickSchema,
  ResolveSchema,
  InviteCodeSchema,
  RESERVED_INVITE_CODES,
} from './validators';

describe('CreatePoolSchema', () => {
  it('accepts valid input', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'Super Bowl 2026',
      captainName: 'John',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with buyInAmount', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'Super Bowl 2026',
      captainName: 'John',
      buyInAmount: '$20',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreatePoolSchema.safeParse({
      name: '',
      captainName: 'John',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'a'.repeat(101),
      captainName: 'John',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty captainName', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'Pool',
      captainName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects captainName over 50 chars', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'Pool',
      captainName: 'a'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('rejects buyInAmount over 20 chars', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'Pool',
      captainName: 'John',
      buyInAmount: 'a'.repeat(21),
    });
    expect(result.success).toBe(false);
  });
});

describe('CreatePropSchema', () => {
  it('accepts valid input', () => {
    const result = CreatePropSchema.safeParse({
      questionText: 'Who will win?',
      options: ['Team A', 'Team B'],
      pointValue: 10,
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with category', () => {
    const result = CreatePropSchema.safeParse({
      questionText: 'Who will win?',
      options: ['Team A', 'Team B'],
      pointValue: 10,
      category: '1st Quarter',
    });
    expect(result.success).toBe(true);
  });

  it('accepts 10 options (maximum)', () => {
    const result = CreatePropSchema.safeParse({
      questionText: 'Pick a number',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      pointValue: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects fewer than 2 options', () => {
    const result = CreatePropSchema.safeParse({
      questionText: 'Who will win?',
      options: ['Team A'],
      pointValue: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 options', () => {
    const result = CreatePropSchema.safeParse({
      questionText: 'Pick a number',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
      pointValue: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty option strings', () => {
    const result = CreatePropSchema.safeParse({
      questionText: 'Who will win?',
      options: ['Team A', ''],
      pointValue: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative pointValue', () => {
    const result = CreatePropSchema.safeParse({
      questionText: 'Who will win?',
      options: ['Team A', 'Team B'],
      pointValue: -5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects zero pointValue', () => {
    const result = CreatePropSchema.safeParse({
      questionText: 'Who will win?',
      options: ['Team A', 'Team B'],
      pointValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer pointValue', () => {
    const result = CreatePropSchema.safeParse({
      questionText: 'Who will win?',
      options: ['Team A', 'Team B'],
      pointValue: 10.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('JoinPoolSchema', () => {
  it('accepts valid name', () => {
    const result = JoinPoolSchema.safeParse({ name: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = JoinPoolSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 50 chars', () => {
    const result = JoinPoolSchema.safeParse({ name: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('SubmitPickSchema', () => {
  it('accepts valid input', () => {
    const result = SubmitPickSchema.safeParse({
      propId: '550e8400-e29b-41d4-a716-446655440000',
      selectedOptionIndex: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts higher option indices', () => {
    const result = SubmitPickSchema.safeParse({
      propId: '550e8400-e29b-41d4-a716-446655440000',
      selectedOptionIndex: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID', () => {
    const result = SubmitPickSchema.safeParse({
      propId: 'not-a-uuid',
      selectedOptionIndex: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative option index', () => {
    const result = SubmitPickSchema.safeParse({
      propId: '550e8400-e29b-41d4-a716-446655440000',
      selectedOptionIndex: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer option index', () => {
    const result = SubmitPickSchema.safeParse({
      propId: '550e8400-e29b-41d4-a716-446655440000',
      selectedOptionIndex: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('ResolveSchema', () => {
  it('accepts valid input', () => {
    const result = ResolveSchema.safeParse({ correctOptionIndex: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts higher indices', () => {
    const result = ResolveSchema.safeParse({ correctOptionIndex: 9 });
    expect(result.success).toBe(true);
  });

  it('rejects negative index', () => {
    const result = ResolveSchema.safeParse({ correctOptionIndex: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer index', () => {
    const result = ResolveSchema.safeParse({ correctOptionIndex: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('InviteCodeSchema', () => {
  it('accepts valid lowercase code', () => {
    const result = InviteCodeSchema.safeParse('superbowl');
    expect(result.success).toBe(true);
  });

  it('accepts code with numbers', () => {
    const result = InviteCodeSchema.safeParse('super2026');
    expect(result.success).toBe(true);
  });

  it('accepts code with hyphens', () => {
    const result = InviteCodeSchema.safeParse('super-bowl-2026');
    expect(result.success).toBe(true);
  });

  it('accepts minimum length (4 chars)', () => {
    const result = InviteCodeSchema.safeParse('test');
    expect(result.success).toBe(true);
  });

  it('accepts maximum length (20 chars)', () => {
    const result = InviteCodeSchema.safeParse('a'.repeat(20));
    expect(result.success).toBe(true);
  });

  it('rejects code under 4 characters', () => {
    const result = InviteCodeSchema.safeParse('abc');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('4 characters');
    }
  });

  it('rejects code over 20 characters', () => {
    const result = InviteCodeSchema.safeParse('a'.repeat(21));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('20 characters');
    }
  });

  it('rejects uppercase letters', () => {
    const result = InviteCodeSchema.safeParse('SuperBowl');
    expect(result.success).toBe(false);
  });

  it('rejects code starting with hyphen', () => {
    const result = InviteCodeSchema.safeParse('-superbowl');
    expect(result.success).toBe(false);
  });

  it('rejects code ending with hyphen', () => {
    const result = InviteCodeSchema.safeParse('superbowl-');
    expect(result.success).toBe(false);
  });

  it('rejects consecutive hyphens', () => {
    const result = InviteCodeSchema.safeParse('super--bowl');
    expect(result.success).toBe(false);
  });

  it('rejects special characters', () => {
    const result = InviteCodeSchema.safeParse('super_bowl');
    expect(result.success).toBe(false);
  });

  it('rejects spaces', () => {
    const result = InviteCodeSchema.safeParse('super bowl');
    expect(result.success).toBe(false);
  });

  it('rejects reserved words (4+ chars)', () => {
    // Only test reserved words with 4+ chars (shorter ones fail min length first)
    const longReservedCodes = RESERVED_INVITE_CODES.filter((code) => code.length >= 4);
    longReservedCodes.forEach((reserved) => {
      const result = InviteCodeSchema.safeParse(reserved);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('reserved');
      }
    });
  });

  it('rejects short reserved words via length check', () => {
    // Short reserved words like 'api', 'app', 'www' fail min length check
    const shortReservedCodes = RESERVED_INVITE_CODES.filter((code) => code.length < 4);
    shortReservedCodes.forEach((reserved) => {
      const result = InviteCodeSchema.safeParse(reserved);
      expect(result.success).toBe(false);
    });
  });
});

describe('CreatePoolSchema with inviteCode', () => {
  it('accepts valid pool with custom invite code', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'Super Bowl 2026',
      captainName: 'John',
      inviteCode: 'superbowl-2026',
    });
    expect(result.success).toBe(true);
  });

  it('accepts pool without invite code (optional)', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'Super Bowl 2026',
      captainName: 'John',
    });
    expect(result.success).toBe(true);
  });

  it('rejects pool with invalid invite code', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'Super Bowl 2026',
      captainName: 'John',
      inviteCode: 'AB', // too short
    });
    expect(result.success).toBe(false);
  });

  it('rejects pool with reserved invite code', () => {
    const result = CreatePoolSchema.safeParse({
      name: 'Super Bowl 2026',
      captainName: 'John',
      inviteCode: 'admin',
    });
    expect(result.success).toBe(false);
  });
});
