<!-- Copy of the approved plan (2026-09-25). Source of truth for scope; progress lives in ROADMAP.md / HANDOFF.md. -->
# Plan: a multiplayer game hub with VRF casino wagers (Chain Jam Vol. 1)

> The working name for the hub is pending. "Arena" collides with 2 jam entries, and the name becomes the contract's `gameId`, so it is decided at checkpoint ✱N (before the first contract deploy that we'd submit). `@arena/*` is only the internal package scope and can stay.

## 1. Context

The user is entering **Chain Jam Vol. 1** (jam.chain.wtf), an on-chain casino game jam on Base:
- Entries must use the Chain casino SDK (`ICasinoGameV2`), with outcomes drawn from VRF and a declared RTP of 93–98%.
- The 76 existing entries are mostly "press a button, get a random number" ladders. Nobody built a game you play **against people**.

The user wants a premium, social, GamePigeon-style **multiplayer arena**:
- Rooms with share links, with friends and bots in the same match.
- Quick play, tournaments, practice, leaderboards.
- **Zero friction:** no wallet, no sign-in to play; sign in later to keep points.
- A **hands-on tutorial** in every game (Chickenz-style).
- xray.games' flow: a live game floating behind the menus, one-click practice.

It is built from four researched references:

| Game | Source | Approach |
|---|---|---|
| **Chickenz** (flagship) | Rust sim, MIT | Full design fidelity, generalized to 4-player FFA |
| **8-ball pool** | tailuge is GPL | Our own engine |
| **Eggy League** | 2D head-soccer | Our own sim |
| **KaspaKinesis / DAG Dasher** | 3-lane runner | Rebuilt as a same-seed ghost race |

**Decisions locked with the user:**
1. **Free skill arena, VRF wagers.** Skill play earns points and rank only. Money moves only through VRF-settled `ICasinoGameV2` rounds.
2. **Wager style is "both".** Decision moments ("you call it, VRF answers") plus bets on VRF-seeded bot matches. Novelty comes from the social layer (see ADR-001).
3. **Chickenz first**, built to full polish, then Pool, Soccer, Runner.
4. **Chickenz becomes 4-player FFA.** Generalize the sim to N ≤ 4, and 1v1 is simply N=2.
5. **No voice chat.** Quick-chat emotes only.
6. **Hosting:**
   - Realtime server on the user's **Coolify with Nixpacks**.
   - Web on Vercel.
   - Convex for identity and data.
7. **Quality over time.** The user has decided the deadline is not a reason to cut quality.
   - Fact noted: the site says submissions close **Sep 27 2026 23:59 UTC**, and the judged build is whatever is live then.
   - So a finished, eligible slice is submitted as early as possible (✱E) and keeps improving. Unbuilt games are hidden, never shown as "coming soon".
8. **Tests only for complex logic.** UI components come from 21st.dev. Read the docs before using any library.
9. **Best-practice code:** constants, clean imports, small files, strict types.
10. **Staged work with an on-disk handoff**, so any session can resume after a context clear.

**Research inputs** (each stage file lists which to read):
- `docs/research/deep/{chickenz,8ball,eggy-league,xray-games,kaspakinesis,tech-stack,game-feel-audio-ux}.md`
- `docs/research/00–04`
- `docs/requirements.md`
- `docs/competitors.md`
- `CLAUDE.md`
- `casino-sdk/docs/*`
- Reference code in `references/`

## 2. Session-resume system (built first)

Continuity lives **on disk**:

```
docs/roadmap/
  PLAN.md       # copy of this plan (the ~/.claude/plans file is outside the repo)
  ROADMAP.md    # stage table: id · title · status (todo/active/done) · link. Single source of truth for progress.
  HANDOFF.md    # ≤60 lines, rewritten at every pause (template below)
  LOG.md        # append-only, one line per session: date · stage · what shipped · commit
  stages/S00a-*.md …   # goal · inputs to read · tasks [ ] · acceptance · verify commands · exit checklist · notes
docs/decisions/ADR-00N-*.md   # money model, hosting, pool engine (no GPL), SDK vendoring, Chickenz Rust + FFA, seed banks…
docs/CREDITS.md               # asset/code license ledger (MIT Chickenz attribution, pooltool Apache-2.0, art/sound sources)
```

**HANDOFF.md template:**
- Stage and step (k/N), with a link.
- Last completed task and commit sha.
- **NEXT ACTION:** one concrete command or edit.
- Uncommitted work.
- Blocked on the user (✱?).
- Environment state:
  - Is the simulator up (:3300/:8545)?
  - The current local contract address (it changes on every redeploy).
  - Convex deployment, server URL, branch.
- Last green verification, and anything known to be failing.
- Gotchas learned.
- New ADRs.
- Research to read before resuming.
- Deadline status and the submitted build sha.

**Protocol** (written into `CLAUDE.md` and memory):
- **Session start:** read HANDOFF, then the active stage file, then only its listed inputs. Continue from NEXT ACTION.
- **During work:** tick tasks and make one Conventional Commit per task.
- **Exit checklist** for every stage and pause: verify commands pass, ROADMAP updated, HANDOFF rewritten, LOG line added, committed.
- **Planning is just-in-time:**
  - S00a–S05 are written in full detail in S00a.
  - Later stages start as goal + acceptance stubs and are expanded, using their research doc, when they become active.

## 3. Architecture

```
Browser — standalone URL | chain.wtf iframe (sandbox: allow-scripts allow-same-origin) | jam-gallery hover iframe (no host)
 ├─ React 19 shell (Vite 8) · zustand · Motion · 21st.dev/shadcn UI · string catalog (en; ui.locale/theme respected)
 ├─ ONE persistent canvas: three.js r186 WebGPURenderer (WebGL2 fallback, forceWebGL flag) via R3F 9
 │    game module = attract (bots playing, slow orbit, zoomed out, low DPR) | play (camera dolly) — xray pattern
 ├─ @arena/sim-*: deterministic sims AND deterministic bot policies → prediction, server, bots, practice, seed banks, /verify
 ├─ Colyseus 0.18 client ─WSS─► apps/server on Coolify (Nixpacks), wss://play.<domain>
 ├─ Convex client ─WSS─► convex/ (anon auth + later OAuth/email link, profiles, leaderboards, tournaments, replays, claim codes)
 └─ @arena/casino-bridge (single module-level connection)
      handshake OK → @chain/casino-sdk guest bridge → chain.wtf host → Base: <Name>Game.sol (ICasinoGameV2)
      window.parent===window OR handshake timeout ~3 s → DemoHost ("DEMO credits — no value" badge)
```

**Degraded mode:** if Colyseus or Convex is down (for example during judging), practice against local bots plus demo wagers still work fully offline.

### ADR-001: money model, seed banks, novelty

- **The contract draws an outcome class from VRF.**
  - Rejection sampling on a uint256: `limit = floor(2^256/D)*D`, with bounded keccak re-hashes.
  - Each bet type has constant `weights[]`, `multipliers[]` and a denominator.
  - **Every bet type pays exactly the single declared RTP** (e.g. 96.00%). The number on the jam form matches every bet type.
- **The client only presents the result, in O(1) time, from offline-mined seed banks.**
  - Banks live at `packages/casino-math/seedbanks/v{N}.json`, with K=512 sim seeds for each (betType, class), and their keccak hash is published.
  - Presentation seed = `bank[class][rejectionSample(keccak(randomness,"present"), K)]`.
  - `gameData` carries `presentationVersion`. Old wasm builds and banks are kept so `/verify` always reproduces past rounds.
  - A CI test asserts that every bank entry reproduces its class.
  - Optional live search is capped at 64 tries or ~50 ms, then falls back to the bank.
- **The sim is only a presentation**, like reel stops on a slot machine.
  - The declared math is the contract's class table, which satisfies "outcome derives from VRF; declared math = paytable".
  - Skill never touches payouts.
- **Novelty stance.**
  - Plain "bet on a simulated contestant" and "call the break count" overlap jam entries (Chain Arena, W.ARENA, Clatter, Roll Call). Penalty shootouts are an existing casino genre.
  - So each wager's novelty must come from our social and multiplayer layer. Example: a **watch party**, where your VRF round plays as a live bot exhibition in your room and friends react, emote and see the pot fly.
  - Each session has its own VRF, so no shared multi-bettor pool (a stated limitation).
  - **Every wager spike (S10, S15, S20, S25) must pass a novelty check against `docs/competitors.md`** and the Stake/Roobet/BC.Game originals list.
- **Decision moments never pause a live 60 Hz match** for a transaction plus VRF wait. They happen in solo, practice or intermission.

### Contract lifecycle (ADR-004)

- **One contract, one address, one `gameId`.**
  - It is a generic **class-table contract** with every bet type routed through one `_payout()` that feeds `quoteCaps`, `quoteRiskParams`, `onSessionStart` and `onRandomness`.
  - No constructor args, and no external libraries.
  - `reservedProfitDelta = 0` on the settling step.
  - `bodyVarianceScaled` is computed for multi-tier tables.
  - `quoteForfeitPayout = 0` unless the payout depends only on already-revealed state.
- **Size gate:** `forge build --sizes` in CI keeps the contract under 24,576 bytes.
- **All bet types included in a submission are designed before that deploy.** Every new address has to be re-audited and whitelisted by the maintainers.
- **Source and simulator sync.** Source lives in `contracts/src/`. `pnpm contracts:sync` copies it into `casino-sdk/simulator/contracts/` with chokidar; symlinks aren't reliable with `fs.watch`. The copied files are gitignored there.
- **Foundry in `contracts/`** runs fuzz tests plus the Solidity↔TS payout parity test, using shared JSON vectors.

### ADR-003: SDK vendoring

`casino-sdk/` is a private npm-workspaces package that exports raw TS. It is not usable as a pnpm dependency, so:
- **`packages/chain-casino-sdk`** takes the package name `@chain/casino-sdk` and holds verbatim copies of `src/{types,guest,host,bet-limits,manifest,index}.ts`, with exports `./guest` and `./host`.
  - Dependencies: `penpal@^7.0.4`, `zod@^4.4.3`.
  - A `pnpm sync:sdk` script copies the files and a test byte-compares them against `casino-sdk/src`, following the SDK's own §8.1 vendoring guidance.
- **`casino-sdk/` stays npm-only.** It is excluded from `pnpm-workspace.yaml`, which uses explicit globs `apps/*`, `packages/*`, `convex`, `contracts` and never `**`. It is also excluded from biome and turbo, and its `node_modules` and lockfile are gitignored.

### Host integration (decided in S01/S03)

- **Manifest (`game.manifest.json`):**
  - `presentation.mode: "full-iframe"`, with `hostPanels` all false (we render our own history).
  - `capabilities.openSession` is true. `submitAction`, `cancelStuckRandomness` and `forfeitExpiredSession` are true if any bet type is multi-action.
  - `resize` is false, and the canvas is sized to the viewport, to avoid a feedback loop with `observeGameContentSize` on a full-screen canvas.
  - `assets.iconUrl` and `assets.coverUrl` are included.
- **Reveal and recovery:**
  - `revealOutcome` is always called: a ~12 s watchdog, plus a reveal on unmount or game switch.
  - Session rows are routed by the `betType` decoded from `raw.gameData`, and a global "pending round" chip shows. A refresh mid-round restores any bet type.
  - `computeMaxWager` uses each bet type's top multiplier.
- **Sandbox constraints, tested with a prod-exact harness** (the simulator's iframe is looser than production):
  - no popups or OAuth, no pointer lock or fullscreen (use an in-page theater mode)
  - clipboard, Gamepad API and Web Share may be blocked (feature-detect and fall back)
  - audio unlocks on the first gesture
  - WebGPU availability is checked empirically
  - Convex and Colyseus WSS connections work
  - localStorage has a try/catch plus an in-memory fallback
  - share links always point to the standalone URL
- **Headers:** no `X-Frame-Options` or `frame-ancestors`, so the jam gallery can use a hover iframe. If a CSP is set, `connect-src` covers convex.cloud, `play.<domain>` and jam.chain.wtf.

## 4. Repository structure (S00a/S00b)

```
chain-jam/  (git root)
├─ apps/
│  ├─ web/                      # @arena/web — Vite 8 + React 19 + R3F 9
│  │  ├─ public/                # game.manifest.json, og-image.png (1200×630), icons
│  │  ├─ index.html             # <script async src="https://jam.chain.wtf/widget.js"></script>
│  │  └─ src/
│  │     ├─ app/                # main.tsx, providers, AppShell overlay, url-state (?game=&room=)
│  │     ├─ engine/             # GameShell <Canvas>, camera director, attract/play machine, scrim, gpu tier/forceWebGL
│  │     ├─ games/registry.ts   # eager metadata + lazy import; entries hidden until shipped
│  │     ├─ games/chickenz/     # index.tsx config.ts store.ts scene/ hud/ net/ tutorial/ wager/ touch/ assets/
│  │     ├─ features/           # onboarding lobby rooms results leaderboard wager verify profile settings
│  │     ├─ components/ui/      # shadcn + 21st.dev (components.json)
│  │     ├─ i18n/  lib/  hooks/  stores/
│  │     └─ config/             # env.ts (t3-env+zod), flags.ts
│  └─ server/                   # @arena/server — Colyseus 0.18
│     ├─ nixpacks.toml  tsdown.config.ts (dts:false, noExternal @arena/*, copies wasm)
│     └─ src/ index.ts app.config.ts rooms/{lobby,queue,chickenz,…} bots/ services/ config/env.ts lib/
├─ convex/                      # @arena/convex (convex.json: functions "src/", codegen.staticApi true)
├─ contracts/                   # @arena/contracts — Foundry; src/<Name>Game.sol, test/, vectors/, scripts/sync
├─ crates/chickenz-sim/         # from references/chickenz fp.rs only (MIT, NOTICE); ZK + f64 path + risc0 sha2 removed; N≤4 players; deterministic bot policy
├─ packages/
│  ├─ tsconfig/                 # base, vite-react, node, sim (no DOM lib)
│  ├─ shared/                   # constants, ids, flags, types (pure; no node:* — Convex-safe)
│  ├─ protocol/                 # Colyseus schema() defs + messages, subpath per game
│  ├─ netcode/                  # wraps/extends Colyseus 0.18 reconciler/rewind (evaluated in S05)
│  ├─ chain-casino-sdk/         # vendored @chain/casino-sdk (ADR-003)
│  ├─ casino-bridge/            # bridge singleton, DemoHost, session routing, reveal watchdog
│  ├─ casino-math/              # payout tables mirror, exact RTP enumeration, seedbanks/
│  ├─ sim-chickenz/             # TS wrapper, committed pkg/ + pkg/SOURCE_HASH, load.ts (browser init / node initSync)
│  ├─ sim-pool/ sim-soccer/ sim-runner/   # added in their stages
│  ├─ audio/  fx/  assets-pipeline/        # browser engines; glTF-Transform/KTX2/Meshopt/audio-sprite scripts
├─ tooling/ biome/no-nondeterminism.grit, prod-frame/ (exact prod sandbox harness), seedbank-miner/
├─ references/  casino-sdk/     # vendored read-only — references/ gitignored; casino-sdk excluded from workspace/lint/turbo
├─ docs/  .github/workflows/ci.yml
└─ package.json pnpm-workspace.yaml turbo.json biome.json Cargo.toml rust-toolchain.toml
   .editorconfig .gitignore .nvmrc(24.12.4+) .node-version .env.example lefthook.yml commitlint.config.ts
```

## 5. Engineering standards (enforced in S00b, written into CLAUDE.md)

- **Toolchain:**
  - Node **≥24.12.4**, which is the SDK's engines floor: `.nvmrc`, `.node-version`, `engines.node: "24.x"`.
  - **pnpm 10.x pinned** in `packageManager`. Nixpacks maps only pnpm 6–10, and the local pnpm 11 auto-switches.
  - Turborepo 2.9.
  - **TypeScript 7, after an S00b spike** proves that `vite build`, `tsdown` (dts off) and `convex dev` all pass. Fall back to TS 6.x if any fails.
  - Biome 2.
  - Rust and wasm-bindgen pinned in `rust-toolchain.toml`.
- **TypeScript config:** a shared `@arena/tsconfig` with `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `erasableSyntaxOnly` and `moduleResolution: bundler`.
  - **No enums and no decorators.** Use `as const` and the Colyseus `schema()` builder.
- **Imports:**
  - Across packages: `@arena/*` only, via `exports` (internal packages ship their source).
  - Inside `apps/web`: `@/…`.
  - Inside the server: `#app/…` subpath imports.
  - Inside a game: relative imports only. **Games never import each other.**
  - Imports are sorted by Biome.
- **Sim purity:**
  - `packages/sim-*` and `crates/*` must not use three, react, the DOM, `node:*`, audio or fx.
  - A GritQL rule bans `Math.random`, `Date.now`, `performance.now`, timers and `crypto.getRandomValues` in sims.
  - `sim.json` has no DOM lib.
  - Bot policies live inside the sims and use the sim's PRNG.
- **Constants and config:**
  - No magic numbers.
  - Sim tuning lives in `packages/sim-<game>/src/constants.ts` (or Rust `consts.rs`), with units in the names and derived values (`TICK_DT_MS = 1000 / TICK_RATE_HZ`).
  - Tables are written `as const satisfies Record<Id, Stats>`.
  - Visual and audio tuning lives in `games/<game>/config.ts` and never feeds the sim.
  - Shared values live in `@arena/shared/constants`.
  - Env is validated with t3-env + zod. `.env.example` is committed, and no secrets go in the repo.
- **Structure and style:**
  - Keep files around 300–400 lines; split into systems. Chickenz's 2.3k-line `GameScene` is the counter-example.
  - Comments explain *why*.
  - Errors are handled at boundaries (network, bridge, Convex), and sims never throw on input.
- **Tests (Vitest and Foundry, logic only):**
  - RTP enumeration and payout parity (TS/Sol).
  - Sim and bot determinism: the same seed plus inputs gives an identical per-tick hash in Node and the browser.
  - Seed-bank validity.
  - The netcode reconciler.
  - SDK vendoring sync.
- **Git:**
  - Conventional Commits, enforced with commitlint and lefthook. Pre-commit runs `biome check --staged`.
  - One commit per task.
  - `references/` is gitignored before the first `git add`. It holds 168 MB, including GPL code.
- **WASM exception (ADR-002):**
  - `packages/sim-chickenz/pkg/` is committed, because Nixpacks can't build Rust.
  - `pkg/SOURCE_HASH` (a hash of the crate sources plus `Cargo.lock`) is checked in CI. It is not a byte diff, because wasm-opt output drifts.

## 6. Deployment (ADR-002)

- **Server on Coolify with Nixpacks.**
  - Base Directory `/`, because the root lockfile is needed.
  - Build variables: `NIXPACKS_CONFIG_FILE=apps/server/nixpacks.toml`, `NIXPACKS_NODE_VERSION=24`.
  - `nixpacks.toml`:
    - `nixPkgs = ["...", "curl"]`
    - install: `pnpm install --frozen-lockfile --filter @arena/server...`
    - build: `pnpm --filter @arena/server... run build`
    - start: `node apps/server/dist/index.js`. Use `node` so SIGTERM reaches Colyseus, which drains gracefully.
  - App settings:
    - Port 2567 on its own subdomain `wss://play.<domain>`.
    - `/health` check with a start period.
    - Stop grace period 30 s.
    - Runtime-only secrets.
    - Auto Deploy through the GitHub App.
  - **Watch Paths = the server's dependency closure only:** `apps/server/**`, `packages/{shared,protocol,netcode,sim-*,casino-math}/**`, `crates/**`, lockfile, workspace file, root `package.json`, `!**/*.md`.
  - Never set `NODE_ENV=production` as a build variable.
  - Fallback: a documented Dockerfile (Nixpacks is in maintenance mode, and Railpack is beta).
  - Monitoring: an uptime check on `/health`.
- **Coolify context: confirmed with the user at ✱S02.** Read-only probing found only `agari-new` (localhost:8001) responding; `zkf` and `agari` timed out.
- **Web on Vercel.**
  - Built with the `@arena/web` filter, SPA rewrites, immutable hashed assets.
  - Carries the widget tag, the og:image and a same-origin manifest.
  - No frame-blocking headers.
- **Convex:** `npx convex deploy`.
- **Contract:** the local simulator for development. The maintainers handle whitelisting after submission.
- **Source access:** the repo is private and reviewers get invited at ✱E / S11. The jam requires source access.

## 6b. Assets (ADR-006; details in `docs/assets/`)

**Art direction (the user's choice):**
- One **shared brand** wraps everything: the hub and the casino layer share a palette, fonts, chunky Supercell-style press buttons, Phosphor icons, transitions, the sound language, and the payout celebrations.
- Each game keeps its **native style**: pixel Chickenz, cinematic 3D pool, code-drawn cartoon soccer, stylized low-poly 3D runner.
- Gold is reserved for money. No emoji icons, no spinners, no default Inter-everywhere.
- The brand is set at ✱N using the 21st-ui-explore skill and written into `docs/assets/ART-BIBLE.md`: palette tokens, type scale, UI kit, icon rules, motion rules, audio identity, per-game style rules, and reference boards.

**Source policy:**
- Allowed: commercial licences that permit use in real-money gambling products. That means CC0, royalty-free with no gambling exclusion, or work we own.
- **Banned:** anything NC, SA, GPL, or ambiguous; Chickenz's original music, guns, logo and taunts; Jestan's weapons pack; Udio; stock-music subscriptions whose game use is gated behind enterprise terms (Epidemic, Artlist); Uppbeat.
- Every asset gets a row in `docs/CREDITS.md` (source, licence, URL, price, date) and appears on an in-game credits screen.
- Raw Sonniss WAVs and other redistribution-restricted sources stay **out of git**, in a gitignored `assets-src/` folder. Only processed output is committed.

**ElevenLabs (✱ pending written clarification):**
- **What the terms say:**
  - The Prohibited Use Policy §3(c) bans "facilitat[ing] real-money gambling activities" and applies to "Outputs you create… within and outside our Website".
  - There's no approval route for §3(c). Paid commercial rights are subject to that policy.
  - Starter-plan music excludes "Studio Games".
  - ElevenLabs' own casino and slot SFX pages say those sounds can be used "in commercial projects", which is why asking is worthwhile.
- **We do not reword prompts to get around the policy.**
- **The ask:** the user emails team@elevenlabs.io or a help.elevenlabs.io request, using the draft saved in `docs/assets/elevenlabs-request.md` (S00a).
- **If approved:**
  - Install `@elevenlabs/cli` 1.4.0.
  - Use the local `sound-effects` skill (`eleven_text_to_sound_v2`, loop support) and the `music` skill (`music_v2`, composition plans, stems) for the signature sounds and stems.
  - Budget: the 39,855-credit Starter pool (resets 25 Oct) covers about 17 minutes of music (15.3k) plus about 300 two-second SFX (24k).
  - Every generation is logged in CREDITS.
- **Until then, and as the fallback:** the licensed sources below. Nothing is blocked either way.

**Inventory and sources per game (licences verified 2026-09-25):**

| Game | Visuals | Audio |
|---|---|---|
| **Hub / casino** | Brand from the Art Bible; Phosphor icons (MIT); fonts: Lilita One / Titan One / Bungee (OFL), Luckiest Guy (Apache-2.0, ship its licence); GPU confetti and coin particles; og:image and icons designed in the brand | Kenney Casino Audio + Music Jingles (CC0); UI sound language (Kenney Interface / UI Audio, CC0, layered and processed); VRF-wait tension loop and payout stingers (bespoke: Suno or ElevenLabs if approved, else CC0 plus procedural) |
| **Chickenz** | Pixel Frog **Pixel Adventure 1** (CC0, free: 4 heroes = 4-player FFA, terrain, backgrounds, items, pops); **Pixel Adventure 2** ($5, CC0: chicken and other enemies as extra skins); Pixel Frog Treasure Hunters / Kings and Pigs / Pirate Bomb (CC0) for larger 4-player maps and UI frames; **5 guns hand-drawn in Aseprite** on the PA palette (fallback: Asgaard42 CC0); ansimuz Explosions + Warped Shooting Fx (CC0), re-tinted to the palette | Procedural Web Audio SFX (the Chickenz `sfx.ts` approach, extended); impacts and whooshes from Sonniss GDC / Freesound CC0; new taunt voices; music from CC0 chiptune loops (SubspaceAudio 400-loop set) or bespoke |
| **Pool** | Procedural table (extruded rails, CSG pockets) and a lathe cue; procedural canvas ball textures (standard colours, number drawn twice); Poly Haven **`billiard_hall` HDRI** + wood and leather (CC0); ambientCG Fabric034 felt (CC0) or procedural felt | **Silverplatter Billiards** (CAD $34, royalty-free, 96k/24-bit) plus papapleygames Pool SFX (CC0) and Freesound CC0; velocity-scaled gain, pitch and low-pass, 4–6 takes, a voice limiter |
| **Soccer** | Egg characters, ball and cosmetics **drawn in code** (SVG/canvas, procedural squash, stretch and eye-tracking; no Rive or Spine licence needed); Kenney Sports Pack (CC0) for goals and markings; painted stadium backdrops (brand-designed) | Sonniss stadium and crowd beds; Kenney Impact (CC0) kicks and bounces; a synthesized goal horn |
| **Runner** | Quaternius Universal Base Characters + Universal Animation Library 1 & 2 (CC0) or KayKit Character Animations (CC0); Quaternius Downtown City MegaKit / KayKit City Builder Bits / Kenney City Kit Roads (CC0); procedural coins | Footsteps and whooshes from Sonniss / Kenney; pickup and debuff stingers; a music stem layered by speed |

**Budget:**
- Paid packs so far: about $5 (PA2) + CAD $34 (Silverplatter), plus optional Suno Pro/Premier. The user has approved spending where it clearly raises quality, including free trials.
- Each purchase is logged in CREDITS with its receipt.

**Pipeline** (`packages/assets-pipeline`, built in S03):
- `assets-src/<game>/` (raw, gitignored if restricted) → scripts → `apps/web/public/assets/<game>/` (committed; Git LFS for binaries over 1 MB, with LFS enabled on Vercel).
- **Sprites:** `@assetpack/core` atlases (NearestFilter, 1–2 px extrude) plus JSON.
- **3D:** `gltf-transform optimize --compress meshopt --texture-compress ktx2` (needs KTX-Software `toktx`), with UASTC for normal maps and ETC1S for base colour.
- **Audio:** Opus/WebM first, AAC `.m4a` fallback, loudness-normalized to about −16 LUFS, one audio sprite per game for SFX, streamed music stems.
- **Fonts:** subset to woff2 with `pyftsubset`.
- **HDRIs:** 1k–2k, converted.
- **Naming:** `<game>/<category>/<name>[_<variant>][@<scale>].<ext>`, kebab-case.
- **Weight budgets:**
  - Attract mode per game: ≤1.5 MB.
  - Full game chunk (code and assets, lazily loaded): ≤8 MB.
  - Music streams separately.
  - CI checks the budgets.

**Where assets happen in the roadmap:**
- **S00a** writes the ADR, the `CREDITS.md` skeleton and the source policy.
- **S03** builds the pipeline and the budgets, and sets the brand and Art Bible at ✱N.
- Each game's **rendering** stage (S07, S13, S18, S23) starts with an asset sub-task:
  1. Write that game's `docs/assets/<game>.md` manifest (every sprite, model, texture, SFX and music cue with its source and licence).
  2. Acquire the assets. ✱ Purchases need the user's approval.
  3. Process them, log CREDITS, and check the budget.
- Each game's **feel** stage does the sound design pass (layering, mixing, the loudness pass).
- **S11 and each game's ship stage** check the in-game credits screen.

## 7. Staged roadmap (one stage ≈ one session; ✱ = user checkpoint)

**Stage A: Foundations**

- **S00a Resume system** (short):
  - `git init`, `.gitignore` (with `references/`, `casino-sdk/node_modules` etc.).
  - `docs/roadmap/` {PLAN, ROADMAP, HANDOFF, LOG, stages S00a–S05 detailed, S06+ stubs}, ADR-001…004, `CREDITS.md`.
  - Update `CLAUDE.md`: protocol, standards, a correct layout that replaces the old "game lives in casino-sdk/examples" line.
  - Update memory and `requirements.md`: 4-player FFA, no voice.
- **S00b Toolchain:**
  - The pnpm 10 workspace (explicit globs), turbo, biome and the grit rule, the tsconfig package, lefthook, commitlint, editorconfig, CI (install, biome, typecheck, tests).
  - The **TS7 spike**.
  - ✱ Create a private GitHub repo and push.
- **S01 Casino core:**
  - Run `casino-sdk` with `npm install && npm start` (simulator at :3300).
  - `packages/chain-casino-sdk` (vendored, with the sync test).
  - `contracts/` Foundry setup with the class-table contract (one real, finished bet type), `contracts:sync`, the size gate and the parity vectors.
  - `@arena/casino-math` (RTP enumeration).
  - `@arena/casino-bridge`: singleton, DemoHost with a 3 s handshake timeout, reveal watchdog, session routing.
  - `tooling/prod-frame` harness.
  - Acceptance:
    - The full bet → WAITING_RANDOMNESS → reveal → payout loop works, including the **top multiplier**.
    - Unhappy paths pass: slow indexer, stuck randomness (`cast rpc hardhat_mine 0x10`), wallet not ready, refresh mid-round.
    - The prod-sandbox checks pass.
- **S02 Deploy skeleton:**
  - `apps/server` with a hello room and `/health`, plus `nixpacks.toml`.
  - ✱ Coolify context/server, subdomain, Auto Deploy, watch paths.
  - `apps/web` on Vercel with the widget, manifest and placeholder og:image.
  - A Convex project with anonymous auth, checked end to end: deployed web → deployed server → Convex.
- **✱E Early eligible submission** (as soon as it is honestly *finished*):
  - What ships: the standalone hub, one complete wager experience, labelled DEMO mode, the widget, the manifest, the og:image, and a declared RTP.
  - The user decides whether to submit now; the same URL keeps improving.
  - Reviewers are invited to the repo.

**Stage B: Hub framework** (game-agnostic)

- **S03 Engine shell:**
  - GameShell (persistent R3F WebGPU canvas, GPU tier, forceWebGL).
  - Registry with lazy chunks.
  - Attract/play machine, camera director, scrim, overlay, url-state, stores.
  - `@arena/audio` and `@arena/fx` bases.
  - `assets-pipeline` (glTF-Transform, KTX2/Meshopt, audio sprites).
  - The **performance budget enforced in CI now**: shell ≤150 KB gz, near-instant first frame.
  - The i18n string catalog, with `ui.theme`/`locale` respected.
  - ✱N **Name + brand/visual direction** via the 21st-ui-explore skill. The user picks, and the name sets the contract `gameId`.

**Stage C: the Chickenz core, pulled early to de-risk wagers**

- **S06 Sim:**
  - Extract `crates/chickenz-sim` from `fp.rs`.
  - Generalize to **N ≤ 4 players**: spawns, stomp and ride between any pair, camera framing data, round and victory rules, and a symmetric tie-break (Chickenz's creator-wins tie-break is removed).
  - Port `BotAI.ts` into the crate as a **deterministic fixed-point bot policy** using the sim PRNG.
  - wasm build, `load.ts`, `SOURCE_HASH`, determinism tests in Node and the browser, documented constants. ADR-005 records why it stays Rust and why FFA.
- **S10a Wager spike:**
  - Seed-bank miner, bank validation test, presentation from the bank.
  - Design a novel Chickenz wager (watch-party bot exhibition and/or a decision moment), with the novelty check.
  - This proves the whole money path early.

**Stage B continued**

- **S04 Identity and onboarding:**
  - Convex anonymous user and guest names.
  - First-visit modal, username prompt, and the **tutorial step engine**.
  - Settings: audio, controls, reduced motion.
  - Claim-code merge (iframe ↔ standalone).
  - **"Sign in later to keep points"**: Convex Auth OAuth/email, standalone only.
- **S05 Lobby and rooms:**
  - Lobby and Queue rooms, Quick Play, public/private rooms, 5-letter codes and `?room=` links, ready-up and countdown.
  - **Labelled** bot fill, reconnect window, results screen, rematch vote, quick-chat emotes.
  - Evaluate the Colyseus 0.18 `reconciler`/`rewind` before extending them in `@arena/netcode`.
  - Degraded offline mode (practice plus demo wagers) as an acceptance item.

**Stage C: Chickenz, continued** (input: `chickenz.md`)

- **S07 Rendering:**
  - three.js orthographic pixel scene; sprites and animation.
  - Camera framing for up to 4 players.
  - Ported wipe, ragdoll and gun anchoring.
  - ✱ Asset plan: verify the Pixel Frog license or replace the art. The music, guns, logo and taunts are new, since the originals are copyrighted. Record everything in `CREDITS.md`.
- **S08 Netcode:**
  - ChickenzRoom at 60 Hz, server-authoritative, supporting 2–4 players.
  - Input-on-change, binary/delta state, prediction, smoothing, lag compensation.
  - Practice against local bots.
- **S09 Feel:**
  - Juice: shake, render-only hit-stop, muzzle flash, damage flash, knockback, trails.
  - HUD, hands-on tutorial, **touch controls** (port `TouchControls.ts`), results, a sound pass.
  - The 60-second "feels real?" test.
- **S10b Wagers:**
  - Full implementation of the S10a design: watch-party presentation in rooms, `/verify`, the celebration tiers.
- **S11 Ship Chickenz:**
  - Leaderboards and Elo.
  - Real og:image, `manifest.assets`, and the "18+ / DEMO credits have no value" notice.
  - The eligibility checklist.
  - ✱ Submit or update.

**Stages D–F: Pool, Soccer, Runner** (inputs: `8ball.md`, `eggy-league.md`, `kaspakinesis.md`)

- Each stage follows the same pattern:
  - Sim (Pool: our own engine following the published physics papers, pooltool as the porting reference, basic arithmetic and square roots only, compared against tailuge from the outside).
  - Rendering and feel, including touch controls.
  - Room and deterministic bot.
  - Wager spike with the novelty check.
  - Tutorial and polish.
- Stage numbers: Pool S12–S16, Soccer S17–S21, Runner S22–S26 (same-seed ghost race and "beat my run").
- **All wager designs** for the games in the next submission are finished before that contract deploy (ADR-004).

**Stage G: final**

- **S27** Tournaments and daily seeded cups.
- **S28** Mobile, accessibility, perf re-audit.
- **S29** Final feel pass. ✱ Update the submission.

## 8. Verification

- **Casino:**
  - Every bet type passes the full loop in the simulator, including the explicit **top multiplier**.
  - Unhappy paths pass.
  - RTP tests show exactly the declared RTP.
  - Foundry parity and fuzz tests are green.
  - The size gate passes.
- **Presentation:**
  - Every seed-bank entry reproduces its class.
  - `/verify` reproduces past rounds for each `presentationVersion`.
- **Determinism:** identical per-tick hashes in Node and the browser, for the sim and for bots.
- **Multiplayer:**
  - Two to four browsers at 150 ms throttling.
  - Prediction is smooth, reconnect works, bots are labelled.
  - The offline degraded mode works.
- **Sandbox:** the `tooling/prod-frame` harness with the exact production sandbox. Also a jam-style hover iframe with no host, which falls back to DemoHost within 3 s.
- **Deploy:**
  - A push redeploys the server only when a watched path changes.
  - `/health` is green and `wss://` connects.
  - `curl` of the web URL shows the widget tag.
  - The manifest passes `validateCasinoGameManifest`.
  - The og:image is present.
- **Performance:** the CI bundle budget, Lighthouse, a mobile GPU check, and a near-instant first frame.

## 9. First actions after approval

1. Run **S00a**: create the repo, the resume system, the ADRs (including ADR-006 on assets) and CLAUDE.md, and update `requirements.md`. Save to memory:
   - build style
   - staged workflow and handoff
   - Nixpacks/pnpm 10
   - Chickenz 4-player FFA
   - no voice
   - shared brand with native game styles
   - the asset source policy
   - the ElevenLabs gambling-clause status and the outcome of the user's clarification request
2. ✱ The user sends the ElevenLabs clarification email (draft provided). The answer decides whether ElevenLabs is used for signature SFX and music.
3. From then on, every session starts at `docs/roadmap/HANDOFF.md`.
