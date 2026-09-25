import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';

import { useGameMachine } from '@/engine/gameMachine.ts';
import type { GameSceneProps } from '@/engine/types.ts';
import { LOBBY_TRACK, playMusic } from '@/lib/audio/music.ts';

import { BATTLE_TRACKS } from './audio/music.ts';
import { playEvents } from './audio/sfx.ts';
import { MatchDirector } from './match/director.ts';
import { input, setDriver } from './match/runtime.ts';
import { useMatch } from './match/store.ts';
import { Arena } from './render/Arena.tsx';
import { Bird } from './render/Bird.tsx';
import { Effects } from './render/Effects.tsx';
import { ChickenzEffects } from './render/effects.ts';
import { Pickups } from './render/Pickups.tsx';
import { Projectiles } from './render/Projectiles.tsx';
import { layoutFrom } from './render/terrain.ts';
import { Zone } from './render/Zone.tsx';
import { ChickenzDriver } from './sim/driver.ts';
import { HEROES, type Hero } from './sprites.ts';
import { PRESENTATION } from './wager/constants.ts';
import { heroesForFight, useWager } from './wager/store.ts';

/** Attract seed: fixed per scene generation, so a revisit shows a fresh exhibition. */
const ATTRACT_SEED_BASE = 0x5eed;
const MS_PER_S = 1000;

let director: MatchDirector | null = null;
export const getDirector = () => director;

export function ChickenzScene({ generation }: GameSceneProps) {
  const driver = useMemo(() => new ChickenzDriver(ATTRACT_SEED_BASE + generation), [generation]);
  const matchDirector = useMemo(() => new MatchDirector(driver), [driver]);
  const effects = useMemo(() => new ChickenzEffects(), []);
  const [round, setRound] = useState(0);
  const machinePhase = useGameMachine((s) => s.phase);
  const wagerPhase = useWager((s) => s.phase);
  const fight = useWager((s) => s.fight);
  const backed = useWager((s) => s.hero);
  const skipRequested = useWager((s) => s.skipRequested);
  const matchStatus = useMatch((s) => s.status);
  const matchHeroes = useMatch((s) => s.heroes);

  const presenting = driver.kind === 'fight' && (wagerPhase === 'fight' || wagerPhase === 'result');
  const inMatch = matchStatus !== 'off';
  const heroes: Hero[] = presenting ? heroesForFight(backed) : inMatch ? matchHeroes : [...HEROES];

  useEffect(() => {
    driver.start();
    setDriver(driver);
    director = matchDirector;
    driver.onRound = () => {
      effects.clear();
      setRound(driver.round);
    };
    input.attach();
    driver.readInput = () => input.read();
    return () => {
      input.dispose();
      matchDirector.stop();
      driver.stop();
      setDriver(null);
      director = null;
    };
  }, [driver, matchDirector, effects]);

  // Sounds follow whatever is on screen: full volume in play, a quiet bed behind the menu.
  useEffect(() => {
    driver.onStep = (prev, curr) => {
      playEvents(prev, curr, heroes, machinePhase !== 'attract');
      effects.ingest(prev, curr);
    };
  }, [driver, heroes, machinePhase, effects]);

  // Play starts a real match (you vs bots); leaving returns the backdrop to exhibitions.
  useEffect(() => {
    if (machinePhase === 'entering' && wagerPhase === 'idle' && !matchDirector.active) {
      matchDirector.start(useWager.getState().hero, (Date.now() ^ generation) >>> 0);
      const track = BATTLE_TRACKS[generation % BATTLE_TRACKS.length];
      if (track) playMusic(track);
    } else if (machinePhase === 'leaving' && matchDirector.active) {
      matchDirector.stop();
      driver.exhibit();
      playMusic(LOBBY_TRACK);
    }
  }, [machinePhase, wagerPhase, matchDirector, driver, generation]);

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
      if (driver.kind === 'fight') useWager.getState().set({ fightDone: true, phase: 'result' });
      else if (useMatch.getState().status === 'playing') matchDirector.handleRoundEnd();
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
      <Projectiles driver={driver} />
      <Effects effects={effects} />
      <Zone driver={driver} />
    </>
  );
}
