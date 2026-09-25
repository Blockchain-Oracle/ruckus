# S04: Identity and onboarding

**Goal:** zero friction from the first visit. The player is dropped straight into a hands-on tutorial, gets a guest name, and reaches the lobby. They can sign in later to keep their points.

**Read first:**
- `docs/requirements.md` (onboarding)
- `docs/research/deep/chickenz.md` §1 flow and `references/chickenz/apps/client/src/tutorial/Tutorial.ts`
- `references/chickenz/apps/client/src/main.ts:320-360`
- `references/chickenz/apps/client/src/ui/AnimalNameGenerator.ts`
- `tech-stack.md` §6
- context7: Convex Auth (anonymous, OAuth or email, account linking)

## Tasks
1. [ ] **Guest identity:** Convex anonymous user created on the first load (storage wrapped in try/catch with an in-memory fallback). Guest name generator (`Fox4821` style), editable.
2. [ ] **First-visit flow:**
   - The lobby renders dimmed behind a "LOOKS LIKE YOU'RE NEW HERE" modal with [PLAY TUTORIAL] and [SKIP].
   - Then the username prompt with "LET'S GO!".
   - Build both with 21st.dev components in the brand style.
3. [ ] **Tutorial step engine** in `features/onboarding/tutorial/`:
   - Step definitions: prompt text, completion condition (a predicate over sim state or inputs), optional highlight, success sound.
   - A prompt box at the top centre, runs on the local sim with no network, can be skipped, and is re-playable from the lobby menu.
   - Each game supplies its own steps later.
4. [ ] **Settings:** audio volumes per bus, controls (keyboard, touch, gamepad hints only if the API is available), reduced motion, forceWebGL, language.
5. [ ] **Claim codes:** generate a short code or QR in the iframe context. Redeeming it on the standalone site merges the guest's progress (a Convex mutation, rate-limited).
6. [ ] **"Sign in later to keep points":** Convex Auth OAuth (Google/GitHub) or an email magic link, **standalone only** (the iframe blocks popups), linking the anonymous account.

## Acceptance
- A first-time visitor gets modal → tutorial → name → lobby, and a returning visitor skips straight to the lobby.
- Inside the prod-frame iframe, no popup is ever attempted, and a claim code transfers progress to the standalone site.

## Exit checklist
ROADMAP · HANDOFF · LOG · commits
