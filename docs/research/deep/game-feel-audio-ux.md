# Game feel, audio, motion and UX for a premium browser arena hub

Research date: 2026-09-25. Scope: the Chain Jam hub. It is a three.js/web game with Chickenz-style 2D platformer-shooter duels, 3D 8-ball pool, boost-and-jump physics soccer and possibly a racer, all wagered on-chain. The judging criterion this serves is **"Visual & sound: does it feel like a real game? No AI slop."** Fun and Simplicity also depend on feel.

> Rule zero: juice sits on top of a responsive core. It is not a substitute for one. In Swink's terms, *real-time control* has to feel good before *polish* is added. Every effect below must be cosmetic and must never delay input. For the deterministic/ZK-replayed Chickenz sim in particular, hit-stop, slow-mo and shake belong to the **render layer only**. Freeze interpolation and hold poses, and never pause the sim tick.

---

## 0. TL;DR (what to actually do)

1. **Build one shared "feel kit" for every game**: `trauma` camera shake, a `hitStop(ms)` render freeze, `squash(obj, amt)`, spring and tween helpers, a pooled particle burst, `sfx.play(id, {pitchVar, volVar})`, `haptic(pattern)`, `slowmo(scale, ms)` and a `celebrate(tier)` call. Every mini-game then gets the same premium baseline for free.
2. **Audio does half the work.** Build every important sound from 3 layers (transient, body, tail), give it ±5–10% random pitch and 3–5 variants, run it through one master bus with a limiter, and duck the music under big moments. Music uses vertical layers plus quantized stingers.
3. **Pick one art direction and hold it everywhere.** Use one palette (5–7 hues plus neutrals), one display font, one button language, and tone mapping (AgX or ACES) plus restrained bloom. Reserve gold for money and wins.
4. **Remove all friction before play.** Offer a play-now guest session, a `/r/ABCD` link or QR code, 4-letter room codes, auto-countdown once everyone is ready, a practice sandbox while waiting, and a 1-tap rematch that shows who has voted.
5. **Treat the casino beat as a 4-act show**: commit, then suspense, then a staged reveal, then a payout scaled to the multiplier. Oracle and VRF latency gets masked by a diegetic suspense loop, **never a spinner**.

---

## 1. Game-feel principles, with numbers

### 1.1 Canonical sources (watch or read these; each is short)

| Source | Core takeaway |
|---|---|
| **Jan Willem Nijman (Vlambeer), "The Art of Screenshake"**, INDIGO 2013 ([YouTube](https://www.youtube.com/watch?v=AJdEqssNZ-U)) | Takes a bland shooter to a juicy one in about 30 steps: bigger bullets, muzzle flash, faster bullets, less accuracy, impact effects, hit flash, enemy knockback, **permanence** (shells and corpses stay), camera lerp, camera leads toward the aim, screen shake, player recoil/knockback, **sleep (hit-stop)**, gun kick, more bass, random explosions. |
| **Martin Jonasson & Petri Purho, "Juice It or Lose It"**, 2012 ([YouTube](https://www.youtube.com/watch?v=Fy0aCDmgnxg)) | A Breakout clone made juicy with tweens (elastic/back), squash and stretch, color flashes, sounds on every collision, particles, shake, and "personality" (eyes, smiles). Adds **no mechanics**, only feedback. |
| **Steve Swink, *Game Feel* (2008)** | Game feel = real-time control + simulated space + polish. Response inside the human perception window (~100 ms) reads as "instant". Tune feel through *metrics*: acceleration curves, max speed, gravity and air control. |
| **Squirrel Eiserloh, "Juicing Your Cameras With Math"**, GDC 2016 ([Vault](https://gdcvault.com/play/1023146/Math-for-Game-Programmers-Juicing), [YouTube](https://www.youtube.com/watch?v=tu-Qe66AvtY)) | The **trauma model** for shake (`shake = trauma²`), smoothed noise instead of random jitter, framing and smoothing, dynamic split-screen. |
| **Maddy Thorson, "Celeste & Forgiveness"** ([article](https://maddythorson.medium.com/celeste-forgiveness-31e4a40399f1)) | Coyote time, jump buffering, halved gravity at the jump apex, jump corner correction, dash corner pop-up. Invisible forgiveness makes control feel "tight". |
| **Jared Cone (Psyonix), "It IS Rocket Science! The Physics of Rocket League Detailed"**, GDC 2018 | 120 Hz fixed physics tick, custom arcade car physics over Bullet, a ball tuned for readability over realism, hitboxes decoupled from visuals. **Consistency beats realism.** |
| Nicolae Berbece, "Game Feel: Why Your Death Animation Sucks", GDC 2017 | Deaths and wins need their own motion design: pause, impact, readable cause, then a fast return to play. |
| Mix and Jam, "Recreating Balatro's Game Feel" ([YouTube](https://www.youtube.com/watch?v=I1dAZuWurw4)) and the [80.lv breakdown](https://80.lv/articles/balatro-s-card-movements-shaders-recreated-in-unity) | Card tilt toward the cursor, spring-follow, idle sway, and sequential scoring with rising pitch. |

### 1.2 Techniques and numbers

**Hit-stop ("sleep")**
- Light hit: **2–4 frames (33–66 ms)**. Heavy hit or kill: **6–10 frames (100–170 ms)**. Match-deciding blow: 150–250 ms, then chain into slow-mo.
- Freeze both attacker and victim, but keep particles and shake running (or start them *on release*). A white/red flash on the victim during the freeze sells it.
- Chickenz sim: freeze the **renderer's interpolation clock** only, then catch up over the next 100 ms at 1.3–1.5x. Never stall the fixed-tick WASM sim, because the ZK replay must match.
- Pool: a tiny 30–50 ms freeze on the cue-ball strike at high power. Soccer: 50–80 ms on a power shot, 0 on dribbles.

**Screen shake (trauma model, Eiserloh)**
```
trauma = clamp(trauma + add, 0, 1)                    // add: 0.15 small hit, 0.3 shot, 0.5 explosion, 0.8–1.0 goal / KO
shake  = trauma ** 2                                  // squared (or cubed) so small traumas barely move
offX   = maxOffset * shake * noise(seed,   t*freq)    // Perlin/simplex, not Math.random
offY   = maxOffset * shake * noise(seed+1, t*freq)
angle  = maxAngle  * shake * noise(seed+2, t*freq)
trauma = max(0, trauma - decay*dt)                    // decay ≈ 0.8–1.5 /s
```
- Typical values: `maxAngle` 3–8°, `maxOffset` 0.3–0.8 world units in 3D (or 8–20 px in 2D), `freq` 15–25 Hz.
- In 3D, prefer **rotational** shake (no clipping). Directional shake along the impact vector feels more intentional than omnidirectional shake.
- Always offer a "Reduce motion" toggle (`prefers-reduced-motion`) that scales shake to 0–25%. It is an accessibility point that judges notice.
- Don't shake on your own small actions in pool. Pool is a calm game: shake only on a "slam" break.

**Squash & stretch** (preserve volume)
- 2D: `sy = s; sx = 1/s`. 3D: `sy = s; sx = sz = 1/sqrt(s)`.
- Jump take-off stretch ~1.2–1.3 for 80 ms. Landing squash ~0.7–0.8, spring back over 100–150 ms (under-damped, one overshoot).
- Apply it to UI too: buttons go to 0.92 on press and overshoot to 1.05 on release. Coins and chips pop from 0 to 1.15 to 1.0.
- Soccer ball: squash along the hit normal on impact (~0.8 for 60 ms). It reads instantly as "hard hit".

**Easing & springs**
- Enter: easeOutQuint/Expo or easeOutBack (overshoot 1.2–1.7) at **200–350 ms**. Exit: easeInQuad/Cubic at **120–200 ms**. Exits are always faster than entrances.
- Prefer springs for anything interactive (stiffness ~300–500, damping ~20–30, mass 1). They retarget mid-motion without snapping. Useful libraries: `motion` (Framer Motion), `@react-spring`, `gsap` (now free, including its plugins, since the Webflow acquisition), or a 20-line custom spring.
- Frame-rate-independent smoothing: `x += (target - x) * (1 - Math.exp(-k * dt))` with k ≈ 8–15 for camera and 20+ for UI. Never use `lerp(x, target, 0.1)` per frame, because it breaks on 120 Hz displays.
- Stagger lists and results by 30–60 ms per item.

**Anticipation**
- 50–150 ms wind-up before big actions: a cue pull-back, a soccer car crouching before a jump, a slight pullback before a chip slides in. The big move then reads as powerful.
- In the UI, the "Place bet" button compresses while held and releases on commit.

**Particles**
- Burst on every contact: 6–12 particles for small hits, 30–80 for explosions or goals. Lifetime 0.2–0.6 s, shrinking and fading with easeOut, gravity where appropriate. Add **debris that persists** (Vlambeer "permanence"): shell casings, scorch decals, chalk dust on the pool cloth.
- Use one `InstancedMesh`/`Points` pool per effect type. In three.js, a single `InstancedMesh` with per-instance color and scale handles thousands of particles in one draw call.
- Color particles by team or player, and use the money/gold color only for payouts.

**Camera work**
- Platformer: a dead-zone box, look-ahead in the aim/velocity direction (~15–25% of the screen), and a duel framing that keeps both players on screen with a zoom clamp.
- Soccer (Rocket League style): a ball-cam/car-cam toggle. RL's defaults are a distance of ~270 uu, a height of ~100 uu, and FOV 110. Add a **FOV kick** of +5–10° while boosting (ease 150 ms), speed lines above a supersonic threshold, and camera lag on landing.
- Pool: an orbit aim camera, auto-transition to a low tracking cam after the strike, and a **pocket cam cut** for the final black ball.
- Kill/goal cam: 0.5–1.0 s slow-mo plus a zoom toward the event, then snap back.

**Input forgiveness (platformer, soccer jump)**
- Coyote time: ~**0.1 s** (Celeste's grace window is ~6 frames at 60 fps).
- Jump buffer: **0.08–0.15 s**.
- Variable jump height: on release, cut upward velocity by 40–60%.
- Apex hang: halve gravity when |vy| is small and jump is held (Celeste).
- Fall gravity at 1.5–2.5x rise gravity, plus a terminal velocity.
- Corner correction: nudge 2–4 px around ceiling corners.
- Aim assist: small magnetism toward targets on gamepad and touch.
- Pool: an aim guide line with ghost-ball and first-bounce preview (the 8 Ball Pool convention), fine-aim mode, and a power meter with a slow-in near max.

**Haptics**
- Android Chrome: `navigator.vibrate(pattern)`, e.g. tap `10`, hit `[20]`, goal `[40,30,80]`, big win `[30,40,30,40,120]`. It needs sticky user activation.
- **iOS Safari has no Vibration API.** The known workaround toggles a hidden `<input type="checkbox" switch>` (Safari 17.4+), which fires the system haptic. It is a hack, so gate it behind feature detection.
- Gamepad (Chrome/Edge): `gamepad.vibrationActuator.playEffect('dual-rumble', {duration: 120, strongMagnitude: 0.8, weakMagnitude: 0.4})`. `trigger-rumble` also exists on Xbox pads in Chromium.
- Keep haptics short (under 150 ms) and meaningful: hits, goals, pocketed balls, payout ticks. Add a settings toggle.

**Slow-mo on key moments**
- Match point, last goal, final 8-ball drop or KO: timeScale 0.2–0.35 for 0.6–1.2 s on the *render/cosmetic* layer. For physics games that run authoritative sims, apply it on replay rather than live.
- Audio drops with it: low-pass the music to ~800 Hz and pitch the SFX down 3–5 semitones. The *return* to 1.0 is a whoosh plus a stinger.

**Win and lose moments**
- Win: hit-stop, slow-mo, a flash to white (60 ms), a winner-focus camera, confetti in team colors, a music stinger, then the results card slides in about 1.2 s after the event.
- Lose: keep it quick and dignified, with a desaturated background (grayscale 60%) and a short falling tone. Show the **Rematch** CTA within 1.5 s.

### 1.3 How the top casual and party games do it

| Game | What to copy |
|---|---|
| **Rocket League** | Kickoff: a 3-2-1 countdown with cars frozen, each beep rising in pitch, "GO" on a brighter tone. Goals: a big goal explosion that knocks cars back, a crowd roar, a replay with slow-mo, then a quick reset. Boost: a flame trail, FOV/speed lines and a supersonic trail. Big hits: a "demolition" explosion. Quick chat ("What a save!") as low-effort social expression. |
| **Fall Guys** | Jelly-bean characters with constant secondary motion (wobble, flail ragdoll). A round-intro flyover shows the course before play. Big bold typography stamps ("QUALIFIED!", "ELIMINATED") with squash-in. A pastel palette with saturated accents, and toy-like lighting with soft shadows. |
| **Stumble Guys** | The same template tuned for mobile: bigger UI, snappier rounds, one-tap re-queue. |
| **Brawl Stars / Clash Royale (Supercell)** | Chunky 3D buttons (drop shadow, beveled top, squash on press). A heavy display font with dark outline and drop shadow. Reward boxes and chests use escalating taps: each tap shakes harder, rarity color leaks through cracks *before* the reveal, and legendary drops get a full-screen shimmer and a unique sound. Currency flies to the HUD counter, which ticks and pulses. |
| **8 Ball Pool (Miniclip)** | **The closest model for wagered duels.** The entry fee is chosen per "table/city" tier. Both players' stakes animate into a central **pot** shown between the avatars during the match, and the winner's avatar receives the flying coins at the end. Aim guide line, spin widget and a vertical power slider. A shot timer ring around the avatar. |
| **GamePigeon** | Zero-onboarding: the game *is* the message. Turns are asynchronous. Every game is under 60 s to understand. Crisp, simple sounds. |
| **Balatro** | Everything moves slightly all the time (idle sway, cursor tilt). Scoring runs **sequentially per card**, with chips ticking up and pitch rising for each trigger, so the score builds a crescendo. A shake and a fire effect appear when the hand beats the blind. A CRT/pixel shader and a swirling background shader give one cohesive look. The key lesson: **stage and sequence the reveal and escalate the audio pitch.** |
| **Buckshot Roulette** | Tension through **silence, slow deliberate animation and diegetic info**. Shells are shown briefly, then hidden. The dealer pauses. The camera cuts to the barrel. The click-or-bang lands after a held beat. Low-poly models, heavy lighting and dithering give a strong identity on a tiny budget. |

---

## 2. Audio design

### 2.1 Sound construction
- **Layering**: every hero sound = transient (click, snap, 0–30 ms) + body (the "thing", 30–300 ms) + tail or sweetener (reverb, shimmer, sub-thump). Example for a pool break: cue tip click + ball-cluster clack + cloth rumble + low-end thump.
- **Variation**: 3–5 round-robin variants per sound, random pitch ±5–10% (about ±1 semitone), random volume ±1.5 dB. A repeated identical sample is the fastest route to "cheap".
- **Voice limiting**: cap each sound at 3–6 simultaneous instances, stealing the oldest. Add a 30–50 ms cooldown on the same sound (for example, bullets hitting the same wall).
- **Physics-driven SFX**: map impact velocity to volume and to sample choice (soft / medium / hard). Pool balls, soccer ball, car bumps. Fire only above a velocity threshold, with per-pair cooldowns, or resting contacts will "machine-gun".
- **Pitch as information**: combos, streaks, count-ups and power meters rise in pitch per step (Balatro, Peggle, coin collect). Quantize the steps to a musical scale (major pentatonic) so it sounds musical, not like a siren.

### 2.2 Adaptive music
- **Vertical layering**: stems at the same tempo (drums, bass, pads, lead) that start together and fade in and out with state. Lobby = pads + bass. Match = + drums. Final 10 s / overtime / match point = + lead and hats, or a switch to a double-time stem.
- **Horizontal resequencing**: intro, loop A, loop B and outro segments. Transition on the bar line.
- **Stingers**: short 1–3 s cues for goal, KO, win, lose, jackpot and "final round". Quantize them to the next beat with `audioCtx.currentTime` scheduling (lookahead of about 25 ms), and duck the music bed while they play.
- ElevenLabs Music (available via the `music` skill) can generate stems and loops from a composition plan. Request "instrumental, 120 BPM, loopable, separate drum and melody versions" to get vertical layers.

### 2.3 UI sound language
- Define one family with shared timbre (for example, soft wooden/plastic clicks plus a bell for money): hover tick (very quiet, -30 dB relative), press, confirm, back/cancel (lower pitch), error (two descending notes), toggle on/off (up/down), countdown beeps (rising), notification, coin tick, chip place, "bet locked" (heavy satisfying clunk), and a payout family in 4 tiers.
- UI sounds bypass the world reverb and stay dry and centered.

### 2.4 Spatial audio
- 2D platformer: a `StereoPannerNode` driven by screen x (pan = clamp(x_norm*0.7)), with volume falloff by distance from the camera center.
- 3D pool, soccer, racer: `THREE.AudioListener` on the camera plus `THREE.PositionalAudio` (PannerNode) on the ball and cars. Use `distanceModel 'inverse'`, `refDistance` ≈ car size, and `rolloffFactor` 1–2. Use `panningModel 'equalpower'` for cheap sources and `'HRTF'` only for a few hero sources. Add a Doppler-like pitch shift from relative velocity for cars (manual, because the Web Audio Doppler API was removed).
- Crowd/ambience: a stereo loop whose intensity is layered by game tension (a crowd swell as the ball approaches the goal, like Rocket League).

### 2.5 Mixing, ducking, loudness
- Bus structure: `master` ← [`music`, `sfx`, `ui`, `voice`]. Put a `DynamicsCompressorNode` as a safety limiter on master (threshold -6 dB, ratio 12–20, attack 3 ms, release 250 ms).
- **Ducking**: on big SFX or stingers, dip music by -6 to -10 dB (attack 20–50 ms, release 300–600 ms) via `gain.setTargetAtTime`. Before a casino reveal, duck the music almost to silence, because silence is the strongest suspense tool.
- **Loudness targets**: Sony's ASWG-R001 practice is commonly cited as about -24 LUFS integrated for console/home and about -18 LUFS for mobile/portable. For a browser game heard next to YouTube and Spotify tabs on laptops and phones, master assets so gameplay sits around **-16 to -18 LUFS integrated with a true peak ≤ -1 dBTP**. Normalize every SFX to a consistent peak and loudness before import (for example, `ffmpeg -af loudnorm=I=-16:TP=-1`). Default the in-game music slider to about 60%.
- Offer separate Music / SFX / UI sliders and a mute key (M). Persist them in localStorage.

### 2.6 Delivery: sprites, formats, unlock
- **Audio sprites**: pack UI and short SFX into one file per game (or per category) with a JSON offset map (Howler.js `sprite` or `audiosprite`), and decode it once into an `AudioBuffer`. Stream long music through an `<audio>` element with a `MediaElementSource`, or decode on demand.
- **Formats**: ship `.webm/.ogg (Opus)` with an `.m4a (AAC)` fallback. Avoid MP3 for loops, because encoder padding creates gaps. For seamless loops, use `AudioBufferSourceNode.loop` with `loopStart`/`loopEnd`.
- **Budget**: about 1–2 MB of SFX per game and about 1–3 MB of music per game. Lazy-load per mini-game.
- **Mobile autoplay unlock**: create one `AudioContext` and call `ctx.resume()` inside the first `pointerdown`/`keydown`/`touchend` (the "Play" button). Play a 1-sample silent buffer to fully unlock iOS. Set `navigator.audioSession.type = 'playback'` where supported (Safari), so sound plays with the ringer switch on silent; without it, iOS Web Audio is muted by the silent switch. Re-`resume()` on `visibilitychange`, since iOS suspends the context when backgrounded.

### 2.7 Where to get high-quality, commercially usable audio (licenses checked 2026-09-25)

| Source | License (verified) | Notes and caveats |
|---|---|---|
| **Kenney audio** ([kenney.nl/assets/category:Audio](https://kenney.nl/assets/category:Audio)) | **CC0**. Commercial use is fine and attribution is optional ([support FAQ](https://kenney.nl/support)). | Interface Sounds, Impact Sounds, UI Audio, Digital Audio, and **[Casino Audio](https://kenney.nl/assets/casino-audio)** (chips, cards, dice). Great base layers. They are widely used, so layer or process them to avoid sounding "stock". |
| **Sonniss #GameAudioGDC bundles** ([sonniss.com/gameaudiogdc](https://sonniss.com/gameaudiogdc/), [license](https://sonniss.com/gdc-bundle-license/)) | Royalty-free, unlimited users, commercial use in finished projects. | **Restrictions:** no redistributing the sounds *as sound effects* (raw, modified or re-designed), and **no AI training**. **Do not commit the raw WAVs to a public GitHub repo.** Ship only the processed or bundled audio inside the built game, and keep source WAVs out of git (or in a private asset bucket). Professional quality: the best source for impacts, whooshes, crowds and cars. |
| **Soundly** ([FAQ](https://getsoundly.com/faq/can-i-use-the-sounds-in-a-video-game/)) | The Free and Pro libraries are cleared for commercial use, including video games. | The free tier is about 3,000 sounds via the desktop app. Very clean library. |
| **ZapSplat** ([standard license](https://www.zapsplat.com/license-type/standard-license/)) | The free (Basic) tier allows commercial use with **attribution to "ZapSplat" required** and MP3 only. Premium is attribution-free, adds WAV, and sounds downloaded while subscribed stay licensed for life. | No redistribution, no use as the primary value of a product, no AI training. Put "Sound effects from zapsplat.com" in the credits. |
| **Freesound** ([FAQ](https://freesound.org/help/faq/#licenses)) | Licensed per sound: CC0, CC-BY 4.0 or CC-BY-NC (plus the legacy Sampling+). | **Filter by CC0 or CC-BY only.** Avoid NC and Sampling+ for a wagering product. Keep an attributions file (Freesound provides an attribution list). Quality varies. |
| **OpenGameArt** | Licensed per asset: CC0, CC-BY, CC-BY-SA, GPL, OGA-BY. | Use CC0/CC-BY only. SA/GPL add obligations. Quality varies widely; good for chiptune/retro music. |
| **ElevenLabs Sound Effects / Music** (the `sound-effects` and `music` skills are available) | **Paid plan required for commercial use.** The free plan is non-commercial and requires attribution ([help](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform), [SFX page](https://elevenlabs.io/sound-effects)). | Best for **bespoke** sounds that no library has: "wooden chip stack clack with metallic coin shimmer", "stadium crowd gasp then roar", a looping VRF-wait tension riser, per-game music stems. Generate 4–8 takes and pick the best. Still layer and normalize the result. Regenerate anything made on a free account once on a paid plan. |

---

## 3. Visual direction that avoids "AI slop"

### 3.1 What reads as "premium, real game" vs "AI slop"
**Slop tells:** a generic purple-blue gradient with glassmorphism, emoji as icons, mismatched asset styles (a Kenney character next to a photoreal texture), default Inter everywhere, AI-generated illustrations with melted detail, unlit `MeshStandardMaterial` with no environment map, no shadows, a flat gray floor, no motion on idle screens, and spinners.

**Premium tells:** one committed art style across hub, games and UI. Lighting with an environment map and soft shadows (contact shadows). Tone mapping. A restrained palette with a reserved accent. Custom, consistent iconography. A chunky, legible display font. Everything responds (hover, press, idle breathing). Sound on every interaction.

### 3.2 three.js recipe (r16x–r18x)
- `renderer.outputColorSpace = SRGBColorSpace`; `renderer.toneMapping = AgXToneMapping` (or `ACESFilmicToneMapping`; `NeutralToneMapping` if colors must stay brand-accurate), exposure 1.0–1.2.
- Image-based lighting: `PMREMGenerator.fromScene(new RoomEnvironment())`, or a small HDRI (Poly Haven, CC0). Crucial for glossy pool balls and car paint.
- Shadows: one directional key light with `PCFSoftShadowMap` and a tight shadow camera, plus a fake contact shadow (blurred decal, or drei `ContactShadows`) under cars, balls and players.
- Post-processing via **pmndrs/postprocessing** (one merged `EffectPass`, cheaper than three's stock passes):
  - `BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.9, intensity: 0.6–1.2 })`. Bloom only emissive things (neon goals, boost, payout coins). Selective bloom keeps it classy.
  - **N8AO** (SSAO) at half resolution for grounding in pool and soccer.
  - `SMAAEffect` (or MSAA on the render target), a subtle `VignetteEffect` (darkness 0.4), a tiny amount of `ChromaticAberration` only during impacts or slow-mo, and a `LUT3DEffect` for a cohesive grade.
  - Mobile: drop AO and cap DPR at 1.5–2.
- Toon/outline style (Fall Guys, Brawl Stars, Wind Waker feel): `MeshToonMaterial` with a 3–4 step `gradientMap`, plus an inverted-hull outline (a back-face mesh scaled 1.02–1.04 in dark team color) or pmndrs `OutlineEffect` for selection highlights.
- The 2D platformer (Chickenz-style) can still sit in three.js or PixiJS. Add parallax layers, rim-light sprites, additive muzzle flashes, a hit-flash shader (mix to white for 1–2 frames), a pixel-snapped camera if pixel art, and optionally a subtle CRT/scanline pass (Balatro-style) as the hub's signature.

### 3.3 Palette and typography
- Palette: 5–7 hues plus 2–3 neutrals from one source (a Lospec palette or a hand-picked set). Assign roles: Team A, Team B, **money/win gold**, danger/lose red, UI surface, UI ink. Never use gold for anything except value.
- Type: one chunky display face for numbers and stamps (Lilita One, Luckiest Guy, Bungee or Titan One; all Google Fonts, OFL) with a 2–4 px dark stroke and a drop shadow, plus one clean text face (Inter or Rubik) for body text. Use **tabular numerals** for balances, timers and odds.
- Buttons follow the Supercell recipe: vertical gradient face, darker 4–6 px "base" slab, 1 px highlight line, press = translateY(4 px) with the slab collapsing, and squash on release.

### 3.4 Reference games and sites (study these)
1. **[bruno-simon.com](https://bruno-simon.com)**: a three.js driving portfolio. Toy physics, collision sounds, a cohesive palette and soft shadows. The gold standard for "web can feel like a game".
2. **[messenger.abeto.co](https://messenger.abeto.co)**: a multiplayer three.js world (Awwwards SOTD). Loads in seconds, painterly lighting and art direction.
3. **[PolyTrack (Kodub)](https://www.kodub.com/apps/polytrack)**: a browser low-poly racer. Reference for the racer mini-game's speed feel and instant restart.
4. **[slowroads.io](https://slowroads.io)**: procedural driving in the browser. Atmosphere, fog and lighting on a budget.
5. **[krunker.io](https://krunker.io)**: instant-play browser FPS. Reference for load-to-play speed and hit feedback.
6. **Rocket League**: boost/ball/goal feedback, and a kickoff and goal pacing template.
7. **Fall Guys**: toy lighting, pastel palette, stamp typography.
8. **Brawl Stars / Clash Royale**: UI buttons, reward reveals, currency flights.
9. **Balatro**: sequential scoring, rising pitch, CRT shader, constant micro-motion.
10. **Buckshot Roulette**: the pacing of tension and reveal, dithered low-poly look.
11. **Stake Originals** (Crash, Plinko, Mines, Dice): one clear visual metaphor per game, instant state legibility, and a strongest-feedback-at-the-decision hierarchy ([arthouselabs analysis](https://arthouselabs.com/blog/game-art-lessons-stake-originals-plinko-mines-crash)).

### 3.5 3D/2D asset sources (licenses checked)
| Source | License | Use for |
|---|---|---|
| **Kenney** ([kenney.nl/assets](https://kenney.nl/assets)) | CC0 (verified) | UI packs, platformer tiles, racing kit, car kit, particles, fonts, input prompts. |
| **Quaternius** ([quaternius.com](https://quaternius.com)) | CC0 (verified on site) | Rigged, animated low-poly characters (the Ultimate/Universal animation library), guns, vehicles. |
| **KayKit (Kay Lousberg)** ([kaylousberg.com/game-assets](https://kaylousberg.com/game-assets)) | CC0, "free for personal and commercial use, no attribution" (verified on the Platformer pack page); paid "extra" versions add content | Platformer Pack, Prototype Bits, Character Animations. Cohesive toy style that fits Fall Guys-like soccer and hub. |
| **Poly Pizza** ([poly.pizza](https://poly.pizza)) | **Per model: CC0 or CC-BY 3.0** (the API exposes a `Licence` field and a ready attribution string) | Filler props. Check each model, and log CC-BY credits. |
| **Poly Haven** ([polyhaven.com](https://polyhaven.com)) | CC0 | HDRIs (lighting), PBR textures (felt, wood for pool). |
| **itch.io packs** | Per pack; read each license | Pixel-art characters and VFX sprite sheets for the platformer. Prefer packs that state "commercial use OK" explicitly. |
| **Google Fonts** | OFL | Display and body fonts. |

Keep one `CREDITS.md` and an in-game credits screen listing every CC-BY/ZapSplat/Freesound attribution.

---

## 4. Menu, lobby and HUD UX for zero-friction multiplayer

### 4.1 Patterns from the best
| Product | Pattern to steal |
|---|---|
| **Jackbox** ([jackbox.tv](https://jackbox.tv)) | A **4-letter room code** plus a name field and one "Play" button. Phones are controllers. The host screen shows the code large and permanently. Audience mode for overflow players. |
| **Gartic Phone** | Host creates a room and **copies an invite link**. The lobby shows avatars dropping in with a sound. The host tweaks presets, and everyone else just waits with something to look at. |
| **skribbl.io** | A **"Play!" button drops you into a public game instantly**, and "Create private room" gives a link. Avatar customization happens *while* the lobby fills. |
| **krunker.io** | From URL to in-match in seconds, and you spawn directly into a live game. Menus are overlays on top of the running game (a spectate/attract background). |
| **GamePigeon** | The invite *is* the game. Async turns with no lobby at all. Result plus "Play again" in one message. |
| **Discord Activities** | Launch in a voice channel so everyone present can join in one click. Identity is pre-filled. Design for 2–8 friends who already know each other. |
| **Rocket League** | Free play / training while matchmaking. The queue never feels like dead time. |

### 4.2 Our flow (target: link to gameplay in under 10 s, wallet only when money is involved)
1. **Landing = the hub running live.** An attract-mode demo match or a spectated real match plays behind the menu. Big "PLAY" button. The first click also unlocks audio.
2. **Identity**: an auto-generated guest name and avatar (editable). Connect a wallet or embedded wallet **only when entering a wagered match**. Free/practice matches need none.
3. **Create room**: returns `/r/KQXZ`. Use 4 letters excluding the ambiguous I, O, L and 0/1. Offer copy-link, QR code (for phone to laptop) and "Share to Discord/X". Joining via the link skips all menus.
4. **Lobby**: player cards with avatar, name, ping and wager-ready state. Host picks the game and stake. Show the **pot** in the center (8 Ball Pool pattern). **Ready-up** toggles. When everyone is ready, an auto countdown starts (3-2-1, ~0.8 s per beat, rising pitch, and "GO" on a higher, brighter note). Cancel is allowed until "1".
5. **While waiting**: a local **practice sandbox** of the selected game (shoot targets, juggle the ball, free table), so the player feels the controls before the match.
6. **HUD**: minimal. Score, timer (it turns red and pulses in the last 10 s, when the music layer also increases) and pot/stake. Pool: shot-timer ring on the avatar. Soccer: boost meter. Platformer: weapon and ammo near the player, not in a corner.
7. **Results**: a winner stamp, then the payout animation (coins fly from the pot to the winner's balance), then 2–3 highlight stats ("Longest shot", "Top speed"), then a **Rematch** button that shows votes (`Rematch 1/2`) and auto-starts when all agree. Add "Double or nothing" for wagers and a "Back to lobby" link. Auto-return to the lobby after 20 s idle.
8. **Spectate**: anyone with the link but no seat becomes a spectator with a free/follow camera. Spectators can "call next".
9. **Tournaments/brackets**: 4 or 8 player single elimination. Show the bracket as a hero screen with animated connector lines as winners advance, and "Your next match in 0:45" with a practice sandbox meanwhile. The final gets its own intro stinger.
10. **Leaderboards**: show **your rank with ±2 neighbors** as well as the top 10. Animate rank changes (number ticks, row slides). Offer weekly and all-time tabs. Show net winnings and win streak with tabular numerals.

### 4.3 Network-feel rules
- Your own inputs produce immediate local feedback (sound, muzzle flash, cue strike) through client prediction. Server-authoritative events (goal confirmed, pot won) play a local *anticipation* immediately and the *confirmation* on the server message.
- Interpolate remote entities with a ~100 ms buffer. Never show raw teleports; smooth corrections over 100–200 ms.

---

## 5. How the casino moments should feel

The on-chain loop is: **place wager, then commit (tx), then wait for randomness or settlement (VRF / oracle / ZK proof), then reveal, then payout**. Latency is unavoidable, so design it as *drama*, not *loading*.

### Act 1: Wager placement (tactile, instant)
- Chips are physical objects: dragging or tapping stacks chips with a clack (pitch rises slightly per chip), the stack wobbles, and the total counts up with tabular numerals. Show the **potential payout live** next to the stake ("Win 1.94 ◆").
- Presets (½, 2x, Max) and a Stake-style keyboard shortcut. Remember the last bet.
- The **commit** is a hold-to-confirm or a heavy button press: anticipation compress, then release, a "LOCK" clunk, and the chips slide into the pot with a spring. From here the UI is optimistic. The wallet or tx confirmation appears as an in-world beat ("Bet locked"), not a modal wall where possible.

### Act 2: Waiting for randomness (suspense loop, never a spinner)
- Start a **diegetic, loopable suspense state** the instant the tx is sent: a drumroll or heartbeat loop, a low-pass filter slowly opening, a slow camera push-in, the dealer shuffling or rolling the dice in hand, the ball jittering in the Plinko hopper. It can loop indefinitely at no narrative cost.
- **Minimum suspense of 0.8–1.5 s** even if the result is instant, because an instant result feels cheap and untrustworthy. After ~6–8 s, add a gentle in-fiction line ("The dealer is checking the chain…" with the tx link). Past ~20 s, show honest status with a retry path.
- Duck the music toward silence as the reveal approaches, as Buckshot Roulette does: **silence before the bang** is the strongest tool.

### Act 3: Reveal (staged, escalating)
- Break the reveal into **beats**, each louder or brighter than the last (Balatro scoring, Clash Royale chest taps). Example: dice tumble, then die 1 lands (thud), then die 2 wobbles on an edge for 300 ms, then lands, then the total stamps in.
- **Foreshadow the tier** (a rarity-colored glow leaking just before the final beat) so the brain starts celebrating early. Only foreshadow **true** outcomes: no fake near-misses. The result is provably fair, so show the honest path.
- Tap-to-skip is always available for repeat players. The auto-bet/turbo mode shortens every beat by about 70% (Stake-style).

### Act 4: Payout celebration (scaled by multiplier)
| Tier | Trigger | Treatment |
|---|---|---|
| Loss | 0x | Brief (under 0.6 s): a soft descending tone, the chips slide away, desaturate 40%. **Rebet** is focused immediately. No shaming. |
| Push/small | ≤1.5x | A coin tick count-up (0.5 s), a small sparkle, a light haptic. |
| Win | 1.5–5x | A coin burst flies from the pot to the balance, the count-up has rising pitch (1–1.5 s), a mid stinger, trauma 0.3, and a haptic pattern. |
| Big win | 5–25x | A "BIG WIN" stamp (squash-in, overshoot), slow-mo, a coin fountain, bloom intensity up, music drops to the stinger then returns, trauma 0.6. |
| Jackpot | 25x+ | A full-screen takeover: 250 ms hit-stop, a white flash, a slow-mo camera orbit, a confetti and gold shower, a unique jackpot stinger, a long count-up (2–4 s, skippable), a shareable result card, and the win noted in the lobby feed. |

- Count-ups use easeOutExpo on the value with ticks quantized to a scale. The final number "lands" with a thump and a squash of the balance widget.
- Show a **result history strip** (last 10 outcomes as colored pills, Stake-style) and a "Verify" link (VRF request, tx hash) on every result. It builds trust and costs little UI.
- For **skill duels** (pool, soccer, platformer), the "reveal" is the match itself. The casino beats wrap it: stake-lock stinger before kickoff, pot visible throughout, and the result screen as Act 4 with pot-to-winner coin flight.

---

## 6. Per-mini-game checklist

### Shared "feel kit" (build once, use everywhere)
- [ ] `trauma` camera shake (squared, noise-based, rotational in 3D, reduced-motion aware)
- [ ] `hitStop(ms)` on the render layer and `slowmo(scale, ms)` with audio low-pass and pitch-down
- [ ] Spring and tween helpers (frame-rate independent). Squash/stretch helper that preserves volume.
- [ ] Pooled instanced particle system (burst, trail, debris with permanence)
- [ ] Audio manager: single context, unlock on first gesture, `audioSession.type='playback'`, buses plus limiter, sprites, round-robin, pitch/vol variance, voice limit, ducking, quantized stingers, vertical music layers
- [ ] Haptics wrapper (vibrate / iOS switch hack / gamepad rumble) with a settings toggle
- [ ] `celebrate(tier)` and `lose()` sequences, a countdown component, results card, rematch voting
- [ ] Tone mapping, environment map, contact shadows, bloom/SMAA/vignette/LUT preset, DPR cap
- [ ] Settings: Music/SFX/UI volume, reduce motion, haptics, quality (auto-detect)

### Platformer shooter (Chickenz-style)
- [ ] Coyote 0.1 s, jump buffer 0.1 s, variable jump, apex hang, fast-fall 2x, corner correction
- [ ] Per weapon: muzzle flash (1–2 frames additive), recoil kick (sprite plus camera nudge opposite the aim), shell casing that persists, distinct 3-layer fire sound, bullet trail
- [ ] On hit: white flash 1–2 frames, knockback, 2–4 frame hit-stop, blood/feather particles, directional shake 0.2
- [ ] Kill: 8-frame hit-stop, slow-mo 0.3x for 0.6 s, feather explosion, KO stamp, stinger
- [ ] Sudden-death wall closing: rumble loop, red vignette pulse, music layer up
- [ ] Camera frames both players, with a look-ahead in the aim direction
- [ ] Hit-stop and slow-mo **render-only** (deterministic sim and ZK replay untouched)

### 3D 8-ball pool
- [ ] Aim: guide line with ghost ball and first-bounce preview, fine-aim, spin widget, power bar with anticipation (cue pull-back mirrors power)
- [ ] Strike: cue click, 30–50 ms freeze on hard shots, camera transitions to a low tracking cam
- [ ] Ball-ball clacks scaled by impact speed (3 velocity tiers, round robin), cushion thuds, rolling-cloth loop by speed, pocket drop, then a "rattle" in the return tray
- [ ] Glossy balls from the env map, felt with AO, soft overhead lamp shadow, subtle bloom on the lamp
- [ ] Pocket cam and slow-mo on the 8-ball, a winner stamp, pot to winner
- [ ] Shot timer ring and turn-change swoosh. Foul = a gentle buzz plus "Ball in hand" stamp.

### Physics soccer (boost + jump, Eggy League / Rocket League)
- [ ] Kickoff 3-2-1-GO with players frozen, rising beeps and a crowd swell
- [ ] Boost: flame particles, FOV +5–10°, speed lines, boost loop sound whose pitch follows speed, boost pad pickup chime
- [ ] Jump: squash 0.8 on take-off, stretch in air, landing squash with a dust puff. Double jump or flip gets a whoosh.
- [ ] Ball hit: squash on the ball along the normal, 50–80 ms hit-stop on power shots, impact sound by velocity, trail when fast
- [ ] Crowd ambience rises when the ball nears goal. Near miss = "ooooh" (a genuine one).
- [ ] Goal: explosion knockback, trauma 1.0, a flash, a team-colored confetti burst, a goal horn plus stinger, slow-mo replay 3–4 s (skippable), then reset
- [ ] Last 10 s: red timer pulse, music intensity layer. Overtime stamp.

### Racer (if built)
- [ ] Engine sound as 2–3 RPM-layered loops crossfaded with pitch by speed. Tire screech by slip angle.
- [ ] FOV and camera distance scale with speed, speed lines, motion blur only at top speed
- [ ] Countdown lights, a boost-start window (perfect-start timing reward), instant restart (PolyTrack-style)
- [ ] Checkpoint chime with a split-time delta (green/red), a new-best stinger, a ghost car of the best lap
- [ ] Collision: sparks, shake scaled by impact, a crunch sound. No hit-stop (it breaks flow).

### Hub / lobby / casino layer
- [ ] Live attract background, one PLAY button, audio unlock on the first click
- [ ] Room link and QR code, 4-letter code, avatars pop in with a sound, ready-up, auto-countdown
- [ ] Practice sandbox while waiting. Spectate mode.
- [ ] Wager: physical chips, live potential payout, hold-to-commit, "LOCK" clunk
- [ ] VRF/settlement wait = a diegetic loop, with a 0.8–1.5 s minimum and honest status after ~8 s
- [ ] Staged reveal with escalating beats and truthful foreshadowing. Tap to skip.
- [ ] Payout tiers (loss / small / win / big / jackpot) with count-up and coin flight
- [ ] Results: stats, Rematch (vote count), Double-or-nothing, share card, Verify link
- [ ] Leaderboard with your rank ±2, animated changes. A bracket screen for tournaments.
- [ ] Cohesive palette and fonts. Gold only for money. No emoji icons. No spinners.
- [ ] CREDITS.md plus an in-game credits screen for all attributed assets. Sonniss raw files kept out of the public repo.

### "Does it feel like a real game?" 60-second judge test
- [ ] Every click and tap makes a sound and moves something
- [ ] Nothing is static on any screen (idle breathing, background motion)
- [ ] The first 10 seconds contain an impact moment with shake, particles and sound
- [ ] Win and lose each have a distinct, memorable moment, and rematch is one tap away
- [ ] It runs at 60 fps on a mid-range laptop and is playable on a phone
