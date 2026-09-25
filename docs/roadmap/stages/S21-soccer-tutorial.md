# S21 Soccer tutorial

**Goal:** hands-on lessons that teach every control with no manual, judged by the live sim.

**Read first:** `apps/web/src/games/pool/hud/Lesson.tsx` (lesson card pattern), `packages/sim-soccer/src/*`

## Design calls (session 4)
- **Five lessons** (`tutorial/lessons.ts`):
  1. Move: reach a ring.
  2. Jump high: the ring can only be reached by holding jump.
  3. Shoot: score by running into the ball; there's no kick button.
  4. Header: head a dropping ball.
  5. Power-ups: knock the ball through a bubble, which teaches the last-touch rule and the colour code.
- **Director** (`tutorial/director.ts`):
  - The lessons run on the real world. The director only stages pieces, pins the clock and blocks spawns.
  - The sim needs a second egg, so the director parks it above the left goal.
  - It judges each lesson from events and state.
  - A miss resets itself after the ball settles, with a hint. Reset and Skip are always on the card.
- **Placements:**
  - The Shoot ball sits 300 px out so an honest run-through scores; from further out it chips over the bar.
  - The Power-ups bubble sits on the traced dribble line at (150, 75).
  - The Jump ring is at y 290: a held jump peaks at 278 (inside reach), while a tap peaks at about 184 (outside).
- **Entry points:**
  - First visit: "How to play" offers **Try it (1 min)** or **Kick off**.
  - **Settings → Replay tutorial:** from the hub it queues the lessons and enters; mid-practice it switches straight to them.
- **Finish:** "YOU'RE READY" leads to a real match.
- **Presenter:** it stays quiet in lessons; the lesson card owns the feedback.

## Tasks
- [x] Lessons and a director on the live sim; driver `tutorial` mode + `resync()`.
- [x] Lesson card (reset, skip, notes), goal ring, finish card; touch pad and key hint during lessons.
- [x] First-visit offer; Settings → Replay tutorial.
- [x] `pnpm -F @arena/browser-checks soccer-tutorial` plays all five lessons with the keyboard. PASS: move 2.3 s, jump 1.0 s, shoot 1.5 s, header 3.4 s, power-ups 1.2 s, then into a real match.

## Acceptance
Met.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
