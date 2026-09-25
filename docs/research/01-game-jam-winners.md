# 01 — Game Jam Winners & Top-Rated Entries (Mar–Sep 2026) → Casino Adaptation Candidates

Research date: 2026-09-25. Goal: find **real, fun, proven** jam games whose core loop can become **wager → outcome → payout** (VRF randomness), ideally social / PvP / vs-computer (GamePigeon-style), browser-playable.

**Method.** Ranks come from the official itch.io results pages and per-entry rate pages (fetched directly), the Ludum Dare API (`api.ldjam.com`), and organizer posts (gamedevjs.com, jam overview pages). I also pulled the full entries JSON for GMTK 2026 (10,325 entries), Brackeys 2026.1/2026.2, Gamedev.js 2026, GameDev.tv 2026, Pirate 19 and Kenney 2026. I searched every title in those jams for casino, dice, card, versus and duel keywords, then fetched each candidate's rank and description. **I did not play these games.** Mechanics come from each game's own itch/ldjam description. "web" means itch shows an in-browser embed. Source repos and licenses were checked with the GitHub API. Anything I'm unsure of is marked **(?)**.

---

## TL;DR — Top 5 (best mix of proven fun + casino fit)

1. **Plummet** (GameDev.tv Jam 2026, **#3 overall** of 831). This is Connect-Four against an AI with a Balatro-style shop: you spend chips to put modifiers on your pieces. It's a well-known board game with a roguelite layer. **Casino:** stake on a match against the "house" AI, and VRF sets the piece bag and modifier rolls. The chips/shop layer already feels like a casino.
2. **LIAR LIAR / Dice of the Damned** (Brackeys 2026.2, theme "Trust No One"). Both are head-to-head Liar's Dice, a genre that is naturally a wager game. **Casino:** VRF rolls the hidden hands, the pot is escrowed, and the winner takes it (minus a rake). Works PvP or against a house bot. This is the closest thing to a GamePigeon-style social bluffing game.
3. **Energy Duel** (Gamedev.js Jam 2026, #32 overall, **#22 Gameplay, #19 Innovation** of 495). Each side queues 8 moves in secret, then both sides play them out at the same time. **MIT license, TypeScript, web.** **Casino:** secret-then-reveal turns map directly onto on-chain commit→reveal. PvP wager, and VRF spawns the arena's blockers and energy nodes. This is the easiest codebase to fork.
4. **Riches To Rags** (GMTK 2026, Enjoyment #433 of ~10.3k, top ~4%). Blackjack where the house bends the rules each round (22 as the max score, a gun that doubles the bet, a fire alarm that pays half). **Casino:** flip it so the *player* drafts the rule cards against the house. The deck is shuffled by VRF, and each rule card changes the payout multipliers. It's "Balatro-blackjack" with real stakes.
5. **plink plonk** (GMTK 2026, **Enjoyment #12**, only 18 ratings). Plinko with a limited number of balls and a high-score goal. **Casino:** Plinko is already a staple crypto-casino game. VRF sets each ball's bounce seed and payout = the slot multiplier. The jam version's upgrades and score mechanics keep it from being just "click a button, get a random number". The rank rests on few ratings, so treat the quality signal as weaker.

Honourable mentions for the shortlist: **One Suspicious Minesweeper** (becomes a "Mines" game where the numbers can lie), **Veggie Brawl** (GMTK Mark's Favourite: an auction draft followed by an autobattler, so you bet on your squad), and **Lock in!** (timing a vault dial for a bigger payout, similar to crash/cash-out games).

---

## Which jams ran in the window (verified)

| Jam | Dates (2026) | Theme | Entries | Results status |
|---|---|---|---|---|
| GMTK Game Jam 2026 | Jul 22–26 | **Count Down** | ~10.5k | Out. GMTK has no single #1; the "Mark's Favourites" list acts as the winners, plus per-category ranks |
| Brackeys Game Jam 2026.2 | Aug 23–30 | **Trust No One** (per entries) | 2,245 | Out. Overall winner **Supurrvisor** |
| Brackeys Game Jam 2026.1 | Feb 15–22 (just outside window) | image-only on the jam page; "strange places" per a participant's Reddit post **(?)** | 1,421 | Out. Overall winner **Rulehouse** (listed as "House Rules") |
| Ludum Dare 59 | Apr 18 weekend | **Signal** | — | Out (queried via API) |
| Ludum Dare 60 | not yet held (event node exists, no dates/theme) | — | — | n/a |
| Gamedev.js Jam 2026 (all web/JS) | April | **Machines** | 495 | Out. Winner **Bauhaus Builder** |
| GameDev.tv Jam 2026 | May 15–25 | **Connections** | 831 | Out. Winner **Mag** |
| Pirate Software Jam 19 | Jul 15–31 | **The Cost of Progress** | 51 entries listed on itch **(?)** — the count seems low | Out. #1 **The Long Winter** |
| Pirate Software Jam 18 | Jan 17–31 (outside window) | "The world is watching" | — | Winners listed (e.g. Don't Read Chat) |
| Kenney Jam 2026 | Jul 17–19 | **Scale** | 568 | Judged top 3: AXIORA, Dale and Scale, Long Live the Kingdom |
| Godot Wild Jam #91–#96 | Mar–Aug (monthly) | #93 "Bounty", others vary | 180–280 each | Out |
| Bad Ideas Game Jam 2026 | Mar 1–31 | — | 521 | Out |
| js13kGames 2026 | Aug 13 – Sep 13 | **Unicorns and Rainbows** (per search snippet) | 317 (record) | **Voting still open. No winners yet.** All entries are open-source web games under 13 KB, so check again once results are posted |
| Game Off 2025 (GitHub) | Nov 2025 (outside window; results early 2026) | Wave(s) | 710 | #1 **Evaw** |
| Global Game Jam 2026 | late Jan (outside window) | not verified | — | Skipped: GGJ has no ranked winners |

---

## Ranked candidate list (quality × casino fit)

Legend: **Fit** A = strong (loop is already wager-shaped or 1v1), B = workable with a redesign, C = weak/poor fit. "web" = playable in browser on itch.

### 1. Plummet — Fit A
- **Jam / placement:** GameDev.tv Game Jam 2026, **#3 Overall** (score 4.500)
- **Link:** https://shawkwaive.itch.io/plummet (web) · Repo: none found
- **Mechanic:** You and an AI share one Connect-Four board. Four in a row clears lines, gravity pulls pieces down, and combos cascade. Winning a match opens a shop where you spend chips to attach modifiers to the pieces in your bag. Every opponent changes the rules.
- **Why fun:** A universally familiar board game plus cascading combos plus a roguelite shop. The author says "definitely not inspired by a childhood board game or a certain poker roguelite."
- **Casino adaptation:** Buy-in → play a match against the house AI (or PvP) → payout scaled by margin of victory or combo score. VRF sets the bag order, modifier rolls and "opponent rule" cards so there is real variance. The AI difficulty tunes the house edge. For PvP, both players stake and the winner takes the pot.

### 2. LIAR LIAR — Fit A
- **Jam / placement:** Brackeys 2026.2: Overall #397, Theme #324, Gameplay #329 (of 2,245)
- **Link:** https://superpuff.itch.io/liar-liar (web, Godot) · Repo: none found
- **Mechanic:** A fast head-to-head take on Liar's Dice using shapes. You make escalating bets on how many copies of a shape are hidden across both hands, or call "LIAR". Wrong calls cost you shapes.
- **Why fun:** Pure bluffing tension in short rounds, 1v1.
- **Casino adaptation:** A textbook fit. Both sides ante, VRF deals the hidden hands, the bidding rounds play out, and the loser of the showdown forfeits the pot. PvP with a rake, or against a house bot with a set edge. You could also add side bets on the final count.

### 3. Dice of the Damned — Fit A
- **Jam / placement:** Brackeys 2026.2: **Overall #124**, Audio #45, Visuals #67, Theme #114
- **Link:** https://hugo7558.itch.io/dice-of-the-damned (web)
- **Mechanic:** One-on-one Liar's Dice against five escalating underworld gamblers, each with a different AI personality. The stakes are "Soul Lanterns" holding collected souls.
- **Why fun:** Better presentation than LIAR LIAR (it ranked higher on audio and visuals). Personality-driven AI opponents give it a ladder to climb.
- **Casino adaptation:** Same as LIAR LIAR, with a strong premium theme already in place (souls work as chips). The AI "ladder" becomes rising stake tiers with bigger multipliers.

### 4. Energy Duel — Fit A
- **Jam / placement:** Gamedev.js Jam 2026: Overall #32, **Gameplay #22, Innovation #19**, Audio #49 (of 495)
- **Link:** https://rorystandley.itch.io/energy-duel (web) · **Repo: https://github.com/rorystandley/energy-duel — MIT, TypeScript**
- **Mechanic:** Each round both players secretly queue 8 moves on a grid, then both execute at once to collect energy nodes. Collisions and new blockers disrupt plans. Best of 5 rounds.
- **Why fun:** "Every decision is a prediction." It's a mind-game in the vein of RoboRally or rock-paper-scissors, with no mid-turn reactions.
- **Casino adaptation:** Very clean. The hidden-plan phase is on-chain **commit→reveal**. PvP escrow, winner takes the pot. VRF generates the arena layout, blocker spawns and node values each round, so the game can't be solved. There is also a vs-house-bot mode. It's an open-source TS web app, which gives the fastest path to a static build.

### 5. Riches To Rags — Fit A
- **Jam / placement:** GMTK 2026: **Enjoyment #433** (of ~10.3k), Creativity #1483
- **Link:** https://mickname.itch.io/riches-to-rags (web)
- **Mechanic:** You are the house playing blackjack against "the luckiest man alive". Each round you add a new rule (e.g. 22 is the max score, a gun that doubles the bet, a fire alarm that pays half the bet regardless). You win when his money counts down to 0.
- **Why fun:** Blackjack with a mutating ruleset, so every hand is a puzzle.
- **Casino adaptation:** Reverse the roles. The player bets against the house, and between hands they draft or VRF-draw rule cards that change odds and payouts (e.g. "22 max, blackjack pays 3:1"). VRF shuffles the shoe. It's a premium "rogue-blackjack" casino table.

### 6. plink plonk — Fit A
- **Jam / placement:** GMTK 2026: **Enjoyment #12** (score 4.556, 18 ratings, so a small sample)
- **Link:** https://hulien22.itch.io/plink-plonk (web; has an online leaderboard via Talo)
- **Mechanic:** Get the highest score with a limited number of balls, Plinko/pachinko style. The description is minimal, so the exact upgrade systems are **(?)**.
- **Why fun:** Players rated it very highly for enjoyment, and physics drops are satisfying to watch.
- **Casino adaptation:** Plinko is a native crypto-casino game. Stake per ball, VRF sets the drop path or peg jitter, and the landing slot sets the multiplier. The jam's limited-balls/score layer can become a "run" mode (buy 10 balls, hit a score threshold to multiply the stake) so it isn't a bare RNG button.

### 7. One Suspicious Minesweeper (+ Trust Issues: Feat. Minesweeper) — Fit A
- **Jam / placement:** Brackeys 2026.2: **Theme #40**, Gameplay #120, Enjoyment #191, Overall #245. (Trust Issues: Theme #150, Innovation #191, Overall #432)
- **Links:** https://debeck.itch.io/minesweeper (web) · https://david-sebesta.itch.io/trust-issues-feat-minesweeper (web)
- **Mechanic:** Classic minesweeper, except some "1" tiles are lying. You can flag or check suspected fakes.
- **Why fun:** A familiar game with a deduction twist.
- **Casino adaptation:** Maps directly onto the popular "Mines" casino format. Stake, VRF places the mines, and each safe reveal raises the multiplier, with cash-out allowed at any time. The "lying numbers" twist adds information and skill beyond plain Mines, and a VRF-chosen liar count could be a risk setting.

### 8. Veggie Brawl — Fit A/B
- **Jam / placement:** GMTK 2026: **Mark's Favourites** (the de facto winners list), Enjoyment #94
- **Link:** https://therozental.itch.io/veggie-brawl (web)
- **Mechanic:** Outbid rival farmers in an auction to draft a squad of veggies, then watch them auto-battle in the arena.
- **Why fun:** The auction mind-games plus the autobattler spectacle.
- **Casino adaptation:** Stake, then draft against the house or other players using auction chips. VRF drives the battle RNG (crits, turn order). Payout depends on placement. You can also run a spectator mode where people bet on which squad wins. Good multiplayer and social potential.

### 9. Lock in! — Fit B
- **Jam / placement:** GMTK 2026: Enjoyment #56 (4.378)
- **Link:** https://matt-neave.itch.io/lock-in (web)
- **Mechanic:** Escape through a series of vault doors. A needle sweeps a dial while gates open and shrink, and you click when the needle hits an open gate. Tighter timing gives a bigger payout, and clean hits build a combo. There are boss vaults.
- **Why fun:** A tight one-button skill loop with an escalating combo.
- **Casino adaptation:** A "crash"-style cash-out. Stake, then each door you clear raises the multiplier. VRF sets the gate positions, sizes and needle speed per door, and you can bank at any door. **Warning:** skill-based payouts can be exploited by bots, so cap the multipliers or make the RNG dominate.

### 10. Rulehouse (listed as "House Rules") — Fit B
- **Jam / placement:** **Brackeys 2026.1 Overall #1 winner**, also #1 Enjoyment and #1 Gameplay
- **Link:** https://dalichrome.itch.io/house-rules (web)
- **Mechanic:** "Master a new form of chess across the globe". Fifteen levels, each with different chess rules, locations and funny characters.
- **Why fun:** The top-rated game of the earlier Brackeys jam. Chess variants give familiar-but-fresh puzzles.
- **Casino adaptation:** Chess against an AI is deterministic skill, so it's weak as-is. It works as "Rule Roulette Chess": VRF picks the house rule(s) and the AI strength, you stake, and payout scales with rule difficulty. PvP chess with a wager is also possible, but that's betting on skill, not a casino game.

### 11. Give Me Your Hand — Fit B
- **Jam / placement:** Brackeys 2026.2: **Overall #8, Enjoyment #7**
- **Link:** https://blizzardfan.itch.io/give-me-your-hand (web)
- **Mechanic:** A single-player card survival game. Each day three strangers offer you cards and any of them may be lying. You peek at a corner, judge their story, take or discard the card, or shoot the liar. You build and sell poker hands for cash to pay your debts.
- **Why fun:** One of the highest-rated games in the jam. Poker hands plus social deduction.
- **Casino adaptation:** A "poker-hand builder" table. Stake, VRF deals the offered cards and decides which strangers lie, and the final poker hand strength sets the payout multiplier from a paytable, like video poker with a bluff layer.

### 12. Poker Mafia / Untitled Poker Game — Fit B
- **Jam / placement:** Brackeys 2026.2: Poker Mafia Overall #155 (Theme #120). Untitled Poker Game Overall #160 (Enjoyment #164)
- **Links:** https://screamycat.itch.io/poker-mafia (web, but the author recommends the Windows build) · https://omagadev.itch.io/untitled-poker-game (web)
- **Mechanic:** *Poker Mafia*: Texas Hold'em against mobsters where you cheat when their backs are turned. *Untitled*: you are the dealer, you must pay out pots correctly and catch the cheater marking cards.
- **Casino adaptation:** Hold'em against house bots with a "cheat" mechanic is fun. The Untitled dealer-role twist could become a side-bet ("spot the cheater" pays x). Both need a lot of polish.

### 13. Footsypool — Fit B
- **Jam / placement:** Ludum Dare 59 **Compo: Overall #5, Fun #4**
- **Link:** https://anttihaavikko.itch.io/footsypool (web) · **Repo: https://github.com/anttihaavikko/footsypool — MIT, Godot/GDScript**
- **Mechanic:** Arcade football with billiards-style trickshots: bounce the ball off everything to score on an increasingly crowded field. The opponent must never touch the ball, you get one spare mistake, and big scores require risk. There's an online leaderboard.
- **Why fun:** Made by anttihaavikko, a prolific jam veteran, and it's very juicy. Risk-for-reward is built into the design.
- **Casino adaptation:** Stake on a score target, where each trickshot bounce raises the multiplier and a touch by the opponent busts you. VRF sets defender placement each round. It's a skill-heavy game, so treat it as "skill-based wager" or a PvP score duel. A billiards-style game like GamePigeon's 8-Ball is the natural sibling.

### 14. EPOCHESS — Fit B
- **Jam / placement:** GMTK 2026: **Creativity #44**, Enjoyment #130
- **Link:** https://cosmickosumi.itch.io/epochess (web)
- **Mechanic:** Chess rewritten with time management. You spend time on planning your board layout and on the fight itself. **Designed for 2 players locally.**
- **Casino adaptation:** A PvP wager game (pot, winner takes it). VRF could randomize the starting army or layout budget to add variance. Social 1v1 fit.

### 15. NULL RUSH! — Fit B
- **Jam / placement:** GMTK 2026: **Mark's Favourites**, **Enjoyment #21** (4.515)
- **Link:** https://tulsonic.itch.io/null-rush-gmtk-2026 (web)
- **Mechanic:** A roguelike deckbuilder where you fight numbers with math. It has a global leaderboard and a **PvP mode (against bots or online)** that was added post-jam.
- **Casino adaptation:** A PvP deck duel with stakes, with VRF shuffles. Or a single-player "reach score X" run with a multiplier paytable.

### 16. Duels of Betrayal — Fit B (social)
- **Jam / placement:** Brackeys 2026.2: Overall #147, Theme #57, Innovation #165
- **Link:** https://dev1d123.itch.io/duels-of-betrayal (web, first-person 3D)
- **Mechanic:** Four captives play 12 Prisoner's Dilemma matches. You ask questions, build trust, lie, betray. The most money at the end wins.
- **Casino adaptation:** The "Split or Steal" / Golden Balls format with real stakes is a great social wager mechanic. VRF could assign hidden roles or bonus pots. The 3D shell would need to be rebuilt as 2D.

### 17. High Rollers — Fit B/C
- **Jam / placement:** Ludum Dare 59 **Jam: Fun #1, Overall #6**
- **Link:** https://siberiancyborgs.itch.io/high-rollers (web)
- **Mechanic:** "You're tied to a chair. You're rolling at full speed. You're shooting and gambling at the same time." A first-person retro shooter.
- **Casino adaptation:** The theme is ideal but the genre (FPS) is heavy. You could borrow the "gamble mid-action" idea: a spin mechanic that bets your current score multiplier. Poor fit for a quick static port.

### 18. 100 Spins — Fit B
- **Jam / placement:** GMTK 2026: Enjoyment #803, Audio #767
- **Link:** https://omargames7.itch.io/100-spins (web, mobile ok)
- **Mechanic:** You have 100 slot-machine spins total to reach 1M coins. You upgrade the machine (new symbols, more 7s) with your winnings, in the vein of *Luck be a Landlord*.
- **Casino adaptation:** A roguelite slot. Buy-in buys a 100-spin run, VRF sets the reels, and the final coins map to a payout tier. It's a proven genre but closer to "slop" unless the upgrade layer is deep.

### 19. Incremental Claw Machine — Fit B
- **Jam / placement:** Gamedev.js 2026: Overall #73, **Theme #43**, Gameplay #65
- **Link:** https://jcn001.itch.io/incremental-claw-machine (web)
- **Mechanic:** An idle gacha claw. You launch the claw, it ricochets around the machine, collects toys, and opens capsules for upgrades.
- **Casino adaptation:** Stake per claw drop, VRF sets the ricochet seed and capsule contents, and the capsule rarity table sets the payout.

### 20. Precision HyperGolf / Power Putt / Putt Putt Perfection — Fit B (GamePigeon-style)
- **Placements:** HyperGolf: GMTK Enjoyment #50. Power Putt: GMTK Enjoyment #55 (18 holes). Putt Putt Perfection: **Brackeys 2026.1 Enjoyment #7**
- **Links:** https://zesty-the-lemon.itch.io/hypergolf · https://doomz-11.itch.io/power-putt · https://lucas-riedlshah.itch.io/putt-putt-perfection-2 (all web)
- **Mechanic:** 2D mini golf. HyperGolf adds hitting the ball while it's still moving, against a timer.
- **Casino adaptation:** A GamePigeon-style PvP mini golf: both players stake and fewest strokes wins. VRF sets course generation and wind. As a solo casino game it's weak (pure skill).

### 21. Clock Chess — Fit B/C
- **Jam / placement:** GMTK 2026: **Enjoyment #110**
- **Link:** https://some-games-by-bee.itch.io/clock-chess (web, touch) · **Repo: https://github.com/yourname3/gmtk-2026 — AGPL-3.0, GDScript** (AGPL requires publishing source for network use)
- **Mechanic:** A chess-like puzzle where you sequence special-move cards to capture the right pieces and play every card.
- **Casino adaptation:** A puzzle game with a VRF-dealt hand. Stake to solve within N moves. Weak.

### 22. Bottle Cap Chess — Fit B
- **Jam / placement:** GMTK 2026: Creativity #139, Enjoyment #419
- **Link:** https://w4nda.itch.io/bottle-cap-chess (web)
- **Mechanic:** An abstract 2-player strategy game. You move stacks of caps, and each move leaves caps behind so the stack counts down. Capture enemy piles and reach the far baseline.
- **Casino adaptation:** A simple rule set for PvP wagers (a GamePigeon-like abstract game). Needs VRF only for the starting setup.

### 23. Liar's Chess — Fit B
- **Jam / placement:** Brackeys 2026.2: **Innovation #35**, Enjoyment #196
- **Link:** https://theblankdev.itch.io/liars-chess (web)
- **Mechanic:** Chess against a CPU with randomized starting positions and hidden identities, so you don't know where their king is. Take all CPU pieces, with no check or checkmate.
- **Casino adaptation:** Hidden information plus random setup (VRF) against a house AI, with payouts by piece-count margin. Better variance than plain chess.

### 24. Cold Beer & Liar Dice — Fit B
- **Jam / placement:** Brackeys 2026.2: Overall #174, Audio #84, Visuals #111
- **Link:** https://boring-hacker.itch.io/cold-beer-and-liar-dice (web)
- **Mechanic:** A narrative game (15–30 min, 4 endings) built around Liar's Dice games at a bar.
- **Casino adaptation:** Useful mainly as a mood and art reference for a Liar's Dice table. Dice of the Damned and LIAR LIAR are the better mechanical references.

### 25. Rogue's Dice — Fit B
- **Jam / placement:** Pirate Software Jam 19: Overall #18 (of 51 listed)
- **Link:** https://blackstreamgames.itch.io/rogues-dice (web)
- **Mechanic:** A dice-crew battler. Six dice make up your crew, each face is an action (attack, block, etc.), and you challenge rival captains at crooked tables.
- **Casino adaptation:** A dice duel against the house with VRF rolls. Stake per table, and climbing tiers raises the stakes.

### 26. Deck Stabber / Cards Down / Burn Your Cards! — Fit B/C (card duels vs AI)
- **Placements:** Deck Stabber: GMTK Enjoyment #571. Cards Down: GMTK Enjoyment #1803. Burn Your Cards!: Pirate 19 #17
- **Links:** https://suumpmolk.itch.io/deck-stabber · https://seneku.itch.io/cards-down · https://ukrumum.itch.io/burn-your-cards (all web)
- **Mechanics:** Deck Stabber: draw one card, play one card, reduce the opponent's board to zero. Cards Down: each player's chess clock is their health, you answer with strictly lower cards, and each suit has its own effect. Burn Your Cards: sacrifice units to gain mana, against 3 AI decks.
- **Casino adaptation:** A wager duel against a house AI with VRF shuffles. Cards Down's "clock = HP" idea is a neat hook for a PvP stake duel.

### 27. BombIt — Fit C
- **Jam / placement:** GMTK 2026: **Enjoyment #2** (4.692, only 13 ratings)
- **Link:** https://aspect110.itch.io/bombit (web)
- **Mechanic:** A physics arena where you hold a live bomb with an always-burning fuse, throw fast, grab the next one, and survive three stages including a boss.
- **Casino adaptation:** Could inspire a "hot potato" PvP game (VRF fuse length, last player holding it loses the stake). As-is it's an action game, so a poor fit.

### 28. Poker Block — Fit B
- **Jam / placement:** GMTK 2026: Enjoyment #1777 (weak rank)
- **Link:** https://antoad.itch.io/poker-block (web)
- **Mechanic:** Place poker-card blocks on a grid. Completing a row or column scores that line as a poker hand.
- **Casino adaptation:** Block-puzzle video poker. VRF deals the block queue and the paytable multiplies the stake. Interesting hybrid, but its rating is low.

### 29. Robo Dance — Fit C
- **Jam / placement:** Gamedev.js 2026 **#3 Overall**
- **Link:** https://insality.itch.io/robo-dance (web) · **Repo: https://github.com/Insality/robo-dance-jam-2026 — MIT, Lua (Defold)**
- **Mechanic:** Simultaneous rhythm-turn-based tactics: you queue move, attack and teleport turns to the beat.
- **Casino adaptation:** It's mostly a single-player puzzle. Its simultaneous-turn idea is covered better by Energy Duel. Listed mainly as a high-quality open-source Defold/web reference.

### 30. Satellite Days — Fit C
- **Jam / placement:** Ludum Dare 59 **Compo: Overall #4, Fun #1**
- **Link:** https://lectvs.itch.io/satellite-days (web, pixi.js)
- **Mechanic:** A paddle-controlled incremental action game ("being a satellite dish"). The details are thin in the description **(?)**.
- **Casino adaptation:** Poor fit, but it's a very highly rated pixi.js web game, useful as a reference for polish and web tech.

---

## Winners that are poor casino fits (for completeness)

| Game | Jam / placement | Link | Why poor fit |
|---|---|---|---|
| Supurrvisor | Brackeys 2026.2 **Overall #1** | https://moonkey1.itch.io/supurrvisor | Shop-management / anti-theft sim |
| Crowd Control | Brackeys 2026.2 #1 Enjoyment & Gameplay | https://scarfedblade.itch.io/crowd-control | Spot-the-parasite shooter (a "spot the fake" bonus round could borrow the idea) |
| The False Few / Everybody Lies / Shifty lil'Wizzlers | Brackeys 2026.2 #2 / #6 / #4 | mentel / awaycrash44 / mortussangeluss .itch.io | Deduction puzzles |
| The Art Appraiser / Pawn's Paradise | Brackeys 2026.2 #7 / #17 | wakedk / gumi772 .itch.io | Appraise real vs fake. A "real or fake, double or nothing" side game is possible **(idea)** |
| By The Numbers, Picture Day, Sketchdown, DEXFUSAL, Some Reassembly Required, Game Jam Simulator 2026, 11:59, Research And Detonation, Circuit Breaker, Drill Dracula, My Hand is a Gun, Major Moo's… | GMTK 2026 Mark's Favourites | see gmtk results page | Narrative, puzzle and action games |
| Pies in the Skies [Online Co-Op] | GMTK 2026 **Enjoyment #1** | https://wesperanto.itch.io/pies-in-the-skies | Online 2-player co-op (driver + cook). Good proof that online co-op scores well, but no wager loop |
| 0:07 | GMTK 2026 Enjoyment #3 | https://placeholders.itch.io/007 | Hotline-Miami-like shooter |
| Bauhaus Builder / BUILDOBAN / GUNGLASSES | Gamedev.js 2026 #1 / #2 / #1 Gameplay | madmarcel / isu502884 / tripoly-studios .itch.io | Physics builder / Sokoban / platformer |
| Boba's Love Story / Signal Garden | LD59 Compo #1 / Jam #1 | ldjam.com/events/ludum-dare/59/… | Adventure / incremental |
| Mag / Mirrors of the Ancients | GameDev.tv 2026 #1 / #2 | yukiiris / daytaur .itch.io | Puzzle platformer / light puzzle |
| The Long Winter | Pirate 19 #1 | https://deadpyxel.itch.io/the-long-winter | Resource-attrition narrative (its "pay with supplies, body, hope" loop is thematically casino-adjacent) |
| Evaw | Game Off 2025 #1 | https://wafflenaut-games.itch.io/evaw | Outside window; not a fit |
| GWJ winners: Last Shift (#91), Brewers of Khazad-Dun (#92), Caught on Paper (#93), Bloom Box (#94), World Cup 2099 (#95), Witchy As Charged (#96) | Godot Wild Jam | itch | Mostly sims/puzzles. World Cup 2099 (robot soccer) could be a PvP wager game but is action-heavy |

---

## Takeaways for Chain Jam

- **Genres that proved fun in 2026 jams and map cleanly to casino:** Liar's Dice / bluffing duels (at least 4 well-rated Brackeys entries), Connect-Four/board-game roguelites (Plummet), secret-then-reveal duels (Energy Duel), Plinko (plink plonk), Mines-with-a-twist, rule-mutating blackjack, and auction-draft autobattlers.
- **The "Balatro layer" keeps recurring** (Plummet, Riches To Rags, 100 Spins, Poker Block, NULL RUSH). Modifiers bought with chips between rounds make a random outcome feel earned. That's the antidote to "click a button, random number".
- **Open-source, permissively licensed, web-ready forks:** Energy Duel (MIT, TypeScript), Footsypool (MIT, Godot web export), Robo Dance (MIT, Defold). Clock Chess is AGPL. Everything else has no public repo, so treat it as **design reference only** and don't copy code or assets.
- **js13k 2026 results are pending** (317 entries, all on GitHub under 13 KB). Check again when winners are announced; they're ideal static-web references.
- **Caveats:** Several enjoyment ranks rest on small rating counts (BombIt 13, plink plonk 18). GMTK's "#1" labels on the results page mark Mark's Favourites, not a single overall winner. Pirate 19's 51-entry count looks odd **(?)**.
