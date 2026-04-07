import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BALANCE,
  DEFAULT_NOTICE,
  EVENT_TYPES,
  FLOOR,
  GRID_SIZE,
  LEVEL_MODIFIERS,
  MAX_LEVELS,
  META_STORAGE_KEY,
  TILE,
  WALL,
  createInitialCombatState,
  createInitialGameState,
  createInitialHudState,
  styles,
} from "./dungeonRoll/config";
import { cleanupAudioAsset, createAudioAsset } from "./dungeonRoll/audio";
import {
  clamp,
  coordKey,
  getAssetUrlCandidates,
  manhattanDistance,
  pickRandom,
  rand,
} from "./dungeonRoll/utils";

function mergeStyle(base, extra = {}) {
  return { ...(base || {}), ...extra };
}

function getMaxLevelsForDifficulty(difficulty) {
  if (difficulty === "easy") return 10;
  if (difficulty === "medium") return 25;
  if (difficulty === "hard") return 50;
  return MAX_LEVELS;
}

function PixelShopkeeperIcon() {
  return (
    <div
      style={{
        width: 92,
        height: 92,
        position: "relative",
        margin: "0 auto 12px",
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          background: "#2563eb",
          position: "absolute",
          top: 18,
          left: 21,
          border: "4px solid #93c5fd",
          boxShadow: "0 0 0 4px #0f172a",
        }}
      />
      <div
        style={{
          width: 28,
          height: 10,
          background: "#38bdf8",
          position: "absolute",
          top: 8,
          left: 32,
        }}
      />
      <div
        style={{
          width: 8,
          height: 8,
          background: "#fff",
          position: "absolute",
          top: 34,
          left: 34,
        }}
      />
      <div
        style={{
          width: 8,
          height: 8,
          background: "#fff",
          position: "absolute",
          top: 34,
          left: 50,
        }}
      />
      <div
        style={{
          width: 24,
          height: 6,
          background: "#0f172a",
          position: "absolute",
          top: 54,
          left: 34,
        }}
      />
    </div>
  );
}

function StartMenuScreen({
  menuBgStyle,
  menuOverlayStyle,
  menuPanelStyle,
  menuButtonColumnStyle,
  menuButtonStyle,
  menuDotStyle,
  startMenuItems,
  menuIndex,
  setMenuIndex,
  onStart,
  onOptions,
  onExit,
}) {
  return (
    <div style={menuBgStyle}>
      <div style={menuOverlayStyle} />
      <div style={menuPanelStyle}>
        <div style={menuButtonColumnStyle}>
          {startMenuItems.map((item, index) => {
            const active = menuIndex === index;

            function handleClick() {
              setMenuIndex(index);

              if (item === "START") onStart();
              else if (item === "OPTIONS") onOptions();
              else if (item === "EXIT") onExit();
            }

            return (
              <button
                key={item}
                onMouseEnter={() => setMenuIndex(index)}
                onClick={handleClick}
                style={menuButtonStyle(active)}
              >
                <span style={menuDotStyle}>•</span>
                {item}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DifficultyMenuScreen({
  menuBgStyle,
  menuOverlayStyle,
  difficultyItems,
  difficultyIndex,
  setDifficultyIndex,
  btnStyle,
  onBack,
  onChooseDifficulty,
}) {
  return (
    <div style={menuBgStyle}>
      <div style={menuOverlayStyle} />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "rgba(2, 6, 23, 0.88)",
            border: "2px solid rgba(255,255,255,0.18)",
            borderRadius: 18,
            padding: 32,
            width: "min(520px, 92%)",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ fontSize: 38, fontWeight: 900, marginBottom: 20 }}>
            Select Difficulty
          </div>

          {difficultyItems.map((item, index) => {
            const active = difficultyIndex === index;
            return (
              <button
                key={item.key}
                onMouseEnter={() => setDifficultyIndex(index)}
                style={{
                  ...btnStyle,
                  width: "100%",
                  marginBottom: 12,
                  border: active
                    ? "2px solid #facc15"
                    : "1px solid rgba(255,255,255,0.15)",
                  boxShadow: active ? "0 0 14px rgba(250,204,21,0.35)" : "none",
                }}
                onClick={() => {
                  if (item.key === "back") onBack();
                  else onChooseDifficulty(item.key);
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OptionsMenuScreen({
  menuBgStyle,
  menuOverlayStyle,
  audioVolume,
  setAudioVolume,
  keyBindings,
  rebindKey,
  setRebindKey,
  btnStyle,
  onBack,
}) {
  return (
    <div style={menuBgStyle}>
      <div style={menuOverlayStyle} />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "rgba(2, 6, 23, 0.88)",
            border: "2px solid rgba(255,255,255,0.18)",
            borderRadius: 18,
            padding: 32,
            width: "min(560px, 92%)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              fontSize: 38,
              fontWeight: 900,
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            Options
          </div>

          <div style={{ margin: "24px 0" }}>
            <label style={{ fontSize: 20, marginBottom: 8, display: "block" }}>
              Audio Volume
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={audioVolume}
              onChange={(e) => setAudioVolume(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 16, marginTop: 8 }}>
              {Math.round(audioVolume * 100)}%
            </div>
          </div>

          <div style={{ margin: "24px 0" }}>
            <label style={{ fontSize: 20, marginBottom: 8, display: "block" }}>
              Key Bindings
            </label>
            {Object.entries(keyBindings).map(([action, key]) => (
              <div key={action} style={{ margin: "10px 0", fontSize: 16 }}>
                <span style={{ fontWeight: "bold" }}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}:
                </span>
                {rebindKey === action ? (
                  <span style={{ marginLeft: 8, color: "#38bdf8" }}>
                    Press any key...
                  </span>
                ) : (
                  <span style={{ marginLeft: 8 }}>{key}</span>
                )}
                <button
                  style={{ ...btnStyle, fontSize: 14, marginLeft: 12 }}
                  onClick={() => setRebindKey(action)}
                >
                  Rebind
                </button>
              </div>
            ))}
            {rebindKey && (
              <div style={{ fontSize: 14, color: "#ef4444", marginTop: 8 }}>
                Press a key to set binding for <b>{rebindKey}</b>
              </div>
            )}
          </div>

          <button style={{ ...btnStyle, width: "100%" }} onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

function ShopModal({ open, shopItems, playerInventory, btnStyle, onBuy, onClose }) {
  if (!open) return null;

  return (
    <div
      style={mergeStyle(styles?.modal, {
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: 20,
      })}
    >
      <div
        style={{
          width: "min(680px, 100%)",
          background: "linear-gradient(180deg, #1e293b, #0f172a)",
          border: "4px solid #38bdf8",
          boxShadow: "0 0 0 4px #0f172a, 0 0 0 8px #1d4ed8, 0 18px 60px rgba(0,0,0,0.6)",
          borderRadius: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <PixelShopkeeperIcon />
        <div style={{ fontSize: 18, color: "#38bdf8", marginTop: 8 }}>Shopkeeper</div>

        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
          Welcome to the NES Shop!
        </div>
        <div style={{ fontSize: 16, marginBottom: 18 }}>Choose one item to buy:</div>

        <div style={{ display: "grid", gap: 18 }}>
          {shopItems.map((item) => {
            const disabled = playerInventory[item.id] || playerInventory._shopBought;
            return (
              <div
                key={item.id}
                style={{
                  background: "#0f172a",
                  border: "2px solid #38bdf8",
                  borderRadius: 8,
                  padding: "14px 10px",
                  boxShadow: "0 0 8px #2563eb",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  fontSize: 16,
                }}
              >
                <div style={{ fontWeight: 700, color: "#fff", fontSize: 18 }}>{item.name}</div>
                <div style={{ color: "#facc15", fontSize: 14, marginTop: 4 }}>
                  {item.price} gold
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 14, margin: "6px 0 10px 0" }}>
                  {item.desc}
                </div>
                <button
                  style={{ ...btnStyle, width: 220, fontSize: 16, margin: 0 }}
                  disabled={disabled}
                  onClick={() => onBuy(item)}
                >
                  {playerInventory[item.id]
                    ? "Purchased"
                    : playerInventory._shopBought
                    ? "One item already bought"
                    : "Buy"}
                </button>
              </div>
            );
          })}
        </div>

        <button
          style={{ ...btnStyle, width: 180, fontSize: 16, marginTop: 24 }}
          onClick={onClose}
        >
          Leave Shop
        </button>
      </div>
    </div>
  );
}

function CombatModal({ open, combat, btnStyle, onRoll }) {
  if (!open) return null;

  return (
    <div
      style={mergeStyle(styles?.modal, {
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1800,
        padding: 20,
      })}
    >
      <div
        style={{
          background: "#0f172a",
          border: "2px solid rgba(148,163,184,0.35)",
          borderRadius: 16,
          padding: 24,
          width: "min(420px, 100%)",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Combat</div>
        <div style={{ color: "#cbd5e1", marginBottom: 18 }}>{combat.message}</div>

        <div
          style={{
            ...styles.diceBox,
            color: combat.rolling ? "#facc15" : "#fff",
            marginBottom: 18,
          }}
        >
          {combat.diceDisplay || "D20"}
        </div>

        <div style={{ minHeight: 24, color: "#93c5fd", marginBottom: 18 }}>
          {combat.result}
        </div>

        <button
          style={{ ...btnStyle, fontSize: 20, minWidth: 180 }}
          onClick={() => onRoll(false)}
          disabled={combat.rolling}
        >
          {combat.rolling ? "Rolling..." : "Roll"}
        </button>
      </div>
    </div>
  );
}

export default function DungeonRollMiniGame({ onBack }) {
  const [menuState, setMenuState] = useState("start"); // start | options | difficulty | game
  const [difficulty, setDifficulty] = useState(null);
  const titleScreenUrl = "/title-screen.png";

  const shopItems = useMemo(
    () => [
      {
        id: "vision",
        name: "Potion of Vision",
        desc: "Enhances vision in dark levels.",
        price: 10,
      },
      {
        id: "standing",
        name: "Potion of Standing Position",
        desc: "Prevents one level reroll after death.",
        price: 15,
      },
      {
        id: "skip",
        name: "Potion of Level Skip",
        desc: "Skip the current level once.",
        price: 20,
      },
    ],
    []
  );

  const startMenuItems = useMemo(() => ["START", "OPTIONS", "EXIT"], []);
  const difficultyItems = useMemo(
    () => [
      { key: "easy", label: "EASY (10 LEVELS)" },
      { key: "medium", label: "MEDIUM (25 LEVELS)" },
      { key: "hard", label: "HARD (50 LEVELS)" },
      { key: "back", label: "BACK" },
    ],
    []
  );

  const [menuIndex, setMenuIndex] = useState(0);
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.45);
  const [rebindKey, setRebindKey] = useState(null);
  const [keyBindings, setKeyBindings] = useState({
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    roll: "Space",
  });

  const [shopOpen, setShopOpen] = useState(false);
  const [playerInventory, setPlayerInventory] = useState({
    vision: false,
    standing: false,
    skip: false,
    _shopBought: false,
  });

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 920 : false
  );
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1366
  );

  const [hud, setHud] = useState(createInitialHudState);
  const [notice, setNotice] = useState(DEFAULT_NOTICE);
  const [combat, setCombat] = useState(createInitialCombatState);

  const canvasRef = useRef(null);
  const gameRef = useRef(createInitialGameState());
  const rafRef = useRef(0);
  const rollerRef = useRef(0);
  const fastRollResolverRef = useRef(null);
  const lastRollTapRef = useRef(0);

  const bgmRef = useRef(null);
  const bgmDuckTimerRef = useRef(null);
  const rollSfxRef = useRef(null);
  const killSfxRef = useRef(null);
  const deathSfxRef = useRef(null);

  useEffect(() => {
    setMenuState("start");
    setDifficulty(null);
  }, []);

  const leaveToHome = useCallback(() => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [onBack]);

  const menuBgStyle = {
    minHeight: "100vh",
    width: "100%",
    backgroundImage: `url(${titleScreenUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const menuOverlayStyle = {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.18)",
  };

  const menuPanelStyle = {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: 1400,
    minHeight: "100vh",
  };

  const desktopMenuMix = clamp((viewportWidth - 1024) / 896, 0, 1);
  const mobileMenuMix = clamp((viewportWidth - 360) / 560, 0, 1);

  const menuButtonColumnStyle = {
    position: "absolute",
    right: isMobile
      ? `${Math.round((8.5 - mobileMenuMix * 2.5) * 10) / 10}%`
      : `${Math.round((18.5 - desktopMenuMix * 4.5) * 10) / 10}%`,
    top: isMobile
      ? `${Math.round((64 - mobileMenuMix * 4) * 10) / 10}%`
      : `${Math.round((61.5 - desktopMenuMix * 4) * 10) / 10}%`,
    transform: "translateY(-50%)",
    display: "flex",
    flexDirection: "column",
    gap: isMobile
      ? Math.round(12 + mobileMenuMix * 3)
      : Math.round(16 + desktopMenuMix * 4),
  };

  const menuButtonStyle = (active = false) => ({
    background: "transparent",
    color: "#fff",
    border: "none",
    fontSize: isMobile
      ? Math.round(34 + mobileMenuMix * 7)
      : Math.round(44 + desktopMenuMix * 10),
    fontWeight: 900,
    fontFamily: '"Courier New", monospace',
    letterSpacing: "0.03em",
    textShadow: active ? "0 0 12px #facc15, 4px 4px 0 #000" : "4px 4px 0 #000",
    cursor: "pointer",
    textAlign: "left",
    padding: 0,
    lineHeight: 1,
  });

  const menuDotStyle = {
    color: "#facc15",
    marginRight: isMobile
      ? Math.round(10 + mobileMenuMix * 2)
      : Math.round(12 + desktopMenuMix * 2),
    textShadow: "0 0 10px #facc15, 3px 3px 0 #000",
  };

  const panelStyle = mergeStyle(styles?.panel, {
    background: "rgba(15, 23, 42, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: 12,
    padding: 12,
    color: "#fff",
  });

  const btnStyle = mergeStyle(styles?.btn, {
    padding: "12px 18px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "#1e293b",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  });

  const updateHud = useCallback(() => {
    const g = gameRef.current;
    setHud({
      level: g.currentLevel,
      lives: g.lives,
      keyStatus: g.hasKey ? "Yes" : "No",
      shieldStatus: g.hasShield ? `${g.shieldCharges}/2` : "No",
      streak: g.streak,
      score: g.score,
      modifier: g.levelModifier?.name || "Classic",
      nextBonus: g.nextRollBonus,
      monsterCount: g.enemies.length,
      state: g.victory
        ? "Victory"
        : g.gameOver
        ? "Defeated"
        : g.inCombat
        ? "Combat"
        : "Playing",
      bestLevel: g.bestLevel,
      bestStreak: g.bestStreak,
      bestScore: g.bestScore,
      totalKills: g.totalKills,
      totalWins: g.totalWins,
    });
  }, []);

  const persistMeta = useCallback(() => {
    if (typeof window === "undefined") return;

    const g = gameRef.current;
    window.localStorage.setItem(
      META_STORAGE_KEY,
      JSON.stringify({
        bestLevel: g.bestLevel,
        bestStreak: g.bestStreak,
        bestScore: g.bestScore,
        totalKills: g.totalKills,
        totalWins: g.totalWins,
      })
    );
  }, []);

  const updateMeta = useCallback(() => {
    const g = gameRef.current;
    g.bestLevel = Math.max(g.bestLevel || 1, g.currentLevel || 1);
    g.bestStreak = Math.max(g.bestStreak || 0, g.streak || 0);
    g.bestScore = Math.max(g.bestScore || 0, g.score || 0);
    persistMeta();
  }, [persistMeta]);

  const pushNotice = useCallback((text) => {
    setNotice(text);
  }, []);

  const resetCombatState = useCallback(() => {
    setCombat(createInitialCombatState());
  }, []);

  const triggerFx = useCallback((kind) => {
    const g = gameRef.current;

    if (kind === "hit") {
      g.shakeTicks = 8;
      g.flashTicks = 6;
      g.flashColor = "rgba(239, 68, 68, 0.2)";
      return;
    }

    if (kind === "crit") {
      g.shakeTicks = 5;
      g.flashTicks = 5;
      g.flashColor = "rgba(250, 204, 21, 0.2)";
      return;
    }

    if (kind === "shield") {
      g.flashTicks = 5;
      g.flashColor = "rgba(56, 189, 248, 0.2)";
    }
  }, []);

  const isInside = useCallback(
    (x, y) => x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE,
    []
  );

  const isWalkable = useCallback(
    (x, y) => isInside(x, y) && gameRef.current.grid?.[y]?.[x] === FLOOR,
    [isInside]
  );

  const carveSimpleDungeon = useCallback(() => {
    const g = gameRef.current;

    g.grid = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => WALL)
    );

    let cx = 1;
    let cy = 1;
    g.grid[cy][cx] = FLOOR;

    const steps = 260;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (let i = 0; i < steps; i += 1) {
      const [dx, dy] = dirs[rand(0, dirs.length - 1)];
      cx = Math.max(1, Math.min(GRID_SIZE - 2, cx + dx));
      cy = Math.max(1, Math.min(GRID_SIZE - 2, cy + dy));
      g.grid[cy][cx] = FLOOR;

      if (rand(1, 100) < 18) {
        for (const [adx, ady] of dirs) {
          const ax = Math.max(1, Math.min(GRID_SIZE - 2, cx + adx));
          const ay = Math.max(1, Math.min(GRID_SIZE - 2, cy + ady));
          g.grid[ay][ax] = FLOOR;
        }
      }
    }

    for (let y = 1; y < GRID_SIZE - 1; y += 1) {
      for (let x = 1; x < GRID_SIZE - 1; x += 1) {
        if (g.grid[y][x] !== WALL) continue;

        const neighbors = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].reduce(
          (count, [dx, dy]) => count + (g.grid[y + dy][x + dx] === FLOOR ? 1 : 0),
          0
        );

        if (neighbors >= 2 && rand(1, 100) <= 10) {
          g.grid[y][x] = FLOOR;
        }
      }
    }
  }, []);

  const randomFloorCell = useCallback(
    (exclusions = new Set()) => {
      let x = 1;
      let y = 1;
      let tries = 0;

      do {
        x = rand(1, GRID_SIZE - 2);
        y = rand(1, GRID_SIZE - 2);
        tries += 1;
        if (tries > 1000) break;
      } while (!isWalkable(x, y) || exclusions.has(coordKey(x, y)));

      return { x, y };
    },
    [isWalkable]
  );

  const reachable = useCallback(
    (start, goal) => {
      const q = [start];
      const seen = new Set([coordKey(start.x, start.y)]);
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];

      while (q.length) {
        const cur = q.shift();
        if (!cur) break;
        if (cur.x === goal.x && cur.y === goal.y) return true;

        for (const [dx, dy] of dirs) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          const key = coordKey(nx, ny);

          if (!seen.has(key) && isWalkable(nx, ny)) {
            seen.add(key);
            q.push({ x: nx, y: ny });
          }
        }
      }

      return false;
    },
    [isWalkable]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const g = gameRef.current;
    const visionActive = playerInventory.vision;

    function drawFloor(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#111827";
      ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
      ctx.fillStyle = "#334155";
      ctx.fillRect(px + 10, py + 10, 6, 6);
      ctx.fillRect(px + 28, py + 24, 5, 5);
      ctx.fillRect(px + 18, py + 34, 4, 4);
    }

    function drawWall(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#475569";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(px, py, TILE, 8);
      ctx.fillRect(px, py, 8, TILE);
      ctx.fillStyle = "#334155";
      ctx.fillRect(px + 8, py + 10, 14, 10);
      ctx.fillRect(px + 24, py + 26, 16, 10);
      ctx.fillRect(px + 12, py + 30, 8, 8);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(px + 24, py + 10, 10, 8);
    }

    function drawHero(x, y) {
      const px = x * TILE;
      const py = y * TILE;

      let heroColor = "#38bdf8";
      if (g.lives === 2) heroColor = "#facc15";
      if (g.lives === 1) heroColor = "#fb923c";

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 12, py + 8, 24, 30);
      ctx.fillStyle = heroColor;
      ctx.fillRect(px + 16, py + 10, 16, 10);
      ctx.fillRect(px + 14, py + 20, 20, 12);
      ctx.fillRect(px + 10, py + 24, 6, 10);
      ctx.fillRect(px + 32, py + 24, 6, 10);
      ctx.fillRect(px + 16, py + 32, 6, 10);
      ctx.fillRect(px + 26, py + 32, 6, 10);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(px + 18, py + 12, 4, 4);
      ctx.fillRect(px + 26, py + 12, 4, 4);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(px + 18, py + 22, 12, 4);
    }

    function drawEnemy(enemy) {
      const px = enemy.x * TILE;
      const py = enemy.y * TILE;

      if (enemy.boss && enemy.dragon) {
        ctx.fillStyle = "#7c2d12";
        ctx.fillRect(px + 8, py + 8, 32, 28);
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(px + 12, py + 12, 24, 16);
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(px + 16, py + 16, 16, 6);
        ctx.fillStyle = "#fff";
        ctx.fillRect(px + 18, py + 24, 4, 4);
        ctx.fillRect(px + 28, py + 24, 4, 4);
        ctx.fillStyle = "#111827";
        ctx.fillRect(px + 22, py + 30, 6, 4);
        return;
      }

      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(px + 12, py + 8, 24, 30);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(px + 14, py + 10, 20, 10);
      ctx.fillRect(px + 10, py + 20, 28, 12);
      ctx.fillRect(px + 14, py + 32, 6, 10);
      ctx.fillRect(px + 28, py + 32, 6, 10);
      ctx.fillStyle = "#fff";
      ctx.fillRect(px + 16, py + 12, 4, 4);
      ctx.fillRect(px + 28, py + 12, 4, 4);
      ctx.fillStyle = "#111827";
      ctx.fillRect(px + 20, py + 24, 8, 4);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(px + 6, py + 12, 4, 12);
      ctx.fillRect(px + 4, py + 10, 8, 4);
    }

    function drawEliteBadge(x, y, isBoss) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = isBoss ? "#a855f7" : "#f97316";
      ctx.fillRect(px + 18, py + 2, 12, 6);
      ctx.fillStyle = "#fff";
      ctx.fillRect(px + 21, py + 3, 6, 4);
    }

    function drawKey(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#facc15";
      ctx.fillRect(px + 18, py + 18, 14, 8);
      ctx.fillRect(px + 28, py + 22, 8, 4);
      ctx.fillRect(px + 34, py + 18, 4, 6);
      ctx.fillRect(px + 34, py + 26, 4, 6);
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 14, py + 14, 8, 16);
    }

    function drawShield(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 14, py + 10, 20, 28);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(px + 16, py + 12, 16, 22);
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(px + 20, py + 16, 8, 12);
      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(px + 18, py + 30, 12, 4);
    }

    function drawExit(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#14532d";
      ctx.fillRect(px + 10, py + 6, 28, 36);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(px + 14, py + 10, 20, 28);
      ctx.fillStyle = "#052e16";
      ctx.fillRect(px + 18, py + 14, 12, 18);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(px + 30, py + 22, 3, 3);
    }

    function drawShrine(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(px + 10, py + 10, 28, 28);
      ctx.fillStyle = "#ddd6fe";
      ctx.fillRect(px + 16, py + 16, 16, 16);
      ctx.fillStyle = "#4c1d95";
      ctx.fillRect(px + 20, py + 20, 8, 8);
    }

    function drawEventTile(eventTile) {
      const px = eventTile.x * TILE;
      const py = eventTile.y * TILE;
      const colorMap = {
        teleport: "#06b6d4",
        chest: "#f59e0b",
        mimic: "#dc2626",
        fountain: "#22c55e",
      };
      ctx.fillStyle = colorMap[eventTile.type] || "#94a3b8";
      ctx.fillRect(px + 12, py + 12, 24, 24);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(px + 18, py + 18, 12, 12);
    }

    function drawShopkeeper(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(px + 10, py + 10, 28, 28);
      ctx.fillStyle = "#fff";
      ctx.fillRect(px + 18, py + 18, 4, 4);
      ctx.fillRect(px + 28, py + 18, 4, 4);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 20, py + 28, 8, 4);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(px + 14, py + 8, 20, 8);
    }

    function drawOverlay(title, sub) {
      ctx.fillStyle = "rgba(2, 6, 23, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "bold 52px Courier New";
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = "20px Courier New";
      ctx.fillStyle = "#bfdbfe";
      ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 26);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (g.shakeTicks > 0) {
      ctx.translate(rand(-3, 3), rand(-3, 3));
      g.shakeTicks -= 1;
    }

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (g.grid?.[y]?.[x] === WALL) drawWall(x, y);
        else drawFloor(x, y);
      }
    }

    if (!g.hasKey && g.key?.x >= 0 && g.key?.y >= 0) drawKey(g.key.x, g.key.y);
    if (g.shield && !g.hasShield) drawShield(g.shield.x, g.shield.y);
    if (g.shrine) drawShrine(g.shrine.x, g.shrine.y);
    g.events.forEach(drawEventTile);
    if (g.exitTile?.x >= 0 && g.exitTile?.y >= 0) drawExit(g.exitTile.x, g.exitTile.y);

    g.enemies.forEach((enemy) => {
      drawEnemy(enemy);
      if (enemy.elite || enemy.boss) {
        drawEliteBadge(enemy.x, enemy.y, enemy.boss);
      }
    });

    if (g.shopkeeper) {
      drawShopkeeper(g.shopkeeper.x, g.shopkeeper.y);
    }

    drawHero(g.player.x, g.player.y);

    if (g.levelModifier?.id === "dark") {
      const centerX = g.player.x * TILE + TILE / 2;
      const centerY = g.player.y * TILE + TILE / 2;
      const visionRadius = visionActive ? 240 : 48;
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        visionActive ? 180 : 24,
        centerX,
        centerY,
        visionRadius
      );
      gradient.addColorStop(0, "rgba(2, 6, 23, 0)");
      gradient.addColorStop(1, "rgba(2, 6, 23, 0.85)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (g.flashTicks > 0) {
      ctx.fillStyle = g.flashColor || "rgba(255,255,255,0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      g.flashTicks -= 1;
    }

    ctx.restore();

    if (g.gameOver) drawOverlay("GAME OVER", "Click the screen to restart");
    if (g.victory) drawOverlay("YOU WIN", "Click the screen to play again");
  }, [playerInventory.vision]);

  const startCombat = useCallback(
    (enemy) => {
      const g = gameRef.current;
      if (g.inCombat || g.gameOver || g.victory) return;

      g.inCombat = true;
      g.currentCombatEnemy = enemy;

      const baseRoll = rand(6, 14) + Math.floor(g.currentLevel / 4);
      const elitePenalty = enemy.elite ? 1 : 0;
      const bossPenalty = enemy.boss ? 2 : 0;
      const blessingBonus = g.levelModifier?.id === "blessing" ? 2 : 0;

      g.combatBonusUsed = g.nextRollBonus;
      g.requiredRoll = clamp(
        baseRoll + elitePenalty + bossPenalty - blessingBonus - g.combatBonusUsed,
        4,
        20
      );
      g.nextRollBonus = 0;

      const enemyName = enemy.boss
        ? "Boss"
        : enemy.mimic
        ? "Mimic"
        : enemy.elite
        ? "Elite monster"
        : "Monster";

      setCombat({
        open: true,
        message: `${enemyName}: roll ${g.requiredRoll}+ to win.${enemy.boss ? ` Boss HP ${enemy.hp}.` : ""}`,
        result: "",
        diceDisplay: "D20",
        rolling: false,
      });

      updateHud();
      draw();
    },
    [draw, updateHud]
  );

  const applyLootDrop = useCallback(() => {
    const g = gameRef.current;
    if (rand(1, 100) > BALANCE.lootDropChance) return;

    const roll = rand(1, 100);
    if (roll <= 35) {
      g.lives = Math.min(5, g.lives + 1);
      pushNotice("Loot drop: Healing potion (+1 life).");
      return;
    }

    if (roll <= 70) {
      g.nextRollBonus += 2;
      pushNotice("Loot drop: Battle focus (+2 next combat roll).");
      return;
    }

    g.score += 15;
    pushNotice("Loot drop: Treasure cache (+15 score).");
  }, [pushNotice]);

  const checkPerfectClear = useCallback(() => {
    const g = gameRef.current;
    if (g.perfectClearClaimed || g.enemies.length > 0) return;

    g.perfectClearClaimed = true;
    g.hasKey = true;
    g.score += 50;
    pushNotice("Perfect Clear! Exit unlocked and +50 score.");
    updateMeta();
  }, [pushNotice, updateMeta]);

  const resolveShrine = useCallback(() => {
    const g = gameRef.current;
    if (!g.shrine) return;

    g.shrine = null;

    if (rand(1, 100) <= 55) {
      const blessing = rand(1, 3);
      if (blessing === 1) {
        g.lives = Math.min(5, g.lives + 1);
        pushNotice("Shrine blessing: +1 life.");
      } else if (blessing === 2) {
        g.nextRollBonus += 3;
        pushNotice("Shrine blessing: +3 next combat roll.");
      } else {
        g.hasShield = true;
        g.shieldCharges = 2;
        pushNotice("Shrine blessing: Chan's Shield restored.");
      }
      return;
    }

    g.lives -= 1;
    g.streak = 0;
    triggerFx("hit");

    if (g.lives <= 0) {
      g.gameOver = true;
      pushNotice("Shrine curse ended your quest.");
    } else {
      pushNotice("Shrine curse: you lost 1 life.");
    }
  }, [pushNotice, triggerFx]);

  const resolveEventTile = useCallback(
    (eventTile) => {
      const g = gameRef.current;
      g.events = g.events.filter((tile) => tile !== eventTile);

      if (eventTile.type === "teleport") {
        const exclusions = new Set([
          coordKey(g.key.x, g.key.y),
          coordKey(g.exitTile.x, g.exitTile.y),
          ...(g.shield ? [coordKey(g.shield.x, g.shield.y)] : []),
          ...(g.shrine ? [coordKey(g.shrine.x, g.shrine.y)] : []),
          ...(g.shopkeeper ? [coordKey(g.shopkeeper.x, g.shopkeeper.y)] : []),
          ...g.events.map((tile) => coordKey(tile.x, tile.y)),
          ...g.enemies.map((enemy) => coordKey(enemy.x, enemy.y)),
        ]);
        const destination = randomFloorCell(exclusions);
        g.player = destination;
        pushNotice("Event: Arcane trap teleported you.");
        triggerFx("shield");
        return;
      }

      if (eventTile.type === "chest") {
        g.score += 30;
        if (!g.hasKey && rand(1, 100) <= BALANCE.chestKeyChance) {
          g.hasKey = true;
        }
        pushNotice("Event: Treasure chest opened (+30 score).");
        return;
      }

      if (eventTile.type === "fountain") {
        g.lives = Math.min(5, g.lives + 1);
        if (g.hasShield) g.shieldCharges = 2;
        pushNotice("Event: Healing fountain restored vitality.");
        return;
      }

      const randomRoll = rand(1, 100);

      if (randomRoll <= 25) {
        pushNotice("Event: You are sent to the dragon boss battle!");
        g.bossFight = true;
        g.grid = Array.from({ length: GRID_SIZE }, () =>
          Array.from({ length: GRID_SIZE }, () => FLOOR)
        );
        g.enemies = [
          {
            x: Math.floor(GRID_SIZE / 2),
            y: Math.floor(GRID_SIZE / 2),
            boss: true,
            dragon: true,
            elite: true,
            hp: 10,
            stepDelay: 2,
            tick: 0,
          },
        ];
        g.player = { x: 1, y: 1 };
        g.events = [];
        g.key = { x: -1, y: -1 };
        g.shield = null;
        g.shrine = null;
        g.exitTile = { x: -1, y: -1 };
        g.shopkeeper = null;
        setShopOpen(false);
        return;
      }

      if (randomRoll <= 45) {
        g.levelModifier = LEVEL_MODIFIERS.find((m) => m.id === "dark") || g.levelModifier;
        pushNotice("Event: The dungeon is plunged into darkness!");
        return;
      }

      if (randomRoll <= 60) {
        g.lives = 1;
        g.hasShield = false;
        g.shield = null;
        g.shieldCharges = 0;
        pushNotice("Event: You are cursed! Life set to 1 and shield removed.");
        return;
      }

      if (randomRoll <= 75) {
        g._autoNat20Buff = true;
        pushNotice("Event: Divine blessing! All rolls are natural 20 this stage.");
        return;
      }

      const mimic = {
        x: g.player.x,
        y: g.player.y,
        stepDelay: 0,
        tick: 0,
        elite: false,
        boss: false,
        hp: 1,
        mimic: true,
      };

      pushNotice("Event: Mimic ambush!");
      startCombat(mimic);
    },
    [pushNotice, randomFloorCell, startCombat, triggerFx]
  );

  const hitPlayer = useCallback(() => {
    const g = gameRef.current;

    if (g._autoNat20Buff) {
      pushNotice("Buff: Divine blessing prevents monster damage!");
      return;
    }

    if (playerInventory.standing && !g._standingUsed) {
      g._standingUsed = true;
      setPlayerInventory((inv) => ({ ...inv, standing: false }));
      pushNotice("Standing Position potion saved your floor layout.");
      updateHud();
      draw();
      return;
    }

    if (g.hasShield) {
      g.shieldCharges = Math.max(0, g.shieldCharges - 1);
      g.hasShield = g.shieldCharges > 0;
      g.streak = 0;
      g.inCombat = false;
      g.currentCombatEnemy = null;
      g.requiredRoll = 0;
      g.rolling = false;
      g.combatBonusUsed = 0;

      triggerFx("shield");
      pushNotice(g.hasShield ? "Chan's Shield absorbed the hit." : "Chan's Shield shattered.");

      resetCombatState();
      updateHud();
      draw();
      return;
    }

    const deathSfx = deathSfxRef.current;
    if (deathSfx) {
      const candidates = getAssetUrlCandidates("you-died.mp3");
      const currentSrc = deathSfx.getAttribute("data-src") || "";
      const fallbackSrc = candidates.find((c) => c !== currentSrc) || candidates[0];

      deathSfx.currentTime = 0;
      deathSfx.play().catch(() => {
        if (fallbackSrc && fallbackSrc !== currentSrc) {
          deathSfx.src = fallbackSrc;
          deathSfx.setAttribute("data-src", fallbackSrc);
          deathSfx.currentTime = 0;
          return deathSfx.play().catch(() => {});
        }
        return Promise.resolve();
      });
    }

    g.lives -= 1;
    g.streak = 0;
    g.inCombat = false;
    g.currentCombatEnemy = null;
    g.requiredRoll = 0;
    g.rolling = false;
    g.combatBonusUsed = 0;
    triggerFx("hit");

    if (g.lives <= 0) {
      g.gameOver = true;
      pushNotice("You were slain.");
    } else {
      pushNotice("You lost 1 life.");
    }

    updateHud();
    draw();
  }, [draw, playerInventory.standing, pushNotice, resetCombatState, triggerFx, updateHud]);

  const generateLevel = useCallback(() => {
    const g = gameRef.current;
    let ready = false;

    g.levelModifier = g.currentLevel === 1 ? LEVEL_MODIFIERS[0] : pickRandom(LEVEL_MODIFIERS);
    g.perfectClearClaimed = false;
    g._autoNat20Buff = false;
    g.shopkeeper = null;
    setShopOpen(false);

    while (!ready) {
      carveSimpleDungeon();
      const used = new Set();

      g.exitTile = randomFloorCell(used);
      used.add(coordKey(g.exitTile.x, g.exitTile.y));

      g.player = { x: g.exitTile.x, y: g.exitTile.y };

      g.key = randomFloorCell(used);
      used.add(coordKey(g.key.x, g.key.y));

      if (!reachable(g.player, g.key) || !reachable(g.key, g.exitTile)) continue;

      g.shrine = null;
      if (rand(1, 100) <= BALANCE.shrineSpawnChance) {
        const shrineCell = randomFloorCell(used);
        if (reachable(g.player, shrineCell)) {
          g.shrine = shrineCell;
          used.add(coordKey(g.shrine.x, g.shrine.y));
        }
      }

      g.events = [];
      if (rand(1, 100) <= BALANCE.eventSpawnChance) {
        const eventCell = randomFloorCell(used);
        if (reachable(g.player, eventCell)) {
          g.events.push({
            ...eventCell,
            type: pickRandom(EVENT_TYPES),
          });
          used.add(coordKey(eventCell.x, eventCell.y));
        }
      }

      g.shield = null;
      if (!g.hasShield && rand(1, 100) <= BALANCE.shieldSpawnChance) {
        const shieldCell = randomFloorCell(used);
        if (reachable(g.player, shieldCell)) {
          g.shield = shieldCell;
          used.add(coordKey(g.shield.x, g.shield.y));
        }
      }

      if (g.shopLevels?.includes(g.currentLevel) && !g._shopVisitedThisLevel) {
        const shopCell = randomFloorCell(used);
        if (reachable(g.player, shopCell)) {
          g.shopkeeper = shopCell;
          used.add(coordKey(shopCell.x, shopCell.y));
        }
      }

      g.enemies = [];
      const isBossFloor = g.currentLevel === (g.maxLevels || MAX_LEVELS);
      const enemyCount = isBossFloor ? 1 : Math.min(1 + g.currentLevel, 6);
      let placed = 0;
      let attempts = 0;

      while (placed < enemyCount && attempts < 400) {
        attempts += 1;
        const enemyPos = randomFloorCell(used);

        if (manhattanDistance(enemyPos, g.player) < BALANCE.minEnemyStartDistance) continue;
        if (!reachable(g.player, enemyPos)) continue;

        used.add(coordKey(enemyPos.x, enemyPos.y));

        const baseDelay = g.levelModifier?.id === "haste" ? rand(14, 24) : rand(20, 36);

        g.enemies.push({
          x: enemyPos.x,
          y: enemyPos.y,
          stepDelay: baseDelay,
          tick: 0,
          elite: false,
          boss: false,
          hp: 1,
        });

        placed += 1;
      }

      if (placed < enemyCount) continue;

      if (isBossFloor && g.enemies[0]) {
        g.enemies[0].boss = true;
        g.enemies[0].dragon = true;
        g.enemies[0].elite = true;
        g.enemies[0].hp = BALANCE.bossHp || 6;
        g.enemies[0].stepDelay = 14;
      } else if (g.currentLevel % 3 === 0 && g.enemies.length > 0) {
        const eliteIndex = rand(0, g.enemies.length - 1);
        g.enemies[eliteIndex].elite = true;
        g.enemies[eliteIndex].stepDelay = clamp(
          g.enemies[eliteIndex].stepDelay - 4,
          10,
          40
        );
      }

      ready = true;
    }

    g.hasKey = false;
    g.inCombat = false;
    g.currentCombatEnemy = null;
    g.requiredRoll = 0;
    g.rolling = false;

    resetCombatState();
    pushNotice(`${g.levelModifier.name}: ${g.levelModifier.desc}`);
    updateHud();
    draw();
  }, [
    carveSimpleDungeon,
    draw,
    pushNotice,
    randomFloorCell,
    reachable,
    resetCombatState,
    updateHud,
  ]);

  const nextLevel = useCallback(() => {
    const g = gameRef.current;

    if (playerInventory.skip && !g._skipUsed && g.currentLevel < (g.maxLevels || MAX_LEVELS)) {
      g._skipUsed = true;
      setPlayerInventory((inv) => ({ ...inv, skip: false }));
      pushNotice("Level Skip potion used.");
      g.currentLevel += 1;
      g._shopVisitedThisLevel = false;
      generateLevel();
      return;
    }

    if (g.currentLevel >= (g.maxLevels || MAX_LEVELS)) {
      g.victory = true;
      g.totalWins += 1;
      g.score += 100;
      pushNotice("Victory! Dungeon conquered. +100 score.");
      updateMeta();
      updateHud();
      draw();
      return;
    }

    g.currentLevel += 1;
    g._shopVisitedThisLevel = false;
    generateLevel();
  }, [draw, generateLevel, playerInventory.skip, pushNotice, updateHud, updateMeta]);

  const movePlayer = useCallback(
    (dx, dy) => {
      const g = gameRef.current;
      if (menuState !== "game") return;
      if (shopOpen || g.gameOver || g.victory || g.inCombat) return;

      const nx = g.player.x + dx;
      const ny = g.player.y + dy;
      if (!isWalkable(nx, ny)) return;

      g.player.x = nx;
      g.player.y = ny;

      if (g.shopkeeper && g.player.x === g.shopkeeper.x && g.player.y === g.shopkeeper.y) {
        g._shopVisitedThisLevel = true;
        setShopOpen(true);
        g.shopkeeper = null;
        updateHud();
        draw();
        return;
      }

      if (!g.hasKey && g.player.x === g.key.x && g.player.y === g.key.y) {
        g.hasKey = true;
        pushNotice("You found the key.");
      }

      if (g.shield && g.player.x === g.shield.x && g.player.y === g.shield.y) {
        g.hasShield = true;
        g.shieldCharges = 2;
        g.shield = null;
        pushNotice("Picked up Chan's Shield (2 hits).");
      }

      if (g.shrine && g.player.x === g.shrine.x && g.player.y === g.shrine.y) {
        resolveShrine();
        if (g.gameOver) {
          updateHud();
          draw();
          return;
        }
      }

      const eventTile = g.events.find(
        (tile) => tile.x === g.player.x && tile.y === g.player.y
      );

      if (eventTile) {
        resolveEventTile(eventTile);
        if (g.inCombat || g.gameOver) {
          updateHud();
          draw();
          return;
        }
      }

      for (const enemy of g.enemies) {
        if (enemy.x === g.player.x && enemy.y === g.player.y) {
          startCombat(enemy);
          draw();
          return;
        }
      }

      if (g.hasKey && g.player.x === g.exitTile.x && g.player.y === g.exitTile.y) {
        nextLevel();
        return;
      }

      updateMeta();
      updateHud();
      draw();
    },
    [
      draw,
      isWalkable,
      menuState,
      nextLevel,
      pushNotice,
      resolveEventTile,
      resolveShrine,
      shopOpen,
      startCombat,
      updateHud,
      updateMeta,
    ]
  );

  const moveEnemies = useCallback(() => {
    const g = gameRef.current;
    if (menuState !== "game") return;
    if (shopOpen || g.gameOver || g.victory || g.inCombat) return;

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (const enemy of g.enemies) {
      enemy.tick += 1;
      if (enemy.tick < enemy.stepDelay) continue;
      enemy.tick = 0;

      if (enemy.boss && enemy.dragon) {
        let dx = 0;
        let dy = 0;

        if (enemy.x < g.player.x) dx = 1;
        else if (enemy.x > g.player.x) dx = -1;

        if (enemy.y < g.player.y) dy = 1;
        else if (enemy.y > g.player.y) dy = -1;

        const nx = enemy.x + dx;
        const ny = enemy.y + dy;

        if (isWalkable(nx, ny)) {
          enemy.x = nx;
          enemy.y = ny;
        }
      } else {
        const options = dirs
          .map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy }))
          .filter(
            (pos) =>
              isWalkable(pos.x, pos.y) &&
              !(pos.x === g.exitTile.x && pos.y === g.exitTile.y) &&
              !(pos.x === g.key.x && pos.y === g.key.y) &&
              !(g.shield && pos.x === g.shield.x && pos.y === g.shield.y) &&
              !(g.shrine && pos.x === g.shrine.x && pos.y === g.shrine.y) &&
              !(g.shopkeeper && pos.x === g.shopkeeper.x && pos.y === g.shopkeeper.y) &&
              !g.events.some((tile) => tile.x === pos.x && tile.y === pos.y)
          );

        if (options.length) {
          const next = options[rand(0, options.length - 1)];
          enemy.x = next.x;
          enemy.y = next.y;
        }
      }

      if (enemy.x === g.player.x && enemy.y === g.player.y) {
        startCombat(enemy);
        draw();
        return;
      }
    }

    draw();
  }, [draw, isWalkable, menuState, shopOpen, startCombat]);

  const resetGame = useCallback(
    (selectedDifficulty) => {
      const difficultyToUse = selectedDifficulty || difficulty || "easy";
      const g = gameRef.current;

      g.maxLevels = getMaxLevelsForDifficulty(difficultyToUse);
      g.shopLevels = [];

      if (difficultyToUse === "easy") {
        g.shopLevels = [rand(1, 5)];
      } else if (difficultyToUse === "medium") {
        g.shopLevels = [rand(2, 10), rand(11, 20)];
      } else if (difficultyToUse === "hard") {
        g.shopLevels = [rand(2, 15), rand(16, 30), rand(31, 45)];
      }

      setShopOpen(false);
      setPlayerInventory({
        vision: false,
        standing: false,
        skip: false,
        _shopBought: false,
      });

      g.currentLevel = 1;
      g.lives = 3;
      g.hasKey = false;
      g.hasShield = false;
      g.shieldCharges = 0;
      g.streak = 0;
      g.score = 0;
      g.nextRollBonus = 0;
      g.shield = null;
      g.shrine = null;
      g.events = [];
      g.gameOver = false;
      g.victory = false;
      g.inCombat = false;
      g.currentCombatEnemy = null;
      g.requiredRoll = 0;
      g.combatBonusUsed = 0;
      g._autoNat20Buff = false;
      g._standingUsed = false;
      g._skipUsed = false;
      g._shopVisitedThisLevel = false;
      g.shopkeeper = null;

      pushNotice("A new quest begins.");
      generateLevel();
    },
    [difficulty, generateLevel, pushNotice]
  );

  const beginGame = useCallback(
    (selectedDifficulty) => {
      setDifficulty(selectedDifficulty);
      setShopOpen(false);
      resetCombatState();
      setMenuState("game");

      const kickoff = () => resetGame(selectedDifficulty);

      if (typeof window !== "undefined") {
        window.setTimeout(kickoff, 0);
      } else {
        kickoff();
      }
    },
    [resetCombatState, resetGame]
  );

  const handleRestartOverlayClick = useCallback(() => {
    const g = gameRef.current;
    if (!g.gameOver && !g.victory) return;
    resetGame();
  }, [resetGame]);

  const buyShopItem = useCallback(
    (item) => {
      if (!item) return;

      setPlayerInventory((inv) => {
        if (inv[item.id] || inv._shopBought) return inv;
        return {
          ...inv,
          [item.id]: true,
          _shopBought: true,
        };
      });

      pushNotice(`Purchased ${item.name}.`);
      setShopOpen(false);
      updateHud();
      draw();
    },
    [draw, pushNotice, updateHud]
  );

  const handleRoll = useCallback(
    (skipAnimation = false) => {
      const g = gameRef.current;
      if (!g.inCombat || !g.currentCombatEnemy) return;

      if (g.rolling) {
        if (skipAnimation && fastRollResolverRef.current) {
          fastRollResolverRef.current();
        }
        return;
      }

      const rollSfx = rollSfxRef.current;
      if (rollSfx) {
        const bgm = bgmRef.current;
        if (bgm) {
          const duckedVolume = Math.max(0.08, Math.min(audioVolume, 0.35));
          bgm.volume = duckedVolume;
          if (bgmDuckTimerRef.current) {
            window.clearTimeout(bgmDuckTimerRef.current);
          }
          bgmDuckTimerRef.current = window.setTimeout(() => {
            const activeBgm = bgmRef.current;
            if (activeBgm) activeBgm.volume = audioVolume;
            bgmDuckTimerRef.current = null;
          }, 320);
        }

        const candidates = getAssetUrlCandidates("dice-roll.mp3");
        const currentSrc = rollSfx.getAttribute("data-src") || "";
        const fallbackSrc = candidates.find((candidate) => candidate !== currentSrc) || candidates[0];

        rollSfx.currentTime = 0;
        rollSfx.play().catch(() => {
          if (fallbackSrc && fallbackSrc !== currentSrc) {
            rollSfx.src = fallbackSrc;
            rollSfx.setAttribute("data-src", fallbackSrc);
            rollSfx.currentTime = 0;
            return rollSfx.play().catch(() => {});
          }
          return Promise.resolve();
        });
      }

      const playKillSfx = () => {
        const killSfx = killSfxRef.current;
        if (!killSfx) return;

        const candidates = getAssetUrlCandidates("monster-dying-effect.mp3");
        const currentSrc = killSfx.getAttribute("data-src") || "";
        const fallbackSrc = candidates.find((candidate) => candidate !== currentSrc) || candidates[0];

        killSfx.currentTime = 0;
        killSfx.play().catch(() => {
          if (fallbackSrc && fallbackSrc !== currentSrc) {
            killSfx.src = fallbackSrc;
            killSfx.setAttribute("data-src", fallbackSrc);
            killSfx.currentTime = 0;
            return killSfx.play().catch(() => {});
          }
          return Promise.resolve();
        });
      };

      const resolveFinalRoll = (rolledValue) => {
        fastRollResolverRef.current = null;

        const finalRoll = gameRef.current._autoNat20Buff ? 20 : rolledValue;
        setCombat((prev) => ({ ...prev, diceDisplay: String(finalRoll) }));

        if (finalRoll === 20) {
          const enemy = gameRef.current.currentCombatEnemy;
          let bossDefeated = false;

          if (enemy?.boss && enemy.hp > 1) {
            enemy.hp -= 2;
            if (enemy.hp <= 0) {
              gameRef.current.enemies = gameRef.current.enemies.filter((mob) => mob !== enemy);
              gameRef.current.totalKills += 1;
              bossDefeated = true;
            }
          } else {
            gameRef.current.enemies = gameRef.current.enemies.filter((mob) => mob !== enemy);
            gameRef.current.totalKills += 1;
            if (enemy?.boss) bossDefeated = true;
          }

          gameRef.current.streak += 1;
          gameRef.current.score += enemy?.boss ? 40 : enemy?.elite ? 20 : 10;

          if (gameRef.current.streak > 0 && gameRef.current.streak % 3 === 0) {
            gameRef.current.nextRollBonus = clamp(gameRef.current.nextRollBonus + 1, 0, 3);
            pushNotice("Streak reward: +1 next combat roll.");
          }

          gameRef.current.inCombat = false;
          gameRef.current.currentCombatEnemy = null;
          gameRef.current.rolling = false;
          gameRef.current.combatBonusUsed = 0;

          updateMeta();
          applyLootDrop();
          checkPerfectClear();
          updateHud();
          playKillSfx();
          triggerFx("crit");

          setCombat((prev) => ({
            ...prev,
            rolling: false,
            result: bossDefeated
              ? "Critical hit. Dragon boss defeated!"
              : "Critical hit. Monster destroyed.",
          }));

          window.setTimeout(() => {
            resetCombatState();
            draw();

            if (bossDefeated) {
              pushNotice("You defeated the dragon boss! Teleporting to the next level...");
              gameRef.current.bossFight = false;
              nextLevel();
            }
          }, 650);
          return;
        }

        if (finalRoll === 1) {
          setCombat((prev) => ({
            ...prev,
            rolling: false,
            result: "Natural 1. The monster kills you.",
          }));
          gameRef.current.rolling = false;
          window.setTimeout(() => hitPlayer(), 700);
          return;
        }

        if (finalRoll >= gameRef.current.requiredRoll) {
          const enemy = gameRef.current.currentCombatEnemy;
          let bossDefeated = false;

          if (enemy?.boss && enemy.hp > 1) {
            enemy.hp -= 1;
            gameRef.current.inCombat = true;
            gameRef.current.currentCombatEnemy = enemy;
            gameRef.current.rolling = false;
            gameRef.current.requiredRoll = clamp(gameRef.current.requiredRoll, 4, 20);

            setCombat((prev) => ({
              ...prev,
              rolling: false,
              result: `You wounded the boss. ${enemy.hp} HP left.`,
              message: `Boss still stands: roll ${gameRef.current.requiredRoll}+ for the next hit.`,
            }));

            triggerFx("hit");
            updateHud();
            draw();
            return;
          }

          gameRef.current.enemies = gameRef.current.enemies.filter((mob) => mob !== enemy);
          gameRef.current.totalKills += 1;
          if (enemy?.boss) bossDefeated = true;

          gameRef.current.streak += 1;
          gameRef.current.score += enemy?.boss ? 40 : enemy?.elite ? 20 : 10;

          if (gameRef.current.streak > 0 && gameRef.current.streak % 3 === 0) {
            gameRef.current.nextRollBonus = clamp(gameRef.current.nextRollBonus + 1, 0, 3);
            pushNotice("Streak reward: +1 next combat roll.");
          }

          gameRef.current.inCombat = false;
          gameRef.current.currentCombatEnemy = null;
          gameRef.current.rolling = false;
          gameRef.current.combatBonusUsed = 0;

          updateMeta();
          applyLootDrop();
          checkPerfectClear();
          updateHud();
          playKillSfx();

          setCombat((prev) => ({
            ...prev,
            rolling: false,
            result: bossDefeated
              ? `You rolled ${finalRoll}. Dragon boss defeated!`
              : `You rolled ${finalRoll}. Monster killed.`,
          }));

          window.setTimeout(() => {
            resetCombatState();
            draw();

            if (bossDefeated) {
              pushNotice("You defeated the dragon boss! Teleporting to the next level...");
              gameRef.current.bossFight = false;
              nextLevel();
            }
          }, 650);
          return;
        }

        setCombat((prev) => ({
          ...prev,
          rolling: false,
          result: `You rolled ${finalRoll}. Not enough. You die.`,
        }));
        gameRef.current.rolling = false;
        window.setTimeout(() => hitPlayer(), 700);
      };

      g.rolling = true;
      setCombat((prev) => ({ ...prev, rolling: true, result: "Rolling..." }));

      fastRollResolverRef.current = () => {
        window.clearInterval(rollerRef.current);
        resolveFinalRoll(rand(1, 20));
      };

      if (skipAnimation) {
        fastRollResolverRef.current();
        return;
      }

      let ticks = 0;
      rollerRef.current = window.setInterval(() => {
        const rollingFace = rand(1, 20);
        setCombat((prev) => ({ ...prev, diceDisplay: String(rollingFace) }));
        ticks += 1;

        if (ticks < 14) return;

        window.clearInterval(rollerRef.current);
        resolveFinalRoll(rand(1, 20));
      }, 85);
    },
    [
      applyLootDrop,
      checkPerfectClear,
      draw,
      hitPlayer,
      nextLevel,
      pushNotice,
      resetCombatState,
      triggerFx,
      updateHud,
      updateMeta,
    ]
  );

  useEffect(() => {
    if (!rebindKey) return;

    function handleKey(e) {
      e.preventDefault();
      const nextValue = e.code === "Space" ? "Space" : e.key;
      setKeyBindings((prev) => ({ ...prev, [rebindKey]: nextValue }));
      setRebindKey(null);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rebindKey]);

  useEffect(() => {
    function handleMenuKeys(e) {
      if (rebindKey) return;

      if (menuState === "start") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          setMenuIndex((prev) => (prev - 1 + startMenuItems.length) % startMenuItems.length);
          return;
        }

        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          setMenuIndex((prev) => (prev + 1) % startMenuItems.length);
          return;
        }

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();

          if (menuIndex === 0) {
            setDifficultyIndex(0);
            setMenuState("difficulty");
          } else if (menuIndex === 1) {
            setMenuState("options");
          } else if (menuIndex === 2) {
            leaveToHome();
          }
        }
        return;
      }

      if (menuState === "difficulty") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          setDifficultyIndex((prev) => (prev - 1 + difficultyItems.length) % difficultyItems.length);
          return;
        }

        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          setDifficultyIndex((prev) => (prev + 1) % difficultyItems.length);
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          setMenuState("start");
          return;
        }

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const selected = difficultyItems[difficultyIndex];
          if (selected.key === "back") {
            setMenuState("start");
            return;
          }
          beginGame(selected.key);
        }
        return;
      }

      if (menuState === "options" && e.key === "Escape") {
        e.preventDefault();
        setMenuState("start");
        return;
      }

      if (menuState !== "game") return;

      if (shopOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShopOpen(false);
        }
        return;
      }

      const rollKeys = [keyBindings.roll, " ", "Space"];
      if (rollKeys.includes(e.key) || rollKeys.includes(e.code)) {
        e.preventDefault();
        const now =
          typeof window !== "undefined" && window.performance
            ? window.performance.now()
            : Date.now();
        const isDoubleTap = now - lastRollTapRef.current <= 280;
        lastRollTapRef.current = now;
        handleRoll(isDoubleTap);
        return;
      }

      const upKeys = [keyBindings.up, "w", "W"];
      const downKeys = [keyBindings.down, "s", "S"];
      const leftKeys = [keyBindings.left, "a", "A"];
      const rightKeys = [keyBindings.right, "d", "D"];

      if (upKeys.includes(e.key) || upKeys.includes(e.code)) {
        e.preventDefault();
        movePlayer(0, -1);
        return;
      }

      if (downKeys.includes(e.key) || downKeys.includes(e.code)) {
        e.preventDefault();
        movePlayer(0, 1);
        return;
      }

      if (leftKeys.includes(e.key) || leftKeys.includes(e.code)) {
        e.preventDefault();
        movePlayer(-1, 0);
        return;
      }

      if (rightKeys.includes(e.key) || rightKeys.includes(e.code)) {
        e.preventDefault();
        movePlayer(1, 0);
      }
    }

    window.addEventListener("keydown", handleMenuKeys);
    return () => window.removeEventListener("keydown", handleMenuKeys);
  }, [
    beginGame,
    difficultyIndex,
    difficultyItems,
    handleRoll,
    keyBindings,
    leaveToHome,
    menuIndex,
    menuState,
    movePlayer,
    rebindKey,
    shopOpen,
    startMenuItems,
  ]);

  useEffect(() => {
    const g = gameRef.current;

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(META_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          g.bestLevel = Number(parsed.bestLevel) || 1;
          g.bestStreak = Number(parsed.bestStreak) || 0;
          g.bestScore = Number(parsed.bestScore) || 0;
          g.totalKills = Number(parsed.totalKills) || 0;
          g.totalWins = Number(parsed.totalWins) || 0;
        }
      } catch {
        // Ignore corrupted data.
      }
    }

    updateHud();

    function onResize() {
      setIsMobile(window.innerWidth <= 920);
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", onResize);

    function loop() {
      moveEnemies();
      rafRef.current = window.requestAnimationFrame(loop);
    }

    rafRef.current = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(rafRef.current);
      window.clearInterval(rollerRef.current);
      if (bgmDuckTimerRef.current) {
        window.clearTimeout(bgmDuckTimerRef.current);
        bgmDuckTimerRef.current = null;
      }
      fastRollResolverRef.current = null;
    };
  }, [moveEnemies, updateHud]);

  useEffect(() => {
    let music = null;

    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
      bgmRef.current = null;
    }

    const src =
      menuState === "game"
        ? getAssetUrlCandidates("TempleOS theme Remix.mp3")[0]
        : getAssetUrlCandidates("menu-theme.mp3")[0];

    music = new Audio(src);
    music.loop = true;
    music.preload = "auto";
    music.volume = audioVolume;
    music.play().catch(() => {});
    bgmRef.current = music;

    return () => {
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
      if (bgmRef.current === music) {
        bgmRef.current = null;
      }
    };
  }, [menuState, audioVolume]);

  useEffect(() => {
    const rollSfx = createAudioAsset("dice-roll.mp3", 0.62);
    rollSfxRef.current = rollSfx;
    return () => {
      cleanupAudioAsset(rollSfx);
      rollSfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    const killSfx = createAudioAsset("monster-dying-effect.mp3", 0.95);
    killSfxRef.current = killSfx;
    return () => {
      cleanupAudioAsset(killSfx);
      killSfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    const deathSfx = createAudioAsset("you-died.mp3", 0.95);
    deathSfxRef.current = deathSfx;
    return () => {
      cleanupAudioAsset(deathSfx);
      deathSfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    const unlockSfx = () => {
      const all = [rollSfxRef.current, killSfxRef.current, deathSfxRef.current];

      for (const sfx of all) {
        if (!sfx) continue;
        const wasMuted = sfx.muted;
        sfx.muted = true;
        sfx.currentTime = 0;
        sfx
          .play()
          .then(() => {
            sfx.pause();
            sfx.currentTime = 0;
            sfx.muted = wasMuted;
          })
          .catch(() => {
            sfx.muted = wasMuted;
          });
      }
    };

    window.addEventListener("pointerdown", unlockSfx, { once: true });
    window.addEventListener("keydown", unlockSfx, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockSfx);
      window.removeEventListener("keydown", unlockSfx);
    };
  }, []);

  const pageStyle = mergeStyle(styles?.page, {
    minHeight: "100vh",
    color: "#fff",
    padding: 0,
    display: "block",
  });

  return (
    <div style={pageStyle}>
      <ShopModal
        open={shopOpen && menuState === "game"}
        shopItems={shopItems}
        playerInventory={playerInventory}
        btnStyle={btnStyle}
        onBuy={buyShopItem}
        onClose={() => setShopOpen(false)}
      />

      {menuState === "start" && (
        <StartMenuScreen
          menuBgStyle={menuBgStyle}
          menuOverlayStyle={menuOverlayStyle}
          menuPanelStyle={menuPanelStyle}
          menuButtonColumnStyle={menuButtonColumnStyle}
          menuButtonStyle={menuButtonStyle}
          menuDotStyle={menuDotStyle}
          startMenuItems={startMenuItems}
          menuIndex={menuIndex}
          setMenuIndex={setMenuIndex}
          onStart={() => {
            setDifficultyIndex(0);
            setMenuState("difficulty");
          }}
          onOptions={() => setMenuState("options")}
          onExit={leaveToHome}
        />
      )}

      {menuState === "difficulty" && (
        <DifficultyMenuScreen
          menuBgStyle={menuBgStyle}
          menuOverlayStyle={menuOverlayStyle}
          difficultyItems={difficultyItems}
          difficultyIndex={difficultyIndex}
          setDifficultyIndex={setDifficultyIndex}
          btnStyle={btnStyle}
          onBack={() => setMenuState("start")}
          onChooseDifficulty={beginGame}
        />
      )}

      {menuState === "options" && (
        <OptionsMenuScreen
          menuBgStyle={menuBgStyle}
          menuOverlayStyle={menuOverlayStyle}
          audioVolume={audioVolume}
          setAudioVolume={setAudioVolume}
          keyBindings={keyBindings}
          rebindKey={rebindKey}
          setRebindKey={setRebindKey}
          btnStyle={btnStyle}
          onBack={() => {
            setRebindKey(null);
            setMenuState("start");
          }}
        />
      )}

      {menuState === "game" && (
        <div
          style={mergeStyle(styles?.page, {
            minHeight: "100vh",
            color: "#fff",
            padding: isMobile ? 12 : 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxWidth: 1200,
            width: "100%",
            margin: "0 auto",
          })}
        >
          <div
            style={mergeStyle(styles?.titlebar, {
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            })}
          >
            <div>
              <div style={styles?.logo}>Dungeon Roll</div>
              <div style={styles?.subtitle}>
                NES-style browser mini-game from D20Masters.ink
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={{ ...btnStyle, minWidth: 150 }} onClick={leaveToHome}>
                Back
              </button>
              <button
                style={{ ...btnStyle, minWidth: 190 }}
                onClick={() => {
                  setShopOpen(false);
                  resetCombatState();
                  setMenuState("start");
                }}
              >
                Main Menu
              </button>
              <button style={{ ...btnStyle, minWidth: 190 }} onClick={() => resetGame()}>
                Restart Quest
              </button>
            </div>
          </div>

          <div
            style={mergeStyle(styles?.hud, {
              display: "grid",
              gridTemplateColumns: isMobile
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(6, minmax(0, 1fr))",
              gap: 12,
            })}
          >
            <div style={panelStyle}>
              <div style={styles?.label}>Level</div>
              <div style={styles?.value}>
                {hud.level}/{gameRef.current.maxLevels || MAX_LEVELS}
              </div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>Lives</div>
              <div style={styles?.value}>{hud.lives}</div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>Key</div>
              <div style={styles?.value}>{hud.keyStatus}</div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>Shield</div>
              <div style={styles?.value}>{hud.shieldStatus}</div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>Score</div>
              <div style={styles?.value}>{hud.score}</div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>State</div>
              <div style={styles?.value}>{hud.state}</div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={panelStyle}>
              <canvas
                ref={canvasRef}
                width={GRID_SIZE * TILE}
                height={GRID_SIZE * TILE}
                onClick={handleRestartOverlayClick}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  imageRendering: "pixelated",
                  border: "2px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  background: "#020617",
                  cursor:
                    gameRef.current.gameOver || gameRef.current.victory ? "pointer" : "default",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={panelStyle}>
                <div style={styles?.label}>Notice</div>
                <div style={{ fontWeight: 700 }}>{notice}</div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Modifier</div>
                <div style={styles?.value}>{hud.modifier}</div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Streak</div>
                <div style={styles?.value}>{hud.streak}</div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Next Bonus</div>
                <div style={styles?.value}>{hud.nextBonus}</div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Monsters</div>
                <div style={styles?.value}>{hud.monsterCount}</div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Inventory</div>
                <div>Vision: {playerInventory.vision ? "Yes" : "No"}</div>
                <div>Standing: {playerInventory.standing ? "Yes" : "No"}</div>
                <div>Skip: {playerInventory.skip ? "Yes" : "No"}</div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Records</div>
                <div>Best Level: {hud.bestLevel}</div>
                <div>Best Streak: {hud.bestStreak}</div>
                <div>Best Score: {hud.bestScore}</div>
                <div>Total Kills: {hud.totalKills}</div>
                <div>Total Wins: {hud.totalWins}</div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Controls</div>
                <div>Move: arrows / WASD / rebound keys</div>
                <div>Roll: {keyBindings.roll}</div>
                <div>Double tap roll to skip animation</div>
                <div>Esc closes shop</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CombatModal open={combat.open && menuState === "game"} combat={combat} btnStyle={btnStyle} onRoll={handleRoll} />

      <a
        href="https://buymeacoffee.com/ghostbyte"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: "#ffdd00",
          color: "#333",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          padding: "12px 24px",
          fontWeight: "bold",
          fontSize: 18,
          textDecoration: "none",
          transition: "background 0.2s",
          border: "2px solid #fff",
        }}
      >
        ☕ Buy Me a Coffee
      </a>
    </div>
  );
}
