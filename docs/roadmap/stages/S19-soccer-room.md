# S19 Soccer room + bot

**Goal:** a SoccerRoom at 60 Hz with whole-world prediction. It plays 1v1 and 2v2 with friends, labelled bots and watchers, and players join through invite links.

**Read first:** docs/research/deep/eggy-league.md, ADR-001/003/004/006, PLAN §6b, `apps/server/src/rooms/chickenz/ChickenzRoom.ts` (the real-time model), `apps/web/src/features/rooms/kit.ts`

## Design calls (session 4)
- **Server:** runs the same TS sim (`@arena/sim-soccer`) at 60 Hz.
  - Humans send `[seq u32][h i8][jump u8]` every tick.
  - Each client gets the whole world as Float64 bytes (`packWorld`) at 20 Hz, with its own input ack.
- **Client:** predicts the entire world.
  - Remote eggs keep their last applied input; bots think locally, since their brain travels in the snapshot.
  - On a snapshot it unpacks, drops acknowledged inputs, and replays the rest.
  - The visual jump decays at 14/s, so corrections glide.
  - Goals or the final whistle that only the server saw are synthesised from score and phase changes, so their sound and call-out still play.
  - Online play has no render slow motion, which would put the client behind the server's clock.
- **Format:** two seated players play 1v1. Three or four play 2v2, with a labelled bot filling the gap.
- **Teams:** lobby slot parity is the team (even Tomato, odd Violet). The server renumbers seats to sim slots and rebalances an over-full side.
- **Watchers and walkouts:**
  - Joiners mid-match watch live (`matchStart` is replayed to them) and take a free seat at the next lobby.
  - A player who leaves mid-match hands their egg to a `Bot (name)`.
  - A dropped connection keeps its seat for 20 s.
- **Room kit:** the generic kit gained `sendBytes` for real-time inputs.

## Tasks
- [x] `packWorld`/`unpackWorld` in sim-soccer, bit-exact; test: an unpacked world continues identically for 2000 ticks.
- [x] Protocol `@arena/protocol/soccer` (schema seats and state, message names, byte layouts).
- [x] `SoccerRoom`: seats, host commands, ready, bots, format and team assignment, 60 Hz loop, per-client snapshots, full time, back to lobby, walkout → bot, reconnection.
- [x] Driver online mode: prediction, input replay, smoothing, synthesised goal and whistle events.
- [x] `net/online.ts` room kit, pending match for invite links, lobby return; Online hub button; RoomSheet with team eggs; online results card.
- [x] `pnpm -F @arena/browser-checks soccer-room`: host + friend (invite link, Ready up) + bot → 2v2; a watcher joins mid-match; the friend walks out → a bot takes over; all clients agree on full time and score; ball within 120 px in ≥ 90% of samples; the room returns to its lobby.
- [x] Deployed: Coolify server (commit 99a86ee) and Vercel web. Production smoke test: two SDK clients start a 1v1, 20 Hz snapshots.

## Acceptance
Met. The local `soccer-room` check passes: 163/163 samples in tolerance (worst 36 px). The production smoke test passes.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
