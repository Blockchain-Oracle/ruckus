# S26 Runner tutorial + polish + ship

**Goal:** hands-on lessons (jump → duck → lane change → pickup), polish, and Neon Dash shipped in the hub.

**Read first:** docs/research/deep/kaspakinesis.md, ADR-001/003/004/006, PLAN §6b

## Design calls (session 5)
- **Six lessons on the live sim, in the order the barrier grammar teaches itself:**
  1. Change lanes: a red wall.
  2. Jump: cyan.
  3. Duck: yellow.
  4. Purple, duck only.
  5. Slam: a hurdle then a bar, where a duck in the air drops you fast.
  6. Coins and orbs: grab the green orb and pass the red one.
- The director lays each lesson's road from the start line, so it runs at the gentle 15 m/s. It keeps coins topped up, so nothing wipes you out.
- It judges by sim events: cleared past the last barrier with no hit, or the speed orb taken.
- A hit restarts the lesson with a hint.
- The first visit's How to play card offers **Quick lesson** or **Start the race**. Settings has **Replay tutorial**; the lesson card has **Reset** and **Skip the lessons**.

## Tasks
- [x] `tutorial/lessons.ts`, `tutorial/director.ts`, the driver's tutorial mode + `resync`, flow (`startLessons`, queue from Settings), lesson card, intro card choice, dev handle `__ruckusRunnerTutorial`
- [x] `runner-tutorial` check: an in-page player presses by distance to the next barrier through the real keyboard path; all six lessons pass and "You're ready" shows
- [x] Screens at 1280×720 and 844×390 (touch wording)
- [x] Shipped in the hub (visible), with credits and the S23–S25 checks green

## Acceptance
- `pnpm -F @arena/browser-checks runner-tutorial`: PASS. First visit → Quick lesson → six lessons → "You're ready".

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
