import { z } from 'zod';

/**
 * Reserved invite codes that cannot be used (route conflicts, security)
 */
export const RESERVED_INVITE_CODES = [
  // Routes that exist or might exist
  'api', 'pool', 'pools', 'join', 'create', 'leaderboard',
  'picks', 'captain', 'player', 'admin', 'settings',
  // Auth-related (phishing prevention)
  'login', 'logout', 'auth', 'signup', 'register', 'account',
  // Common web conventions
  'app', 'www', 'help', 'support', 'static', 'assets',
];

/**
 * Schema for custom invite codes.
 * - 4-20 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Cannot start/end with hyphen, no consecutive hyphens
 * - Cannot be a reserved word
 */
export const InviteCodeSchema = z
  .string()
  .min(4, 'Code must be at least 4 characters')
  .max(20, 'Code must be at most 20 characters')
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'Only lowercase letters, numbers, and single hyphens (not at start/end)'
  )
  .refine(
    (code) => !RESERVED_INVITE_CODES.includes(code.toLowerCase()),
    'This code is reserved'
  );

export type InviteCodeInput = z.infer<typeof InviteCodeSchema>;

/**
 * Schema for creating a new pool
 */
export const CreatePoolSchema = z.object({
  name: z
    .string()
    .min(1, 'Pool name is required')
    .max(100, 'Pool name must be 100 characters or less'),
  captainName: z
    .string()
    .min(1, 'Captain name is required')
    .max(50, 'Captain name must be 50 characters or less'),
  buyInAmount: z
    .string()
    .max(20, 'Buy-in amount must be 20 characters or less')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  inviteCode: InviteCodeSchema.optional(),
});

export type CreatePoolInput = z.infer<typeof CreatePoolSchema>;

/**
 * Schema for updating pool details (name, description) or status
 */
export const UpdatePoolSchema = z.object({
  name: z
    .string()
    .min(1, 'Pool name is required')
    .max(100, 'Pool name must be 100 characters or less')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
  status: z.enum(['open', 'locked', 'completed']).optional(),
});

export type UpdatePoolInput = z.infer<typeof UpdatePoolSchema>;

/**
 * Schema for creating a new prop
 */
export const CreatePropSchema = z.object({
  questionText: z
    .string()
    .min(1, 'Question is required')
    .max(500, 'Question must be 500 characters or less'),
  options: z
    .array(z.string().min(1, 'Option cannot be empty'))
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed'),
  pointValue: z
    .number()
    .int('Point value must be a whole number')
    .positive('Point value must be positive'),
  category: z.string().max(50).optional(),
});

export type CreatePropInput = z.infer<typeof CreatePropSchema>;

/**
 * Schema for updating a prop.
 * In draft: all fields editable
 * In open: only questionText editable (for typo fixes)
 */
export const UpdatePropSchema = z.object({
  questionText: z
    .string()
    .trim()
    .min(1, 'Question is required')
    .max(500, 'Question must be 500 characters or less')
    .optional(),
  options: z
    .array(z.string().min(1, 'Option cannot be empty'))
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed')
    .optional(),
  pointValue: z
    .number()
    .int('Point value must be a whole number')
    .positive('Point value must be positive')
    .optional(),
  category: z.string().max(50).nullable().optional(),
});

export type UpdatePropInput = z.infer<typeof UpdatePropSchema>;

/**
 * Schema for joining a pool
 */
export const JoinPoolSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or less'),
});

export type JoinPoolInput = z.infer<typeof JoinPoolSchema>;

/**
 * Schema for submitting a pick
 */
export const SubmitPickSchema = z.object({
  propId: z.string().uuid('Invalid prop ID'),
  selectedOptionIndex: z
    .number()
    .int('Option index must be a whole number')
    .nonnegative('Option index must be 0 or greater'),
});

export type SubmitPickInput = z.infer<typeof SubmitPickSchema>;

/**
 * Schema for resolving a prop (marking correct answer)
 */
export const ResolveSchema = z.object({
  correctOptionIndex: z
    .number()
    .int('Option index must be a whole number')
    .nonnegative('Option index must be 0 or greater'),
});

export type ResolveInput = z.infer<typeof ResolveSchema>;

/**
 * Schema for locking a pool
 */
export const LockPoolSchema = z.object({
  status: z.literal('locked'),
});

export type LockPoolInput = z.infer<typeof LockPoolSchema>;
