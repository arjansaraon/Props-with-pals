# Props With Pals - Claude Code Guidelines

## Security

**Never access or display sensitive credentials:**
- Do not read `.env`, `.env.local`, or other environment files
- Do not read files containing API keys, database URLs, or auth tokens
- Do not run commands that would expose credentials in output
- When database migrations or credential-dependent commands are needed, provide the command for the user to run manually

## Project Context

- Next.js 14 App Router with TypeScript
- Drizzle ORM with Turso (SQLite)
- TDD approach - write tests first
- Vitest for testing
