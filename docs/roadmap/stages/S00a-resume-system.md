# S00a: Resume system and repo init

**Goal:** a git repo whose continuity lives on disk, so any session can resume after a context clear.

**Read first:** `docs/roadmap/PLAN.md` §2.

## Tasks
- [x] `git init -b main`; `.gitignore` covering `references/`, the casino-sdk `node_modules` and lockfile, the synced `*Game.sol`, `assets-src/` and env files
- [x] `docs/roadmap/PLAN.md` (a copy of the approved plan)
- [x] ADR-001 to ADR-006 in `docs/decisions/`
- [x] `docs/CREDITS.md` skeleton and `docs/assets/elevenlabs-request.md`
- [x] Stage files: S00a–S05 in full detail, the rest as stubs
- [x] `ROADMAP.md`, `HANDOFF.md`, `LOG.md`
- [x] Rewrite `CLAUDE.md`: session protocol, standards, the correct layout
- [x] Update `docs/requirements.md` (4-player FFA, no voice, assets)
- [x] Save memory: resume protocol, standards, hosting, product decisions, assets, ElevenLabs
- [x] First commit

## Acceptance
- `git status` is clean after the commit, and `references/` is not tracked (`git ls-files references | wc -l` returns 0).
- A new session following `CLAUDE.md` lands on HANDOFF's NEXT ACTION without needing chat history.

## Exit checklist
- [x] ROADMAP updated · [x] HANDOFF rewritten · [x] LOG line added · [x] committed
