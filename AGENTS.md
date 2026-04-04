# AGENTS

Basic guidance for working in this repo.

## Stack

- Package manager: `pnpm`
- Monorepo: `pnpm-workspace.yaml`
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS v4 plus shared styles in `apps/frontend/src/styles/global.css`
- Backend: Node/TypeScript
- Shared types: `packages/shared-types`

## Commands

- Install deps: `pnpm install`
- Run all dev servers: `pnpm dev`
- Run frontend only: `pnpm --filter @terminal-poker/frontend dev`
- Run backend only: `pnpm --filter @terminal-poker/backend dev`
- Build everything: `pnpm build`
- Build frontend: `pnpm --filter @terminal-poker/frontend build`
- Typecheck workspace: `pnpm typecheck`
- Run tests: `pnpm test`

## Frontend Guidance

- Prefer Tailwind utilities for page and component styling.
- Reuse existing shared components before adding new UI patterns:
  - `AppHeader`
  - `AppModal`
  - `Button`
  - `Field`
  - `SelectField`
  - `StatusChip`
- Prefer to use Tailwind CSS for layout and styling, rather than custom CSS classes.
- Use `global.css` for theme tokens, shared utility classes, and cross-page layout rules.
- Avoid hardcoded dark/light colors in JSX when a CSS variable already exists or should exist.
- Keep the terminal-inspired visual language, but prioritize clarity over gimmicks.
- Favor low-friction, developer-friendly flows: fast create/join, readable voting states, and strong keyboard support where it already exists.
- Prefer calm, high-contrast layouts with clear hierarchy; use decorative effects sparingly, and only when they support clarity.

## Editing Guidance

- Keep changes scoped and minimal.
- Prefer updating existing files/components over creating parallel versions.
- Remove dead UI, stale copy, and unused code when replacing features.
- Do not leave fake metrics or fake system labels in the UI.
- Preserve the terminal-style visual language.

## Verification

- For frontend changes, at minimum run:
  - `pnpm --filter @terminal-poker/frontend build`
- If shared logic changes, also run:
  - `pnpm typecheck`
