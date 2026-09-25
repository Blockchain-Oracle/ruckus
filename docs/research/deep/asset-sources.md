# Asset sources per game (licences verified on original pages, 2026-09-25)

Policy: ADR-006. The product includes real-money wagering, so every licence must allow commercial use in gambling. We avoid NC, SA, GPL and anything ambiguous.

## Red flags
- **ElevenLabs.** Its Prohibited Use Policy §3(c) prohibits facilitating real-money gambling. Status is pending clarification; see `elevenlabs.md`.
- **Udio.** Downloads have been disabled since the UMG settlement on 30 Oct 2025.
- **Stock-music subscriptions:**
  - Epidemic Sound: games need the API Scale or Enterprise plan, and its "sensitive subjects" clause is ambiguous.
  - Artlist: games need an Enterprise agreement.
  - Uppbeat: no game coverage.
  - Pixabay Music: medium risk (an "immoral or illegal" catch-all, and Content ID).
- **Jestan's "Ultimate Weapons Pack".** Its licence file conflicts with the page, and it includes movie look-alike guns. Don't use it.
- **Luckiest Guy.** It is **Apache-2.0**, not OFL, so ship its licence text.

## Chickenz (pixel, 32×32 characters, 16×16 tiles)
- **Pixel Frog, Pixel Adventure 1:** https://pixelfrog-assets.itch.io/pixel-adventure-1
  - Name your own price (free).
  - Licence: *"Creative Commons Zero (CC0)… even for commercial purposes. Attribution is not required."*
  - Contents: 4 heroes (Ninja Frog, Mask Dude, Pink Man, Virtual Guy), exactly enough for 4-player FFA. Also terrain, 7 backgrounds, items and the "collected" pop.
  - "No generative AI was used."
- **Pixel Adventure 2:** https://pixelfrog-assets.itch.io/pixel-adventure-2 ($5+, CC0). 20 enemies, including a **Chicken**. These become extra skins.
- **Same artist, all CC0, name your own price:** Treasure Hunters, Kings and Pigs, Pirate Bomb. Useful for bigger maps and UI frames.
- **Kenney Pixel Platformer** (CC0) uses 18×18 tiles. Don't mix it in.
- **Guns:**
  - Recommended: **hand-draw the 5 guns in Aseprite** on the Pixel Adventure palette.
  - Fallback: Asgaard42 Pixel Weapons Pack (CC0). It has no pistol or sniper, and its style differs.
- **Effects:** ansimuz Explosion Animations Pack (CC0) and ansimuz Warped Shooting Fx (CC0; muzzle flashes, projectiles, impacts). Re-tint them to the palette.

## Pool (3D)
- **Table and cue: build them procedurally** (extruded rails, CSG pockets, a lathe for the cue). No verified CC0 table model exists.
- **Poly Haven (CC0):**
  - HDRI: **`billiard_hall`**, a real pool hall. Alternatives: `warm_bar`, `lythwood_lounge`.
  - Wood: `lacquered_cherry_wood`, `dark_wood`, `black_walnut_veneer_01–03`.
  - Leather: `brown_leather`, `leather_red_02/03`, `fabric_leather_01/02`.
- **Felt:** ambientCG Fabric034 (CC0, tinted green) or a procedural noise normal map.
- **Balls: a procedural canvas texture.**
  - Colours: 1 yellow, 2 blue, 3 red, 4 purple, 5 orange, 6 green, 7 maroon, 8 black. Balls 9–15 are white with a stripe in the same colours. The cue ball is white.
  - Size: 57 mm.
  - Texture: a 1024×512 equirectangular map with the number drawn twice, 180° apart. Use a clearcoat material.
- **Sound effects:**
  - Free: **papapleygames Pool And Billiards SFX** (29 WAVs, CC0) and Freesound CC0 clacks.
  - **Paid: Silverplatter Billiards** (CAD $34, 69 files at 96k/24-bit, royalty-free). Also Vadi Billiards ($18.85; read the EULA first).
  - Sonniss bundles with billiards recordings are unconfirmed.
  - Technique: vary gain, pitch (±3%) and low-pass by impact speed; rotate between 4–6 takes; limit a ball pair to one hit per ~15 ms.

## Soccer (2D egg-heads)
- **Draw characters in code** (SVG or canvas): procedural squash and stretch, eyes that track the ball, spring-driven accessories.
  - Rive's runtime is MIT, but exporting needs a paid plan ($9 per seat per month). Spine costs $69 or $379. Neither is needed.
- **Kenney Sports Pack** (CC0, top-down): use it for balls, goals and markings.
- **Sound:** Sonniss GDC stadium and crowd beds (royalty-free; no raw redistribution and no AI training), plus Freesound CC0 and Kenney Impact for kicks. Synthesize the goal horn.

## Runner (3D)
- **Characters and animation (all CC0):** Quaternius Universal Animation Library 1 & 2 (120+ and 130+ animations, including parkour) and Universal Base Characters, or KayKit Character Animations (161, including crouch and dodge).
- **City and track (all CC0):** Quaternius Downtown City MegaKit, KayKit City Builder Bits, Kenney City Kit Roads.
- **Coins:** procedural (a lathe with an emissive rim).

## Hub and casino
- **Sound:** Kenney **Casino Audio** (50 files: chips, cards, dice; CC0) and Kenney Music Jingles (85; CC0).
- **Icons:** **Phosphor (MIT)**, chosen for its six weights. Lucide (ISC) would also work.
- **Fonts (Google Fonts):** Lilita One, Bungee, Titan One, Silkscreen, Press Start 2P (all OFL); Luckiest Guy (Apache-2.0).
- **Confetti:** GPU instanced quads rather than sprites.

## Music
- **Safest:** CC0 loops, such as SubspaceAudio "5 Chiptunes (Action)" and its roughly 400-loop collection on OpenGameArt, and Kenney Jingles.
- **Suno Pro/Premier:** the ToS assigns output ownership to paid subscribers, and it doesn't mention gambling. Some legal risk remains from the label lawsuits. Monthly download caps apply.
- **Commissioned composer (work-for-hire):** the best quality and uniqueness.
- **ElevenLabs Music:** pending clarification. Also, Starter excludes "Studio Games".

## Web delivery
- **Audio:**
  - Opus in WebM first. Chrome and Firefox fully support it; Safari 17.4/17.5+ on macOS 15.4+, and iOS Safari 18.4+.
  - AAC `.m4a` fallback for iOS 17.3 and earlier.
  - No MP3 for loops.
- **Sprite atlases:** `@assetpack/core` (MIT, v1.7.0) with NearestFilter and 1–2 px extrude. free-tex-packer-cli is stale (last updated 2023). TexturePacker is paid.
- **glTF:** gltf-transform CLI v4.5.0 (MIT): `optimize --compress meshopt --texture-compress ktx2`. **It needs KTX-Software `toktx`** (v4.4.2). In three.js, use `MeshoptDecoder` and `KTX2Loader`.
- **Fonts:** `pyftsubset` from fonttools 4.66 (`--flavor=woff2`) or glyphhanger 6.
- **Git LFS on Vercel:** supported. Toggle it in Project Settings → Git, then redeploy. Transfers count against GitHub LFS bandwidth.
