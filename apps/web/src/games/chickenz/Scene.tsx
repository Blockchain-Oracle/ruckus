import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';

import { backBirdClass, runBotRound } from '@arena/sim-chickenz';

import { useProfile } from '@/app/stores/profile.ts';
import { useGameMachine } from '@/engine/gameMachine.ts';
import type { GameSceneProps } from '@/engine/types.ts';
import { LOBBY_TRACK, playMusic } from '@/lib/audio/music.ts';

import { playEvents } from './audio/sfx.ts';
import { onPlay, stopAll } from './flow.ts';
import { MatchDirector } from './match/director.ts';
import { input, setDirectors, setDriver } from './match/runtime.ts';
import { useMatch } from './match/store.ts';
import { useChickenzPrefs } from './prefs.ts';
import { Arena } from './render/Arena.tsx';
import { Bird } from './render/Bird.tsx';
import { Effects } from './render/Effects.tsx';
import { EmoteBubble } from './render/EmoteBubble.tsx';
import { ChickenzEffects } from './render/effects.ts';
import { Nameplate } from './render/Nameplates.tsx';
import { Pickups } from './render/Pickups.tsx';
import { Projectiles } from './render/Projectiles.tsx';
import { layoutFrom } from './render/terrain.ts';
import { Zone } from './render/Zone.tsx';
import { ChickenzDriver } from './sim/driver.ts';
import { HERO_NAMES, HEROES, type Hero } from './sprites.ts';
import { TutorialDirector, useTutorial } from './tutorial/director.ts';
import { useOnboarding } from './tutorial/onboarding.ts';
import { PRESENTATION } from './wager/constants.ts';
import { heroesForFight, useWager } from './wager/store.ts';

/** Attract seed: fixed per scene generation, so a revisit shows a fresh exhibition. */
const ATTRACT_SEED_BASE = 0x5eed;
const MS_PER_S = 1000;
/**
 * Plates over the birds carry the name in the slot colour the HUD cards use; the "Bot ·" label stays
 * on the cards and results, so four long labels never pile up over a scrum.
 */
const BOT_PREFIX = /^Bot · /;
const SLOT_COLORS = ['#ff5a36', '#2ec4b6', '#8c6bff', '#9be15d'] as const;

export function ChickenzScene({ generation }: GameSceneProps) {
  const driver = useMemo(() => new ChickenzDriver(ATTRACT_SEED_BASE + generation), [generation]);
  const matchDirector = useMemo(() => new MatchDirector(driver), [driver]);
  const tutorialDirector = useMemo(() => new TutorialDirector(driver), [driver]);
  const tutorialStep = useTutorial((s) => s.step);
  const effects = useMemo(() => new ChickenzEffects(), []);
  const [round, setRound] = useState(0);
  const machinePhase = useGameMachine((s) => s.phase);
  const wagerPhase = useWager((s) => s.phase);
  const fight = useWager((s) => s.fight);
  const backed = useWager((s) => s.hero);
  const myHero = useChickenzPrefs((s) => s.hero);
  const skipRequested = useWager((s) => s.skipRequested);
  const matchStatus = useMatch((s) => s.status);
  const matchHeroes = useMatch((s) => s.heroes);
  const matchNames = useMatch((s) => s.names);
  const profileName = useProfile((s) => s.name);

  const presenting = driver.kind === 'fight' && (wagerPhase === 'fight' || wagerPhase === 'result');
  const inMatch = matchStatus !== 'off' || tutorialStep >= 0;
  const heroes: Hero[] = presenting
    ? heroesForFight(backed)
    : matchStatus !== 'off'
      ? matchHeroes
      : tutorialStep >= 0
        ? heroesForFight(myHero)
        : [...HEROES];

  useEffect(() => {
    driver.start();
    setDriver(driver);
    setDirectors({ match: matchDirector, tutorial: tutorialDirector });
    driver.onRound = () => {
      effects.clear();
      setRound(driver.round);
    };
    input.attach();
    driver.readInput = () => input.read();
    return () => {
      input.dispose();
      stopAll();
      driver.stop();
      setDriver(null);
      setDirectors(null);
    };
  }, [driver, matchDirector, tutorialDirector, effects]);

  // Sounds follow whatever is on screen: full volume in play, a quiet bed behind the menu.
  useEffect(() => {
    driver.onStep = (prev, curr) => {
      playEvents(prev, curr, heroes, machinePhase !== 'attract');
      effects.ingest(prev, curr);
    };
  }, [driver, heroes, machinePhase, effects]);

  // Play starts a real match (you vs bots); leaving returns the backdrop to exhibitions.
  useEffect(() => {
    const busy =
      matchDirector.active || tutorialDirector.active || useOnboarding.getState().stage !== 'none';
    if (machinePhase === 'entering' && wagerPhase === 'idle' && !busy) {
      onPlay();
    } else if (machinePhase === 'leaving' && busy) {
      stopAll();
      driver.exhibit();
      playMusic(LOBBY_TRACK);
    }
  }, [machinePhase, wagerPhase, matchDirector, tutorialDirector, driver]);

  // A settled wager swaps the exhibition for its bank seed; leaving the wager restores exhibitions.
  useEffect(() => {
    if (wagerPhase === 'fight' && fight) {
      driver.setMode({
        kind: 'fight',
        seed: fight.seed,
        mapId: fight.mapId,
        difficulty: PRESENTATION.difficulty,
        players: PRESENTATION.players,
      });
    } else if (wagerPhase === 'idle' && driver.kind === 'fight') {
      driver.exhibit();
    }
  }, [driver, wagerPhase, fight]);

  useEffect(() => {
    driver.onRoundEnd = () => {
      if (driver.kind === 'fight') {
        if (import.meta.env.DEV) recordFight(driver);
        useWager.getState().set({ fightDone: true, phase: 'result' });
      } else if (useMatch.getState().status === 'playing') matchDirector.handleRoundEnd();
    };
  }, [driver, matchDirector]);

  useEffect(() => {
    if (!skipRequested) return;
    useWager.getState().set({ skipRequested: false });
    driver.skipToEnd();
  }, [driver, skipRequested]);

  const layout = useMemo(() => {
    void round;
    return layoutFrom(driver.sim.platforms(), driver.sim.weapon_spawns());
  }, [driver, round]);

  useFrame((_, delta) => {
    matchDirector.tick(delta * MS_PER_S);
    driver.update(delta);
  });

  // Nameplates label real play and presented fights; the attract backdrop stays clean.
  const plateNames: readonly string[] | null = presenting
    ? heroes.map((h) => HERO_NAMES[h])
    : matchStatus !== 'off'
      ? matchNames
      : tutorialStep >= 0
        ? [profileName, 'Dummy']
        : null;
  const markedSlot = presenting ? 0 : inMatch ? driver.humanSlot : -1;

  return (
    <>
      <color attach="background" args={['#1b1024']} />
      <Arena seed={ATTRACT_SEED_BASE + generation + round} layout={layout} />
      <Pickups driver={driver} />
      {heroes.map((h, slot) => (
        <Bird
          key={h}
          hero={h}
          slot={slot}
          driver={driver}
          platforms={layout.platforms}
          marked={slot === markedSlot}
        />
      ))}
      {plateNames?.map((name, slot) => (
        <Nameplate
          key={`${slot}:${name}`}
          slot={slot}
          name={name.replace(BOT_PREFIX, '')}
          color={SLOT_COLORS[slot] ?? SLOT_COLORS[0]}
          driver={driver}
          front={slot === markedSlot}
        />
      ))}
      {plateNames?.map((_, slot) => (
        <EmoteBubble key={slot} slot={slot} driver={driver} />
      ))}
      <Projectiles driver={driver} />
      <Effects effects={effects} />
      <Zone driver={driver} />
    </>
  );
}

/**
 * Dev-only evidence for the simulator e2e: the presented fight's final state hash next to the
 * canonical headless run of the same bank seed, and that run's class.
 */
function recordFight(driver: ChickenzDriver) {
  const fight = useWager.getState().fight;
  if (!fight) return;
  const difficulties = Array.from({ length: PRESENTATION.players }, () => PRESENTATION.difficulty);
  const canonical = runBotRound(fight.seed, fight.mapId, difficulties);
  Object.assign(globalThis, {
    __ruckusFight: {
      sessionId: fight.sessionId,
      settledClass: fight.outcomeClass,
      presentedClass: backBirdClass(fight.seed, fight.mapId, difficulties),
      liveHash: String(driver.overHash),
      canonicalHash: canonical.hash.toString(),
      payout: fight.payout.toString(),
      wager: fight.wager.toString(),
    },
  });
}
