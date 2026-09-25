# S05: Lobby, rooms, netcode framework

**Goal:** a game-agnostic room system: quick play, share links, friends and labelled bots in the same match, ready-up, results and rematch, with reconnects and graceful offline degradation.

**Read first:**
- `tech-stack.md` §1
- `chickenz.md` §2 (rooms, matchmaking, netcode) and `references/chickenz/apps/client/src/net/PredictionManager.ts`
- `xray-games.md` (practice, reconnect-safe sessions)
- `game-feel-audio-ux.md` §4 (lobby UX)
- context7: Colyseus 0.18 (`defineRoom`, matchmaking and queue, `reconciler`/`rewind`, `@colyseus/react`, reconnection)

## Tasks
1. [ ] **`packages/protocol`:** `schema()` definitions and message types (`as const`), with a subpath per game plus `lobby`. `PROTOCOL_VERSION` is checked on join.
2. [ ] **Server rooms:**
   - `LobbyRoom`: realtime room list and presence.
   - `QueueRoom`: quick play by game, mode and region, with a timeout that fills with bots.
   - `BaseMatchRoom`: seats, ready-up, countdown, labelled bot seats, reconnection window (`allowReconnection`, ~20 s), results, rematch vote, quick-chat emotes.
   - Public and private rooms with 5-letter codes (no I/O), `?room=CODE` links, join by code.
3. [ ] **`packages/netcode`:**
   - Evaluate the Colyseus 0.18 `reconciler`/`rewind` first.
   - Wrap or extend them into a reusable prediction reconciler: input buffer, tick-tagged inputs, rollback and replay, render smoothing helpers.
   - Include a Vitest test of the reconciler.
4. [ ] **Web features:**
   - `features/lobby`: Quick Play front and centre, create public/private, join by code, practice vs bot, tournaments (placeholder hidden until S27), replay tutorial.
   - `features/rooms`: seat list, ready, share link (copy with a selectable-text fallback), emotes.
   - `features/results`: standings, points, rematch.
   - All built with 21st.dev components.
5. [ ] **Degraded mode:** if Colyseus or Convex is unreachable, the lobby offers practice vs local bots and demo wagers only, with a clear banner. No crash and no spinner loop.
6. [ ] **Bots:** always labelled "BOT" in the UI. No fake rooms and no disguised bots.

## Acceptance
- Two to four browsers can create, share, join, ready, play a placeholder match, see results and rematch.
- Killing one client's network for 10 s lets it reconnect into the same seat.
- With the server down, practice and demo still work.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits

## Notes (session 2): Chickenz-first implementation
- **Done for Chickenz:**
  - `ChickenzRoom`: codes, links, host bots, ready-up, first to 3, reconnect with bot takeover, watchers joining mid-match.
  - Predicted netcode: restore and replay, 20 Hz per-client snapshots.
  - The room sheet UI.
  - Prod smoke: `SERVER_URL=wss://ruckus-play.84.46.247.92.sslip.io pnpm -F @arena/browser-checks chickenz-room`.
- **Still open:**
  - The generic `packages/netcode` extraction, when the second networked game arrives.
  - The realtime lobby list.
  - Emote UI and rematch vote.
  - The reconnect e2e test.
