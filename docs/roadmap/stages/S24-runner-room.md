# S24 Runner room + bot

**Goal:**
- A same-seed live ghost race.
- "Beat my run" links.
- Recorded runs racing as ghosts.

**Read first:** docs/research/deep/kaspakinesis.md (§11), ADR-001/003/004/006, PLAN §6b

## Design calls (session 5)
- **4 seats, not 2–8.** The arena-wide cap is N ≤ 4, and the sim, HUD colours and lobby all assume 4. Watchers fill any number of extra places.
- **RunnerRoom mirrors SoccerRoom:**
  - server-authoritative TS sim at 60 Hz
  - held inputs up (7 bytes)
  - whole-race Float64 snapshots down at 20 Hz, about 1.2 KB. The course never travels; every client rebuilds it from the seed.
  - labelled bots
  - a walkout hands the runner to a bot
  - watchers and late joiners
  - a 20 s reconnect window
  - Seats are renumbered to sim slots in lobby order, so runners keep the colour the lobby showed.
- **"Beat my run" needs no backend.** A run is its seed plus the run-length-encoded held inputs (`packages/sim-runner/src/recording.ts`), about 380 URL characters for a whole race.
  - The link's time is **recomputed by replaying the run**, so a link can't claim a time it didn't run.
  - Opening one shows "Beat NAME · m:ss.cc" in the hub. Racing it puts you against that run's ghost on its own course.
  - Race again re-races the same ghost.
  - Phones share through the share sheet; desktops copy the link.
- **Recorded runs as bots:** a challenger's ghost *is* a recorded human run racing as a bot. Stored personal-best ghosts per course wait for S27 (daily or tournament courses give a fixed seed to store them against).
- **Photo finishes (fairness fix):** `finished` is the exact sub-tick crossing time. Runners crossing in the same tick place by it.
  - A true dead heat falls to a per-race seeded draw. Before, the slot index broke ties, and slot 0 (the host) won 75 of 120 identical-bot races.

## Tasks
- [x] Protocol `@arena/protocol/runner` + `RunnerRoom` (server) + room kit, lobby sheet and Online button (web)
- [x] `runner-room` check: 2 browsers + 2 bots + a watcher + a walkout; distances within 4 m in 90% of samples; same order; back to the lobby
- [x] Recording format + replay test; driver records your inputs and replays ghosts; challenge link, hub button, results share
- [x] `runner-challenge` check: the recorded run's ghost finishes on exactly the recorded tick
- [x] Photo-finish ordering + seeded dead-heat draw

## Acceptance
- `pnpm -F @arena/browser-checks runner-room`: PASS, 219/219 samples, worst 0.7 m (local server).
- `pnpm -F @arena/browser-checks runner-challenge`: PASS, the ghost finished on tick 6666 as recorded, from a 378-character link.
- Hub challenge button fits at 844×390 and 390×844.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
