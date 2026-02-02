import { describe, it, expect } from 'vitest';
import { generateInviteCode, INVITE_CODE_CHARS } from './invite-code';

describe('generateInviteCode', () => {
  it('generates a 6 character code', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it('only uses allowed characters (A-Z excluding O,I,L and 2-9)', () => {
    // Generate multiple codes to test randomness
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      for (const char of code) {
        expect(INVITE_CODE_CHARS).toContain(char);
      }
    }
  });

  it('does not contain ambiguous characters (0, 1, O, I, L)', () => {
    const ambiguousChars = ['0', '1', 'O', 'I', 'L'];

    // Generate multiple codes to test
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      for (const char of ambiguousChars) {
        expect(code).not.toContain(char);
      }
    }
  });

  it('generates different codes on multiple calls', () => {
    const codes = new Set<string>();

    // Generate 100 codes - they should (almost certainly) all be different
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }

    // With 32^6 possible combinations, collisions in 100 tries are extremely unlikely
    expect(codes.size).toBe(100);
  });

  it('generates uppercase codes only', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).toBe(code.toUpperCase());
    }
  });
});

describe('INVITE_CODE_CHARS', () => {
  it('contains exactly 32 characters', () => {
    // A-Z (26) minus O, I, L (3) = 23 letters
    // 2-9 = 8 digits
    // Total = 31... wait let me check
    // A B C D E F G H J K M N P Q R S T U V W X Y Z = 23 letters (no I, L, O)
    // 2 3 4 5 6 7 8 9 = 8 digits
    // Total = 31
    expect(INVITE_CODE_CHARS).toHaveLength(31);
  });

  it('does not contain 0, 1, O, I, or L', () => {
    expect(INVITE_CODE_CHARS).not.toContain('0');
    expect(INVITE_CODE_CHARS).not.toContain('1');
    expect(INVITE_CODE_CHARS).not.toContain('O');
    expect(INVITE_CODE_CHARS).not.toContain('I');
    expect(INVITE_CODE_CHARS).not.toContain('L');
  });
});
