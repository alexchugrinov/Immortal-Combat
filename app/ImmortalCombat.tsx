"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThreeArena } from "./ThreeArena";

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
      <div className="season-card"><small>SEASON 01</small><b>THE FIRST OATH</b><span>7 fighters · 3 arenas · true 3D combat</span></div>
      <p className="home-hint">FULL KEYBOARD COMBAT · OPTIONAL CONTROLLERS · NO ACCOUNT NEEDED</p>
    </section>
  );
}

function ModeScreen({ gamepads, onBack, onChoose }: { gamepads: ConnectedPad[]; onBack: () => void; onChoose: (mode: Mode) => void }) {
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
          <span className="mode-number">02</span><div className="mode-art">対</div><small>2 PLAYERS · CONTROLLER READY</small><h2>LOCAL VERSUS</h2>
          <p>Challenge a friend on one keyboard, mix keyboard and controller, or connect two controllers.</p>
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
            <div className="stage-mini"><span className="mini-moon"/><i/><i/><i/><b/></div><small>{stage.place}</small><h3>{stage.name}</h3><span className="selected-label">{props.stageId === stage.id ? "SELECTED" : "SELECT"}</span>
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
  const p1Device = mode === "story" ? (onePad || twoPads ? gamepads[0].name : "Keyboard") : twoPads ? gamepads[0].name : "Keyboard";
  const p2Device = mode === "story" ? "CPU Rival" : twoPads ? gamepads[1].name : onePad ? gamepads[0].name : "Keyboard — right side";
  return <div className="control-setup">
    <div className="control-intro">
      <span className="pad-symbol large" aria-hidden="true">⊕</span>
      <div><small>INPUT ASSIGNMENT</small><h2>{gamepads.length ? "CONTROLLERS DETECTED" : "WAITING FOR CONTROLLERS"}</h2><p>Connect a controller and press any button. Assignments update automatically without reloading the game.</p></div>
      <div className={`connection-pill ${gamepads.length ? "online" : ""}`}><i /> {gamepads.length} CONNECTED</div>
    </div>
    <div className="device-grid">
      <article className="device-card p1-device"><small>PLAYER 1</small><div className="device-icon">{p1Device === "Keyboard" ? "⌨" : "⊕"}</div><h3>{p1Device}</h3><p>{p1Device === "Keyboard" ? "WASD · Q/E dash/guard · R/T/F/G attacks" : "Controller assigned automatically"}</p></article>
      <div className="device-vs">VS</div>
      <article className="device-card p2-device"><small>{mode === "story" ? "RIVAL" : "PLAYER 2"}</small><div className="device-icon">{p2Device.includes("Keyboard") ? "⌨" : mode === "story" ? "AI" : "⊕"}</div><h3>{p2Device}</h3><p>{mode === "story" ? "Adaptive story-mode opponent" : p2Device.includes("Keyboard") ? "Arrows · U/I dash/guard · O/L/J/K attacks" : "Controller assigned automatically"}</p></article>
    </div>
    {gamepads.length > 0 && <div className="pad-map" aria-label="Controller button map"><span><kbd>LS</kbd><b>MOVE</b></span><span><kbd>A/✕</kbd><b>JUMP</b></span><span><kbd>LB/L1</kbd><b>GUARD</b></span><span><kbd>RB/R1</kbd><b>DASH</b></span><span><kbd>RT/R2</kbd><b>KICK</b></span><span><kbd>X/□</kbd><b>QUICK</b></span><span><kbd>Y/△</kbd><b>HEAVY</b></span><span><kbd>B/○</kbd><b>POWER</b></span></div>}
    {!gamepads.length && <p className="controller-warning"><b>FULL KEYBOARD MODE.</b> Player 1 uses the left side; Player 2 uses arrows plus the right-side letter cluster.</p>}
    <div className="stage-actions"><button className="text-button" onClick={onBack}>← ARENA</button><button className="cta-button fight-cta" onClick={onFight}>ENTER COMBAT <span>⚔</span></button></div>
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

type CombatMove = "jab" | "heavy" | "kick" | "power";

function FightScreen({ mode, gamepads, level, p1, p2, stage, onExit, onRematch, onStoryWin }: { mode: Mode; gamepads: ConnectedPad[]; level: number; p1: Fighter; p2: Fighter; stage: Stage; onExit: () => void; onRematch: () => void; onStoryWin: (reward: number) => void }) {
  const [health, setHealth] = useState<[number, number]>([100, 100]);
  const [meter, setMeter] = useState<[number, number]>([35, 35]);
  const [positions, setPositions] = useState<[number, number]>([28, 72]);
  const [jumping, setJumping] = useState<[boolean, boolean]>([false, false]);
  const [crouching, setCrouching] = useState<[boolean, boolean]>([false, false]);
  const [blocking, setBlocking] = useState<[boolean, boolean]>([false, false]);
  const [moving, setMoving] = useState<[boolean, boolean]>([false, false]);
  const [effect, setEffect] = useState<{ side: 0 | 1; type: ElementName } | null>(null);
  const [hitSide, setHitSide] = useState<0 | 1 | null>(null);
  const [roundText, setRoundText] = useState("ROUND 1");
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [paused, setPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [combo, setCombo] = useState<{ side: 0 | 1; count: number } | null>(null);
  const [combatNotice, setCombatNotice] = useState("");
  const [action, setAction] = useState<{ side: 0 | 1; kind: CombatMove; stamp: number; combo: number } | null>(null);
  const cooldown = useRef<[number, number]>([0, 0]);
  const dashCooldown = useRef<[number, number]>([0, 0]);
  const comboRef = useRef<[{ count: number; expires: number }, { count: number; expires: number }]>([{ count: 0, expires: 0 }, { count: 0, expires: 0 }]);
  const heldKeys = useRef(new Set<string>());
  const padButtonsRef = useRef<[boolean[], boolean[]]>([[], []]);
  const padGuardRef = useRef<[boolean, boolean]>([false, false]);
  const positionsRef = useRef(positions);
  const crouchingRef = useRef(crouching);
  const blockingRef = useRef(blocking);
  const movingRef = useRef(moving);
  const healthRef = useRef(health);
  const meterRef = useRef(meter);
  const winnerRef = useRef(winner);
  const pausedRef = useRef(paused);
  const p1PadIndex = mode === "story" ? gamepads[0]?.index ?? null : gamepads.length >= 2 ? gamepads[0].index : null;
  const p2PadIndex = mode === "versus" ? gamepads.length >= 2 ? gamepads[1].index : gamepads[0]?.index ?? null : null;
  const started = roundText === "";
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { crouchingRef.current = crouching; }, [crouching]);
  useEffect(() => { blockingRef.current = blocking; }, [blocking]);
  useEffect(() => { movingRef.current = moving; }, [moving]);
  useEffect(() => { healthRef.current = health; }, [health]);
  useEffect(() => { meterRef.current = meter; }, [meter]);
  useEffect(() => { winnerRef.current = winner; }, [winner]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const first = window.setTimeout(() => setRoundText("FIGHT"), 800);
    const second = window.setTimeout(() => setRoundText(""), 1550);
    return () => { window.clearTimeout(first); window.clearTimeout(second); };
  }, []);

  const finish = useCallback((side: 0 | 1) => {
    if (winnerRef.current !== null) return;
    winnerRef.current = side;
    setWinner(side);
    setRoundText("K.O.");
    window.setTimeout(() => setRoundText(""), 1200);
  }, []);

  useEffect(() => {
    if (!started || paused || winner !== null) return;
    const timer = window.setInterval(() => setTimeLeft((value) => {
      if (value > 1) return value - 1;
      const [left, right] = healthRef.current;
      window.setTimeout(() => finish(left >= right ? 0 : 1), 0);
      return 0;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [finish, paused, started, winner]);

  const move = useCallback((side: 0 | 1, delta: number) => {
    if (pausedRef.current || winnerRef.current !== null) return;
    setPositions((current) => {
      const next: [number, number] = [...current];
      const other = side === 0 ? 1 : 0;
      next[side] = Math.max(10, Math.min(90, next[side] + delta));
      if (Math.abs(next[side] - next[other]) < 7) next[side] = current[side];
      return next;
    });
  }, []);

  const jump = useCallback((side: 0 | 1) => {
    if (jumping[side] || crouchingRef.current[side] || blockingRef.current[side] || pausedRef.current || winnerRef.current !== null) return;
    setJumping((current) => { const next: [boolean, boolean] = [...current]; next[side] = true; return next; });
    window.setTimeout(() => setJumping((current) => { const next: [boolean, boolean] = [...current]; next[side] = false; return next; }), 650);
  }, [jumping]);

  const dash = useCallback((side: 0 | 1) => {
    const now = Date.now();
    if (now < dashCooldown.current[side] || crouchingRef.current[side] || blockingRef.current[side] || now < cooldown.current[side] || pausedRef.current || winnerRef.current !== null) return;
    dashCooldown.current[side] = now + 720;
    const other = side === 0 ? 1 : 0;
    const toward = positionsRef.current[other] > positionsRef.current[side] ? 1 : -1;
    move(side, toward * 7.5);
    setCombatNotice("DASH");
    window.setTimeout(() => setCombatNotice(""), 240);
  }, [move]);

  const rumble = useCallback((side: 0 | 1, duration: number, strong: number, weak: number) => {
    const padIndex = side === 0 ? p1PadIndex : p2PadIndex;
    if (padIndex === null) return;
    const pad = navigator.getGamepads?.()[padIndex] as (Gamepad & { vibrationActuator?: { playEffect: (type: string, options: { duration: number; strongMagnitude: number; weakMagnitude: number }) => Promise<unknown> } }) | null;
    void pad?.vibrationActuator?.playEffect("dual-rumble", { duration, strongMagnitude: strong, weakMagnitude: weak }).catch(() => undefined);
  }, [p1PadIndex, p2PadIndex]);

  const landHit = useCallback((attacker: 0 | 1, kind: CombatMove, baseDamage: number, reach: number, projectile = false) => {
    if (winnerRef.current !== null || pausedRef.current) return;
    const target = attacker === 0 ? 1 : 0;
    const distance = Math.abs(positionsRef.current[0] - positionsRef.current[1]);
    if (!projectile && distance > reach) {
      comboRef.current[attacker] = { count: 0, expires: 0 };
      setCombatNotice("WHIFF");
      window.setTimeout(() => setCombatNotice(""), 260);
      return;
    }
    if (crouchingRef.current[target] && (kind === "jab" || kind === "heavy")) {
      comboRef.current[attacker] = { count: 0, expires: 0 };
      setCombatNotice("DUCKED");
      window.setTimeout(() => setCombatNotice(""), 300);
      return;
    }
    const guarded = blockingRef.current[target];
    const storyBonus = mode === "story" && attacker === 1 ? Math.min(4, Math.floor(level / 2)) : 0;
    const dealt = guarded ? Math.max(1, Math.ceil((baseDamage + storyBonus) * .18)) : baseDamage + storyBonus;
    const now = Date.now();
    const chain = comboRef.current[attacker];
    chain.count = now < chain.expires ? Math.min(9, chain.count + 1) : 1;
    chain.expires = now + 900;
    setCombo({ side: attacker, count: chain.count });
    window.setTimeout(() => { if (Date.now() >= comboRef.current[attacker].expires) setCombo(null); }, 920);
    setCombatNotice(guarded ? "GUARD" : projectile ? "ELEMENTAL HIT" : chain.count >= 3 ? "CHAIN" : "CLEAN HIT");
    window.setTimeout(() => setCombatNotice(""), 360);
    setHitSide(target);
    window.setTimeout(() => setHitSide(null), guarded ? 100 : 230);
    rumble(target, guarded ? 80 : projectile ? 260 : 150, guarded ? .12 : projectile ? .85 : .5, guarded ? .18 : .62);
    rumble(attacker, projectile ? 190 : 75, projectile ? .34 : .08, projectile ? .55 : .2);
    if (!guarded) move(target, attacker === 0 ? 2.4 : -2.4);
    setHealth((current) => {
      const next: [number, number] = [...current];
      next[target] = Math.max(0, next[target] - dealt);
      if (next[target] === 0) window.setTimeout(() => finish(attacker), 120);
      return next;
    });
    setMeter((current) => {
      const next: [number, number] = [...current];
      next[attacker] = Math.min(100, next[attacker] + (projectile ? 4 : 10));
      next[target] = Math.min(100, next[target] + (guarded ? 3 : 7));
      return next;
    });
  }, [finish, level, mode, move, rumble]);

  const attack = useCallback((side: 0 | 1, kind: CombatMove = "jab") => {
    const now = Date.now();
    if (now < cooldown.current[side] || winnerRef.current !== null || pausedRef.current || roundText !== "") return;
    const moveData: Record<CombatMove, { damage: number; reach: number; startup: number; recovery: number }> = {
      jab: { damage: 6, reach: 14, startup: 95, recovery: 250 },
      heavy: { damage: 11, reach: 16, startup: 230, recovery: 540 },
      kick: { damage: 9, reach: 18, startup: 170, recovery: 430 },
      power: { damage: 19, reach: 100, startup: 420, recovery: 980 },
    };
    const data = moveData[kind];
    if (kind === "power") {
      if (meterRef.current[side] < 40) {
        setCombatNotice("NEED 40 POWER");
        window.setTimeout(() => setCombatNotice(""), 500);
        return;
      }
      setMeter((current) => { const next: [number, number] = [...current]; next[side] -= 40; return next; });
      setEffect({ side, type: side === 0 ? p1.element : p2.element });
      window.setTimeout(() => setEffect(null), 720);
    }
    cooldown.current[side] = now + data.recovery;
    const chain = comboRef.current[side].count;
    setAction({ side, kind, stamp: now, combo: chain });
    setBlocking((current) => { const next: [boolean, boolean] = [...current]; next[side] = false; return next; });
    window.setTimeout(() => landHit(side, kind, data.damage, data.reach, kind === "power"), data.startup);
  }, [landHit, p1.element, p2.element, roundText]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(2, (now - last) / 16.67); last = now;
      const movingNow: [boolean, boolean] = [false, false];
      if (!pausedRef.current && winnerRef.current === null && roundText === "") {
        if (!crouchingRef.current[0] && !blockingRef.current[0]) {
          if (heldKeys.current.has("a")) { move(0, -0.58 * dt); movingNow[0] = true; }
          if (heldKeys.current.has("d")) { move(0, 0.58 * dt); movingNow[0] = true; }
        }
        if (mode === "versus") {
          if (!crouchingRef.current[1] && !blockingRef.current[1]) {
            if (heldKeys.current.has("arrowleft")) { move(1, -0.58 * dt); movingNow[1] = true; }
            if (heldKeys.current.has("arrowright")) { move(1, 0.58 * dt); movingNow[1] = true; }
          }
        }
      }
      const pads = navigator.getGamepads?.() ?? [];
      const readPad = (side: 0 | 1, padIndex: number | null) => {
        const pad = padIndex === null ? null : pads[padIndex];
        if (!pad?.connected) {
          if (padGuardRef.current[side]) {
            padGuardRef.current[side] = false;
            setBlocking((value) => { const next: [boolean, boolean] = [...value]; next[side] = side === 0 ? heldKeys.current.has("s") : heldKeys.current.has("arrowdown"); return next; });
          }
          return;
        }
        const previous = padButtonsRef.current[side];
        const pressed = (button: number) => Boolean(pad.buttons[button]?.pressed);
        const edge = (button: number) => pressed(button) && !previous[button];
        if (!pausedRef.current && winnerRef.current === null && roundText === "") {
          const stick = Math.abs(pad.axes[0] ?? 0) > .18 ? pad.axes[0] : pressed(14) ? -1 : pressed(15) ? 1 : 0;
          if (Math.abs(stick) > .18 && !crouchingRef.current[side] && !blockingRef.current[side]) { move(side, stick * .72 * dt); movingNow[side] = true; }
          if (edge(0)) jump(side);
          if (edge(2)) attack(side, "jab");
          if (edge(3)) attack(side, "heavy");
          if (edge(1)) attack(side, "power");
          if (edge(5)) dash(side);
          if (edge(7)) attack(side, "kick");
        }
        if (edge(9)) setPaused((value) => !value);
        const keyboardGuard = side === 0 ? heldKeys.current.has("e") : heldKeys.current.has("i");
        const guard = pressed(4) || pressed(6);
        if (guard !== padGuardRef.current[side]) {
          padGuardRef.current[side] = guard;
          setBlocking((value) => { const next: [boolean, boolean] = [...value]; next[side] = guard || keyboardGuard; return next; });
        }
        const keyboardCrouch = side === 0 ? heldKeys.current.has("s") : heldKeys.current.has("arrowdown");
        const padCrouch = keyboardCrouch || (pad.axes[1] ?? 0) > .55 || pressed(13);
        setCrouching((value) => value[side] === padCrouch ? value : side === 0 ? [padCrouch, value[1]] : [value[0], padCrouch]);
        padButtonsRef.current[side] = pad.buttons.map((button) => button.pressed);
      };
      readPad(0, p1PadIndex);
      if (mode === "versus") readPad(1, p2PadIndex);
      if (movingRef.current[0] !== movingNow[0] || movingRef.current[1] !== movingNow[1]) {
        movingRef.current = movingNow;
        setMoving(movingNow);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [attack, dash, jump, mode, move, p1PadIndex, p2PadIndex, roundText]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
      if (key === "escape") { setPaused((value) => !value); return; }
      heldKeys.current.add(key);
      if (event.repeat || pausedRef.current || winnerRef.current !== null) return;
      if (key === "w") jump(0);
      if (key === "s") setCrouching((value) => [true, value[1]]);
      if (key === "e") setBlocking((value) => [true, value[1]]);
      if (key === "q") dash(0);
      if (key === "f") attack(0, "jab");
      if (key === "g") attack(0, "heavy");
      if (key === "r") attack(0, "kick");
      if (key === "t") attack(0, "power");
      if (mode === "versus") {
        if (key === "arrowup") jump(1);
        if (key === "arrowdown") setCrouching((value) => [value[0], true]);
        if (key === "i") setBlocking((value) => [value[0], true]);
        if (key === "u") dash(1);
        if (key === "j") attack(1, "jab");
        if (key === "k") attack(1, "heavy");
        if (key === "o") attack(1, "kick");
        if (key === "l") attack(1, "power");
      }
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase(); heldKeys.current.delete(key);
      if (key === "s") setCrouching((value) => [false, value[1]]);
      if (key === "e") setBlocking((value) => [false, value[1]]);
      if (key === "arrowdown") setCrouching((value) => [value[0], false]);
      if (key === "i") setBlocking((value) => [value[0], false]);
    };
    const blur = () => { heldKeys.current.clear(); setBlocking([false, false]); setCrouching([false, false]); setMoving([false, false]); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, [attack, dash, jump, mode]);

  useEffect(() => {
    if (mode !== "story" || paused || winner !== null || !started) return;
    const ai = window.setInterval(() => {
      const [one, two] = positionsRef.current;
      const distance = Math.abs(one - two);
      const toward = two > one ? -1 : 1;
      const roll = Math.random();
      if (distance > 15) {
        if (meterRef.current[1] >= 40 && roll < .1 + level * .012) attack(1, "power");
        else move(1, toward * (1.8 + Math.min(1.7, level * .12)));
      } else if (roll < .18) {
        setBlocking((value) => [value[0], true]);
        window.setTimeout(() => setBlocking((value) => [value[0], false]), 360 + Math.random() * 260);
      } else attack(1, roll > .72 ? "heavy" : roll > .46 ? "kick" : "jab");
    }, Math.max(300, 650 - level * 28));
    return () => window.clearInterval(ai);
  }, [attack, level, mode, move, paused, started, winner]);

  const reward = 70 + level * 20;
  return (
    <section className={`fight-screen ${hitSide !== null ? "impact" : ""}`} style={{"--sky": stage.sky, "--stage-accent": stage.accent} as React.CSSProperties}>
      <ArenaBackground stage={stage} />
      <ThreeArena stage={stage} fighters={[p1, p2]} positions={positions} jumping={jumping} crouching={crouching} blocking={blocking} moving={moving} hitSide={hitSide} action={action} />
      <div className="cinema-bars" aria-hidden="true"><span/><span/></div>
      <div className="fight-hud">
        <HealthBar fighter={p1} value={health[0]} meter={meter[0]} side="left" />
        <div className="round-badge"><small>{mode === "story" ? `LEVEL ${level}` : "VERSUS"}</small><b>{String(timeLeft).padStart(2, "0")}</b><span>ROUND 1</span></div>
        <HealthBar fighter={p2} value={health[1]} meter={meter[1]} side="right" />
      </div>
      <div className="arena-label"><span>{stage.name}</span><small>{stage.place}</small></div>
      <button className="pause-button" onClick={() => setPaused(true)} aria-label="Pause combat">Ⅱ</button>
      {effect && <PowerEffect effect={effect} from={positions[effect.side]} to={positions[effect.side === 0 ? 1 : 0]} />}
      {roundText && <div className="fight-callout">{roundText}</div>}
      {combatNotice && <div className="combat-notice">{combatNotice}</div>}
      {combo && combo.count > 1 && <div className={`combo-readout side-${combo.side}`}><b>{combo.count}</b><span>HIT<br/>COMBO</span></div>}
      <div className="fight-controls"><FightControlLegend player="P1" controller={p1PadIndex !== null} />{mode === "versus" && <FightControlLegend player="P2" controller={p2PadIndex !== null} />}</div>
      <TouchControls onLeft={() => move(0, -3)} onRight={() => move(0, 3)} onJump={() => jump(0)} onHit={() => attack(0, "jab")} onPower={() => attack(0, "power")} />
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
  const publicBase = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return <span className={`character-portrait ${locked ? "portrait-locked" : ""}`} role="img" aria-label={`${fighter.name}, ${fighter.title}`} style={{ backgroundImage: `url('${publicBase}fighter-atlas.png')`, backgroundPosition: `${col * 33.333}% ${row * 100}%` }}><i>{locked ? "◇" : ""}</i></span>;
}

function PowerEffect({ effect, from, to }: { effect: {side: 0 | 1; type: ElementName}; from: number; to: number }) { return <div className={`power-effect power-${effect.type}`} style={{left: `${from + (to - from) * .45}%`} as React.CSSProperties}><span>{effect.type === "lightning" ? "ϟ" : effect.type === "ice" ? "✦" : effect.type === "wind" ? "〰" : "●"}</span><i/><b/></div>; }

function HealthBar({ fighter, value, meter, side }: { fighter: Fighter; value: number; meter: number; side: "left" | "right" }) { return <div className={`health-block ${side}`}><div className="fighter-hud"><CharacterPortrait fighter={fighter}/><div><small>{side === "left" ? "PLAYER ONE" : "CHALLENGER"}</small><strong>{fighter.name}</strong></div></div><div className="health-track"><i style={{width: `${value}%`, background: fighter.color}}/></div><div className="power-track"><i style={{width: `${meter}%`, background: fighter.glow}}/></div></div>; }

function SelectedFighter({ fighter, label, align }: { fighter: Fighter; label: string; align: "left" | "right" }) { return <div className={`selected-fighter ${align}`} style={{"--fighter": fighter.color, "--glow": fighter.glow} as React.CSSProperties}><div className="selected-body"><CharacterPortrait fighter={fighter}/></div><div className="selected-copy"><small>{label} · {fighter.element}</small><h2>{fighter.name}</h2><p>{fighter.title}</p><span>{fighter.power}</span></div></div>; }

function PanelHeading({ eyebrow, title, onBack }: { eyebrow: string; title: string; onBack: () => void }) { return <div className="panel-heading"><button className="back-button" onClick={onBack}>← <span>BACK</span></button><div><small>{eyebrow}</small><h1>{title}</h1></div><span className="heading-rule"/></div>; }

function FightControlLegend({ player, controller }: { player: "P1" | "P2"; controller: boolean }) {
  if (controller) return <span className="controller-legend"><b>{player}</b> <kbd>LS</kbd> MOVE/CROUCH · <kbd>A/✕</kbd> JUMP · <kbd>LB</kbd> GUARD · <kbd>RB</kbd> DASH · <kbd>RT</kbd> KICK · <kbd>X/□</kbd> QUICK · <kbd>Y/△</kbd> HEAVY · <kbd>B/○</kbd> POWER</span>;
  return player === "P1"
    ? <span><b>P1</b> <kbd>WASD</kbd> MOVE/CROUCH · <kbd>Q</kbd> DASH · <kbd>E</kbd> GUARD · <kbd>F</kbd> QUICK · <kbd>G</kbd> HEAVY · <kbd>R</kbd> KICK · <kbd>T</kbd> POWER</span>
    : <span><b>P2</b> <kbd>ARROWS</kbd> MOVE/CROUCH · <kbd>U</kbd> DASH · <kbd>I</kbd> GUARD · <kbd>J</kbd> QUICK · <kbd>K</kbd> HEAVY · <kbd>O</kbd> KICK · <kbd>L</kbd> POWER</span>;
}

function TouchControls({ onLeft, onRight, onJump, onHit, onPower }: { onLeft: () => void; onRight: () => void; onJump: () => void; onHit: () => void; onPower: () => void }) { return <div className="touch-controls"><div><button onPointerDown={onLeft}>←</button><button onPointerDown={onRight}>→</button><button onPointerDown={onJump}>↑</button></div><div><button onPointerDown={onHit}>HIT</button><button className="power-touch" onPointerDown={onPower}>POWER</button></div></div>; }
