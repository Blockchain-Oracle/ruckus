# Session log (append-only, one line per session)

| Date | Session | Stage | What shipped | Commit |
|---|---|---|---|---|
| 2026-09-25 | 1 | research → plan → S00a | Jam and SDK research; 76-entry competitor scan; 10 deep research docs (Chickenz, KaspaKinesis, 8-ball, Eggy League, xray, tech stack, game feel, assets, Coolify, monorepo); approved plan; resume system; ADRs 001–006 | see `git log` |
| 2026-09-25 | 1 | S00b | pnpm 10 monorepo: turbo, Biome with sim-purity rules, TS7 configs, shared constants, minimal web/server, hooks, green CI; named RUCKUS; ElevenLabs CLI | see `git log` |
| 2026-09-25 | 1 | S01 | RuckusGame class-table contract (exact 96% RTP, parity-proven), casino-math, vendored SDK, casino-bridge + DemoHost + reveal guard, debug panel, 60/60 CLI VRF rounds, browser e2e (5 checks) and prod-sandbox probe | see `git log` |
| 2026-09-25 | 1 | S02 | Colyseus server on Coolify (Nixpacks, HTTPS sslip.io, deploy key), Convex dev+prod with anonymous guest auth, web on Vercel (git-connected, turbo-ignore); prod connectivity check PASS | see `git log` |
| 2026-09-25 | 2 | S03 | Persistent WebGPU shell (attract orbit, play dolly, scrim), hub overlay + brand UI kit, @arena/audio, @arena/fx, audio-sprite pipeline + ElevenLabs UI sounds, CI size budgets | see `git log` |
| 2026-09-25 | 2 | S06 | Rust chickenz-sim (4P FFA, symmetric tie-breaks, deterministic bots, snapshots, FNV hash), wasm pkg + TS wrapper + golden tests; real Pixel Adventure Chickenz arena with a live 4-bot attract match | see `git log` |
| 2026-09-25 | 2 | S10a + course correction | Back a Bird seed bank v1 + wager flow; then (user correction) Chickenz made PLAYABLE: controls, touch, round flow, HUD, camera, ragdoll/effects, ElevenLabs SFX+music, tutorial, onboarding; parity ledger | see `git log` |
| 2026-09-25 | 3 | S09 + S10a + judge pass | Chickenz rebinding, dynamic camera toggle, hero choice, fullscreen; world nameplates/HP/stomp prompt; quick-chat emotes (server-validated); fixed mid-match invite joins (prod); Back a Bird simulator e2e PASS to 6×; hub opens on live Chickenz (ADR-007), portrait layout, rotate hint; credits; ledger audit | see `git log` |
| 2026-09-25 | 4 | S18 | Egg Soccer live: toon eggs (eyes track ball, squash/stretch), night stadium with reactive crowd and nets, score bug/call-outs/results, how-to-play + touch pad, ElevenLabs SFX + anthem, 1v1/2v2 + bot levels | see `git log` |
| 2026-09-25 | 4 | S19 | Soccer online: SoccerRoom (60 Hz TS sim, whole-world Float64 snapshots), client prediction + replay + smoothing, 1v1/2v2 with bots, watchers, invite links, walkout → bot; soccer-room check PASS; deployed server + web | see `git log` |
| 2026-09-25 | 4 | S21 | Soccer tutorial: five hands-on lessons judged by the live sim (move, held jump, shoot, header, power-ups), first-visit offer, replay from Settings; soccer-tutorial check PASS; lesson placements traced in the sim | see `git log` |
