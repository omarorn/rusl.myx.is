# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + TypeScript PWA frontend (`components/`, `hooks/`, `services/`, `context/`).
- `worker/`: Cloudflare Worker backend (`src/routes/`, `src/services/`, `src/__tests__/`, `migrations/`).
- `public/`: static web assets.
- `trashpi/`: Raspberry Pi client (`main.py`, `requirements.txt`, `setup.sh`).
- `scripts/`: operational automation (for example R2 image sync).
- `docs/plans/`: implementation/design notes.

## Build, Test, and Development Commands
- Frontend (repo root): `npm install`, `npm run dev`, `npm run build`, `npm run preview`.
- Worker (`worker/`): `npm install`, `npm run dev`, `npm run deploy`, `npm test`, `npm run test:watch`.
- DB migration (worker): `npm run db:migrate`.
- TrashPi (`trashpi/`): `pip install -r requirements.txt`, `python main.py`.

## Coding Style & Naming Conventions
- Keep existing file-local style: frontend commonly 2-space/no-semicolon style, worker commonly semicolon style.
- Use `PascalCase` for React components (`TripScreen.tsx`), `camelCase` for functions/variables, and kebab-case service files (`iceland-rules.ts`).
- Keep route handlers in `worker/src/routes/` and reusable logic in `worker/src/services/`.

## Testing Guidelines
- Framework: Vitest in `worker/vitest.config.ts`.
- Test location/pattern: `worker/src/__tests__/*.test.ts`.
- Prioritize bin-mapping and Iceland-specific edge cases when changing classification logic.
- Run `cd worker && npm test` before opening a PR.

## Commit & Pull Request Guidelines
- Current history uses short Conventional Commit-style subjects (for example `feat: ...`, `feat(ui): ...`, `docs: ...`, `chore: ...`, `sync: ...`).
- Keep commits scoped (avoid mixing unrelated frontend/worker/infra edits).
- PRs should include: concise behavior summary, linked issue/task, test evidence, and screenshots/GIFs for UI changes.

## .claude Plugins, Commands, and Rules
- Enabled plugins (`.claude/settings.json`): `serena`, `typescript-lsp`, `pr-review-toolkit`.
- MCP servers (`.claude/mcp-config.json`): `github` and `cloudflare` via `npx`.
- Project commands (`.claude/commands/`): `/document-agent`, `/fix-oom`, `/oom-reflect`, `/todo-oom`, `/sync-from-template`, `/sync-to-template`.
- High-impact rules (`.claude/rules/`): `golden-rules.md`, `pre-commit-validation.md`, `lsp-integration.md`, `task-status.md`, plus escaping/Tailwind/bash-specific safety rules.

## Security & Configuration Tips
- Never commit secrets; use `wrangler secret put ...` for API keys.
- Validate D1 migration changes locally before deploy.
