# 04 — Social / party / messaging mini-game mechanics → on-chain "vs the house" casino game

Research date: 2026-09-25. Goal: find a mechanic that is fun in social/party/indie games, survives being played against a VRF-driven dealer with a fixed paytable (93–98% RTP), still reads as a casino game, and is not a classic table game or a crypto-original clone. It also has to avoid what the 76 existing Chain Jam entries already do.

---

## 0. TL;DR

- **The jam is saturated with two families.** One is "cash-out ladders" (push-your-luck multiplier climbs, about 25 entries). The other is "pick a risk tier, one VRF word, instant reveal" (about 20 entries). Next come "back a simulated contestant" (about 12) and "paint your own odds / any choice is 96%" (about 8).
- **Almost nobody built a duel against a dealer with a personality.** Nothing like Buckshot Roulette exists in the jam: turn-based, shared public information, items. There is also no bluff-calling against the house (Liar's Bar / Liar's Dice), no "build your machine" game (Luck be a Landlord / Balatro / CloverPit), no card-shedding race, and no pack-rip or RNG-aura collection reveal. The one bluff entry (Mind Bluff ML) is an ML-biometrics gimmick, not a bluff game.
- **Hidden information can be done on-chain with lazy sampling.** On-chain VRF words are public, so a pre-shuffled hidden deck leaks. The fix is to draw each hidden item only at the moment it is revealed, from the remaining multiset or from a Bayesian posterior. This is equivalent in distribution and needs no secret state. Games like Buckshot and Liar's Dice become buildable this way.
- **Player agency is fine as long as payouts are priced at optimal play.** Fix the dealer's policy (deterministic, or VRF-randomised), solve the game by backward induction, and scale payouts so that optimal play returns about 97%. Mistakes lower a player's RTP, the same as in blackjack. Keep the state space small enough (under about 10^5 states) to solve exactly and to publish the solver.
- **Ranked pick:** #1 **"LOADED"**, a Buckshot-style shotgun duel against the Dealer. #2 **"LIAR'S TABLE"**, calling the Dealer's bluff with a revolver penalty. #3 **"LANDLORD REELS"**, where you draft your own reel strip and every draft is 96%. Full ranking in §4.

---

## 1. Catalogue: games and their core fun hook

### 1a. iMessage GamePigeon (24 games)
Full list: 8-Ball, 9-Ball, Mini Golf, Basketball, Cup Pong, Archery, Darts, Tanks, Sea Battle, Anagrams, Word Hunt, Word Bites, Mancala, Knockout, Shuffleboard, Chess, Checkers, Four in a Row, Gomoku, Reversi, 20 Questions, Dots and Boxes, Filler, Crazy 8.
Most popular (media, tier lists, word of mouth): **8-Ball** (the brand's synonym), **Cup Pong**, **Word Hunt**, then Mini Golf, Anagrams, Sea Battle, Darts, Knockout.

| Game | Core fun hook |
|---|---|
| 8-Ball | Called shots and a skill flex. The opponent watches your turn replay asynchronously, which gives a "did you see that" moment. |
| Cup Pong | Flick physics. "Balls back" (hit both and throw again) is a streak reward. Cups vanishing is visible progress. |
| Word Hunt | A 90-second 4×4 grid. The score reveal compares you with a friend, and big words feel great to find. |
| Anagrams / Word Bites | A fixed letter set and a race to exhaust it. |
| Knockout | Sumo-style penguins. Everyone launches at once, so collisions are chaotic and unpredictable. |
| Tanks | Artillery with wind. You adjust shot to shot and learn the environment. |
| Sea Battle | Hidden fleets. Hunting for a hit, then chasing along it once found. |
| Filler | A territory flood. You pick a colour and swallow the neighbouring cells, like Land-io in miniature. |
| Mancala | Sowing seeds creates chain moves (landing in your own store gives another turn) and captures. |
| Darts / Archery | Aim plus a wobble or wind handicap. Rings map directly to points. |
| 20 Questions | Deduction and the social back-and-forth. |

What makes it work socially: games are **asynchronous and turn-based inside a chat**, so each turn is a message. Sessions are short, the rules are already known, and there is a visible opponent. Every turn is a small event.

### 1b. Discord Activities
Poker Night (Texas hold 'em, 18+), Chess in the Park, Checkers in the Park, **Putt Party** (mini golf with power-ups that sabotage others), **Land-io** (territory claiming), **Bobble League** (turn-based physics football with simultaneous move plans), Blazing 8s (Crazy Eights with skip/reverse/hand-swap), Letter League (Scrabble), Sketch Heads (Pictionary), **Know What I Meme** (caption contest plus vote), Gartic Phone (drawing telephone; discontinued on Discord 30 Jun 2025), SpellCast (Boggle-like), Whiteboard, Watch Together.

| Game | Core fun hook |
|---|---|
| Putt Party | Power-ups that ruin a friend's shot. The drama comes from reversals, not skill. |
| Bobble League | **Simultaneous hidden planning, then a physics resolve.** You plan, and everything plays out at once. |
| Land-io | Greedy expansion against the risk of being cut off (a snake/territory tension). |
| Blazing 8s | Take-that cards (swap hands, reverse). Last-card tension. |
| Know What I Meme / Quiplash | Humour as the scoring function. Voting is the reveal. |
| Sketch Heads / Gartic | Bad drawings are funny, and the chain mutates. |
| Poker Night | Chips, bluffing, and table talk. |

### 1c. Jackbox
Quiplash (the most-played and highest ranked), Fibbage (write a convincing lie and spot the truth), Drawful, Trivia Murder Party (a trivia quiz whose losers play death minigames such as the "killing floor"), Tee K.O., Push the Button (social deduction), Survive the Internet.

Hook: **your phone is the controller**, there is zero install, and humour comes from the players. Two mechanics transfer. **Fibbage** is spotting the real answer among plausible fakes, a bluff-detection game. **Trivia Murder Party** turns failure into a spectacle, like a dramatic loss animation.

### 1d. Telegram / Farcaster / Base mini-apps (2024–2026)
- **Telegram:** Notcoin, Hamster Kombat, TapSwap, Yescoin (swipe), Blum, and Catizen (a cat merge game: 36M players and 7M DAU at its peak). By 2026 the tap-to-earn peak has passed, and the durable survivors are merge/idle games with real loops. Hooks: **tap to watch a number go up**, referral leagues, and airdrop anticipation.
- **Farcaster / Base mini-apps:** Farcade (Geo Crush, Minesweeper, Tower Blocks), FarGuesser (a GeoGuessr clone), Clankermon (Pokémon-like), FlappyCaster, and "Arrows" (mint until you roll the signature green arrow to win an ETH pot). Hooks: **feed-native, one-tap, share the result as a cast**, and an on-chain collectible as the trophy.

### 1e. Viral browser, Roblox and web (2025–2026)
- Browser: Poki reports about 100M MAU. The evergreen .io titles (Diep, Krunker, Skribbl, Shell Shockers) keep going, but there was no Wordle-scale breakout in 2026.
- **Roblox 2025 was the real viral surface.** Grow a Garden set a record of about 21.6M concurrent players, and Steal a Brainrot beat it at about 25M in Sep 2025. Both run on luck-driven collection loops: random mutations and weather events in Grow a Garden, rarity-tiered brainrot creatures and stealing in Steal a Brainrot.
- **Sol's RNG** (Roblox, about 1.8B visits and 40–100K CCU) is the purest example. The whole game is pressing ROLL to get an "aura" with a rarity of "1 in X", from 1 in 2 up to 1 in 3,000,000,000, with rarity-scaled cutscenes. Luck potions and gear boost the odds. **This is gambling UX with no money involved, and kids love it.** The fun is the displayed "1 in N" number and the escalating reveal cinematic.
- **Pokémon TCG Pocket pack opening**: slots 1–3 are guaranteed commons and slots 4–5 are where rares appear. Rares get tilt effects, "immersive" cards play an animation, and **offering rates are shown before opening**. The hook is sequential reveal with escalation saved for the end.

### 1f. Gambling-adjacent indie hits (the most relevant group)

| Game | Numbers | Core fun hook | Why it matters here |
|---|---|---|---|
| **Buckshot Roulette** (Mike Klubnika, 2023/24) | 4M+ copies by Dec 2024 | A shotgun loaded with a known count of live and blank shells in unknown order. Shoot yourself (a blank means you keep the turn) or shoot the Dealer. Items include a magnifier (peek), beer (eject a shell), handcuffs (skip the Dealer's turn), a saw (double damage) and cigarettes (heal). Tension comes from **enough information to estimate the odds, never enough to feel safe**. You have to track the remaining shells in your head. The Dealer is **imperfect but menacing**, so the game never becomes a solved puzzle. Oppressive diegetic presentation and heavy sound. | It is already a game against a dealer AI with probabilistic hidden state. It maps almost 1:1 onto a VRF casino game. |
| **Liar's Bar** (Curve Animation, Oct 2024) | Huge streamer hit | **Liar's Deck:** play cards face down claiming they are the "table card". Anyone can call "Liar!", and whoever is wrong pulls the trigger on a revolver whose odds of firing rise with each pull (1/6, then 1/5…). **Liar's Dice** is the classic claim-escalation game. Animal characters, table slams, shouting "LIAR". | It is a bluff game with an escalating-risk penalty device. Bluff calling against the house works if the house's hand is lazily sampled (§2). |
| **Balatro** (LocalThunk, 2024) | 5M+ sold (Jan 2025); Game Awards Best Indie/Debut/Mobile | A poker hand is the input to a **Chips × Mult** engine. Jokers stack multipliers. Numbers explode on screen. Hooks: synergy discovery, **score counting up as a slot-machine payoff**, CRT/juice presentation, "one more run". | Proves that casino fiction plus build-crafting sells. The hard part is RTP-bounding a build space, so it has to be heavily simplified. |
| **Luck be a Landlord** (TrampolineTales) | Inspired Balatro | You **own the reel strip**. Each spin you draft a symbol to add, and symbols interact by adjacency (a cat eats milk, and so on). Rent is due on a schedule. | "Build your own slot" works as a casino game if every draft option is priced to the same RTP. |
| **CloverPit** (Panik Arcade, Sep 2025) | 100K copies on day 1, **1M in about a month**, 92% positive | A slot machine in a rusty cell. Pay the ATM debt each round or fall into the pit. Charms modify the machine, with a Buckshot-style grim atmosphere. | Confirms that **Buckshot mood plus Balatro build-crafting plus slots** is a proven, current formula. |
| **Slots & Daggers** (2025) | Mobile port | A diegetic slot machine in a pub. Spins roll your weapons and abilities against monsters. | A slot as a combat randomiser: the reels decide the fight. |
| **Dungeons & Degenerate Gamblers** (2024) | — | Blackjack with deckbuilding. Cards can change the target to 20 and so on. You play against gamblers who have their own decks. | Rule-mutating cards. Too close to blackjack for us. |
| **Peglin** | — | Pachinko/Peggle as combat. The orb path is the damage roll. | Plinko-adjacent, which the brief excludes. |
| **Dicey Dungeons / Die in the Dungeon / Die for the Lich** | — | Roll dice, then **assign** them to equipment slots. Rolls are random, and the skill is in the allocation. | "Roll then allocate" is a decision layer that stays small enough to solve by DP. |
| **Ball x Pit** (Devolver, Oct 2025) | Standout of Oct 2025 | Breakout plus ball fusion, survivors-like. | Physics chaos is satisfying, but the loop is skill-based. |
| **Schedule I** casino (2025) | Massive Steam hit | Slots, Blackjack, and **Ride the Bus**: red/black, then higher/lower, then inside/outside, then suit, with each step double-or-nothing. Players called Ride the Bus "the most fun" because "it puts the ball in your court". | A drinking-game card ladder. It is fun, but it is a ladder (the overused family) and it resembles Hi-Lo. |
| **Inscryption** (card table vs a captor) | — | The dealer is a character. Diegetic table, with the opponent's hands and face in the dark. | "Opponent with a face" presentation. |

### 1g. Cross-cutting fun hooks (distilled)
1. **Opponent with a face.** The Buckshot Dealer, the Liar's Bar animals, Inscryption's Leshy. Losing to a character feels different from losing to an RNG.
2. **Estimable but uncertain odds** (Buckshot's shell count). The player feels clever doing the arithmetic.
3. **Escalating single-object danger** (the revolver chamber, the shotgun). One prop carries all the tension.
4. **Bluff and call.** "LIAR!" is the most shouted moment on stream in 2024–25.
5. **Build your own machine** (Landlord, Balatro, CloverPit). Ownership of the randomness.
6. **Count-up payoff juice** (Balatro chips × mult, Sol's RNG cutscenes, TCG Pocket's last-card reveal).
7. **Take-that reversal** (Putt Party power-ups, Blazing 8s hand swap).
8. **Simultaneous plan, then resolve** (Bobble League).
9. **Shareable artefact** (Farcaster casts, the claw-machine shelf, the "1 in 3B" aura screenshot).
10. **Asynchronous turns as messages** (GamePigeon).

---

## 2. "Vs the house" adaptability analysis

Constraints: the opponent is the contract (a VRF plus a fixed policy), the paytable is fixed, RTP is 93–98%, and **VRF words are public on-chain once fulfilled**.

### 2a. Two enabling techniques
1. **Lazy sampling for hidden information.** Never pre-commit a hidden shuffle, because it would be readable on-chain. At each reveal, draw the next item from the remaining multiset using a fresh VRF word (or the per-step word the SDK provides). For a shotgun with L live and B blank shells, P(next is live) = L/(L+B), and the result is exactly the same distribution as a pre-shuffled magazine. Peek items simply draw and commit the next shell early.
   For a **bluffing dealer**, the dealer's claim is a known stochastic function of its hand. When the player calls, sample the dealer's hand from the **posterior P(hand | claim)**. This is distribution-equivalent to a dealer who really had that hand and really chose that claim. It is feasible when the hand space is tiny (for example 2–5 dice, or 1–3 cards from a 4-type deck).
2. **Priced-at-optimal paytables.** Fix the dealer's policy, publish it as a lookup table or VRF-mixed strategy, solve the player's best response by backward induction, and set the payouts so that best play gives exactly the target RTP (for example 97%). Any other strategy gives at most 97%, which is house-safe. It is the same principle as the "basic strategy" RTP in blackjack. The solver can live in the repo and be quoted in the pitch ("every decision is solved; the contract can't lose EV").

   Single-transaction fallback: the player commits a *policy* up front ("shoot myself while live ≤ blanks, use the magnifier on shell 3…"). One VRF word then resolves it, and the client animates the result. This loses the per-turn tension, but builds on any instant-settle SDK.

### 2b. Mechanic survival table

| Mechanic | Survives vs a VRF house? | Notes |
|---|---|---|
| Buckshot duel (known count, unknown order, self vs dealer shots, items) | **Yes, strongly** | Lazy hypergeometric draws. The dealer policy is a small table. State = (lives, dealer lives, live, blank, items, turn), a few thousand states, solvable exactly. |
| Revolver escalating chamber | Yes, but alone it is a ladder | Use it as the *penalty device* inside another mechanic, not as the core. |
| Bluff calling (Liar's Deck/Dice vs dealer) | **Yes** (posterior sampling) | The house bluffs at a fixed published rate. The player's skill is reading the claim against the priced payouts. Solvable. |
| Player bluffing the house | Weak | The house has no information to be fooled by, since the player's hand is public on-chain. Only works as a "dare" where the dealer calls at a fixed rate, which is just a risk tier. |
| Build your reel strip / draft symbols (Landlord) | **Yes** | Price each draft so that every option gives the same RTP (a fixed-EV, volatility-only choice, as proven by FAIRGROUND/Gust in the jam). Adjacency synergies make each spin a small puzzle to watch. |
| Balatro chips × mult with free hand selection | Partial | The full combinatorial space is too big to bound RTP. It needs a reduced version: one hand, fixed small deck, precomputed optimal hold EV (like video-poker tables, and video poker is a classic). |
| Dice-roll allocation (Dicey Dungeons) | Yes | Small dice counts are DP-solvable. Close to Ember Forge & Quench (re-roll) in the jam, so the novelty is moderate. |
| Card-shedding race vs dealer (Crazy 8s / Blazing 8s) | Yes, but heavy | A long game with many decisions. Solvable only with small decks. It also takes a long time per bet. |
| Pack rip / gacha / aura roll | Yes, trivially | A single-draw paytable dressed up. The novelty is in presentation, since mechanically it is a pick tier or a slot. Loot boxes and cases already exist in crypto casinos. |
| Skill physics (Cup Pong, 8-Ball, Putt Party, Darts) | **No** as skill | Skill beats a fixed paytable (RTP above 100% for good players, and bots). Only survives as "choose shot difficulty, VRF resolves", which is the overused pick-a-risk family. |
| Word games (Word Hunt, Anagrams) | No as skill | A solver bot wins. Could survive as prop bets on the VRF grid ("≥ one 7-letter word?") but needs a dictionary oracle, too heavy for 2.5 days. |
| Humour/voting (Quiplash, KWIM) | No | Needs a human jury and a pool. Not a house game. |
| Territory (Land-io, Filler) | Weak | Deterministic after the deal, so it is solvable and becomes skill. VRF growth plus a single bet collapses into spectate-a-sim. |
| Simultaneous plan then resolve (Bobble League) | Yes | The player plans, the dealer's plan is VRF-drawn from a published mix, then both resolve. This is the rock-paper-scissors core (below). |
| RPS / mind games vs dealer with a "tell" | Yes | The dealer's throw comes from a VRF-weighted mix. A visible tell meter shows the mix, and the paytable is priced per throw. Very simple, but shallow. |
| Asynchronous turns as messages | Orthogonal | Presentation. A shareable "turn card" per bet. |

### 2c. Rule of thumb
Mechanics survive when the uncertainty lives in the **deal** (random, lazily sampled) and the player's agency is a **small, finite decision tree** you can solve. Mechanics fail when the agency is **dexterity, knowledge, or human judgement**.

---

## 3. Gaps: mechanic families in the 76 jam entries

### 3a. What is overused (approximate tagging; some entries fit several families)

| Family | Count | Entries |
|---|---|---|
| **Cash-out ladder / push-your-luck climb** | ~25 | Lazer (crash), Tumbler, Static, Ember, Grudge Lab, DEADEYE, Tap 64, W.ARENA, Genie's Vault, Varmin' Season, Tug, Neon Block Drop, fracture, Echo Dive, Meltdown, Roach Hunt, Crack the Dozen, House of Fortune, Capsules, Deadman Drift, Candle, The Survey, The Brokers, Assay, Counterweight |
| **Pick a risk tier, one VRF word, instant reveal** | ~20 | Arcana Fate (Mimic), Claw Machine, CLAW, Color Rush, FRACTURE (glass), Robo Strike, Laser Ricochet, Critical Mass, Orbital Collider, Gildfall, NEON BREACH, The Alchemist, SentinelDice, Tide Pot, Aureole, Scree Gleam, Keel Notch, Weir Chord, Midnight Run |
| **Back a simulated contestant / predict a spectacle** | ~12 | ChessChuck, Chain Arena, TILT!, Floe, Roll Call, Last Stand, VIGIL, Clatter, Replay, Soul Odds, Midnight Run, Cascade |
| **Paint your own odds / "every configuration is 96%"** | ~8 | FAIRGROUND, Gust, LEDGE, Crayon, Relay, Graft Garden, Grudge Lab, Dragon Brood |
| **Slots** | 3 | STARFORGE, Jitter Jackpot, Dragon Brood (match then crack) |
| **Semi-puzzle / routing** | ~5 | Platinum Chip, Battleship, Surge Routing, Fission, Deadline City |
| **Math-paper "optimal stopping / Pandora's box"** | 4 | Candle, The Survey, The Brokers, Replay (polished, but low plays) |
| Culture-specific | 1 | Hongbao (red envelope split) |
| Bluff | 1 | Mind Bluff ML (a cursor-biometrics gimmick, not a real bluff loop) |
| Re-roll / forge | 1 (×3 dupes) | Ember — Forge & Quench |

Signals in the play counts: the top entries are **tactile and instantly legible** (Lazer crash 234, Tumbler dial 196, Clatter, Gust, Claw Machine). Clever-maths entries (Survey, Brokers, Keel Notch) sit near the bottom. Juice and legibility beat maths elegance.

### 3b. Families absent (the opportunity space)
1. **Turn-based duel against a dealer character with shared odds** (Buckshot). **Absent.** W.ARENA and Chain Arena are spectated fights, not player turns against the dealer.
2. **Calling the house's bluff** (Liar's Bar / Liar's Dice / Fibbage "spot the lie"). **Absent** as a real mechanic.
3. **Build or draft your own machine** (Luck be a Landlord / CloverPit / Balatro). **Absent.** STARFORGE is a fixed slot. FAIRGROUND paints odds but has no symbol synergies or adjacency.
4. **Memory/counting of revealed information** (Buckshot shells, card counting as the fun). **Absent.** Every jam entry shows all the odds on screen.
5. **Items / one-shot consumables that alter a live round** (Buckshot items, Putt Party power-ups). Only traces: the Meltdown cryo-coolant and the Genie's Vault curse defuse.
6. **Card shedding / trick race against the dealer** (Crazy 8s, Blazing 8s). **Absent.**
7. **Dice allocation** (Dicey Dungeons). **Absent.** The closest are Ember Forge's re-rolls and SentinelDice's 2d6.
8. **Simultaneous hidden throw** (RPS / Bobble League plan-then-resolve). **Absent.**
9. **Collection reveal / aura rarity "1 in N"** (Sol's RNG, TCG Pocket). Mostly absent. The Claw Machine shelf and Arcana relics touch it.
10. **Word/letter games.** Absent, and they do not transfer well (§2b).

---

## 4. Candidate directions (ranked)

Scores are 1–5 each. **Total = Novelty × Fun × Simplicity × Buildability (2.5 days)**, max 625.

| # | Name | Novelty | Fun | Simplicity | Build | Total |
|---|---|---|---|---|---|---|
| 1 | **LOADED**: shotgun duel vs the Dealer | 5 | 5 | 4 | 4 | **400** |
| 2 | **LIAR'S TABLE**: call the Dealer's bluff, revolver penalty | 5 | 5 | 3 | 3 | **225** |
| 3 | **LANDLORD REELS**: draft your reel strip, adjacency slot | 4 | 4 | 4 | 4 | **256** |
| 4 | **SHOWDOWN**: simultaneous throw with a Dealer tell (RPS casino) | 4 | 3 | 5 | 5 | **300** |
| 5 | **1-IN-N**: aura roll with "luck potions" | 3 | 4 | 5 | 5 | **300** |
| 6 | **DEALT DICE**: roll 3 dice and allocate them against the Dealer's creature | 4 | 4 | 3 | 3 | **144** |
| 7 | **LAST CARD**: Crazy-8s shedding race vs the Dealer | 5 | 3 | 2 | 2 | **60** |
| 8 | **PACK RIP**: 5-card booster with late-slot rare escalation | 2 | 4 | 5 | 5 | **200** |

The ordering by raw product would be 1, 4, 5, 3, 2, 8, 6, 7. The **recommended order** below weights novelty and "wow" higher, because judges and players reward the absent families (§3b) and dressed-up single draws (4, 5, 8) risk reading as yet another pick-a-tier game.

### Recommended order

**1. LOADED — Buckshot duel vs the Dealer** *(recommended)*
- **Loop:** stake, then the Dealer loads the shotgun with a displayed count (for example 3 live and 2 blank) and shuffles on camera. On your turn, **shoot yourself** or **shoot the Dealer**. Shooting yourself with a blank keeps your turn and bumps your multiplier (for example ×1.3). A live round on yourself loses a life. Shooting the Dealer with a live round takes a Dealer life, and a blank passes the turn to him. Each side has 2 lives. Win (Dealer at 0) pays the stake × the accumulated multiplier. Each round comes with 1–2 VRF-dealt items: 🔍 Peek (the next shell is sampled and shown), 🍺 Eject, ⛓ Cuffs (skip the Dealer's turn), 🪚 Saw (double damage).
- **House math:** the Dealer's policy is published (for example "shoot the player if P(live) ≥ ½, otherwise shoot self; use items greedily"). Lazy hypergeometric sampling on each trigger pull. Solve the player's best response by DP over roughly 10^3–10^4 states, then scale the multiplier table so that optimal play gives 97%.
- **Why it wins:** it copies the tension engine of a 4M-seller (enough information to calculate, never enough to feel safe), puts a face on the house, and is instantly legible. No jam entry does this. It works as a single table scene in the style of the Tumbler/Lazer leaders.
- **Risks:** per-action VRF latency (mitigate with a fast VRF, or the one-transaction "policy commit" fallback that replays the whole duel). Keep the item set to 2–3 so the DP stays small.
- **Must-avoid:** don't let a self-blank be free EV. Price the extra-turn bonus inside the DP.

**2. LIAR'S TABLE — calling the Dealer's bluff**
- **Loop:** the table card is announced (for example ♛). The Dealer slides 1–3 face-down cards and claims "three Queens". You choose **Believe** (small payout, and the round continues to a higher claim) or **LIAR!** Right call: big payout. Wrong call: **you pull the revolver**, which for money means a chamber-based loss chance (1/6, then 1/5… of losing the whole stake) rather than an instant loss. The chamber escalates across calls, so a streak of Believes costs you revolver pressure.
- **House math:** the deck composition is public (for example 6♛ 6♚ 6♜ 2 jokers). The Dealer's claim policy P(claim | hand) is published. On LIAR, the Dealer's hand is **sampled from the posterior P(hand | claim)** (Bayes over a tiny hand space). Pay at optimal-play 96–97%.
- **Why:** Liar's Bar was the 2024–25 stream sensation, and "LIAR!" is a satisfying shout button. Absent from the jam. A strong character and animation opportunity.
- **Risks:** posterior sampling has to be explained ("the Dealer's hand is decided when you call, distributed exactly as if it had been dealt"). That is a small trust leap, so publish the maths. More design time is needed than for LOADED.

**3. LANDLORD REELS — draft your own reel strip**
- **Loop:** a 3×3 or 4×5 slot with ~20 symbols. Before each spin (or once per 5-spin run) you pick 1 of 3 offered symbols to add (🐱 eats 🥛 for a bonus, 💎 doubles adjacent coins, 💣 clears its neighbours…). Spin, and adjacency effects cascade with Balatro-style count-up.
- **House math:** every offered draft set is priced so that *each* option leaves RTP at exactly 96% (a volatility-only choice, like the FAIRGROUND/Gust proofs). Precompute the EV for each small strip configuration. Constrain the strip size so the enumeration or Monte Carlo is exact (or reject-sampled to be exact).
- **Why:** the CloverPit/Landlord/Balatro wave is the hottest gambling-flavoured indie genre (CloverPit sold 1M in a month in 2025). "Build your slot machine" is new to the jam, and slots are unambiguously casino.
- **Risks:** exact RTP across strip configurations. Keep the run to one draft plus one spin to stay tractable.

**4. SHOWDOWN — simultaneous throw vs the Dealer with a tell**
- **Loop:** RPS-style (or a themed triad: Gun / Shield / Knife). The Dealer's throw comes from a VRF mix that shifts each round. A visible **tell meter** ("he glances at the knife") shows the current mix. Win, tie and lose payouts are priced per throw, so every throw is 96%, but volatility differs. A best-of-3 streak option doubles up.
- **Why:** Bobble League-style plan-then-resolve, trivially buildable, and a strong character moment. Novel in the jam.
- **Risk:** shallow. Because every throw has equal EV, the tell is flavour, which a savvy judge may notice. Better used as a side mode inside #1 or #2.

**5. 1-IN-N — aura roll** (Sol's RNG meets a casino)
- **Loop:** stake and ROLL. The result is an aura with a displayed rarity ("1 in 4,096 — SOLAR FLARE") that pays in proportion to its rarity × RTP. Luck potions shift the distribution toward the tails (a volatility knob, fixed RTP). A collection shelf and shareable screenshots.
- **Why:** Roblox's most-played luck loop and a proven crowd pleaser. Cheapest to build, and the cinematic reveal carries it.
- **Risk:** mechanically it is a weighted paytable (close to "wheel/limbo" in spirit), so judges may call it a reskin. Novelty depends entirely on presentation.

**6. DEALT DICE — roll and allocate** (Dicey Dungeons)
- **Loop:** you roll 3 dice (VRF). The Dealer's creature shows 2–3 slots ("needs ≥5", "exact 3", "pair"). Allocate your dice to slots, and each filled slot adds a multiplier. One re-roll token. DP-solved allocation EV, priced at 96%.
- **Why:** real decisions with a tiny solvable space. Absent from the jam.
- **Risk:** needs clear UI teaching. Somewhat near Ember Forge's re-roll.

**7. LAST CARD — Crazy-8s race vs the Dealer**
- Novel and social-flavoured, but long rounds and a big decision tree make exact pricing hard in 2.5 days. Not recommended.

**8. PACK RIP — 5-card booster, rares in the late slots**
- Great reveal UX (TCG Pocket), but loot boxes and cases already exist in crypto casinos and in the jam (Mimic chest, Claw). Reuse its **reveal choreography** (commons first, the last card gets a tilt/glow) inside #1–#5 instead of shipping it as the game.

### Cross-cutting recommendations for whichever is chosen
- **Give the house a face.** The Dealer character, reactions and sound are where Buckshot, Liar's Bar and CloverPit spend their budget.
- **Show the odds as a live number the player can calculate from** (shells remaining, claim probability), and let optimal play be learnable.
- **Publish the solver and the priced paytable** as the fairness story. It reads as "provably unexploitable", not just "provably random".
- **One scene, one prop, one big button** (the jam leaders are all single-screen and tactile).
- **Make the win a shareable artefact** (a Farcaster-cast style card: "Beat the Dealer 2–0 with 1 shell left, ×4.2").

---

## Sources
- GamePigeon: [Wikipedia](https://en.wikipedia.org/wiki/GamePigeon), [App Store](https://apps.apple.com/us/app/gamepigeon/id1124197642), [Westwood Horizon tier list](https://westwoodhorizon.com/2024/11/gamepigeon-games-tier-list/)
- Discord Activities: [Discord blog](https://discord.com/blog/server-activities-games-voice-watch-together), [Discord Wiki: Activities](https://discord.fandom.com/wiki/Activities), [Gartic Phone discontinuation](https://discord.fandom.com/wiki/Gartic_Phone), [Know What I Meme FAQ](https://support-apps.discord.com/hc/en-us/articles/26502085834903-Know-What-I-Meme-FAQ), [Poker Night FAQ](https://support-apps.discord.com/hc/en-us/articles/26502258215703-Poker-Night-FAQ), [Blazing 8s FAQ](https://support-apps.discord.com/hc/en-us/articles/26501925147415-Blazing-8s-FAQ), [Putt Party FAQ](https://support-apps.discord.com/hc/en-us/articles/26502262624919-Putt-Party-FAQ)
- Jackbox: [TheGamer ranking](https://www.thegamer.com/every-jackbox-games-party-packs-best-ranked/), [IGDB](https://www.igdb.com/companies/jackbox-games-inc/best)
- Telegram/Farcaster: [The Block](https://www.theblock.co/post/331571/telegram-games-like-notcoin-and-hamster-kombat-helped-chart-a-new-path-for-web3-gaming), [DailyGame 2026](https://www.dailygame.net/telegram-mini-apps-and-the-new-wave-of-bot-based-games-how-ton-gaming-reshaped-mobile-play-in-2026/), [Bankless: 20 Farcaster Mini Apps](https://www.bankless.com/read/20-farcaster-mini-apps)
- Browser/Roblox: [Dinogame 2026](https://dinogame.gg/blog/best-new-browser-games-2026/), [Switchblade 2026](https://www.switchbladegaming.com/best-games/browser-games-2026/), [PocketGamer.biz Roblox 47.4M](https://www.pocketgamer.biz/robloxs-peak-concurrent-user-count-hits-record-474m-as-steal-a-brainrot-and-grow-a-garden-compete/), [Steal a Brainrot](https://en.wikipedia.org/wiki/Steal_a_Brainrot), [Sol's RNG auras](https://sol-rng.fandom.com/wiki/Auras), [TCG Pocket rarity](https://www.wargamer.com/pokemon-tcg-pocket/rarity)
- Buckshot Roulette: [Noisy Pixel](https://noisypixel.net/buckshot-roulette-review-perfect-for-streamers-2024/), [Hardcore Gamer](https://hardcoregamer.com/review-buckshot-roulette/), [Game World Observer sales](https://gameworldobserver.com/2024/12/12/balatro-3-5-million-copies-sold-buckshot-roulette-4m)
- Liar's Bar: [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/LiarsBar), [Liar's Deck rules](https://www.debigare.com/how-to-play-liars-deck-from-liars-bar-full-rules-and-variants/), [Game of Nerds review](https://thegameofnerds.com/2024/10/08/liars-bar-review-a-hilarious-russian-roulette-tabletop-game/)
- Balatro & co: [Gematsu 5M](https://www.gematsu.com/2025/01/balatro-sales-top-five-million), [CloverPit 1M](https://www.gamedeveloper.com/business/slot-machine-roguelite-cloverpit-tops-1-million-sales), [CloverPit (Wikipedia)](https://en.wikipedia.org/wiki/CloverPit), [Luck Be a Landlord](https://en.wikipedia.org/wiki/Luck_Be_a_Landlord), [Slots & Daggers](https://rogueliker.com/slots-and-daggers-review/), [Dungeons & Degenerate Gamblers](https://en.wikipedia.org/wiki/Dungeons_&_Degenerate_Gamblers), [Ball x Pit](https://en.wikipedia.org/wiki/Ball_x_Pit), [Dicey Dungeons](https://en.wikipedia.org/wiki/Dicey_Dungeons)
- Schedule I: [Dexerto casino guide](https://www.dexerto.com/gaming/casino-guide-schedule-1-3171629/), [Deltia's Ride the Bus](https://deltiasgaming.com/schedule-1-ride-the-bus-game-guide-how-to-win/)
- Jam entries: `/Users/abu/dev/hackathon/chain-jam/docs/competitors.md`
