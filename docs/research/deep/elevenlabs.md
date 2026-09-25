# ElevenLabs: policy, local skills, CLI, credits (researched 2026-09-25)

## Policy verdict
This section quotes the pages below:
- Prohibited Use Policy, 17 Aug 2026: https://elevenlabs.io/use-policy
- Terms of Service, 31 Mar 2026: https://elevenlabs.io/terms-of-use
- Sound Effects Terms: https://elevenlabs.io/sound-effects-terms
- Music Terms, 26 May 2026: https://elevenlabs.io/music-terms
- Eleven Music Model-Specific Terms: https://elevenlabs.io/eleven-music-model-specific-terms

**The Prohibited Use Policy**
- **It covers outputs.** It "applies to your access and use of our Services, including any Inputs you provide and Outputs you create… within and outside our Website… directly or indirectly."
- **§3 heading:** "Do not use the Services to facilitate activities that may significantly affect the wellbeing of others."
- **§3(c):** "Facilitate real-money gambling activities or pay day lending."
- **Approval exists only for §3(a),** which covers regulated drugs and controlled goods. §3(c) has no "unless approved" wording.
- **Enforcement** is at "ElevenLabs' sole discretion". They may remove material and suspend access.
- **§9(c):** Sound Effects output can't be sold or distributed "on a standalone basis". Sounds built into a game are fine.

**The Terms of Service**
- **§1:** paid plans allow commercial use, but "any Output must still comply with the Prohibited Use Policy."
- **§4(a):** downloaded output is "always subject to these Terms and our Prohibited Use Policy."
- **§4(c):** you retain all rights in your Output.
- **§5(b):** unauthorized use "will terminate the license".

**Music terms**
- **Banned sectors:** firearms, tobacco, pharmaceuticals, adult content, religious organisations and political campaigns. Gambling isn't on that list, but the Prohibited Use Policy still applies.
- **The Starter plan** is "For Individual Use Only":
  - 17 minutes generated and 30 minutes downloaded per month.
  - No release on streaming services.
  - All commercial use is allowed **except "film, TV, radio, & Studio Games"**. Studio Games are monetised games available on more than one platform, and they need Enterprise Music.

**Pointing the other way:** ElevenLabs' own marketing pages https://elevenlabs.io/sound-effects/casino and https://elevenlabs.io/sound-effects/slot-machine say the sounds are royalty-free and can be used in commercial projects, while deferring to the terms.

**Conclusion**
- **Don't ship ElevenLabs output in this product without written permission, and don't reword prompts to get around the policy.**
- The request draft is in `docs/assets/elevenlabs-request.md`.
- Contacts:
  - team@elevenlabs.io
  - https://help.elevenlabs.io/hc/en-us/requests/new
  - The approval form: `?ticket_form_id=13145996177937`
  - Sales: https://elevenlabs.io/contact-sales

## Account (checked with read-only API calls)
- Tier **starter**, status active.
- Credit limit **39,855**, 0 used. Resets on **2026-10-25**.
- `ELEVENLABS_API_KEY` is set in the shell.

## Credit costs
| Use | Cost |
|---|---|
| Sound effects, auto duration | 200 credits each |
| Sound effects, set duration | 40 credits per second (pricing tooltip says max 22 s; the skill says 30 s) |
| Music | 900 credits per minute (Starter also caps generation at 17 min/month) |
| Text to speech | about 1 credit per character |

**A sensible split, if approved:** 17 minutes of music (15,300 credits) plus about 300 two-second sound effects (24,000 credits).

## Local skills (`/Users/abu/.claude/skills/`)
| Skill | Endpoint | Models / key parameters |
|---|---|---|
| sound-effects | `POST /v1/sound-generation` | `eleven_text_to_sound_v2`; `duration_seconds` 0.5–30; `prompt_influence` (default 0.3); `loop` (v2); output default `mp3_44100_128`, plus pcm and opus |
| music | `POST /v1/music` (+ `/stream`, `/detailed`, `/plan`, `/video-to-music`, `/finetunes`) | `music_v2` recommended; 3 s–10 min; `force_instrumental`; composition plans of up to 30 sections; `mp3_48000_192`; no artist names |
| text-to-speech | `/v1/text-to-speech/{voice}` | eleven_v3, multilingual_v2, flash_v2_5, turbo_v2_5 |
| speech-to-text | `/v1/speech-to-text` | scribe_v2 (+ realtime) |
| speech-engine | real-time voice over WebSocket/WebRTC | flash_v2_5 |
| voice-changer | `/v1/speech-to-speech/{voice}` | multilingual_sts_v2 |
| voice-isolator | `/v1/audio-isolation` | — |
| agents | `/v1/convai/*` + CLI | — |
| setup-api-key | `GET /v1/user` | — |

All of them use `ELEVENLABS_API_KEY` with the Python SDK (`elevenlabs`) or the JS SDK (`@elevenlabs/elevenlabs-js`).

## CLI and SDKs
**Nothing is installed locally.**

| Package | Version | Notes |
|---|---|---|
| `@elevenlabs/cli` | **1.4.0** (released 2026-09-25) | Binary `elevenlabs`. It exposes every endpoint: `text-to-sound-effects convert`, `music compose`, `music compose-detailed`, `music separate-stems`, `music composition-plan create`, `say`, agents. |
| JS SDK `@elevenlabs/elevenlabs-js` | 2.69.0 | The old `elevenlabs` npm package is deprecated. |
| Python SDK `elevenlabs` | 2.69.0 | — |

**Install only if ElevenLabs approves the use case:**
- CLI: `npm i -g @elevenlabs/cli`, or `npx @elevenlabs/cli <cmd>`, or `brew install elevenlabs/tap/elevenlabs`.
- Python: create a venv, because Homebrew Python refuses global pip installs: `python3 -m venv .venv && .venv/bin/pip install -U elevenlabs`.
