# Hub UI sound prompts (ElevenLabs `eleven_text_to_sound_v2`, prompt_influence 0.6–0.7)

| File | Duration | Prompt |
|---|---|---|
| click_a.mp3 | 0.5 s | Loud crisp arcade button click, hard plastic snap, single close-miked tap, dry (first take was silent, regenerated) |
| click_b.mp3 | 0.5 s | Short satisfying chunky plastic arcade button click, clean transient, dry, single |
| confirm.mp3 | 0.8 s | Bright playful three-note rising UI confirm chime, marimba and plastic click, cheerful, dry, short |
| back.mp3 | 0.5 s | Soft low wooden UI click, cancel or back button, muted, dry, short |
| coin.mp3 | 0.6 s | Single gold coin clink, bright metallic ting, casino chip coin, short, dry |
| whoosh.mp3 | 1.0 s | Soft airy camera swoosh transition, smooth, short, cinematic but gentle |

Build: `pnpm -F @arena/assets-pipeline audio:hub` (trim, -20 LUFS, TP -1 dBTP, Opus/WebM + AAC/M4A).
