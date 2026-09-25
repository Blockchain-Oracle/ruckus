# HANDOFF (updated 2026-09-25 by session 1)

**Stage:** S00a is done. Next up is **S00b Toolchain and monorepo skeleton**, step 1 of 13. [stages/S00b-toolchain.md](stages/S00b-toolchain.md)

**Last completed:** the S00a resume system, ADRs 001–006, CLAUDE.md, the memory files and the first commit (see `git log -1`).

**NEXT ACTION:** open `stages/S00b-toolchain.md` and do task 1: check the latest pnpm 10 with `npm view pnpm@10 version`, then write the root `package.json`.

**Uncommitted work:** none.

**Blocked on user (✱):**
- The ElevenLabs clarification email (draft in `docs/assets/elevenlabs-request.md`). This doesn't block anything; we use licensed audio in the meantime.
- The GitHub repo name and visibility, needed at the end of S00b.

**Environment state:**
- Simulator: not running yet (starts in S01 with `cd casino-sdk && npm install && npm start` → :3300, chain :8545).
- Local contract address: none yet.
- Convex deployment, server URL, Vercel URL: none yet.
- Branch: `main`, local only (no remote yet).
- Toolchain: node 25.9.0 locally (CI uses 24), pnpm 11.24 locally (the repo will pin 10.x), rustc 1.98.1 with the wasm32 target, Foundry installed, the 21st CLI installed.
- **wasm-pack is not installed.** It's needed in S06.
- The ElevenLabs key is set (Starter, 39,855 credits); its use is pending clarification.

**Last green verification:** none yet; no code exists.

**Gotchas learned:**
- Nixpacks only supports pnpm 6–10, so pin 10.x.
- The Coolify Base Directory must be `/`.
- `casino-sdk/` must stay out of the pnpm workspace.
- `references/` is gitignored (168 MB, includes GPL code).
- ElevenLabs' use policy §3(c) bans real-money gambling use. Don't generate or ship ElevenLabs audio until they approve.
- The Chickenz README is wrong in places. Trust `docs/research/deep/chickenz.md`, which was traced from the code.

**New ADRs:** ADR-001 to ADR-006.

**Research to read before resuming:** S00b's "Read first" list only.

**Deadline status:** the site closes submissions Sun Sep 27 23:59 UTC. The user decided not to cut quality for it; the plan submits an early eligible slice at ✱E. **Submitted build:** none.
