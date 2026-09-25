# 02 — Web3 / on-chain game hackathon winners (Mar–Sep 2026) → Chain Jam adaptation ideas

Researched 2026-09-25. Sources: DoraHacks, ETHGlobal showcase, Colosseum (Solana), MagicBlock (Solana gaming tracks), Sui Overflow, Chainlink Convergence, plus casino sites for the "not novel" list.
Checked against `docs/competitors.md` (76 Chain Jam entries), so nothing below repeats an existing entry unless noted.

Confidence tags: **[V]** means verified on the primary page (winner page, official blog or tweet). **[I]** means inferred or secondary. **[?]** means not verified.

---

## TL;DR: top 5 to adapt

The jam field is mostly solo push-your-luck ladders (Tumbler, Tap 64, Echo Dive, Meltdown, Genie's Vault…) and single-draw "pick a thing, VRF decides" games. Almost nothing feels like **playing against someone**. The best 2026 hackathon games were head-to-head hidden-information duels, and that is the gap.

| # | Source game (event, placement) | Adapt as (vs the house) | Why it wins the jam |
|---|---|---|---|
| 1 | **SecretArena** (Solana Graveyard Hackathon, Gaming track 🥉) [V] | **"Secret Number Duel" vs a House opponent.** You and the House each lock a hidden number, then reveal. Tiered payouts. Skip its RPS and High Card, which already exist as casino originals. | GamePigeon-style "mini-game pack" feel. Commit, then reveal, is real tension. None of the jam's 76 entries does this. |
| 2 | **Stellar Poker** (Stellar Hacks: ZK Gaming, 🥉) [V] | **Heads-up Hold'em Showdown vs the House.** VRF deals both hands and the board. You choose check, raise or fold at the flop, turn and river using `onPlayerAction`. The House plays a published fixed strategy. | Poker night with friends, with real decisions. No jam entry uses cards like this. Caveat: close to Evolution's "Casino Hold'em" table game, so the novelty is in presentation and rules. |
| 3 | **Duels: Split or Steal** (ETHGlobal Cannes 2026, **no prize found**) [V] | **Split or Steal vs the House.** The House "talks" through VRF-driven tells, then both sides pick Split or Steal. Each choice is priced to 96% RTP but with different variance. | Golden Balls or prisoner's-dilemma drama is inherently social. Not a casino original anywhere I checked, and not in the jam. |
| 4 | **Dungeons and Moles** (PlaySolana Matrix Hackathon, MagicBlock track 🥉) [V] | **Async "echo" auto-battler.** Pick a loadout (the risk profile), then fight a VRF-selected ghost build from a previous player. Loadout sets the odds and the multiplier. | "Beat your friend's build" gives async PvP feel with no matchmaking. Partial overlap with the jam's fight games (Chain Arena, W.ARENA, Robo Strike), so lean on the ghost-of-other-players angle. |
| 5 | **Flicky** (Sui Overflow 2026, DeepBook track, 4th) [V] | **Swipe Duel.** VRF deals a deck of 5–10 binary "cards" (e.g., will the next hidden card be higher or lower). You and a House bot swipe the same deck, and whoever scores higher wins. | Tinder-swipe UX, head-to-head, fast. Its rival-bot scoreboard makes a solo bet feel like a match. |

Runners-up worth a look: **Eggy League** (Matrix 🥇, soccer PvP with betting), **Oppia zkArcade** (Stellar 5th, Battleship and Wordle with hidden state), **CZA: Triple Duel** (HackMoney 2026, no prize: 3-round card duel with a "nuke"), **The Syndicate** (Colosseum Frontier winner, Gaming: mafia crew card league).

---

## A. Events covered and what was found

| Event | Dates | Game content | Notes |
|---|---|---|---|
| Stellar Hacks: ZK Gaming (DoraHacks) | Feb 9–23, 2026 (winners after) | 5 winners, all games | Just before the window, included because it is the only 2026 game-only hackathon with public winners and repos. [V] |
| Solana Graveyard Hackathon, MagicBlock Gaming track | Feb 12–27, winners Mar 5 / Mar 11, 2026 | 3 winners | [V] from @magicblock thread |
| PlaySolana Matrix Hackathon, MagicBlock track | winners Mar 6, 2026 | 3 winners | [V] from @magicblock thread |
| ETHGlobal HackMoney 2026 | Jan 30–Feb 11, 2026 | a few game projects, one sponsor-prize winner | Top-10 finalists were not games. [V] |
| ETHGlobal Cannes 2026 | ~Apr 2026 [I from repo dates] | Duels, Raid Battle (no prizes shown) | [V] showcase |
| ETHGlobal New York 2026 | Jun 2026 | Playce (Blink prize) | [V] |
| ETHOnline 2026 | Sep 4–16, 2026 | ETH Arcade, Common Arcade | Prizes may not be published yet. [?] |
| Chainlink Convergence 2026 | winners Apr 6, 2026 | Memepull Arena (2nd, Prediction Markets) | [V] blog |
| Colosseum Solana Frontier | winners Jun 26, 2026 | The Syndicate (Gaming), One Arena/Rosentica (Consumer) | 2,857 submissions. [V] |
| Sui Overflow 2026 | winners Aug 27, 2026 | PIPS (1st, DeepBook), Flicky (4th) | No dedicated gaming track. [V] |
| Base / Farcaster / Telegram / Dojo / MUD | — | **No 2026 game-hackathon winner lists found** | Base's 2026 programs (Base Batches 003) were DeFi, AI and prediction markets. Dojo jams and Onchain Summer game tracks are 2023–2025. Somnia Mini Games Hackathon was Jul–Aug 2025 (out of window). Avalanche Build Games (2026, $1M) had no game-specific track. [V: absence in searches, not proof of absence] |

Overall observation: in 2026, ETHGlobal and Colosseum judging moved heavily to AI agents and prediction markets. Game-specific winners are concentrated in Stellar ZK Gaming and the MagicBlock (Solana) gaming tracks.

---

## B. Entries in detail

Format for each entry: event and placement · link · repo (license) · core mechanic · why fun or social · **casino mapping** (wager → outcome → payout vs house) · jam overlap.

### 1. SecretArena: Graveyard Hackathon Gaming track, 🥉 3rd [V]
- Link: https://secretarena.vercel.app/ (live, 4 games marked LIVE). Winner post: https://x.com/magicblock/status/2031750173790244872
- Repo: not found on GitHub search [?]
- Mechanic: cross-platform mini-game suite with **RPS Arena, Coin Flip, Secret Number Duel, High Card Hidden**. Player moves stay hidden in a TEE until reveal, and only results go on-chain.
- Fun/social: GamePigeon's "pick a game, challenge a friend" loop. The hidden simultaneous move is the drama.
- Casino mapping: **Secret Number Duel vs House**. Stake S and pick a number 1–N with a "bold" or "safe" tier. The House number comes from VRF, revealed with a slow flip. Exact match pays high, adjacent pays small, "beat the house" pays about 1.9x. Use `onPlayerAction` for a second round ("double or walk" with a new hidden number).
- Not novel: Stake has **Rock Paper Scissors** and **Flip** originals, and High Card is Casino War. Only Secret Number Duel is fresh.
- Jam overlap: none.

### 2. Stellar Poker: Stellar Hacks ZK Gaming, 🥉 3rd ($1,250) [V]
- BUIDL: https://dorahacks.io/buidl/39840 · Repo: https://github.com/catmcgee/stellar-poker-cosnarks (**no license**, so treat as all-rights-reserved; copy only the idea)
- Mechanic: on-chain Texas Hold'em. A 3-node MPC committee shuffles and deals with secret sharing (coSNARKs), so nobody sees the whole deck. ZK proofs verify deal, reveal and showdown.
- Fun/social: poker is the default "play with friends" game, and the private-cards tech is the hook.
- Casino mapping: **Heads-up Showdown**. Pay the ante, and VRF deals your 2 cards, the House's 2 (face down) and the board. At each street, `onPlayerAction` lets you Raise (add 1x), Check or Fold. The House follows a fixed, published policy. Payout comes from a paytable tuned to 96%, and bonus side-bets can pay on premium hands.
- Not novel: Casino Hold'em (Evolution) and Stake's poker products exist, but nothing in the jam. The presentation (a poker-night table with a House "character") can carry it.
- Jam overlap: none (no card-table game).

### 3. Duels (Split or Steal): ETHGlobal Cannes 2026, **no prize listed** [V]
- Showcase: https://ethglobal.com/showcase/duels-3m3mx · Repo: https://github.com/tekkac/ethglobal-cannes-20206-hackathon (no license)
- Mechanic: spectator-first Split or Steal. Two players' AI agents stake, chat publicly, then commit-reveal a hidden final move.
- Fun/social: Golden Balls TV-show tension. Spectators read the mind games.
- Casino mapping: **Split or Steal vs the House**. Stake S. The House "talks" (2–3 lines of dialogue whose tone is VRF-driven: a tell that is sometimes a bluff). You pick Split or Steal. The House's move comes from VRF with a fixed probability. Price both choices to the same RTP but different variance. Worked example: p(house splits)=0.55; **Split** pays 1.5x if the House splits and 0.3x if it steals (EV 0.96); **Steal** pays 1.745x if the House splits and 0x if it steals (EV 0.96). Optional multi-round "trust ladder" via `onPlayerAction`.
- Not novel: nothing found; not a casino original on Stake, Shuffle, BC or Roobet.
- Jam overlap: none.

### 4. Dungeons and Moles: PlaySolana Matrix Hackathon, MagicBlock track, 🥉 3rd [V]
- Winner post: https://x.com/magicblock/status/2029904876340400622 · Repo: not found [?]
- Mechanic: roguelike auto-battler where **your loadout decides the outcome**. You fight "echoes" of other players' validated builds, with VRF loot drops and real stakes.
- Fun/social: async PvP ("I beat your build"), plus the joy of theory-crafting a loadout.
- Casino mapping: choose 3 of 6 items (each shifts the odds and multiplier, but every combo is exactly 96%). Wager; VRF picks an opponent echo from recent players' saved loadouts and resolves an animated auto-battle. A win pays the loadout's multiplier. Leaderboard of "most-beaten builds".
- Jam overlap: fight-resolution games exist (Chain Arena, W.ARENA, Robo Strike, TILT!, Deadline City). Differentiate with player-made builds as the opponents.

### 5. Flicky: Sui Overflow 2026, DeepBook track, 4th [V]
- Live: https://play.flicky.site/ · Repo: https://github.com/nikola0x0/flicky (no license)
- Mechanic: two players swipe YES/NO through the same deck of real prediction-market cards. Higher score takes the escrowed pot.
- Fun/social: Tinder swipes plus a head-to-head scoreboard. Fast.
- Casino mapping: **Swipe Duel vs House bot**. VRF generates a deck of N binary events (e.g., "next card higher?", "this chest has gold?"). You swipe all of them, and a House bot's swipes (VRF, fixed accuracy) show beside yours. Pay by your score margin over the bot. Ties push.
- Jam overlap: none (no swipe UX in the list).

### 6. Eggy League: PlaySolana Matrix Hackathon, MagicBlock track, 🥇 1st [V]
- Winner post: https://x.com/magicblock/status/2029904978941510039 · Repo: not found [?]
- Mechanic: on-chain 2D soccer with real-time PvP, random power-ups, a shop, and wagering on who wins.
- Casino mapping: **penalty shootout vs House keeper** (pick corner and power; VRF picks the keeper dive), or back one side in a VRF-simulated mini-match.
- Not novel: penalty-shootout crash-style games already exist from third-party providers [I]. Moderate novelty.

### 7. Oppia zkArcade (Battleship + Wordle): Stellar Hacks ZK Gaming, 5th ($750) [V]
- BUIDL: https://dorahacks.io/buidl/39906 · Live: https://oppia-zkarcade.vercel.app · Repo: https://github.com/Oppia-Software-Labs/zkArcade (**MIT**)
- Mechanic: hidden-board Battleship and hidden-word Wordle, with ZK proofs that hit/miss and green/yellow/gray feedback are honest.
- Casino mapping: **Codebreaker / Mastermind for stakes**. VRF sets a hidden code, and fewer guesses means a higher multiplier. ⚠️ Pure-skill feedback lets optimal solvers beat 96% RTP, so add noise (e.g., one VRF-lied peg) or price by guess count against optimal play.
- Jam overlap: **Battleship already exists (#47)**. Wordle/Mastermind is free.

### 8. The Syndicate: Colosseum Frontier, Winner (Gaming) [V]; also in accelerator Cohort 5 [I]
- Arena: https://colosseum.com/arena/projects/explore/the-syndicate · Site: https://thesyndicate.games/ · Repo: github.com/nftimm-dev/the-syndicate (404 now, likely private)
- Mechanic: mafia card league. Your crew of Capo cards battles for territory and runs hustles for in-game $RACKET while you're away. Sessions under 2 minutes.
- Casino mapping: **Heist with a crew**. Draft 3 crew cards (each with a skill/risk trait), pick a job, and VRF resolves each stage. Bail out between stages with `onPlayerAction`.
- Jam overlap: themed push-your-luck exists (Midnight Run, Genie's Vault, Haulfest). Medium novelty.

### Other entries (lower fit)
| Entry | Event / placement | Link / repo (license) | Mechanic | Casino fit |
|---|---|---|---|---|
| Chickenz.io | Stellar ZK Gaming 🥇 [V] | dorahacks.io/buidl/39887 · github.com/AshFrancis/chickenz (**MIT**) | real-time 2D platformer shooter, best-of-3, ZK-proven outcomes | Low: skill action game |
| xray.games | Stellar ZK Gaming 🥈 [V] | xray.games · github.com/fredericrezeau/xray-games (**MIT**) | skill arcade, deterministic sim proven with ZK | Low: skill |
| Cosmic Coders | Stellar ZK Gaming 4th [V] | dorahacks.io/buidl/39826 | productivity + provable fairness | Low |
| Timebent | Graveyard 🥇, Matrix 🥈 [V] | github.com/lunar-fire/timebent-arena (**Apache-2.0**) | pixel RPG, real-time PvP arena, VRF loot and **Derby race tracks** | Derby race betting: medium (race betting is common) |
| Magic Bet | Graveyard 🥈 [V] | @magicbet_ | two identical AI models battle; bet on which survives | Overlaps TILT!, Chain Arena |
| One Arena / Rosentica | Colosseum Frontier Winner (Consumer) [V] | onearena.xyz · github.com/0x-noot/one_arena (404) | tokenized TCG card battles, VRF rolls, win packs | "Pack battles" already exist (Stake Packs, Rollbit Bonus Battles) |
| GridGame-HyperSwiper | HackMoney 2026, ENS prize winner [V] | github.com/0xgeorgemathew/grid-games (no license) | Fruit-Ninja-style "slice coins", predict BTC, 1v1 | Slice-to-reveal multipliers could be fresh; price-based version overlaps Crayon |
| Playce | ETHGlobal NY 2026, Blink prize [V] | github.com/Vib-UX/playce (no license) | venue check-in, staked Lichess chess, AR mini-games | Low (ChessChuck exists) |
| Memepull Arena | Chainlink Convergence 2026, 2nd Prediction Markets [V] | github.com/MemePull | pick a side, pool pot, best price performance wins | Price-based; low |
| CZA: Triple Duel | HackMoney 2026, no prize [V] | github.com/D3Portillo/aezakmi (no license) | 30-second 3-round card duel (Cowboys/Zombies/Aliens) + "nuke", winner takes pool | **Good**: 3-round simultaneous card triangle vs House, with a one-time nuke power |
| Chain Bluff / PlayFrens | HackMoney 2026, no prize [V] | github.com/Akhil-2310/poker-next, github.com/RathodDeven/playfrens | gasless poker with friends (Yellow state channels) | See Stellar Poker |
| Raid Battle | ETHGlobal Cannes 2026, no prize [V] | showcase raid-battle-r3su9 | NFC tap-to-duel; reflex mini-game shifts win odds by 15–20% | Skill nudge breaks fixed RTP; low |
| ETH Arcade (Box Run) | ETHOnline 2026, prize unknown [?] | github.com/team-somehow/eth-arcade | place a box on a price chart; hit pays | Overlaps Crayon (#32) |
| PIPS | Sui Overflow 1st, DeepBook [V] | playpips.fun | 3D one-hand "trading console" | Trading, not casino |

---

## C. Casino "originals" already on the market (NOT novel)

Verified from each site's originals page where it loaded (Stake, BC.Game, Roobet), otherwise from review sites [I].

- **Stake Originals (31 games) [V]**: Baccarat, Bars, Blackjack, Cases, Chicken, Crash, Darts, Diamonds, Dice, Dragon Tower, Drill, Flip, Hilo, Keno, Limbo, Mines, **Moles** (whack-a-mole cash-out, launched Mar 24, 2026), Packs, Plinko, Poker, Primedice, Pump, **Rock Paper Scissors**, Roulette, Slide, Slots, Slots Samurai, Snakes, Tarot, Tome of Life, Video Poker, Wheel.
- **Shuffle Originals [I]**: Dice, Mines, Plinko, Crash, Chicken, Slide, Limbo, Keno, Wheel, Blitz, Hilo, Blackjack, Baccarat, Roulette, Coinflip, Waifu Tower.
- **Rollbit Originals [I]**: X-Crash, X-Roulette, Rollercoaster, Bonus Battles (slot bonus PvP), Mystery Boxes, Duel Arena, Rollbot Bonanza, Plinko, Mines.
- **BC.Game Originals [V/I]**: Crash, Limbo, Keno, Mines, Plinko, Hilo, Twist, Coinflip, Classic Dice, Hash Dice, Tower Legend, Wheel, Roulette, Baccarat, Blackjack, Video Poker, BC Poker, Bingo, Bubble Shooter, Cave, Color, Bullet Spin.
- **Roobet Games [V]**: Blackjack, Coinflip, Crash, Dice, Keno, Limbo, Mines, Mission Uncrossable (chicken-cross-the-road), Plinko, Roulette, Slide, Striker, Towers, Wheel.
- **Gamdom [I]**: Crash, Dice, Roulette, Hilo, Plinko, Mines, Keno. **Thrill [I]**: Eternal Duel, Mines, Crash, Dice, Plinko.
- **On-chain (BetSwirl, VRF on Base) [I]**: Dice, Coin Toss, Keno, Roulette, Wheel, Plinko.
- **Stake Engine** (renamed "Engine", Sep 15, 2026) has 1,000+ creators shipping ~250 titles a week [I], so any generic slot/crash/mines reskin is saturated.

**Takeaway**: avoid crash, mines/towers/chicken-road, plinko, limbo, dice, hilo, keno, wheel, coinflip, RPS, case/pack battles, cash-out-before-bust multiplier ladders, and whack-a-mole. Head-to-head hidden-information duels (Split or Steal, secret-number duel, heads-up poker showdown, swipe duel, async build-vs-build) are absent from every originals catalog above and from the 76 jam entries.

---

## D. Sources
- Stellar Hacks ZK Gaming winners: https://dorahacks.io/hackathon/stellar-hacks-zk-gaming/winner
- Graveyard gaming track winners: https://x.com/magicblock/status/2031750173790244872 · Graveyard page: https://solana.com/graveyard-hack
- PlaySolana Matrix winners: https://x.com/magicblock/status/2029904876340400622
- Colosseum Frontier winners: https://blog.colosseum.com/announcing-the-winners-of-the-solana-frontier-hackathon/
- Sui Overflow 2026 winners: https://www.sui.io/blog/sui-overflow-2026-winners
- Chainlink Convergence winners: https://blog.chain.link/convergence-hackathon-winners/
- ETHGlobal showcase: https://ethglobal.com/showcase (project pages linked above)
- Stake Originals: https://stake.com/casino/group/stake-originals · Moles launch: https://www.yogonet.com/international/news/2026/03/25/118239-stake-rolls-out-arcadestyle-moles-game-under-originals-lineup · Engine rebrand: https://eegaming.org/latest-news/2026/09/15/52632/stake-rebrands-stake-engine-as-engine-opens-platform-to-igaming-operators
- BC Originals: https://bc.game/casino/originals · Roobet: https://roobet.com/casino/category/roobet-games · Shuffle guide: https://shuffle.com/blog/shuffle-originals-guide · Rollbit help: https://help.rollbit.com/en/collections/3460047-rollbit-originals · BetSwirl: https://dappradar.com/blog/multichain-transparent-and-fair-crypto-casino-games-with-betswirl
