"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThreeArena } from "./ThreeArena";

type Screen = "home" | "mode" | "select" | "shop" | "fight";
type Mode = "story" | "versus";
type ElementName = "fire" | "water" | "lightning" | "ice" | "sand" | "wind" | "shadow";

export type Fighter = {
  id: string;
  name: string;
  title: string;
  element: ElementName;
  color: string;
  glow: string;
  price: number;
  power: string;
  portrait: string;
  portraitIndex: number;
  exclusive?: boolean;
};

export type Stage = {
  id: string;
  name: string;
  place: string;
  sky: string;
  accent: string;
};

const fighters: Fighter[] = [
  { id: "raizen", name: "RAIZEN", title: "The Last Ember", element: "fire", color: "#ff4d35", glow: "#ff9c41", price: 0, power: "Inferno Orb", portrait: "炎", portraitIndex: 0 },
  { id: "nyra", name: "NYRA", title: "Tide Keeper", element: "water", color: "#25a7ff", glow: "#72e6ff", price: 0, power: "Tidal Crush", portrait: "水", portraitIndex: 1 },
  { id: "volt", name: "VOLT", title: "Storm Born", element: "lightning", color: "#f8d34a", glow: "#fff6a6", price: 320, power: "Sky Breaker", portrait: "雷", portraitIndex: 2 },
  { id: "kael", name: "KAEL", title: "Frozen Oath", element: "ice", color: "#8ee9ff", glow: "#e9fcff", price: 450, power: "Glacier Fang", portrait: "氷", portraitIndex: 3 },
  { id: "sahra", name: "SAHRA", title: "Dune Phantom", element: "sand", color: "#d8a454", glow: "#ffd991", price: 620, power: "Sand Vortex", portrait: "砂", portraitIndex: 4 },
  { id: "aeri", name: "AERI", title: "Silent Gale", element: "wind", color: "#75e4b3", glow: "#d0ffe7", price: 800, power: "Cyclone Edge", portrait: "風", portraitIndex: 5 },
  { id: "kage", name: "KAGE", title: "The Hidden Oath", element: "shadow", color: "#8b48d7", glow: "#d090ff", price: 9999, power: "Void Rift", portrait: "影", portraitIndex: 6, exclusive: true },
];

const storyFighters = fighters.filter((fighter) => !fighter.exclusive);

const stages: Stage[] = [
  { id: "neon", name: "NEON ROOFTOP", place: "New Muscat · Midnight", sky: "#251643", accent: "#ef3b89" },
  { id: "temple", name: "TEMPLE OF DAWN", place: "Mountain Shrine · Sunrise", sky: "#733c3b", accent: "#ffb85c" },
  { id: "oasis", name: "FORGOTTEN OASIS", place: "Empty Quarter · Dusk", sky: "#724835", accent: "#68d6ba" },
];

const getFighter = (id: string) => fighters.find((fighter) => fighter.id === id) ?? fighters[0];

export function ImmortalCombat() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode>("story");
  const [coins, setCoins] = useState(250);
  const [unlocked, setUnlocked] = useState<string[]>(["raizen", "nyra"]);
  const [p1Id, setP1Id] = useState("raizen");
  const [p2Id, setP2Id] = useState("nyra");
  const [stageId, setStageId] = useState("neon");
  const [level, setLevel] = useState(1);
  const [soundOn, setSoundOn] = useState(true);
  const [toast, setToast] = useState("");
  const [redeemed, setRedeemed] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const savedCoins = localStorage.getItem("immortal-oh");
      const savedFighters = localStorage.getItem("immortal-fighters");
      const savedCodes = localStorage.getItem("immortal-codes");
      if (savedCoins) setCoins(Number(savedCoins));
      if (savedFighters) setUnlocked(JSON.parse(savedFighters));
      if (savedCodes) setRedeemed(JSON.parse(savedCodes));
    } catch { /* local progress is optional */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("immortal-oh", String(coins));
    localStorage.setItem("immortal-fighters", JSON.stringify(unlocked));
    localStorage.setItem("immortal-codes", JSON.stringify(redeemed));
  }, [coins, unlocked, redeemed, hydrated]);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  };

  const openSelect = (nextMode: Mode) => {
    setMode(nextMode);
    if (nextMode === "story") {
      const opponent = storyFighters[(level % storyFighters.length)];
      setP2Id(opponent.id);
    }
    setScreen("select");
  };

  const buy = (fighter: Fighter) => {
    if (unlocked.includes(fighter.id)) return;
    if (coins < fighter.price) return flash(`You need ${fighter.price - coins} more OH`);
    setCoins((value) => value - fighter.price);
    setUnlocked((list) => [...list, fighter.id]);
    flash(`${fighter.name} joined your crew!`);
  };

  const redeemCode = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return "ENTER A CODE FIRST";
    if (redeemed.includes(code)) return "THIS CODE HAS ALREADY BEEN CLAIMED";
    const rewards: Record<string, { coins?: number; fighter?: string; message: string }> = {
      FIRSTALLY: { coins: 250, message: "250 OH ADDED TO YOUR VAULT" },
      STORMHEIR: { coins: 150, fighter: "volt", message: "VOLT + 150 OH UNLOCKED" },
      VEILBREAKER: { coins: 400, fighter: "kage", message: "EXCLUSIVE KAGE + 400 OH UNLOCKED" },
    };
    const reward = rewards[code];
    if (!reward) return "CODE NOT RECOGNIZED";
    if (reward.coins) setCoins((value) => value + reward.coins!);
    if (reward.fighter) setUnlocked((list) => list.includes(reward.fighter!) ? list : [...list, reward.fighter!]);
    setRedeemed((list) => [...list, code]);
    flash(reward.message);
    return reward.message;
  };

  return (
    <main className="game-shell">
      <div className="grain" aria-hidden="true" />
      <header className="topbar">
        <button className="brand" onClick={() => setScreen("home")} aria-label="Immortal Combat home">
          <span className="brand-mark">IC</span>
          <span>IMMORTAL <b>COMBAT</b></span>
        </button>
        <div className="top-actions">
          <div className="currency"><span className="oh-coin">OH</span><strong>{coins.toLocaleString()}</strong></div>
          <button className="icon-button" onClick={() => setSoundOn((value) => !value)} aria-label="Toggle sound">{soundOn ? "♪" : "×"}</button>
        </div>
      </header>

      {screen === "home" && <HomeScreen onPlay={() => setScreen("mode")} onStory={() => openSelect("story")} onShop={() => setScreen("shop")} />}
      {screen === "mode" && <ModeScreen onBack={() => setScreen("home")} onChoose={openSelect} />}
      {screen === "select" && (
        <SelectScreen mode={mode} unlocked={unlocked} p1Id={p1Id} p2Id={p2Id} stageId={stageId}
          onP1={setP1Id} onP2={setP2Id} onStage={setStageId} onBack={() => setScreen("mode")} onShop={() => setScreen("shop")} onFight={() => setScreen("fight")} />
      )}
      {screen === "shop" && <ShopScreen coins={coins} unlocked={unlocked} redeemed={redeemed.length} onBuy={buy} onRedeem={redeemCode} onBack={() => setScreen("home")} />}
      {screen === "fight" && (
        <FightScreen key={`${mode}-${level}-${p1Id}-${p2Id}-${stageId}`} mode={mode} level={level} p1={getFighter(p1Id)} p2={getFighter(p2Id)} stage={stages.find((stage) => stage.id === stageId) ?? stages[0]}
          onExit={() => setScreen("home")}
          onRematch={() => setScreen("select")}
          onStoryWin={(reward) => { setCoins((value) => value + reward); setUnlocked((list) => list.includes(p2Id) ? list : [...list, p2Id]); setLevel((value) => value + 1); setP2Id(storyFighters[((level + 1) % storyFighters.length)].id); setScreen("select"); flash(`+${reward} OH · ${getFighter(p2Id).name} joined your crew`); }} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

function HomeScreen({ onPlay, onStory, onShop }: { onPlay: () => void; onStory: () => void; onShop: () => void }) {
  return (
    <section className="home-screen screen-enter">
      <DynamicCity />
      <div className="hero-copy">
        <p className="eyebrow"><span /> EVERY RIVAL CAN BECOME AN ALLY</p>
        <h1>IMMORTAL<br/><em>COMBAT</em></h1>
        <p className="hero-sub">Strike hard. Show mercy. Build the strongest crew the realms have ever seen.</p>
        <div className="main-menu">
          <button className="menu-button primary" onClick={onPlay}><span>01</span><strong>PLAY</strong><i>→</i></button>
          <button className="menu-button" onClick={onStory}><span>02</span><strong>STORY MODE</strong><i>→</i></button>
          <button className="menu-button" onClick={onShop}><span>03</span><strong>SHOP</strong><i>→</i></button>
        </div>
      </div>
      <div className="hero-fighter fighter-raizen" aria-hidden="true"><CharacterPortrait fighter={fighters[0]} /></div>
      <div className="season-card"><small>SEASON 01</small><b>THE FIRST OATH</b><span>7 fighters · 3 arenas · true 3D combat</span></div>
      <p className="home-hint">LOCAL KEYBOARD COMBAT · NO ACCOUNT NEEDED</p>
    </section>
  );
}

function ModeScreen({ onBack, onChoose }: { onBack: () => void; onChoose: (mode: Mode) => void }) {
  return (
    <section className="panel-screen screen-enter">
      <PanelHeading eyebrow="CHOOSE YOUR PATH" title="HOW WILL YOU FIGHT?" onBack={onBack} />
      <div className="mode-grid">
        <button className="mode-card story-card" onClick={() => onChoose("story")}>
          <span className="mode-number">01</span><div className="mode-art">盟</div><small>CAMPAIGN</small><h2>STORY MODE</h2>
          <p>Defeat rivals, earn their respect, and recruit them into your growing crew. Every level gets tougher.</p>
          <b>BEGIN YOUR LEGEND →</b>
        </button>
        <button className="mode-card versus-card" onClick={() => onChoose("versus")}>
          <span className="mode-number">02</span><div className="mode-art">対</div><small>2 PLAYERS · 1 KEYBOARD</small><h2>LOCAL VERSUS</h2>
          <p>Challenge a friend beside you. Player one uses the left side; player two takes the right.</p>
          <b>SETTLE THE SCORE →</b>
        </button>
      </div>
      <ControlsStrip />
    </section>
  );
}

function SelectScreen(props: { mode: Mode; unlocked: string[]; p1Id: string; p2Id: string; stageId: string; onP1: (id: string) => void; onP2: (id: string) => void; onStage: (id: string) => void; onBack: () => void; onShop: () => void; onFight: () => void }) {
  const [step, setStep] = useState<"fighter" | "stage">("fighter");
  const p1 = getFighter(props.p1Id);
  const p2 = getFighter(props.p2Id);
  return (
    <section className="panel-screen select-screen screen-enter">
      <PanelHeading eyebrow={props.mode === "story" ? "STORY MODE" : "LOCAL VERSUS"} title={step === "fighter" ? "CHOOSE YOUR FIGHTERS" : "CHOOSE THE ARENA"} onBack={props.onBack} />
      {step === "fighter" ? <>
        <div className="versus-preview">
          <SelectedFighter fighter={p1} label="PLAYER 1" align="left" />
          <div className="versus-mark"><span>ROUND</span><b>VS</b><small>{props.mode === "story" ? "LEVEL UP" : "NO MERCY"}</small></div>
          <SelectedFighter fighter={p2} label={props.mode === "story" ? "RIVAL" : "PLAYER 2"} align="right" />
        </div>
        <div className="roster" aria-label="Fighter roster">
          {fighters.map((fighter) => {
            const locked = !props.unlocked.includes(fighter.id);
            const selected = props.p1Id === fighter.id || props.p2Id === fighter.id;
            return <button key={fighter.id} className={`roster-card ${selected ? "selected" : ""} ${locked ? "locked" : ""}`} style={{"--fighter": fighter.color} as React.CSSProperties}
              onClick={() => { if (locked) return props.onShop(); if (props.p1Id !== fighter.id) props.onP1(fighter.id); else if (props.mode === "versus") props.onP2(fighter.id); }}>
              <CharacterPortrait fighter={fighter} locked={locked} /><strong>{fighter.name}</strong><small>{locked ? (fighter.exclusive ? "SECRET CODE" : `${fighter.price} OH`) : fighter.element}</small>
            </button>;
          })}
        </div>
        <p className="selection-help">Pick a card to change Player 1. Pick Player 1’s current card again to assign Player 2.</p>
        <button className="cta-button" onClick={() => setStep("stage")}>CHOOSE ARENA <span>→</span></button>
      </> : <>
        <div className="stage-grid">
          {stages.map((stage) => <button key={stage.id} className={`stage-card ${props.stageId === stage.id ? "active" : ""}`} onClick={() => props.onStage(stage.id)} style={{"--sky": stage.sky, "--accent": stage.accent} as React.CSSProperties}>
            <div className="stage-mini"><span className="mini-moon"/><i/><i/><i/><b/></div><small>{stage.place}</small><h3>{stage.name}</h3><span className="selected-label">{props.stageId === stage.id ? "SELECTED" : "SELECT"}</span>
          </button>)}
        </div>
        <div className="stage-actions"><button className="text-button" onClick={() => setStep("fighter")}>← FIGHTERS</button><button className="cta-button fight-cta" onClick={props.onFight}>ENTER COMBAT <span>⚔</span></button></div>
      </>}
    </section>
  );
}

function ShopScreen({ coins, unlocked, redeemed, onBuy, onRedeem, onBack }: { coins: number; unlocked: string[]; redeemed: number; onBuy: (fighter: Fighter) => void; onRedeem: (code: string) => string; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [codeStatus, setCodeStatus] = useState("Codes can be found in story secrets, events, and community drops.");
  const submitCode = (event: React.FormEvent) => { event.preventDefault(); const result = onRedeem(code); setCodeStatus(result); if (!result.includes("NOT") && !result.includes("ALREADY") && !result.includes("ENTER")) setCode(""); };
  return (
    <section className="panel-screen shop-screen screen-enter">
      <PanelHeading eyebrow="THE UNDERGROUND MARKET" title="RECRUIT YOUR CREW" onBack={onBack} />
      <div className="shop-banner"><div><small>YOUR BALANCE</small><strong><span className="oh-coin large">OH</span>{coins.toLocaleString()}</strong></div><p>Win story fights to earn OH. New fighters bring unique elemental powers into local versus.</p></div>
      <form className="code-vault" onSubmit={submitCode}>
        <div className="code-vault-title"><span>⌁</span><div><small>CLASSIFIED ACCESS</small><h2>SECRET CODE VAULT</h2></div></div>
        <label><span>ENTER ACCESS CODE</span><div><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="••••••••••" autoComplete="off" spellCheck={false} aria-describedby="code-status" /><button type="submit">REDEEM CODE →</button></div></label>
        <p id="code-status" aria-live="polite">{codeStatus} <b>{redeemed} claimed</b></p>
      </form>
      <div className="shop-grid">
        {fighters.map((fighter) => {
          const owned = unlocked.includes(fighter.id);
          return <article className={`shop-card ${owned ? "owned" : ""}`} key={fighter.id} style={{"--fighter": fighter.color, "--glow": fighter.glow} as React.CSSProperties}>
            <div className="shop-portrait"><span className="shop-glyph">{fighter.portrait}</span><CharacterPortrait fighter={fighter} locked={!owned} /></div>
            <div className="shop-info"><small>{fighter.title}</small><h2>{fighter.name}</h2><p><b>{fighter.element.toUpperCase()}</b> · {fighter.power}</p></div>
            <button disabled={owned || fighter.exclusive} onClick={() => onBuy(fighter)}>{owned ? "RECRUITED ✓" : fighter.exclusive ? "CODE EXCLUSIVE" : <><span className="oh-coin small">OH</span>{fighter.price}</>}</button>
          </article>;
        })}
      </div>
    </section>
  );
}

function FightScreen({ mode, level, p1, p2, stage, onExit, onRematch, onStoryWin }: { mode: Mode; level: number; p1: Fighter; p2: Fighter; stage: Stage; onExit: () => void; onRematch: () => void; onStoryWin: (reward: number) => void }) {
  const [health, setHealth] = useState<[number, number]>([100, 100]);
  const [meter, setMeter] = useState<[number, number]>([40, 40]);
  const [positions, setPositions] = useState<[number, number]>([20, 72]);
  const [jumping, setJumping] = useState<[boolean, boolean]>([false, false]);
  const [blocking, setBlocking] = useState<[boolean, boolean]>([false, false]);
  const [effect, setEffect] = useState<{ side: 0 | 1; type: ElementName } | null>(null);
  const [hitSide, setHitSide] = useState<0 | 1 | null>(null);
  const [roundText, setRoundText] = useState("FIGHT");
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [paused, setPaused] = useState(false);
  const [action, setAction] = useState<{ side: 0 | 1; kind: "strike" | "power"; stamp: number } | null>(null);
  const cooldown = useRef<[number, number]>([0, 0]);
  const healthRef = useRef(health);
  const positionsRef = useRef(positions);
  const blockingRef = useRef(blocking);
  useEffect(() => { healthRef.current = health; }, [health]);
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { blockingRef.current = blocking; }, [blocking]);

  useEffect(() => { const timer = window.setTimeout(() => setRoundText(""), 1100); return () => window.clearTimeout(timer); }, []);

  const damage = useCallback((attacker: 0 | 1, amount: number, special = false) => {
    if (winner !== null || paused) return;
    const target = attacker === 0 ? 1 : 0;
    const distance = Math.abs(positionsRef.current[0] - positionsRef.current[1]);
    if (!special && distance > 18) return;
    const dealt = blockingRef.current[target] ? Math.ceil(amount * .3) : amount;
    setHitSide(target);
    window.setTimeout(() => setHitSide(null), 180);
    setHealth((current) => {
      const next: [number, number] = [...current];
      next[target] = Math.max(0, next[target] - dealt);
      if (next[target] === 0) window.setTimeout(() => setWinner(attacker), 120);
      return next;
    });
    setMeter((current) => { const next: [number, number] = [...current]; next[attacker] = Math.min(100, next[attacker] + 12); return next; });
  }, [paused, winner]);

  const attack = useCallback((side: 0 | 1, special = false) => {
    const now = Date.now();
    if (now < cooldown.current[side] || winner !== null) return;
    if (special) {
      if (meter[side] < 40) return;
      setMeter((current) => { const next: [number, number] = [...current]; next[side] -= 40; return next; });
      setEffect({ side, type: side === 0 ? p1.element : p2.element });
      setAction({ side, kind: "power", stamp: now });
      cooldown.current[side] = now + 900;
      window.setTimeout(() => { damage(side, 18, true); setEffect(null); }, 360);
    } else {
      cooldown.current[side] = now + 380;
      setAction({ side, kind: "strike", stamp: now });
      damage(side, 9 + (mode === "story" && side === 1 ? Math.min(7, level) : 0));
    }
  }, [damage, level, meter, mode, p1.element, p2.element, winner]);

  const move = useCallback((side: 0 | 1, delta: number) => {
    setPositions((current) => {
      const next: [number, number] = [...current];
      next[side] = Math.max(7, Math.min(88, next[side] + delta));
      return next;
    });
  }, []);

  const jump = useCallback((side: 0 | 1) => {
    setJumping((current) => { const next: [boolean, boolean] = [...current]; next[side] = true; return next; });
    window.setTimeout(() => setJumping((current) => { const next: [boolean, boolean] = [...current]; next[side] = false; return next; }), 520);
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      const key = event.key.toLowerCase();
      if (key === "escape") return setPaused((value) => !value);
      if (paused || winner !== null) return;
      if (key === "a") move(0, -4); if (key === "d") move(0, 4); if (key === "w") jump(0); if (key === "s") setBlocking((v) => [true, v[1]]);
      if (key === "f") attack(0); if (key === "g") attack(0, true);
      if (mode === "versus") {
        if (key === "arrowleft") move(1, -4); if (key === "arrowright") move(1, 4); if (key === "arrowup") jump(1); if (key === "arrowdown") setBlocking((v) => [v[0], true]);
        if (key === "k") attack(1); if (key === "l") attack(1, true);
      }
    };
    const up = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (key === "s") setBlocking((v) => [false, v[1]]); if (key === "arrowdown") setBlocking((v) => [v[0], false]); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [attack, jump, mode, move, paused, winner]);

  useEffect(() => {
    if (mode !== "story" || paused || winner !== null) return;
    const ai = window.setInterval(() => {
      const [one, two] = positionsRef.current;
      const distance = Math.abs(one - two);
      if (distance > 13) move(1, two > one ? -(2.5 + level * .2) : (2.5 + level * .2));
      else Math.random() > .22 ? attack(1, Math.random() < .18 + level * .025) : move(1, two > one ? 4 : -4);
    }, Math.max(360, 760 - level * 45));
    return () => window.clearInterval(ai);
  }, [attack, level, mode, move, paused, winner]);

  const reward = 70 + level * 20;
  return (
    <section className={`fight-screen ${hitSide !== null ? "impact" : ""}`} style={{"--sky": stage.sky, "--stage-accent": stage.accent} as React.CSSProperties}>
      <ArenaBackground stage={stage} />
      <ThreeArena stage={stage} fighters={[p1, p2]} positions={positions} jumping={jumping} blocking={blocking} hitSide={hitSide} action={action} />
      <div className="cinema-bars" aria-hidden="true"><span/><span/></div>
      <div className="fight-hud">
        <HealthBar fighter={p1} value={health[0]} meter={meter[0]} side="left" />
        <div className="round-badge"><small>{mode === "story" ? `LEVEL ${level}` : "VERSUS"}</small><b>∞</b><span>ROUND 1</span></div>
        <HealthBar fighter={p2} value={health[1]} meter={meter[1]} side="right" />
      </div>
      <button className="pause-button" onClick={() => setPaused(true)}>Ⅱ</button>
      {effect && <PowerEffect effect={effect} from={positions[effect.side]} to={positions[effect.side === 0 ? 1 : 0]} />}
      {roundText && <div className="fight-callout">{roundText}</div>}
      <div className="fight-controls"><span><kbd>A</kbd><kbd>D</kbd> MOVE · <kbd>W</kbd> JUMP · <kbd>S</kbd> BLOCK · <kbd>F</kbd> STRIKE · <kbd>G</kbd> POWER</span>{mode === "versus" && <span><kbd>←</kbd><kbd>→</kbd> MOVE · <kbd>↑</kbd> JUMP · <kbd>↓</kbd> BLOCK · <kbd>K</kbd> STRIKE · <kbd>L</kbd> POWER</span>}</div>
      <TouchControls onLeft={() => move(0, -5)} onRight={() => move(0, 5)} onJump={() => jump(0)} onHit={() => attack(0)} onPower={() => attack(0, true)} />
      {paused && <div className="overlay"><div className="result-card pause-card"><small>COMBAT PAUSED</small><h2>CATCH YOUR BREATH</h2><button className="cta-button" onClick={() => setPaused(false)}>RESUME</button><button className="text-button" onClick={onExit}>EXIT TO MENU</button></div></div>}
      {winner !== null && <div className="overlay"><div className="result-card"><span className="result-glyph">{winner === 0 && mode === "story" ? "盟" : "勝"}</span><small>{winner === 0 ? "VICTORY" : "DEFEAT"}</small><h2>{winner === 0 && mode === "story" ? "FRIENDSHIP FORGED" : `${winner === 0 ? p1.name : p2.name} WINS`}</h2><p>{winner === 0 && mode === "story" ? `${p2.name} respects your strength and joins your journey. The next rival will be even stronger.` : "A fierce battle worthy of the Immortal arena."}</p>{winner === 0 && mode === "story" && <div className="reward"><span className="oh-coin">OH</span><b>+{reward}</b> VICTORY REWARD</div>}<button className="cta-button" onClick={() => winner === 0 && mode === "story" ? onStoryWin(reward) : onRematch()}>{winner === 0 && mode === "story" ? "NEXT LEVEL" : "REMATCH"} <span>→</span></button><button className="text-button" onClick={onExit}>BACK TO MENU</button></div></div>}
    </section>
  );
}

function DynamicCity() { return <div className="dynamic-city" aria-hidden="true"><div className="moon"/><div className="cloud cloud-1"/><div className="cloud cloud-2"/><div className="skyline back">{Array.from({length: 14}, (_, i) => <i key={i}/>)}</div><div className="skyline front">{Array.from({length: 10}, (_, i) => <i key={i}/>)}</div><div className="temple-roof"/><div className="ember-field">{Array.from({length: 12}, (_, i) => <i key={i}/>)}</div></div>; }

function ArenaBackground({ stage }: { stage: Stage }) { return <div className={`arena-bg arena-${stage.id}`} aria-hidden="true"><div className="arena-moon"/><div className="wind-cloud one"/><div className="wind-cloud two"/><div className="arena-buildings">{Array.from({length: 12}, (_, i) => <i key={i}/>)}</div><div className="crowd">{Array.from({length: 26}, (_, i) => <span key={i} style={{animationDelay: `${(i % 7) * -.13}s`}}/> )}</div><div className="tree left"><b/><i/><i/><i/></div><div className="tree right"><b/><i/><i/><i/></div><div className="stage-sign">{stage.name}<small>{stage.place}</small></div></div>; }

function CharacterPortrait({ fighter, locked = false }: { fighter: Fighter; locked?: boolean }) {
  const col = fighter.portraitIndex % 4;
  const row = Math.floor(fighter.portraitIndex / 4);
  return <span className={`character-portrait ${locked ? "portrait-locked" : ""}`} role="img" aria-label={`${fighter.name}, ${fighter.title}`} style={{ backgroundPosition: `${col * 33.333}% ${row * 100}%` }}><i>{locked ? "◇" : ""}</i></span>;
}

function PowerEffect({ effect, from, to }: { effect: {side: 0 | 1; type: ElementName}; from: number; to: number }) { return <div className={`power-effect power-${effect.type}`} style={{left: `${from + (to - from) * .45}%`} as React.CSSProperties}><span>{effect.type === "lightning" ? "ϟ" : effect.type === "ice" ? "✦" : effect.type === "wind" ? "〰" : "●"}</span><i/><b/></div>; }

function HealthBar({ fighter, value, meter, side }: { fighter: Fighter; value: number; meter: number; side: "left" | "right" }) { return <div className={`health-block ${side}`}><div className="fighter-hud"><CharacterPortrait fighter={fighter}/><div><small>{side === "left" ? "PLAYER ONE" : "CHALLENGER"}</small><strong>{fighter.name}</strong></div></div><div className="health-track"><i style={{width: `${value}%`, background: fighter.color}}/></div><div className="power-track"><i style={{width: `${meter}%`, background: fighter.glow}}/></div></div>; }

function SelectedFighter({ fighter, label, align }: { fighter: Fighter; label: string; align: "left" | "right" }) { return <div className={`selected-fighter ${align}`} style={{"--fighter": fighter.color, "--glow": fighter.glow} as React.CSSProperties}><div className="selected-body"><CharacterPortrait fighter={fighter}/></div><div className="selected-copy"><small>{label} · {fighter.element}</small><h2>{fighter.name}</h2><p>{fighter.title}</p><span>{fighter.power}</span></div></div>; }

function PanelHeading({ eyebrow, title, onBack }: { eyebrow: string; title: string; onBack: () => void }) { return <div className="panel-heading"><button className="back-button" onClick={onBack}>← <span>BACK</span></button><div><small>{eyebrow}</small><h1>{title}</h1></div><span className="heading-rule"/></div>; }

function ControlsStrip() { return <div className="controls-strip"><div><b>PLAYER 1</b><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span><span><kbd>F</kbd> STRIKE</span><span><kbd>G</kbd> POWER</span></div><i>VS</i><div><b>PLAYER 2</b><span><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> MOVE</span><span><kbd>K</kbd> STRIKE</span><span><kbd>L</kbd> POWER</span></div></div>; }

function TouchControls({ onLeft, onRight, onJump, onHit, onPower }: { onLeft: () => void; onRight: () => void; onJump: () => void; onHit: () => void; onPower: () => void }) { return <div className="touch-controls"><div><button onPointerDown={onLeft}>←</button><button onPointerDown={onRight}>→</button><button onPointerDown={onJump}>↑</button></div><div><button onPointerDown={onHit}>HIT</button><button className="power-touch" onPointerDown={onPower}>POWER</button></div></div>; }
