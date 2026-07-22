"use client";

import { useEffect, useState } from "react";
import { PhaserArena } from "./PhaserArena";
import type { CombatSnapshot } from "./fighting-engine";

type Screen = "home" | "mode" | "select" | "shop" | "fight";
type Mode = "story" | "versus";
type ElementName = "fire" | "water" | "lightning" | "ice" | "sand" | "wind" | "shadow";
type ConnectedPad = { index: number; name: string };

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
  const [gamepads, setGamepads] = useState<ConnectedPad[]>([]);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const savedCoins = localStorage.getItem("immortal-oh");
        const savedFighters = localStorage.getItem("immortal-fighters");
        const savedCodes = localStorage.getItem("immortal-codes");
        if (savedCoins) setCoins(Number(savedCoins));
        if (savedFighters) setUnlocked(JSON.parse(savedFighters));
        if (savedCodes) setRedeemed(JSON.parse(savedCodes));
      } catch { /* local progress is optional */ }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("immortal-oh", String(coins));
    localStorage.setItem("immortal-fighters", JSON.stringify(unlocked));
    localStorage.setItem("immortal-codes", JSON.stringify(redeemed));
  }, [coins, unlocked, redeemed, hydrated]);

  useEffect(() => {
    const refreshGamepads = () => {
      const next = Array.from(navigator.getGamepads?.() ?? [])
        .filter((pad): pad is Gamepad => Boolean(pad?.connected))
        .map((pad) => ({ index: pad.index, name: pad.id.replace(/\s*\([^)]*(vendor|product)[^)]*\)/gi, "").trim() || `Controller ${pad.index + 1}` }));
      setGamepads((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    window.addEventListener("gamepadconnected", refreshGamepads);
    window.addEventListener("gamepaddisconnected", refreshGamepads);
    const poller = window.setInterval(refreshGamepads, 900);
    refreshGamepads();
    return () => { window.removeEventListener("gamepadconnected", refreshGamepads); window.removeEventListener("gamepaddisconnected", refreshGamepads); window.clearInterval(poller); };
  }, []);

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
      {screen !== "fight" && <header className="topbar">
        <button className="brand" onClick={() => setScreen("home")} aria-label="Immortal Combat home">
          <span className="brand-mark">IC</span>
          <span>IMMORTAL <b>COMBAT</b></span>
        </button>
        <div className="top-actions">
          <div className="currency"><span className="oh-coin">OH</span><strong>{coins.toLocaleString()}</strong></div>
          <button className="icon-button" onClick={() => setSoundOn((value) => !value)} aria-label="Toggle sound">{soundOn ? "♪" : "×"}</button>
        </div>
      </header>}

      {screen === "home" && <HomeScreen onPlay={() => setScreen("mode")} onStory={() => openSelect("story")} onShop={() => setScreen("shop")} />}
      {screen === "mode" && <ModeScreen gamepads={gamepads} onBack={() => setScreen("home")} onChoose={openSelect} />}
      {screen === "select" && (
        <SelectScreen mode={mode} gamepads={gamepads} unlocked={unlocked} p1Id={p1Id} p2Id={p2Id} stageId={stageId}
          onP1={setP1Id} onP2={setP2Id} onStage={setStageId} onBack={() => setScreen("mode")} onShop={() => setScreen("shop")} onFight={() => setScreen("fight")} />
      )}
      {screen === "shop" && <ShopScreen coins={coins} unlocked={unlocked} redeemed={redeemed.length} onBuy={buy} onRedeem={redeemCode} onBack={() => setScreen("home")} />}
      {screen === "fight" && (
        <FightScreen key={`${mode}-${level}-${p1Id}-${p2Id}-${stageId}`} mode={mode} gamepads={gamepads} level={level} p1={getFighter(p1Id)} p2={getFighter(p2Id)} stage={stages.find((stage) => stage.id === stageId) ?? stages[0]}
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
      <div className="season-card"><small>SEASON 01</small><b>THE FIRST OATH</b><span>7 fighters · 3 arenas · frame-based combat</span></div>
      <p className="home-hint">ARROWS TO MOVE · SPACE TO JUMP · F / G / H TO FIGHT</p>
    </section>
  );
}

function ModeScreen({ gamepads, onBack, onChoose }: { gamepads: ConnectedPad[]; onBack: () => void; onChoose: (mode: Mode) => void }) {
  return (
    <section className="panel-screen screen-enter">
      <PanelHeading eyebrow="CHOOSE YOUR PATH" title="HOW WILL YOU FIGHT?" onBack={onBack} />
      <div className="mode-grid">
        <button className="mode-card story-card" onClick={() => onChoose("story")}>
          <span className="mode-number">01</span><div className="mode-portraits"><CharacterPortrait fighter={fighters[0]} /><CharacterPortrait fighter={fighters[2]} /></div><small>CAMPAIGN</small><h2>STORY MODE</h2>
          <p>Defeat rivals, earn their respect, and recruit them into your growing crew. Every level gets tougher.</p>
          <b>BEGIN YOUR LEGEND →</b>
        </button>
        <button className="mode-card versus-card" onClick={() => onChoose("versus")}>
          <span className="mode-number">02</span><div className="mode-portraits"><CharacterPortrait fighter={fighters[0]} /><CharacterPortrait fighter={fighters[1]} /></div><small>2 PLAYERS · CONTROLLER READY</small><h2>LOCAL VERSUS</h2>
          <p>Challenge a friend with keyboard plus controller, or connect two controllers for a clean local-versus setup.</p>
          <b>SETTLE THE SCORE →</b>
        </button>
      </div>
      <ControllerStatus gamepads={gamepads} />
    </section>
  );
}

function SelectScreen(props: { mode: Mode; gamepads: ConnectedPad[]; unlocked: string[]; p1Id: string; p2Id: string; stageId: string; onP1: (id: string) => void; onP2: (id: string) => void; onStage: (id: string) => void; onBack: () => void; onShop: () => void; onFight: () => void }) {
  const [step, setStep] = useState<"fighter" | "stage" | "controls">("fighter");
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);
  const p1 = getFighter(props.p1Id);
  const p2 = getFighter(props.p2Id);
  const publicBase = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return (
    <section className="panel-screen select-screen screen-enter">
      <PanelHeading eyebrow={props.mode === "story" ? "STORY MODE" : "LOCAL VERSUS"} title={step === "fighter" ? "CHOOSE YOUR FIGHTERS" : step === "stage" ? "CHOOSE THE ARENA" : "READY YOUR CONTROLS"} onBack={props.onBack} />
      {step === "fighter" ? <>
        <div className="versus-preview">
          <button className={`selected-slot ${activeSlot === 0 ? "active" : ""}`} onClick={() => setActiveSlot(0)}><SelectedFighter fighter={p1} label="PLAYER 1" align="left" /></button>
          <div className="versus-mark"><span>ROUND</span><b>VS</b><small>{props.mode === "story" ? "LEVEL UP" : "NO MERCY"}</small></div>
          <button className={`selected-slot ${activeSlot === 1 ? "active" : ""}`} onClick={() => props.mode === "versus" && setActiveSlot(1)}><SelectedFighter fighter={p2} label={props.mode === "story" ? "RIVAL" : "PLAYER 2"} align="right" /></button>
        </div>
        <div className="roster" aria-label="Fighter roster">
          {fighters.map((fighter) => {
            const locked = !props.unlocked.includes(fighter.id);
            const selected = props.p1Id === fighter.id || props.p2Id === fighter.id;
            return <button key={fighter.id} className={`roster-card ${selected ? "selected" : ""} ${locked ? "locked" : ""}`} style={{"--fighter": fighter.color} as React.CSSProperties}
              onClick={() => { if (locked) return props.onShop(); if (activeSlot === 0) props.onP1(fighter.id); else if (props.mode === "versus") props.onP2(fighter.id); }}>
              <CharacterPortrait fighter={fighter} locked={locked} /><strong>{fighter.name}</strong><small>{locked ? (fighter.exclusive ? "SECRET CODE" : `${fighter.price} OH`) : fighter.element}</small>
            </button>;
          })}
        </div>
        <p className="selection-help">{props.mode === "story" ? "Choose your fighter. Your next story rival is assigned by the campaign." : `Selecting for ${activeSlot === 0 ? "Player 1" : "Player 2"}. Choose a portrait above to switch slots.`}</p>
        <button className="cta-button" onClick={() => setStep("stage")}>CHOOSE ARENA <span>→</span></button>
      </> : step === "stage" ? <>
        <div className="stage-grid">
          {stages.map((stage) => <button key={stage.id} className={`stage-card ${props.stageId === stage.id ? "active" : ""}`} onClick={() => props.onStage(stage.id)} style={{"--sky": stage.sky, "--accent": stage.accent} as React.CSSProperties}>
            <div className="stage-mini has-art" style={{backgroundImage: `linear-gradient(color-mix(in srgb, ${stage.sky} 24%, transparent), #05060a42), url('${publicBase}game/neon-rooftop-arena.png')`}}><span className="mini-moon"/><i/><i/><i/><b/></div><small>{stage.place}</small><h3>{stage.name}</h3><span className="selected-label">{props.stageId === stage.id ? "SELECTED" : "SELECT"}</span>
          </button>)}
        </div>
        <div className="stage-actions"><button className="text-button" onClick={() => setStep("fighter")}>← FIGHTERS</button><button className="cta-button fight-cta" onClick={() => setStep("controls")}>SET CONTROLS <span>→</span></button></div>
      </> : <ControlSetup mode={props.mode} gamepads={props.gamepads} onBack={() => setStep("stage")} onFight={props.onFight} />}
    </section>
  );
}

function ControllerStatus({ gamepads }: { gamepads: ConnectedPad[] }) {
  return <div className={`controller-status ${gamepads.length ? "connected" : "waiting"}`}>
    <span className="pad-symbol" aria-hidden="true">⊕</span>
    <div><small>CONTROLLER LINK</small><b>{gamepads.length ? `${gamepads.length} CONTROLLER${gamepads.length > 1 ? "S" : ""} READY` : "PRESS ANY CONTROLLER BUTTON"}</b></div>
    <p>{gamepads.length ? gamepads.map((pad) => pad.name).join(" · ") : "Keyboard remains available while the browser waits for a gamepad."}</p>
    <i className="status-light" aria-hidden="true" />
  </div>;
}

function ControlSetup({ mode, gamepads, onBack, onFight }: { mode: Mode; gamepads: ConnectedPad[]; onBack: () => void; onFight: () => void }) {
  const twoPads = gamepads.length >= 2;
  const onePad = gamepads.length === 1;
  const p1Device = mode === "story" ? (onePad || twoPads ? `Keyboard / ${gamepads[0].name}` : "Keyboard") : twoPads ? gamepads[0].name : "Keyboard";
  const p2Device = mode === "story" ? "CPU Rival" : twoPads ? gamepads[1].name : onePad ? gamepads[0].name : "Controller required";
  return <div className="control-setup">
    <div className="control-intro">
      <span className="pad-symbol large" aria-hidden="true">⊕</span>
      <div><small>INPUT ASSIGNMENT</small><h2>{gamepads.length ? "CONTROLLERS DETECTED" : "WAITING FOR CONTROLLERS"}</h2><p>Connect a controller and press any button. Assignments update automatically without reloading the game.</p></div>
      <div className={`connection-pill ${gamepads.length ? "online" : ""}`}><i /> {gamepads.length} CONNECTED</div>
    </div>
    <div className="device-grid">
      <article className="device-card p1-device"><small>PLAYER 1</small><div className="device-icon">{p1Device.includes("Keyboard") ? "⌨" : "⊕"}</div><h3>{p1Device}</h3><p>{p1Device.includes("Keyboard") ? "Arrows move · Space jumps · D blocks · F/G/H attack" : "Controller assigned automatically"}</p></article>
      <div className="device-vs">VS</div>
      <article className="device-card p2-device"><small>{mode === "story" ? "RIVAL" : "PLAYER 2"}</small><div className="device-icon">{mode === "story" ? "AI" : "⊕"}</div><h3>{p2Device}</h3><p>{mode === "story" ? "Adaptive story-mode opponent" : gamepads.length ? "Controller assigned automatically" : "Connect one gamepad for Player 2"}</p></article>
    </div>
    {gamepads.length > 0 && <div className="pad-map" aria-label="Controller button map"><span><kbd>LS</kbd><b>MOVE</b></span><span><kbd>A/✕</kbd><b>JUMP</b></span><span><kbd>LB/L1</kbd><b>BLOCK</b></span><span><kbd>RT/R2</kbd><b>KICK</b></span><span><kbd>X/□</kbd><b>LIGHT</b></span><span><kbd>Y/△</kbd><b>HEAVY</b></span><span><kbd>B/○</kbd><b>POWER</b></span></div>}
    {!gamepads.length && <p className="controller-warning"><b>{mode === "story" ? "KEYBOARD READY." : "PLAYER 2 NEEDS A CONTROLLER."}</b> {mode === "story" ? "Use arrows, Space, D, F, G, H and R." : "Connect any browser-compatible gamepad, then press a button."}</p>}
    <div className="stage-actions"><button className="text-button" onClick={onBack}>← ARENA</button><button className="cta-button fight-cta" disabled={mode === "versus" && !gamepads.length} onClick={onFight}>ENTER COMBAT <span>⚔</span></button></div>
  </div>;
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

function FightScreen({ mode, gamepads, level, p1, p2, stage, onExit, onRematch, onStoryWin }: { mode: Mode; gamepads: ConnectedPad[]; level: number; p1: Fighter; p2: Fighter; stage: Stage; onExit: () => void; onRematch: () => void; onStoryWin: (reward: number) => void }) {
  const [snapshot, setSnapshot] = useState<CombatSnapshot>({
    fighters: [
      { x: 370, y: 0, vx: 0, vy: 0, facing: 1, health: 100, meter: 35, state: "idle", stateFrame: 0, hitstun: 0, blockstun: 0, moveConnected: false },
      { x: 910, y: 0, vx: 0, vy: 0, facing: -1, health: 100, meter: 35, state: "idle", stateFrame: 0, hitstun: 0, blockstun: 0, moveConnected: false },
    ],
    timer: 60, phase: "ready", winner: null, frame: 0, hit: null,
  });
  const [paused, setPaused] = useState(false);
  const reward = 70 + level * 20;
  const winner = snapshot.winner;

  return (
    <section className={`fight-screen phaser-fight ${snapshot.hit && snapshot.frame - snapshot.hit.frame < 8 ? "impact" : ""}`} style={{"--sky": stage.sky, "--stage-accent": stage.accent} as React.CSSProperties}>
      <PhaserArena mode={mode} level={level} fighters={[p1, p2]} stage={stage} paused={paused} onSnapshot={setSnapshot} onPause={() => setPaused((value) => !value)} />
      <div className="cinema-bars" aria-hidden="true"><span/><span/></div>
      <div className="fight-hud">
        <HealthBar fighter={p1} value={snapshot.fighters[0].health} meter={snapshot.fighters[0].meter} side="left" />
        <div className="round-badge"><small>{mode === "story" ? `LEVEL ${level}` : "VERSUS"}</small><b>{String(snapshot.timer).padStart(2, "0")}</b><span>ROUND 1</span></div>
        <HealthBar fighter={p2} value={snapshot.fighters[1].health} meter={snapshot.fighters[1].meter} side="right" />
      </div>
      <div className="arena-label"><span>{stage.name}</span><small>{stage.place}</small></div>
      <button className="pause-button" onClick={() => setPaused(true)} aria-label="Pause combat">Ⅱ</button>
      {snapshot.phase === "ready" && <div className="fight-callout">READY</div>}
      {snapshot.hit && snapshot.frame - snapshot.hit.frame < 18 && <div className="combat-notice">{snapshot.hit.blocked ? "BLOCK" : snapshot.hit.action === "special" ? "ELEMENTAL HIT" : "HIT"}</div>}
      <div className="fight-controls">
        <FightControlLegend player="P1" controller={mode === "story" && gamepads.length > 0} />
        {mode === "versus" && <span className="controller-legend"><b>P2</b> <kbd>GAMEPAD</kbd> REQUIRED · <kbd>LS</kbd> MOVE · <kbd>A/✕</kbd> JUMP · <kbd>X/□</kbd> LIGHT · <kbd>Y/△</kbd> HEAVY</span>}
      </div>
      {paused && <div className="overlay"><div className="result-card pause-card"><small>COMBAT PAUSED</small><h2>CATCH YOUR BREATH</h2><button className="cta-button" onClick={() => setPaused(false)}>RESUME</button><button className="text-button" onClick={onExit}>EXIT TO MENU</button></div></div>}
      {winner !== null && <div className="overlay"><div className="result-card"><span className="result-glyph">{winner === 0 && mode === "story" ? "盟" : "勝"}</span><small>{winner === 0 ? "VICTORY" : "DEFEAT"}</small><h2>{winner === 0 && mode === "story" ? "FRIENDSHIP FORGED" : `${winner === 0 ? p1.name : p2.name} WINS`}</h2><p>{winner === 0 && mode === "story" ? `${p2.name} respects your strength and joins your journey. The next rival will be even stronger.` : "A decisive battle in the Immortal arena."}</p>{winner === 0 && mode === "story" && <div className="reward"><span className="oh-coin">OH</span><b>+{reward}</b> VICTORY REWARD</div>}<button className="cta-button" onClick={() => winner === 0 && mode === "story" ? onStoryWin(reward) : onRematch()}>{winner === 0 && mode === "story" ? "NEXT LEVEL" : "REMATCH"} <span>→</span></button><button className="text-button" onClick={onExit}>BACK TO MENU</button></div></div>}
    </section>
  );
}
function DynamicCity() { return <div className="dynamic-city" aria-hidden="true"><div className="moon"/><div className="cloud cloud-1"/><div className="cloud cloud-2"/><div className="skyline back">{Array.from({length: 14}, (_, i) => <i key={i}/>)}</div><div className="skyline front">{Array.from({length: 10}, (_, i) => <i key={i}/>)}</div><div className="temple-roof"/><div className="ember-field">{Array.from({length: 12}, (_, i) => <i key={i}/>)}</div></div>; }

function CharacterPortrait({ fighter, locked = false }: { fighter: Fighter; locked?: boolean }) {
  const col = fighter.portraitIndex % 4;
  const row = Math.floor(fighter.portraitIndex / 4);
  const publicBase = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return <span className={`character-portrait ${locked ? "portrait-locked" : ""}`} role="img" aria-label={`${fighter.name}, ${fighter.title}`} style={{ backgroundImage: `url('${publicBase}fighter-atlas.png')`, backgroundPosition: `${col * 33.333}% ${row * 100}%` }}><i>{locked ? "◇" : ""}</i></span>;
}

function HealthBar({ fighter, value, meter, side }: { fighter: Fighter; value: number; meter: number; side: "left" | "right" }) { return <div className={`health-block ${side}`}><div className="fighter-hud"><CharacterPortrait fighter={fighter}/><div><small>{side === "left" ? "PLAYER ONE" : "CHALLENGER"}</small><strong>{fighter.name}</strong></div></div><div className="health-track"><i style={{width: `${value}%`, background: fighter.color}}/></div><div className="power-track"><i style={{width: `${meter}%`, background: fighter.glow}}/></div></div>; }

function SelectedFighter({ fighter, label, align }: { fighter: Fighter; label: string; align: "left" | "right" }) { return <div className={`selected-fighter ${align}`} style={{"--fighter": fighter.color, "--glow": fighter.glow} as React.CSSProperties}><div className="selected-body"><CharacterPortrait fighter={fighter}/></div><div className="selected-copy"><small>{label} · {fighter.element}</small><h2>{fighter.name}</h2><p>{fighter.title}</p><span>{fighter.power}</span></div></div>; }

function PanelHeading({ eyebrow, title, onBack }: { eyebrow: string; title: string; onBack: () => void }) { return <div className="panel-heading"><button className="back-button" onClick={onBack}>← <span>BACK</span></button><div><small>{eyebrow}</small><h1>{title}</h1></div><span className="heading-rule"/></div>; }

function FightControlLegend({ player, controller }: { player: "P1" | "P2"; controller: boolean }) {
  if (controller) return <span className="controller-legend"><b>{player}</b> <kbd>LS</kbd> MOVE · <kbd>A/✕</kbd> JUMP · <kbd>LB</kbd> BLOCK · <kbd>X/□</kbd> LIGHT · <kbd>Y/△</kbd> HEAVY · <kbd>RT</kbd> KICK · <kbd>B/○</kbd> POWER</span>;
  return <span><b>P1</b> <kbd>← ↓ →</kbd> MOVE/CROUCH · <kbd>SPACE</kbd> JUMP · <kbd>D</kbd> BLOCK · <kbd>F</kbd> LIGHT · <kbd>G</kbd> HEAVY · <kbd>H</kbd> KICK · <kbd>R</kbd> POWER</span>;
}
