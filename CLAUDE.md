# Props With Pals - Claude Code Guidelines

## Development Workflow

**Always use TDD approach:** Write tests first, then implement features. Run tests after each significant change to catch regressions early.

**Spec-Driven Development:**

1. Write feature specs in `docs/` or as inline test descriptions before implementation
2. Specs define expected behavior, test cases, and implementation details
3. Write failing tests FIRST, then implement to make them pass
4. Each spec should include test code examples
5. Don't duplicate UI without intention - consolidate shared components

## Security

**Never access or display sensitive credentials:**

- Do not read `.env`, `.env.local`, or other environment files
- Do not read files containing API keys, database URLs, or auth tokens
- Do not run commands that would expose credentials in output
- When database migrations or credential-dependent commands are needed, provide the command for the user to run manually

## Project Context

- Next.js 16 App Router with TypeScript
- Drizzle ORM with Turso (SQLite)
- TDD approach - write tests first
- Vitest for testing (321 tests)
- React 19 with shadcn/ui component library
- Tailwind CSS v4
- httpOnly cookie auth with CSRF protection

## Styling

This project uses **Tailwind v4 with shadcn/ui**. Theme changes require updating CSS variables in `globals.css` AND ensuring proper Tailwind v4 theme mapping - check both when styling issues occur.

## Authentication & Debugging

When debugging authentication issues, check pool/resource status first before assuming auth mechanism problems. Auth uses httpOnly cookies as the primary mechanism, with recovery tokens as fallback.

## Environment Setup

Before running git-dependent commands, verify git remote is configured. For security reviews or analysis, specify project directory explicitly if remote is missing.
