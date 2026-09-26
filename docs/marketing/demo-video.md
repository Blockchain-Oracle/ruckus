# RUCKUS demo video: the pitch

Status: plan (2026-09-26). **This video is the pitch.** It shows friends playing RUCKUS, then the owner tells people what it is and sends them to play it. The owner films the people and I (Claude) do the rest: capture, cut, graphics, sound.

It goes in the jam form's **Pitch / info** field, the README, and X posts that tag @chaindotwtf. Target **~2:30**, never more than 3:00.

## The model: the Chickenz winning video
[Chickenz, "Real Time Platformer with ZK Compute"](https://youtu.be/z55wQKFHVMM) runs 2:20 in three acts:

| Time | Act | What happens |
|---|---|---|
| 0:00–0:43 | **Play** | No intro, no logo. Friends mid-match: "I'm too unc for this game", "What a shot!", "Oh, headshot!", laughter. It ends on "**I love this game, dude. I can play this all day.**" |
| 0:43–1:40 | **Pitch** | To camera: what it is ("competitive, funny, fast-paced"), why it's different, and how the tech works (ZK proofs). |
| 1:40–2:18 | **Call to action** | "Give it a go, message me for PvP", then several steps of setup (Pinata, RPC, keys). |

**We keep its shape. We change two things:**
1. **Four games, not one.** Act 1 becomes a tour of four games.
2. **Our tech line is VRF, in one breath.** No proof pipeline, no RPCs. And our strongest contrast is Chickenz's weakest part: they needed tokens, keys and setup; **RUCKUS opens from a link.** "Go try it now" means one click.

## Structure (~2:30)
| Time | Act | Content |
|---|---|---|
| 0:00–1:10 | **1. Game night** | Real reactions only, organised by game (~15 s each): Chickenz → Egg Soccer → 8-Ball → Neon Dash, then back to Chickenz for the finale. A small name tag in the corner for each game, nothing else. **End on a real "I could play this all day" line from a friend.** Don't script it: ask afterwards "what did you think?" and use the honest answer. |
| 1:10–2:15 | **2. Your pitch** | You to camera, with game footage over about half of it (script below). |
| 2:15–2:30 | **3. Try it now** | You say the URL; the end card shows it big, then 3–4 one-second reaction cuts. |

**Edit rules** (from Derek Lieu, Devpost and presskit.gg):
- Act 1: cut every 1–3 s, always from the play to the face reacting to it.
- Keep the game's own sound effects in; music goes under Acts 2–3.
- No feature-list slides, no architecture diagram. The logo appears only on the end card.

## Script: your pitch (Act 2 + 3)
Plain spoken lines, about 150 words, ~65 s at a relaxed pace. Say them in your own words; the facts are the part to keep. `[B-roll]` means game footage plays over your voice.

> **1.** This is RUCKUS. Four party games, one arena, right in your browser.
>
> **2.** `[B-roll: each game, 2 s]` A four-player chicken shootout. Eight-ball pool. Head soccer, with eggs. And a neon runner where you race your friends' ghosts.
>
> **3.** No download, no wallet, no setup. You send your friends a link, and they're in. No friends online? Play the bots. Or just watch.
>
> **4.** `[B-roll: Neon Dash result card + "Beat NAME" link]` Playing is free. Set a time in Neon Dash and send a "beat my run" link. The replay proves the time.
> *(Only if S27 ships before filming:* You earn points, climb the leaderboard, and there's a new tournament every day.*)*
>
> **5.** Now, the bit that makes it a Chain game. Every game has a moment you can call: back a chicken to win the fight, call your pool shot, call how the golden goal ends, call the wipeout.
>
> **6.** `[B-roll: bet → VRF reveal → payout]` You place the bet, and Chain's VRF, verifiable on-chain randomness, settles it. Not us, not the server, not a random number in your browser. Every bet type pays back 96%, and anyone can check it.
>
> **7.** *(to camera)* Go try it now at **ruckus-nine.vercel.app**. Bring your friends. Tell me who won.

**Don't say** "leaderboard", "ranks", "points" or "tournament" unless S27 is live on the day of the edit. The landing copy was pulled back for the same reason.

**Recording it:** camera slightly above eye level, soft light in front, the game running on a monitor behind you, a mic close to you. One line at a time: read it, look up, say it, 3 takes each. Retakes are free; the edit uses the best of each.

## Game night run-sheet (how to organise yourselves)
About 2 hours with 4 people. Keep a **scoreboard on paper** across all four games (1st = 3 pts, 2nd = 2, 3rd = 1). The loser buys food. That gives a stake without the tournament feature, and every game matters.

| # | Block | Time | Why this order | Shots to get |
|---|---|---|---|---|
| 1 | **Neon Dash** warm-up: everyone races the same course, then trades "beat my run" links | 20 min | Easy to learn; people forget the cameras. | Photo finishes, "beat THAT", a wipeout on the last barrier |
| 2 | **8-Ball**, winner stays on; the others watch and heckle | 25 min | Slow shots, so the build-up to each one gives room to talk. | Heckling from the couch, a long pot, a scratch on the 8 |
| 3 | **Egg Soccer**, 1v1 king of the hill | 25 min | Short, chaotic rounds. | Headers, own goals, golden-goal screams |
| 4 | **Chickenz**, 4-player free-for-all | 40 min | The headliner and loudest game; play it last, when everyone is warmed up. | Last-second kills, "he's on one life!", pile-ups |
| 5 | **Call it** round: each person calls one DEMO-credit wager, and everyone watches the reveal together | 10 min | Real reactions to a payout for Act 2's B-roll. | The whole room at the reveal, the 9.6× hit |
| 6 | "What did you think?" (don't lead them) | 5 min | This is where the closing line of Act 1 comes from. | Honest one-liners |

Shout **"CLIP!"** whenever something great happens; I search the transcript for it.

## Filming day: your part
### Before
- [ ] **Install OBS** (free). Set it to 1080p60, CQP ≈ 18, MKV (remux to MP4 afterwards; MKV survives crashes).
  - Separate audio tracks: 1 game, 2 your mic, 3 room mic, 4 Discord (if anyone is remote).
- [ ] Make the game run on the big screen at 60 fps, with **in-game music off** (I add music in the edit; SFX stay on).
- [ ] Get a one-page appearance release signed by each friend (face, voice, name, worldwide promo use, unpaid). **Adults only**, because the video shows wagers.
- [ ] Print or copy the run-sheet above; the scoreboard is the stakes.

### Cameras (couch setup)
- **Cam A, wide:** a locked-off phone on a tripod at chest height, slightly to one side, framing the whole couch. The TV can be out of shot; OBS has the game.
- **Cam B/C, faces:** one phone per 1–2 people at about 45°, landscape, 4K30 or 1080p60, with a lamp or window light on faces.
- **Audio:** OBS mic plus the phones' own audio is enough. A lav on the loudest friend is a bonus.
- **If anyone is remote:** Discord plus the **Craig bot** (a separate audio track per speaker), with each friend recording their own webcam locally.

### During
- [ ] Start **every** device recording, then **clap three times** in view of all cameras. Repeat after any restart.
- [ ] Follow the run-sheet. Never script friends' lines.

### Hand-off
Put everything in one folder: `~/ruckus-shoot/<date>/{obs,camA,camB,camC,talking-head,discord}`, copied off the phones with **originals, not WhatsApp copies**. Then tell me.

## Deliverables
| Cut | Spec | Where |
|---|---|---|
| **Master** | 16:9, 1920×1080 at 60 fps, ~2:30, captions burned in | YouTube, jam Pitch / info, README |
| X cut | 16:9, ≤140 s (X standard accounts max out at 140 s): Act 1 trimmed to ~40 s + the full pitch | X launch post |
| 9:16 cutdowns | 1080×1920, 15–30 s: one per game plus one sizzle. Face on top, game below, captions clear of the bottom 20% | TikTok, Reels, Shorts |

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
- **Promising unshipped features** → the pitch names only what's live on the day of the edit (see the script note).
