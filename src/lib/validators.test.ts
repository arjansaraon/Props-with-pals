import { describe, it, expect } from 'vitest';
import {
  CreatePoolSchema,
  CreatePropSchema,
  JoinPoolSchema,
  SubmitPickSchema,
  ResolveSchema,
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
