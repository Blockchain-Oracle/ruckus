# 8-ball parity ledger

**References:**
- tailuge/billiards (GPL-3.0): a **behaviour oracle only**; no code is copied (ADR-003).
- cinematic-8ball-pool (no licence): the look only (lighting rig values, post chain).
- pooltool (Apache-2.0): the physics models ported (see NOTICE).

Online mobile 8-ball conventions (call the 8, ball in hand) set the rules. The status key is the same as `chickenz-parity.md`.

| Surface | Reference behaviour | Status | Notes |
|---|---|---|---|
| Fixed-step deterministic physics | 2⁻⁹ s step; Han friction; Alciatore throw; Mathavan/Han cushions | have | `sim-pool`: exact arithmetic (lint-enforced), Han cushions, simultaneous rack clusters |
| Squirt | Visual only in tailuge | have (better) | A real squirt deflection (TP A-31) in `cue.ts` |
| Pockets | Knuckle circles, potted when the centre enters | have (better) | Narrowing jaw facings with knuckles; the drop point is 1R past the nose |
| Rack | 8 in the centre, jittered | have | A WPA rack, 0.1 mm seeded jitter, about 1.1 balls potted per break at 0.9 power |
| Rules | Open table, groups, fouls → ball in hand, 8 early | have | Plus online conventions: call the 8; the 8 early, in the wrong pocket or on a foul loses; an 8 on the break respots |
| Aim (mouse) | Drag to rotate; arrows (Ctrl fine) | have | Point-to-aim, ←/→ with Shift for fine aim; touch drag aims |
| Power | Drag-to-strike (pointer speed) or hold Space | have (adapted) | A mobile-8-ball pull-back power cue plus hold/release Space |
| Spin | Drag on the cue ball / DOM spin ball | have | A spin ball with a red dot; the cue tip offsets visibly; the numbers show the roll |
| Aim guide | A 60R line only (no ghost ball) | have (better) | A ghost ball, the object-ball line and the cue-ball tangent |
| Camera | aim / top / spectator | have | A table overview and a cue view (V / View button); the aim view is smoothed |
| Ball in hand | Place anywhere; kitchen on the break | have | Drag the cue ball; validated (`canPlaceCue`) |
| Bot | Ghost-ball heuristics | have (better) | A simulate-and-score search in a Worker; honest aim/power noise by difficulty; a visible stroke |
| Multiplayer | Lockstep, shooter-authoritative | have (better) | The server is authoritative (it runs the same engine); raw-byte tables; aim relay; watchers |
| Spectate | Watch live | have | Invite links join mid-rack as watchers |
| Replays | URL replays | missing | Next: shots are deterministic, so (layout seed + shot list) is enough |
| Shot clock | 20 s auto-fire | missing | Optional for online rooms |
| Audio | 5 one-shots, one per frame | have (better) | 10 ElevenLabs takes; velocity gain, pitch and pan; up to 6 voices per frame; a jazz bed |
| Look | ACES, shadowed spot and rim lights, bloom, vignette | have (mostly) | ACES, pendant spot with soft shadows, fills, the HDRI; bloom and vignette not yet |
| Tutorial | None | have (additive) | Five hands-on lessons with coaching |
| Wager | None | have (additive) | Call Your Shot (S15) |
