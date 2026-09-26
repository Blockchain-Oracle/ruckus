# RUCKUS demo video: plan and shoot brief

Status: plan (2026-09-26). The owner films the people and I (Claude) do the rest: capture, cut, graphics, sound.

## Why this video exists (and what it isn't)
- **The jam doesn't need it.** The form on jam.chain.wtf has no video field: the URL is the entry and judges play it. A video link can still go in **Pitch / info**, the README and X posts that tag @chaindotwtf.
- **Order of work:** submit first (closes **Sun Sep 27, 23:59 UTC**), video second. Nothing in this plan blocks submission.
- **Its job** is marketing: show friends losing their minds over four games, then 20 s of "here's the product". The judging criteria are the checklist the edit should hit:
  - Novelty
  - Fun (does it hold up for hours? → rematches, ranks)
  - Simplicity (no manual needed: one-line how-tos)
  - Visual & sound (no slop: real game audio, real faces)

## Deliverables
| Cut | Spec | Where |
|---|---|---|
| **Master** | 16:9, 1920×1080 at 60 fps, **~2:00** (hard cap 3:00), captions burned in | YouTube (unlisted is fine), README, pitch field |
| X cut | 16:9, 45–60 s (X standard accounts max out at 140 s) | X launch post |
| 9:16 cutdowns | 1080×1920, 15–30 s: one per game plus one sizzle. Face on top, game below, captions clear of the bottom 20% | TikTok, Reels, Shorts |

## Master structure (~2:00)
| Time | Beat | Content |
|---|---|---|
| 0:00–0:04 | **Cold open** | The loudest real reaction, no logo: a Chickenz last-second kill plus a friend screaming. Viewers decide in 1.6–3 s. |
| 0:04–0:10 | Sting | RUCKUS logo hit on the beat drop. One line: "Four party games. Your friends. One arena." |
| 0:10–1:15 | **Four games, ~16 s each** | Each block: title card (0.5 s) → one-line how-to overlay ("tap to jump, drag to aim") → best highlight → cut to the face reacting. Order: Chickenz → Egg Soccer → 8-Ball → Neon Dash. |
| 1:15–1:40 | **You, talking** | 2–3 short inserts, 20–25 s total, with B-roll over half of them: free play earns points and rank; "beat my run" links; watch friends live; tournaments (only if S27 has shipped by then; don't promise what isn't there). |
| 1:40–1:52 | Wager | One clean loop in DEMO mode: bet → VRF reveal → payout (the 9.6× hit if possible). Overlay text: "Every wager settled by on-chain VRF. 96% RTP." |
| 1:52–2:00 | Montage + end card | 6–8 one-second reaction cuts, then the URL and "Play free: ruckus-nine.vercel.app". |

**Edit rules** (from Derek Lieu, Devpost and presskit.gg):
- Cut every 1–3 s in hype sections; hold 4–6 s only on how-tos and the VRF reveal.
- Cut on music beats. Never repeat a shot.
- Keep the game's own SFX in. The logo appears only at the sting and the end card. No feature-list slides, no architecture diagram.

## Filming day: your part
### Before
- [ ] **Install OBS** (free). Set it to 1080p60, CQP ≈ 18, MKV (remux to MP4 afterwards; MKV survives crashes).
  - Separate audio tracks: 1 game, 2 your mic, 3 room mic, 4 Discord (if anyone is remote).
- [ ] Make the game run on the big screen at 60 fps, with **in-game music off** (I add music in the edit; SFX stay on).
- [ ] Get a one-page appearance release signed by each friend (face, voice, name, worldwide promo use, unpaid). **Adults only**, because the video shows wagers.
- [ ] Set the stakes so the hype is real: a bracket (loser buys food) or a small prize. Mix skill levels.

### Cameras (couch setup)
- **Cam A, wide:** a locked-off phone on a tripod at chest height, slightly to one side, framing the whole couch. The TV can be out of shot; OBS has the game.
- **Cam B/C, faces:** one phone per 1–2 people at about 45°, landscape, 4K30 or 1080p60, with a lamp or window light on faces.
- **Audio:** OBS mic plus the phones' own audio is enough. A lav on the loudest friend is a bonus.
- **If anyone is remote:** Discord plus the **Craig bot** (a separate audio track per speaker), with each friend recording their own webcam locally.

### During
- [ ] Start **every** device recording, then **clap three times** in view of all cameras. Repeat after any restart.
- [ ] Play long, 1.5–2 h. The best reactions come after about 30 min, once people forget the cameras. Never script lines.
- [ ] When something great happens, someone shouts **"CLIP!"**. I search the transcript for that word.
- [ ] Play every game. Chickenz 4-player is the headliner, so give it the most time.
- [ ] Do one DEMO-credits wager round per game, so there's a real reaction to a payout.

### Your talking head (separate, 15 min)
- Camera slightly above eye level, soft light in front, a monitor showing the game behind you, lav or close mic.
- Read one short line, look up, say it. Do 3 takes per line. I'll write the lines. Draft:
  1. "This is RUCKUS: GamePigeon for the web, four games you play with your friends, in a browser."
  2. "Playing is free. You earn points, climb the ranks, and send friends a link to beat your run."
  3. "And if you want stakes, every wager is settled by on-chain randomness. Provably fair, 96% back."

### Hand-off
Put everything in one folder: `~/ruckus-shoot/<date>/{obs,camA,camB,camC,talking-head,discord}`, copied off the phones with **originals, not WhatsApp copies**. Then tell me.

## Post: my part
| Step | Tool | Notes |
|---|---|---|
| 1. Ingest + sync | ffmpeg | Remux, find the clap in each file by its audio spike, and line every file up on one timeline. |
| 2. **Find the fun** | ffmpeg `ebur128` + `whisper-cli` (both installed) | Loudness spikes above a rolling baseline, plus transcript hits ("CLIP", "no way", screams and laughs), give about 40 ranked 3–8 s candidates with thumbnails. You veto or approve from a contact sheet. |
| 3. Clean B-roll | Real-GPU Chrome capture at 60 fps using the game's spectator/watch mode and `?capture` framing | Playwright's `recordVideo` (used for the landing loops) is too soft and choppy for this. |
| 4. Music + SFX | ElevenLabs (`music`, `sound-effects`) | One ~2 min track with a drop at the sting, plus whooshes and hits under title cards. Goes in `docs/CREDITS.md`. |
| 5. Graphics | **HyperFrames** (skills installed; Apache-2.0, free) | Logo sting, 4 game title cards, how-to lower-thirds, facecam PiP frames, VRF reveal callout, end card. Uses brand colours from the hub. |
| 6. Assembly + captions | **HyperFrames** (pre-trimmed clips keep renders to minutes) + whisper captions | Output master, X cut and 9:16 cutdowns from one composition. Loudness at −14 LUFS for YouTube and X. |
| 7. Escape hatch | DaVinci Resolve Free (or the CapCut you already have) | If you want to hand-tweak timing, I also export the cut as an editable timeline. |

**Why not Remotion or paid tools:**
- **Remotion** does the same job as HyperFrames and is also free for us, but the HyperFrames skills are already set up here, so it adds nothing.
- **Descript** ($24/mo; connected here) is worth one month only if the talking head takes many retakes.
- Screen Studio and paid editors aren't needed.

## Risks
- **Weak reactions** → raise the stakes (the bracket) and play longer. The cold open needs just **one** great scream.
- **Phones dropping to 30 fps or auto-exposing** → lock exposure and focus (long-press on iPhone), and keep phones plugged in.
- **Promising unshipped features** → the talking head names only what's live on the day of the edit.
