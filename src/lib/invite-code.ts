/**
 * Allowed characters for invite codes.
 * Excludes ambiguous characters: 0, 1, O, I, L
 *
 * A-Z minus O, I, L = 23 letters
 * 2-9 = 8 digits
 * Total = 31 characters
 */
export const INVITE_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const CODE_LENGTH = 6;

/**
 * Generates a random 6-character invite code.
 * Uses only non-ambiguous characters (A-Z excluding O,I,L and 2-9).
 *
 * With 31 possible characters and 6 positions:
 * 31^6 = ~887 million possible codes
 */
export function generateInviteCode(): string {
  let code = '';

  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * INVITE_CODE_CHARS.length);
    code += INVITE_CODE_CHARS[randomIndex];
  }

  return code;
}
