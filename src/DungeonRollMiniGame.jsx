import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BALANCE,
  BOSS_TYPES,
  DEFAULT_NOTICE,
  ENEMY_VARIANTS,
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
import { clamp, coordKey, manhattanDistance, pickRandom, rand } from "./dungeonRoll/utils";
import { createAudioAsset, cleanupAudioAsset } from "./dungeonRoll/audio";

// ─── Constants ───────────────────────────────────────────────────────────────
const START_MENU_ITEMS = ["START", "OPTIONS", "EXIT"];

const STORE_ITEMS = [
  { id: "healPotion",    name: "Healing Draught",        desc: "Immediately restores 1 life.",                     cost: 15, consumable: true  },
  { id: "greaterHeal",  name: "Greater Healing Potion",  desc: "Immediately restores 2 lives.",                    cost: 28, consumable: true  },
  { id: "magicSword",   name: "Magic Sword",             desc: "+2 to all combat rolls this run.",                 cost: 40, consumable: false },
  { id: "vision",       name: "Lantern Lens",            desc: "See further in Dark floors.",                      cost: 20, consumable: false },
  { id: "standing",     name: "Standing Tonic",          desc: "Block one lethal hit automatically.",              cost: 35, consumable: false },
  { id: "skip",         name: "Phase Step Elixir",       desc: "Skip one floor as you exit.",                      cost: 30, consumable: false },
  { id: "bossBlade",    name: "Wyrmfang Blade",          desc: "+3 combat roll bonus vs bosses.",                  cost: 50, consumable: false },
  { id: "gollumCharm",  name: "Echo Charm",              desc: "First Gollum hit is guaranteed to land.",          cost: 35, consumable: false },
  { id: "mirrorWard",   name: "Mirror Ward",             desc: "Failed Clone boss attacks don't hurt you.",        cost: 35, consumable: false },
  { id: "luckyCharm",   name: "Lucky Charm",             desc: "Reroll your dice once per combat.",                cost: 40, consumable: false },
  { id: "ringOfFire",   name: "Ring of Fire",            desc: "+1 roll bonus per kill, stacks up to +5.",         cost: 45, consumable: false },
  { id: "poisonFlask",  name: "Poison Flask",            desc: "Next enemy needs 3 fewer to beat you (one use).", cost: 25, consumable: true  },
  { id: "armorUpgrade", name: "Dwarven Armor",           desc: "Your shield can hold up to 4 charges.",           cost: 35, consumable: false },
  { id: "resurrect",    name: "Resurrection Stone",      desc: "Revive at 1 life once on death.",                  cost: 60, consumable: false },
];

// ─── Helper functions ─────────────────────────────────────────────────────────
function mergeStyle(base, extra = {}) {
  return { ...(base || {}), ...extra };
}

function getMaxLevelsForDifficulty(difficulty) {
  if (difficulty === "easy")   return 10;
  if (difficulty === "medium") return 20;
  return 30;
}

function isBossEnemy(enemy) {
  return Boolean(enemy?.boss);
}

function makeBossEnemy(type) {
  const base = {
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2),
    tick: 0,
    elite: true,
    boss: true,
    bossType: type,
  };
  switch (type) {
    case "dragon":   return { ...base, stepDelay: 11, hp: 8 };
    case "gollum":   return { ...base, stepDelay: 8,  hp: 6 };
    case "clone":    return { ...base, stepDelay: 9,  hp: 7 };
    case "lich":     return { ...base, stepDelay: 12, hp: 5 };
    case "minotaur": return { ...base, stepDelay: 6,  hp: 9 };
    case "vampire":  return { ...base, stepDelay: 10, hp: 6 };
    default:         return { ...base, stepDelay: 10, hp: 6 };
  }
}

// ─── D20 Dice SVG Component ───────────────────────────────────────────────────
function D20Dice({ value, rolling }) {
  const size = 150;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.44;
  const hexPts = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 90) * Math.PI / 180;
    return `${cx + R * Math.cos(angle)},${cy + R * Math.sin(angle)}`;
  }).join(" ");
  const triPts = [
    `${cx},${cy - R * 0.48}`,
    `${cx + R * 0.42},${cy + R * 0.27}`,
    `${cx - R * 0.42},${cy + R * 0.27}`,
  ].join(" ");
  return (
    <div
      style={{
        width: size,
        height: size,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: rolling ? "d20wobble 0.13s ease-in-out infinite alternate" : "d20settle 0.35s ease-out forwards",
        filter: rolling
          ? "drop-shadow(0 0 20px #ef4444) drop-shadow(0 0 6px #fca5a5)"
          : "drop-shadow(0 0 8px #991b1b)",
        transition: "filter 0.4s",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="d20g" x1="15%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="45%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="d20gi" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#450a0a" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <polygon points={hexPts} fill="url(#d20g)" stroke="#fca5a5" strokeWidth="2.5" />
        <polygon points={triPts} fill="url(#d20gi)" stroke="#fca5a5" strokeWidth="1.5" opacity="0.75" />
        {/* edge lines */}
        <line x1={cx} y1={cy - R * 0.48} x2={cx + R * 0.42} y2={cy + R * 0.27} stroke="#fca5a5" strokeWidth="1" opacity="0.4" />
        <line x1={cx} y1={cy - R * 0.48} x2={cx - R * 0.42} y2={cy + R * 0.27} stroke="#fca5a5" strokeWidth="1" opacity="0.4" />
        <text
          x={cx} y={cy + 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={size * 0.28}
          fontWeight="bold"
          fontFamily="Courier New, monospace"
        >
          {value}
        </text>
      </svg>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DungeonRollMiniGame({ onBack }) {
  const [hud, setHud] = useState(createInitialHudState());
  const [notice, setNotice] = useState(DEFAULT_NOTICE);
  const [combat, setCombat] = useState(createInitialCombatState());
  const [menuState, setMenuState] = useState("start");
  const [menuIndex, setMenuIndex] = useState(0);
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [difficulty, setDifficulty] = useState("easy");
  const [audioVolume, setAudioVolume] = useState(0.45);
  const [rebindKey, setRebindKey] = useState(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [gameOverRecap, setGameOverRecap] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  const [keyBindings, setKeyBindings] = useState({
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    roll: " ",
  });
  const [playerInventory, setPlayerInventory] = useState({
    vision: false,
    standing: false,
    skip: false,
    bossBlade: false,
    gollumCharm: false,
    mirrorWard: false,
    magicSword: false,
    luckyCharm: false,
    ringOfFire: false,
    armorUpgrade: false,
    resurrect: false,
  });

  const canvasRef = useRef(null);
  const gameRef = useRef({
    ...createInitialGameState(),
    maxLevels: MAX_LEVELS,
    shopLevels: [],
    shopVisits: 0,
    bossRoomActive: false,
    bossRoomType: null,
    exitUnlockedByBoss: false,
    _standingUsed: false,
    _skipUsed: false,
    _gollumCharmUsed: false,
    _resurrectUsed: false,
  });
  const rafRef = useRef(0);
  const rollerRef = useRef(0);
  const fastRollResolverRef = useRef(null);
  const lastRollTapRef = useRef(0);
  const inventoryRef = useRef(playerInventory);
  const menuBgmRef = useRef(null);
  const gameBgmRef = useRef(null);
  const gameBgm2Ref = useRef(null);
  const rollSfxRef = useRef(null);
  const killSfxRef = useRef(null);
  const deathSfxRef = useRef(null);
  const audioVolumeRef = useRef(0.45);

  useEffect(() => {
    inventoryRef.current = playerInventory;
  }, [playerInventory]);

  // ── Audio volume sync ────────────────────────────────────────────────────
  useEffect(() => {
    audioVolumeRef.current = audioVolume;
    if (menuBgmRef.current)  menuBgmRef.current.volume  = audioVolume;
    if (gameBgmRef.current)  gameBgmRef.current.volume  = audioVolume;
    if (gameBgm2Ref.current) gameBgm2Ref.current.volume = audioVolume;
    if (rollSfxRef.current)  rollSfxRef.current.volume  = Math.min(1, audioVolume * 1.1);
    if (killSfxRef.current)  killSfxRef.current.volume  = Math.min(1, audioVolume * 0.9);
    if (deathSfxRef.current) deathSfxRef.current.volume = audioVolume;
  }, [audioVolume]);

  // ── BGM switching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (menuState === "game") {
      if (gameBgmRef.current && gameBgmRef.current.paused) {
        gameBgmRef.current.currentTime = 0;
        gameBgmRef.current.play().catch(() => {});
      }
    } else {
      if (gameBgmRef.current  && !gameBgmRef.current.paused)  { gameBgmRef.current.pause();  gameBgmRef.current.currentTime  = 0; }
      if (gameBgm2Ref.current && !gameBgm2Ref.current.paused) { gameBgm2Ref.current.pause(); gameBgm2Ref.current.currentTime = 0; }
    }
  }, [menuState]);

  const difficultyItems = useMemo(
    () => [
      { key: "easy",   label: "Easy   (10 floors)" },
      { key: "medium", label: "Medium (20 floors)" },
      { key: "hard",   label: "Hard   (30 floors)" },
      { key: "back",   label: "Back" },
    ],
    []
  );

  // ── HUD ──────────────────────────────────────────────────────────────────
  const updateHud = useCallback(() => {
    const g = gameRef.current;
    setHud({
      level: g.currentLevel,
      lives: g.lives,
      gold: g.gold,
      keyStatus: g.hasKey ? "Yes" : "No",
      shieldStatus: g.hasShield ? `${g.shieldCharges}/${inventoryRef.current.armorUpgrade ? 4 : 2}` : "No",
      streak: g.streak,
      score: g.score,
      modifier: g.levelModifier?.name || "Classic",
      nextBonus: g.nextRollBonus,
      monsterCount: g.enemies.length,
      state: g.victory ? "Victory" : g.gameOver ? "Defeated" : g.inCombat ? "Combat" : "Playing",
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
    g.bestLevel  = Math.max(g.bestLevel  || 1, g.currentLevel || 1);
    g.bestStreak = Math.max(g.bestStreak || 0, g.streak       || 0);
    g.bestScore  = Math.max(g.bestScore  || 0, g.score        || 0);
    persistMeta();
  }, [persistMeta]);

  const pushNotice = useCallback((text) => setNotice(text), []);
  const resetCombatState = useCallback(() => setCombat(createInitialCombatState()), []);

  const isInside = useCallback(
    (x, y) => x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE,
    []
  );
  const isWalkable = useCallback(
    (x, y) => isInside(x, y) && gameRef.current.grid?.[y]?.[x] === FLOOR,
    [isInside]
  );

  // ── Map generation ────────────────────────────────────────────────────────
  const carveSimpleDungeon = useCallback(() => {
    const g = gameRef.current;
    g.grid = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => WALL)
    );
    let cx = 1, cy = 1;
    g.grid[cy][cx] = FLOOR;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (let i = 0; i < 270; i++) {
      const [dx, dy] = dirs[rand(0, dirs.length - 1)];
      cx = Math.max(1, Math.min(GRID_SIZE - 2, cx + dx));
      cy = Math.max(1, Math.min(GRID_SIZE - 2, cy + dy));
      g.grid[cy][cx] = FLOOR;
      if (rand(1, 100) <= 20) {
        for (const [adx, ady] of dirs) {
          const ax = Math.max(1, Math.min(GRID_SIZE - 2, cx + adx));
          const ay = Math.max(1, Math.min(GRID_SIZE - 2, cy + ady));
          g.grid[ay][ax] = FLOOR;
        }
      }
    }
  }, []);

  const randomFloorCell = useCallback(
    (exclusions = new Set()) => {
      let x = 1, y = 1, tries = 0;
      do {
        x = rand(1, GRID_SIZE - 2);
        y = rand(1, GRID_SIZE - 2);
        tries++;
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
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
      while (q.length) {
        const cur = q.shift();
        if (!cur) break;
        if (cur.x === goal.x && cur.y === goal.y) return true;
        for (const [dx, dy] of dirs) {
          const nx = cur.x + dx, ny = cur.y + dy;
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

  // ── Canvas rendering ───────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;
    const inv = inventoryRef.current;

    function drawFloor(x, y) {
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = g.bossRoomActive ? "#151210" : "#1f2937";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = g.bossRoomActive ? "#1f1b18" : "#111827";
      ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
    }

    function drawWall(x, y) {
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = "#475569";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#334155";
      ctx.fillRect(px + 8, py + 10, 14, 10);
      ctx.fillRect(px + 24, py + 26, 16, 10);
    }

    function drawHero(x, y) {
      const px = x * TILE, py = y * TILE;
      const lowLife = g.lives <= 1;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 12, py + 8, 24, 30);
      ctx.fillStyle = lowLife ? "#fb923c" : "#38bdf8";
      ctx.fillRect(px + 16, py + 10, 16, 10);
      ctx.fillRect(px + 14, py + 20, 20, 12);
      ctx.fillRect(px + 10, py + 24, 6, 10);
      ctx.fillRect(px + 32, py + 24, 6, 10);
      // sword if magic sword
      if (inv.magicSword) {
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(px + 34, py + 18, 4, 16);
        ctx.fillStyle = "#a78bfa";
        ctx.fillRect(px + 32, py + 26, 8, 4);
      }
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(px + 18, py + 12, 4, 4);
      ctx.fillRect(px + 26, py + 12, 4, 4);
    }

    function drawEnemy(enemy) {
      const px = enemy.x * TILE, py = enemy.y * TILE;
      // Boss types
      if (enemy.bossType === "dragon") {
        ctx.fillStyle = "#7c2d12";
        ctx.fillRect(px + 8, py + 8, 32, 28);
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(px + 12, py + 12, 24, 16);
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(px + 16, py + 16, 16, 6);
        // wings
        ctx.fillStyle = "#991b1b";
        ctx.fillRect(px + 2, py + 10, 8, 14);
        ctx.fillRect(px + 38, py + 10, 8, 14);
        return;
      }
      if (enemy.bossType === "gollum") {
        ctx.fillStyle = "#3f6212";
        ctx.fillRect(px + 10, py + 10, 28, 28);
        ctx.fillStyle = "#a3e635";
        ctx.fillRect(px + 14, py + 14, 20, 18);
        ctx.fillStyle = "#111827";
        ctx.fillRect(px + 18, py + 20, 4, 4);
        ctx.fillRect(px + 26, py + 20, 4, 4);
        return;
      }
      if (enemy.bossType === "clone") {
        ctx.fillStyle = "#1e3a8a";
        ctx.fillRect(px + 10, py + 10, 28, 28);
        ctx.fillStyle = "#60a5fa";
        ctx.fillRect(px + 14, py + 14, 20, 18);
        ctx.fillStyle = "#dbeafe";
        ctx.fillRect(px + 18, py + 18, 4, 4);
        ctx.fillRect(px + 26, py + 18, 4, 4);
        return;
      }
      if (enemy.bossType === "lich") {
        ctx.fillStyle = "#4c1d95";
        ctx.fillRect(px + 12, py + 6, 24, 34);
        ctx.fillStyle = "#a78bfa";
        ctx.fillRect(px + 16, py + 10, 16, 10);
        ctx.fillStyle = "#7c3aed";
        ctx.fillRect(px + 14, py + 20, 20, 14);
        ctx.fillStyle = "#fff";
        ctx.fillRect(px + 18, py + 12, 4, 5);
        ctx.fillRect(px + 26, py + 12, 4, 5);
        ctx.fillStyle = "#9333ea";
        ctx.fillRect(px + 19, py + 26, 10, 3);
        // staff
        ctx.fillStyle = "#c4b5fd";
        ctx.fillRect(px + 6, py + 8, 4, 28);
        ctx.fillRect(px + 4, py + 6, 8, 6);
        return;
      }
      if (enemy.bossType === "minotaur") {
        ctx.fillStyle = "#78350f";
        ctx.fillRect(px + 8, py + 10, 32, 30);
        ctx.fillStyle = "#d97706";
        ctx.fillRect(px + 12, py + 14, 24, 20);
        // horns
        ctx.fillStyle = "#92400e";
        ctx.fillRect(px + 10, py + 4, 6, 10);
        ctx.fillRect(px + 32, py + 4, 6, 10);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(px + 18, py + 18, 4, 4);
        ctx.fillRect(px + 26, py + 18, 4, 4);
        // axe
        ctx.fillStyle = "#9ca3af";
        ctx.fillRect(px + 38, py + 10, 4, 20);
        ctx.fillRect(px + 36, py + 10, 8, 8);
        return;
      }
      if (enemy.bossType === "vampire") {
        ctx.fillStyle = "#1a0533";
        ctx.fillRect(px + 10, py + 8, 28, 32);
        ctx.fillStyle = "#6b21a8";
        ctx.fillRect(px + 14, py + 12, 20, 18);
        // cape
        ctx.fillStyle = "#581c87";
        ctx.fillRect(px + 6, py + 18, 8, 18);
        ctx.fillRect(px + 34, py + 18, 8, 18);
        // red eyes
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(px + 18, py + 14, 4, 4);
        ctx.fillRect(px + 26, py + 14, 4, 4);
        return;
      }
      // Normal enemy variants
      const elite = enemy.elite;
      const variant = enemy.enemyVariant || "goblin";
      if (variant === "orc") {
        ctx.fillStyle = "#166534";
        ctx.fillRect(px + 12, py + 8, 24, 30);
        ctx.fillStyle = "#4ade80";
        ctx.fillRect(px + 14, py + 10, 20, 10);
        ctx.fillRect(px + 10, py + 20, 28, 12);
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(px + 16, py + 22, 4, 6);
        ctx.fillRect(px + 28, py + 22, 4, 6);
        ctx.fillStyle = "#fff";
        ctx.fillRect(px + 16, py + 12, 4, 4);
        ctx.fillRect(px + 28, py + 12, 4, 4);
      } else if (variant === "skeleton") {
        ctx.fillStyle = "#f5f5f4";
        ctx.fillRect(px + 12, py + 8, 24, 30);
        ctx.fillStyle = "#a8a29e";
        ctx.fillRect(px + 14, py + 12, 20, 4);
        ctx.fillRect(px + 14, py + 18, 20, 4);
        ctx.fillRect(px + 14, py + 24, 20, 4);
        ctx.fillStyle = "#111827";
        ctx.fillRect(px + 16, py + 10, 4, 4);
        ctx.fillRect(px + 28, py + 10, 4, 4);
      } else if (variant === "knight") {
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(px + 10, py + 6, 28, 34);
        ctx.fillStyle = "#64748b";
        ctx.fillRect(px + 14, py + 10, 20, 12);
        ctx.fillRect(px + 12, py + 22, 24, 14);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(px + 16, py + 14, 16, 4);
      } else {
        // goblin
        ctx.fillStyle = "#7f1d1d";
        ctx.fillRect(px + 12, py + 8, 24, 30);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(px + 14, py + 10, 20, 10);
        ctx.fillRect(px + 10, py + 20, 28, 12);
        ctx.fillStyle = "#fff";
        ctx.fillRect(px + 16, py + 12, 4, 4);
        ctx.fillRect(px + 28, py + 12, 4, 4);
      }
      if (elite) {
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(px + 18, py + 4, 12, 5);
      }
    }

    function drawKey(x, y) {
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = "#facc15";
      ctx.fillRect(px + 18, py + 18, 14, 8);
      ctx.fillRect(px + 28, py + 22, 8, 4);
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 14, py + 14, 8, 16);
    }

    function drawShield(x, y) {
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 14, py + 10, 20, 28);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(px + 16, py + 12, 16, 22);
      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(px + 20, py + 14, 8, 8);
    }

    function drawExit(x, y) {
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = "#14532d";
      ctx.fillRect(px + 10, py + 6, 28, 36);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(px + 14, py + 10, 20, 28);
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(px + 20, py + 14, 8, 20);
    }

    function drawEventTile(tile) {
      const px = tile.x * TILE, py = tile.y * TILE;
      ctx.fillStyle = tile.type === "boss_event" ? "#f97316" : "#06b6d4";
      ctx.fillRect(px + 12, py + 12, 24, 24);
      ctx.fillStyle = "#fff";
      ctx.fillRect(px + 18, py + 18, 12, 12);
      if (tile.type === "boss_event") {
        ctx.fillStyle = "#450a0a";
        ctx.fillRect(px + 20, py + 20, 8, 8);
      }
    }

    function drawChest(x, y) {
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = "#92400e";
      ctx.fillRect(px + 10, py + 20, 28, 18);
      ctx.fillStyle = "#d97706";
      ctx.fillRect(px + 10, py + 16, 28, 8);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(px + 20, py + 22, 8, 8);
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 22, py + 24, 4, 4);
    }

    function drawTrap(x, y) {
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = "#374151";
      ctx.fillRect(px + 8, py + 34, 32, 6);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(px + 12, py + 20, 4, 16);
      ctx.fillRect(px + 20, py + 20, 4, 16);
      ctx.fillRect(px + 28, py + 20, 4, 16);
      ctx.fillStyle = "#fca5a5";
      ctx.fillRect(px + 11, py + 18, 6, 4);
      ctx.fillRect(px + 19, py + 18, 6, 4);
      ctx.fillRect(px + 27, py + 18, 6, 4);
    }

    function drawTreasure(x, y) {
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = "#facc15";
      ctx.fillRect(px + 16, py + 24, 8, 8);
      ctx.fillRect(px + 24, py + 26, 8, 6);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(px + 14, py + 28, 6, 4);
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(px + 18, py + 22, 6, 4);
    }

    function drawShopkeeper(x, y) {
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = "#1e40af";
      ctx.fillRect(px + 10, py + 10, 28, 28);
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(px + 14, py + 14, 20, 18);
      ctx.fillStyle = "#fff";
      ctx.fillRect(px + 18, py + 16, 4, 4);
      ctx.fillRect(px + 26, py + 16, 4, 4);
      // coin
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(px + 20, py + 34, 8, 8);
    }

    function drawOverlay(title, sub) {
      ctx.fillStyle = "rgba(2, 6, 23, 0.75)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "bold 48px Courier New";
      ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 8);
      ctx.font = "20px Courier New";
      ctx.fillStyle = "#bfdbfe";
      ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 26);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (g.grid?.[y]?.[x] === WALL) drawWall(x, y);
        else drawFloor(x, y);
      }
    }

    if (!g.hasKey && g.key?.x >= 0 && g.key?.y >= 0) drawKey(g.key.x, g.key.y);
    if (g.shield && !g.hasShield) drawShield(g.shield.x, g.shield.y);
    g.events.forEach(drawEventTile);
    g.chests.forEach(c => drawChest(c.x, c.y));
    g.traps.forEach(t => drawTrap(t.x, t.y));
    g.treasure.forEach(t => drawTreasure(t.x, t.y));

    if (g.exitTile?.x >= 0 && g.exitTile?.y >= 0 && (!g.bossRoomActive || g.exitUnlockedByBoss)) {
      drawExit(g.exitTile.x, g.exitTile.y);
    }
    if (g.shopkeeper) drawShopkeeper(g.shopkeeper.x, g.shopkeeper.y);
    g.enemies.forEach(drawEnemy);
    drawHero(g.player.x, g.player.y);

    if (g.levelModifier?.id === "dark") {
      const centerX = g.player.x * TILE + TILE / 2;
      const centerY = g.player.y * TILE + TILE / 2;
      const baseRadius = inv.vision ? 90 : 36;
      const gradient = ctx.createRadialGradient(centerX, centerY, 8, centerX, centerY, baseRadius);
      gradient.addColorStop(0, "rgba(2, 6, 23, 0.50)");
      gradient.addColorStop(0.35, "rgba(2, 6, 23, 0.84)");
      gradient.addColorStop(1, "rgba(2, 6, 23, 0.97)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (g.gameOver) drawOverlay("GAME OVER", "Click board to restart");
    if (g.victory)  drawOverlay("YOU WIN!",  "Click board to play again");
  }, []);

  // ── Combat helpers ────────────────────────────────────────────────────────
  const applyLootDrop = useCallback(() => {
    const g = gameRef.current;
    if (rand(1, 100) > BALANCE.lootDropChance) return;
    const roll = rand(1, 100);
    if (roll <= 35) {
      g.lives = Math.min(6, g.lives + 1);
      pushNotice("Loot drop: Healing potion (+1 life).");
    } else if (roll <= 65) {
      const bonus = rand(5, 12);
      g.gold += bonus;
      pushNotice(`Loot drop: Gold pouch (+${bonus} gold).`);
    } else if (roll <= 85) {
      g.nextRollBonus += 2;
      pushNotice("Loot drop: Battle focus (+2 next roll).");
    } else {
      g.score += 20;
      pushNotice("Loot drop: Treasure cache (+20 score).");
    }
  }, [pushNotice]);

  const checkPerfectClear = useCallback(() => {
    const g = gameRef.current;
    if (g.enemies.length > 0 || g.perfectClearClaimed) return;
    g.perfectClearClaimed = true;
    if (!g.bossRoomActive) g.hasKey = true;
    g.score += 50;

    // 50/50: gold or a random shop item the player doesn't already own
    const inv = inventoryRef.current;
    const eligible = STORE_ITEMS.filter(it => it.consumable ? true : !inv[it.id]);
    if (Math.random() < 0.5 && eligible.length > 0) {
      const item = eligible[Math.floor(Math.random() * eligible.length)];
      if (item.id === "healPotion") {
        g.lives = Math.min(6, g.lives + 1);
        pushNotice(`Floor Clear! +50 score. Bonus loot: ${item.name} (+1 life)!`);
      } else if (item.id === "greaterHeal") {
        g.lives = Math.min(6, g.lives + 2);
        pushNotice(`Floor Clear! +50 score. Bonus loot: ${item.name} (+2 lives)!`);
      } else if (item.id === "poisonFlask") {
        g.poisonFlaskActive = true;
        pushNotice(`Floor Clear! +50 score. Bonus loot: ${item.name}!`);
      } else {
        setPlayerInventory(i => ({ ...i, [item.id]: true }));
        pushNotice(`Floor Clear! +50 score. Bonus loot: ${item.name}!`);
      }
    } else {
      g.gold += BALANCE.goldPerfectClear;
      pushNotice(`Floor Clear! +50 score, +${BALANCE.goldPerfectClear} gold.`);
    }
  }, [pushNotice]);

  const enterBossRoom = useCallback((bossType) => {
    const g = gameRef.current;
    g.bossRoomActive = true;
    g.bossRoomType = bossType;
    g.exitUnlockedByBoss = false;
    g.events = [];
    g.chests = [];
    g.traps = [];
    g.treasure = [];
    g.shrine = null;
    g.shield = null;
    g.hasShield = false;
    g.shieldCharges = 0;
    g.hasKey = false;
    g.grid = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => FLOOR)
    );
    g.enemies = [makeBossEnemy(bossType)];
    g.player = { x: 1, y: 1 };
    g.key = { x: -1, y: -1 };
    g.exitTile = { x: GRID_SIZE - 2, y: GRID_SIZE - 2 };
    const bossNames = {
      dragon: "Dragon King", gollum: "Gollum", clone: "Doppelganger",
      lich: "The Lich", minotaur: "Minotaur Lord", vampire: "Vampire Lord",
    };
    pushNotice(`BOSS: ${bossNames[bossType] || bossType}! Kill it to unlock the exit.`);
    updateHud();
    draw();
  }, [draw, pushNotice, updateHud]);

  const resolveEventTile = useCallback((eventTile) => {
    const g = gameRef.current;
    g.events = g.events.filter(t => t !== eventTile);
    if (eventTile.type === "boss_event") {
      enterBossRoom(pickRandom(BOSS_TYPES));
      return;
    }
    const goldAmt = BALANCE.goldEventBonus;
    g.gold += goldAmt;
    g.score += 15;
    pushNotice(`Hidden cache: +${goldAmt} gold, +15 score.`);
  }, [enterBossRoom, pushNotice]);

  const hitPlayer = useCallback(() => {
    const g = gameRef.current;
    const inv = inventoryRef.current;

    if (inv.standing && !g._standingUsed) {
      g._standingUsed = true;
      setPlayerInventory(i => ({ ...i, standing: false }));
      pushNotice("Standing Tonic blocked the lethal hit!");
      g.inCombat = false;
      g.currentCombatEnemy = null;
      g.requiredRoll = 0;
      g.rolling = false;
      g.combatBonusUsed = 0;
      g.rerollUsed = false;
      resetCombatState();
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
      g.rerollUsed = false;
      pushNotice("Shield absorbed the hit!");
      resetCombatState();
      updateHud();
      draw();
      return;
    }

    g.lives -= 1;
    g.streak = 0;

    if (g.lives <= 0 && inv.resurrect && !g._resurrectUsed) {
      g._resurrectUsed = true;
      g.lives = 1;
      setPlayerInventory(i => ({ ...i, resurrect: false }));
      pushNotice("Resurrection Stone activates! You survive at 1 life.");
      g.inCombat = false;
      g.currentCombatEnemy = null;
      g.requiredRoll = 0;
      g.rolling = false;
      g.combatBonusUsed = 0;
      g.rerollUsed = false;
      resetCombatState();
      updateHud();
      draw();
      return;
    }

    g.inCombat = false;
    g.currentCombatEnemy = null;
    g.requiredRoll = 0;
    g.rolling = false;
    g.combatBonusUsed = 0;
    g.rerollUsed = false;

    if (g.lives <= 0) {
      g.gameOver = true;
      updateMeta();
      setGameOverRecap({
        level: g.currentLevel,
        score: g.score,
        gold: g.gold,
        kills: g.totalKills,
        streak: g.bestStreak,
      });
      pushNotice("You were slain.");
      // Death SFX + stop BGM
      if (deathSfxRef.current) {
        deathSfxRef.current.currentTime = 0;
        deathSfxRef.current.play().catch(() => {});
      }
      if (gameBgmRef.current) gameBgmRef.current.pause();
    } else {
      pushNotice(`You took a hit. ${g.lives} lives remaining.`);
    }

    resetCombatState();
    updateHud();
    draw();
  }, [draw, pushNotice, resetCombatState, updateHud, updateMeta]);

  const startCombat = useCallback((enemy) => {
    const g = gameRef.current;
    const inv = inventoryRef.current;
    if (g.inCombat || g.gameOver || g.victory) return;

    g.inCombat = true;
    g.currentCombatEnemy = enemy;
    g.rerollUsed = false;

    const baseRoll   = rand(6, 14) + Math.floor(g.currentLevel / 4);
    const elitePen   = enemy.elite ? 1 : 0;
    const bossPen    = enemy.boss  ? 2 : 0;
    const blessBon   = g.levelModifier?.id === "blessing" ? 2 : 0;
    const cursePen   = g.levelModifier?.id === "cursed"   ? 2 : 0;
    const bladeBonus = inv.bossBlade && enemy.boss ? 3 : 0;
    const swordBonus = inv.magicSword ? 2 : 0;
    const mirrorBon  = inv.mirrorWard && enemy.bossType === "clone" ? 2 : 0;
    const ringBonus  = inv.ringOfFire ? Math.min(5, g.ringOfFireBonus) : 0;
    const poisonBon  = g.poisonFlaskActive ? 3 : 0;

    g.combatBonusUsed = g.nextRollBonus;
    g.requiredRoll = clamp(
      baseRoll + elitePen + bossPen + cursePen
        - blessBon - g.combatBonusUsed - bladeBonus - swordBonus - mirrorBon - ringBonus - poisonBon,
      2, 19
    );
    g.nextRollBonus = 0;
    g.poisonFlaskActive = false;

    const enemyName = enemy.boss
      ? { dragon: "Dragon King", gollum: "Gollum", clone: "Doppelganger", lich: "The Lich", minotaur: "Minotaur Lord", vampire: "Vampire Lord" }[enemy.bossType] || "Boss"
      : enemy.elite ? "Elite Monster" : "Monster";

    const hpText = enemy.boss ? ` (HP: ${enemy.hp})` : "";
    setCombat({
      open: true,
      message: `${enemyName}${hpText}: roll ${g.requiredRoll}+ to hit.`,
      result: "",
      diceValue: 20,
      rolling: false,
      canReroll: inv.luckyCharm && !g.rerollUsed,
    });
    updateHud();
    draw();
  }, [draw, updateHud]);

  const generateLevel = useCallback(() => {
    const g = gameRef.current;
    let ready = false;

    g.levelModifier = g.currentLevel === 1 ? LEVEL_MODIFIERS[0] : pickRandom(LEVEL_MODIFIERS);
    g.perfectClearClaimed = false;
    g.shopkeeper = null;
    g.bossRoomActive = false;
    g.bossRoomType = null;
    g.exitUnlockedByBoss = false;
    g.lichCurseStacks = 0;

    while (!ready) {
      carveSimpleDungeon();
      const used = new Set();

      g.exitTile = randomFloorCell(used);
      used.add(coordKey(g.exitTile.x, g.exitTile.y));
      g.player = { x: g.exitTile.x, y: g.exitTile.y };

      g.key = randomFloorCell(used);
      used.add(coordKey(g.key.x, g.key.y));
      if (!reachable(g.player, g.key) || !reachable(g.key, g.exitTile)) continue;

      // Events
      g.events = [];
      const eventCount = rand(1, 2);
      for (let i = 0; i < eventCount; i++) {
        const ec = randomFloorCell(used);
        if (!reachable(g.player, ec)) continue;
        g.events.push({ ...ec, type: i === 0 ? "boss_event" : "loot_event" });
        used.add(coordKey(ec.x, ec.y));
      }

      // Shield
      g.shield = null;
      if (!g.hasShield && rand(1, 100) <= BALANCE.shieldSpawnChance) {
        const sc = randomFloorCell(used);
        if (reachable(g.player, sc)) {
          g.shield = sc;
          used.add(coordKey(sc.x, sc.y));
        }
      }

      // Enemies
      g.enemies = [];
      const enemyCount = Math.min(1 + g.currentLevel, 7);
      let placed = 0, attempts = 0;
      while (placed < enemyCount && attempts < 500) {
        attempts++;
        const ep = randomFloorCell(used);
        if (manhattanDistance(ep, g.player) < BALANCE.minEnemyStartDistance) continue;
        if (!reachable(g.player, ep)) continue;
        used.add(coordKey(ep.x, ep.y));
        const level = g.currentLevel;
        let variant = "goblin";
        if (level <= 3)       variant = "goblin";
        else if (level <= 7)  variant = pickRandom(["goblin", "orc"]);
        else if (level <= 14) variant = pickRandom(["orc", "skeleton"]);
        else                  variant = pickRandom(["skeleton", "knight"]);
        const haste = g.levelModifier?.id === "haste";
        g.enemies.push({
          x: ep.x, y: ep.y,
          stepDelay: haste ? rand(10, 16) : rand(20, 34),
          tick: 0, elite: false, boss: false, hp: 1,
          enemyVariant: variant,
        });
        placed++;
      }
      if (placed < enemyCount) continue;

      // Elite modifier
      if (g.levelModifier?.id === "elite") {
        g.enemies.forEach(e => {
          if (!e.boss) { e.elite = true; e.stepDelay = clamp(e.stepDelay - 4, 8, 40); }
        });
      } else if (g.currentLevel % 3 === 0 && g.enemies.length > 0) {
        const eliteIdx = rand(0, g.enemies.length - 1);
        g.enemies[eliteIdx].elite = true;
        g.enemies[eliteIdx].stepDelay = clamp(g.enemies[eliteIdx].stepDelay - 4, 10, 40);
      }

      // Shopkeeper
      if (g.shopLevels?.includes(g.currentLevel)) {
        const sc = randomFloorCell(used);
        if (reachable(g.player, sc)) {
          g.shopkeeper = sc;
          used.add(coordKey(sc.x, sc.y));
        }
      }

      // Chests
      g.chests = [];
      for (let i = 0; i < rand(0, 2); i++) {
        if (rand(1, 100) > BALANCE.chestSpawnChance) continue;
        const cc = randomFloorCell(used);
        if (reachable(g.player, cc)) {
          g.chests.push({ x: cc.x, y: cc.y });
          used.add(coordKey(cc.x, cc.y));
        }
      }

      // Traps
      g.traps = [];
      for (let i = 0; i < rand(1, 3); i++) {
        if (rand(1, 100) > BALANCE.trapSpawnChance) continue;
        const tc = randomFloorCell(used);
        if (!reachable(g.player, tc)) continue;
        if (manhattanDistance(tc, g.player) < 2) continue;
        g.traps.push({ x: tc.x, y: tc.y });
        used.add(coordKey(tc.x, tc.y));
      }

      // Treasure piles
      g.treasure = [];
      for (let i = 0; i < rand(1, 4); i++) {
        if (rand(1, 100) > BALANCE.treasureSpawnChance) continue;
        const tc = randomFloorCell(used);
        if (reachable(g.player, tc)) {
          g.treasure.push({ x: tc.x, y: tc.y });
          used.add(coordKey(tc.x, tc.y));
        }
      }

      ready = true;
    }

    g.hasKey = false;
    g.inCombat = false;
    g.currentCombatEnemy = null;
    g.requiredRoll = 0;
    g.rolling = false;
    resetCombatState();
    pushNotice(`Floor ${g.currentLevel}: ${g.levelModifier.name} — ${g.levelModifier.desc}`);
    updateHud();
    draw();
  }, [carveSimpleDungeon, draw, pushNotice, randomFloorCell, reachable, resetCombatState, updateHud]);

  const nextLevel = useCallback(() => {
    const g = gameRef.current;
    const inv = inventoryRef.current;

    if (inv.skip && !g._skipUsed && g.currentLevel < (g.maxLevels || MAX_LEVELS)) {
      g._skipUsed = true;
      setPlayerInventory(i => ({ ...i, skip: false }));
      pushNotice("Phase Step Elixir used — floor skipped!");
      g.currentLevel++;
      generateLevel();
      return;
    }

    if (g.currentLevel >= (g.maxLevels || MAX_LEVELS)) {
      g.victory = true;
      g.totalWins++;
      g.score += 100;
      g.gold += 50;
      pushNotice("Victory! Dungeon conquered! +100 score, +50 gold.");
      updateMeta();
      updateHud();
      draw();
      return;
    }

    g.currentLevel++;
    generateLevel();
  }, [draw, generateLevel, pushNotice, updateHud, updateMeta]);

  const movePlayer = useCallback((dx, dy) => {
    const g = gameRef.current;
    const inv = inventoryRef.current;
    if (menuState !== "game") return;
    if (g.gameOver || g.victory || g.inCombat) return;

    const nx = g.player.x + dx;
    const ny = g.player.y + dy;
    if (!isWalkable(nx, ny)) return;

    g.player.x = nx;
    g.player.y = ny;

    // Shopkeeper
    if (g.shopkeeper && g.player.x === g.shopkeeper.x && g.player.y === g.shopkeeper.y) {
      setShopOpen(true);
      updateHud();
      draw();
      return;
    }

    // Key
    if (!g.hasKey && g.player.x === g.key.x && g.player.y === g.key.y) {
      g.hasKey = true;
      pushNotice("You found the key!");
    }

    // Shield
    if (g.shield && g.player.x === g.shield.x && g.player.y === g.shield.y) {
      g.hasShield = true;
      g.shieldCharges = inv.armorUpgrade ? 4 : 2;
      g.shield = null;
      pushNotice(`Picked up shield (${g.shieldCharges} charges).`);
    }

    // Treasure piles
    const treIdx = g.treasure.findIndex(t => t.x === g.player.x && t.y === g.player.y);
    if (treIdx !== -1) {
      const goldAmt = BALANCE.goldTreasurePile;
      g.gold += goldAmt;
      g.treasure.splice(treIdx, 1);
      pushNotice(`Picked up ${goldAmt} gold!`);
      updateHud();
      draw();
      return;
    }

    // Chests
    const chestIdx = g.chests.findIndex(c => c.x === g.player.x && c.y === g.player.y);
    if (chestIdx !== -1) {
      g.chests.splice(chestIdx, 1);
      const roll = rand(1, 100);
      if (roll <= 45) {
        const goldAmt = rand(BALANCE.goldChestMin, BALANCE.goldChestMax);
        g.gold += goldAmt;
        pushNotice(`Chest opened! Found ${goldAmt} gold!`);
      } else if (roll <= 70) {
        g.lives = Math.min(6, g.lives + 1);
        pushNotice("Chest opened! Found a healing potion. +1 life.");
      } else if (roll <= 90) {
        g.nextRollBonus += 3;
        pushNotice("Chest opened! Found a battle scroll. +3 next roll.");
      } else {
        g.score += 30;
        pushNotice("Chest opened! Found treasure. +30 score.");
      }
      updateHud();
      draw();
      return;
    }

    // Traps
    const trapIdx = g.traps.findIndex(t => t.x === g.player.x && t.y === g.player.y);
    if (trapIdx !== -1) {
      g.traps.splice(trapIdx, 1);
      const roll = rand(1, 100);
      if (roll <= 55) {
        if (g.hasShield) {
          g.shieldCharges = Math.max(0, g.shieldCharges - 1);
          g.hasShield = g.shieldCharges > 0;
          pushNotice("Spike trap! Shield absorbed the hit.");
        } else {
          g.lives = Math.max(0, g.lives - 1);
          g.streak = 0;
          pushNotice(`Spike trap! -1 life. (${g.lives} remaining)`);
          if (g.lives <= 0) {
            g.gameOver = true;
            setGameOverRecap({ level: g.currentLevel, score: g.score, gold: g.gold, kills: g.totalKills, streak: g.bestStreak });
            updateMeta();
          }
        }
      } else {
        const goldLost = Math.min(g.gold, rand(5, 15));
        g.gold -= goldLost;
        pushNotice(`Poison dart! Lost ${goldLost} gold.`);
      }
      updateHud();
      draw();
      return;
    }

    // Events
    const eventTile = g.events.find(t => t.x === g.player.x && t.y === g.player.y);
    if (eventTile) {
      resolveEventTile(eventTile);
      updateHud();
      draw();
      return;
    }

    // Enemy collision
    for (const enemy of g.enemies) {
      if (enemy.x === g.player.x && enemy.y === g.player.y) {
        startCombat(enemy);
        draw();
        return;
      }
    }

    // Exit
    if (g.player.x === g.exitTile.x && g.player.y === g.exitTile.y) {
      if (g.bossRoomActive && !g.exitUnlockedByBoss) {
        pushNotice("Room sealed. Kill the boss to open the exit!");
      } else if (g.hasKey || g.bossRoomActive) {
        nextLevel();
        return;
      } else {
        pushNotice("You need the key to exit!");
      }
    }

    updateMeta();
    updateHud();
    draw();
  }, [draw, isWalkable, menuState, nextLevel, pushNotice, resolveEventTile, startCombat, updateHud, updateMeta]);

  const moveEnemies = useCallback(() => {
    const g = gameRef.current;
    if (menuState !== "game") return;
    if (g.gameOver || g.victory || g.inCombat) return;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const enemy of g.enemies) {
      enemy.tick++;
      if (enemy.tick < enemy.stepDelay) continue;
      enemy.tick = 0;
      if (enemy.boss) {
        let dx = 0, dy = 0;
        if (enemy.x < g.player.x) dx = 1;
        else if (enemy.x > g.player.x) dx = -1;
        if (enemy.y < g.player.y) dy = 1;
        else if (enemy.y > g.player.y) dy = -1;
        // Vampire teleports occasionally
        if (enemy.bossType === "vampire" && rand(1, 100) <= 8) {
          const tx = clamp(g.player.x + rand(-3, 3), 1, GRID_SIZE - 2);
          const ty = clamp(g.player.y + rand(-3, 3), 1, GRID_SIZE - 2);
          if (isWalkable(tx, ty)) { enemy.x = tx; enemy.y = ty; }
        } else {
          const nx = enemy.x + dx, ny = enemy.y + dy;
          if (isWalkable(nx, ny)) { enemy.x = nx; enemy.y = ny; }
        }
        // Gollum micro-teleport
        if (enemy.bossType === "gollum" && rand(1, 100) <= 12) {
          const tx = clamp(g.player.x + rand(-2, 2), 1, GRID_SIZE - 2);
          const ty = clamp(g.player.y + rand(-2, 2), 1, GRID_SIZE - 2);
          if (isWalkable(tx, ty)) { enemy.x = tx; enemy.y = ty; }
        }
      } else {
        const options = dirs
          .map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy }))
          .filter(p =>
            isWalkable(p.x, p.y) &&
            !(p.x === g.exitTile.x && p.y === g.exitTile.y) &&
            !(p.x === g.key.x && p.y === g.key.y) &&
            !(g.shield && p.x === g.shield.x && p.y === g.shield.y)
          );
        if (options.length) {
          const pick = options[rand(0, options.length - 1)];
          enemy.x = pick.x;
          enemy.y = pick.y;
        }
      }
      if (enemy.x === g.player.x && enemy.y === g.player.y) {
        startCombat(enemy);
        draw();
        return;
      }
    }
    draw();
  }, [draw, isWalkable, menuState, startCombat]);

  // ── Roll handler ──────────────────────────────────────────────────────────
  const handleRoll = useCallback((skipAnimation = false) => {
    const g = gameRef.current;
    const inv = inventoryRef.current;
    if (!g.inCombat || !g.currentCombatEnemy) return;
    if (g.rolling) {
      if (skipAnimation && fastRollResolverRef.current) fastRollResolverRef.current();
      return;
    }
    // Play roll SFX
    if (!skipAnimation && rollSfxRef.current) {
      rollSfxRef.current.currentTime = 0;
      rollSfxRef.current.play().catch(() => {});
    }

    const resolveFinalRoll = (inputRoll) => {
      let finalRoll = inputRoll;
      fastRollResolverRef.current = null;
      setCombat(prev => ({ ...prev, diceValue: finalRoll }));

      const enemy = g.currentCombatEnemy;

      // Gollum charm
      if (enemy?.bossType === "gollum" && inv.gollumCharm && !g._gollumCharmUsed) {
        g._gollumCharmUsed = true;
        finalRoll = 20;
        setCombat(prev => ({ ...prev, diceValue: 20 }));
      }

      // Natural 1
      if (finalRoll === 1) {
        setCombat(prev => ({ ...prev, rolling: false, result: "Natural 1 — you stumble!", canReroll: inv.luckyCharm && !g.rerollUsed }));
        g.rolling = false;
        window.setTimeout(() => hitPlayer(), 700);
        return;
      }

      // Hit
      if (finalRoll >= g.requiredRoll) {
        let bossDefeated = false;
        if (enemy?.boss && enemy.hp > 1) {
          enemy.hp--;
          setCombat(prev => ({
            ...prev, rolling: false,
            result: `Hit! Boss has ${enemy.hp} HP left.`,
            message: `Roll ${g.requiredRoll}+ again.`,
            canReroll: false,
          }));
          g.rolling = false;
          updateHud();
          draw();
          return;
        }

        g.enemies = g.enemies.filter(m => m !== enemy);
        g.totalKills++;
        bossDefeated = isBossEnemy(enemy);

        // Gold reward
        let goldGained = bossDefeated ? BALANCE.goldPerBossKill
          : enemy?.elite ? BALANCE.goldPerEliteKill
          : BALANCE.goldPerKill;
        if (g.levelModifier?.id === "goldrush") goldGained = Math.floor(goldGained * 1.5);
        g.gold += goldGained;

        // Ring of Fire
        if (inv.ringOfFire) {
          const cap = Math.min(5, g.ringOfFireBonus + 1);
          g.ringOfFireBonus = cap;
        }

        g.streak++;
        g.score += bossDefeated ? 50 : enemy?.elite ? 22 : 10;
        g.inCombat = false;
        g.currentCombatEnemy = null;
        g.rolling = false;
        g.combatBonusUsed = 0;
        g.rerollUsed = false;

        if (bossDefeated && g.bossRoomActive) {
          g.exitUnlockedByBoss = true;
          g.hasKey = true;
          pushNotice(`Boss slain! +${goldGained} gold. Reach the portal to advance.`);
        } else {
          pushNotice(`Killed with ${finalRoll}! +${goldGained} gold.`);
        }

        // Kill SFX
        if (killSfxRef.current) {
          killSfxRef.current.currentTime = 0;
          killSfxRef.current.play().catch(() => {});
        }

        updateMeta();
        applyLootDrop();
        checkPerfectClear();
        updateHud();

        setCombat(prev => ({
          ...prev, rolling: false,
          result: bossDefeated ? `Boss defeated! Rolled ${finalRoll}!` : `Rolled ${finalRoll} — monster slain!`,
          canReroll: false,
        }));

        window.setTimeout(() => { resetCombatState(); draw(); }, 600);
        return;
      }

      // Miss — mirror ward check
      if (enemy?.bossType === "clone" && inv.mirrorWard) {
        setCombat(prev => ({ ...prev, rolling: false, result: "Mirror Ward deflected the clone's counter!", canReroll: false }));
        g.inCombat = false;
        g.currentCombatEnemy = null;
        g.rolling = false;
        g.rerollUsed = false;
        window.setTimeout(() => resetCombatState(), 600);
        updateHud();
        draw();
        return;
      }

      setCombat(prev => ({
        ...prev, rolling: false,
        result: `Rolled ${finalRoll} — need ${g.requiredRoll}+. Not enough!`,
        canReroll: inv.luckyCharm && !g.rerollUsed,
      }));
      g.rolling = false;
      window.setTimeout(() => hitPlayer(), 700);
    };

    g.rolling = true;
    setCombat(prev => ({ ...prev, rolling: true, result: "Rolling...", canReroll: false }));

    fastRollResolverRef.current = () => {
      window.clearInterval(rollerRef.current);
      resolveFinalRoll(rand(1, 20));
    };

    if (skipAnimation) { fastRollResolverRef.current(); return; }

    let ticks = 0;
    rollerRef.current = window.setInterval(() => {
      setCombat(prev => ({ ...prev, diceValue: rand(1, 20) }));
      ticks++;
      if (ticks < 14) return;
      window.clearInterval(rollerRef.current);
      resolveFinalRoll(rand(1, 20));
    }, 75);
  }, [applyLootDrop, checkPerfectClear, draw, hitPlayer, pushNotice, resetCombatState, updateHud, updateMeta]);

  const handleReroll = useCallback(() => {
    const g = gameRef.current;
    if (!g.inCombat || g.rolling || g.rerollUsed) return;
    g.rerollUsed = true;
    setCombat(prev => ({ ...prev, canReroll: false }));
    handleRoll(false);
  }, [handleRoll]);

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.maxLevels = getMaxLevelsForDifficulty(difficulty);

    if (difficulty === "easy") {
      g.shopLevels = [rand(2, 5)];
    } else if (difficulty === "medium") {
      g.shopLevels = [rand(2, 8), rand(9, 16)];
    } else {
      g.shopLevels = [rand(2, 10), rand(11, 20), rand(21, 28)];
    }

    g.shopVisits = 0;
    g.gold = 0;
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
    g.chests = [];
    g.traps = [];
    g.treasure = [];
    g.gameOver = false;
    g.victory = false;
    g.inCombat = false;
    g.currentCombatEnemy = null;
    g.requiredRoll = 0;
    g.combatBonusUsed = 0;
    g._standingUsed = false;
    g._skipUsed = false;
    g._gollumCharmUsed = false;
    g._resurrectUsed = false;
    g.bossRoomActive = false;
    g.bossRoomType = null;
    g.exitUnlockedByBoss = false;
    g.poisonFlaskActive = false;
    g.ringOfFireBonus = 0;
    g.lichCurseStacks = 0;
    g.rerollUsed = false;

    setGameOverRecap(null);
    setShopOpen(false);
    setPlayerInventory({
      vision: false, standing: false, skip: false,
      bossBlade: false, gollumCharm: false, mirrorWard: false,
      magicSword: false, luckyCharm: false, ringOfFire: false,
      armorUpgrade: false, resurrect: false,
    });

    pushNotice("A new quest begins. Find the key and reach the exit!");
    generateLevel();
  }, [difficulty, generateLevel, pushNotice]);

  const handleRestartOverlayClick = useCallback(() => {
    const g = gameRef.current;
    if (!g.gameOver && !g.victory) return;
    resetGame();
  }, [resetGame]);

  // ── Key bindings ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rebindKey) return;
    function handleKey(e) {
      e.preventDefault();
      const nextValue = e.code === "Space" ? "Space" : e.key;
      setKeyBindings(prev => ({ ...prev, [rebindKey]: nextValue }));
      setRebindKey(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [rebindKey]);

  useEffect(() => {
    function handleMenuKeys(e) {
      if (shopOpen || rebindKey) return;

      if (menuState === "start") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          setMenuIndex(p => (p - 1 + START_MENU_ITEMS.length) % START_MENU_ITEMS.length);
          return;
        }
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          setMenuIndex(p => (p + 1) % START_MENU_ITEMS.length);
          return;
        }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (menuIndex === 0) { setDifficultyIndex(0); setMenuState("difficulty"); }
          else if (menuIndex === 1) setMenuState("options");
          else window.location.href = "/";
        }
        return;
      }

      if (menuState === "difficulty") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          setDifficultyIndex(p => (p - 1 + difficultyItems.length) % difficultyItems.length);
          return;
        }
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          setDifficultyIndex(p => (p + 1) % difficultyItems.length);
          return;
        }
        if (e.key === "Escape") { e.preventDefault(); setMenuState("start"); return; }
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const sel = difficultyItems[difficultyIndex];
          if (sel.key === "back") { setMenuState("start"); return; }
          setDifficulty(sel.key);
          setMenuState("game");
          setTimeout(() => resetGame(), 0);
        }
        return;
      }

      if (menuState === "options" && e.key === "Escape") {
        e.preventDefault(); setMenuState("start"); return;
      }

      if (menuState !== "game") return;

      const rollKeys = [keyBindings.roll, " ", "Space"];
      if (rollKeys.includes(e.key) || rollKeys.includes(e.code)) {
        e.preventDefault();
        const now = window.performance ? window.performance.now() : Date.now();
        const isDoubleTap = now - lastRollTapRef.current <= 280;
        lastRollTapRef.current = now;
        handleRoll(isDoubleTap);
        return;
      }

      const upKeys    = [keyBindings.up,    "w", "W"];
      const downKeys  = [keyBindings.down,  "s", "S"];
      const leftKeys  = [keyBindings.left,  "a", "A"];
      const rightKeys = [keyBindings.right, "d", "D"];

      if (upKeys.includes(e.key)    || upKeys.includes(e.code))    { e.preventDefault(); movePlayer(0,  -1); return; }
      if (downKeys.includes(e.key)  || downKeys.includes(e.code))  { e.preventDefault(); movePlayer(0,   1); return; }
      if (leftKeys.includes(e.key)  || leftKeys.includes(e.code))  { e.preventDefault(); movePlayer(-1,  0); return; }
      if (rightKeys.includes(e.key) || rightKeys.includes(e.code)) { e.preventDefault(); movePlayer(1,   0); return; }
    }
    window.addEventListener("keydown", handleMenuKeys);
    return () => window.removeEventListener("keydown", handleMenuKeys);
  }, [difficultyIndex, difficultyItems, handleRoll, keyBindings, menuIndex, menuState, movePlayer, rebindKey, resetGame, shopOpen]);

  useEffect(() => {
    const g = gameRef.current;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(META_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          g.bestLevel  = Number(parsed.bestLevel)  || 1;
          g.bestStreak = Number(parsed.bestStreak) || 0;
          g.bestScore  = Number(parsed.bestScore)  || 0;
          g.totalKills = Number(parsed.totalKills) || 0;
          g.totalWins  = Number(parsed.totalWins)  || 0;
        }
      } catch { /* ignore */ }
    }
    function onResize() {
      setIsMobile(window.innerWidth <= 920);
      setViewportWidth(window.innerWidth);
    }
    onResize();
    window.addEventListener("resize", onResize);

    function loop() { moveEnemies(); rafRef.current = window.requestAnimationFrame(loop); }
    rafRef.current = window.requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(rafRef.current);
      window.clearInterval(rollerRef.current);
      fastRollResolverRef.current = null;
    };
  }, [moveEnemies]);

  // ── Audio init — runs ONCE on mount only ────────────────────────────────
  useEffect(() => {
    const vol = audioVolumeRef.current;
    // menu BGM disabled
    gameBgmRef.current  = createAudioAsset("TempleOS theme Remix.mp3", vol);
    gameBgm2Ref.current = createAudioAsset("game_music_loop.mp3", vol);
    // Alternate between TempleOS → game_music_loop → TempleOS → …
    const onGame1End = () => {
      if (gameBgm2Ref.current) { gameBgm2Ref.current.currentTime = 0; gameBgm2Ref.current.play().catch(() => {}); }
    };
    const onGame2End = () => {
      if (gameBgmRef.current) { gameBgmRef.current.currentTime = 0; gameBgmRef.current.play().catch(() => {}); }
    };
    gameBgmRef.current.addEventListener("ended", onGame1End);
    gameBgm2Ref.current.addEventListener("ended", onGame2End);
    rollSfxRef.current  = createAudioAsset("dice-roll.mp3", Math.min(1, vol * 1.1));
    killSfxRef.current  = createAudioAsset("monster-dying-effect.mp3", Math.min(1, vol * 0.9));
    deathSfxRef.current = createAudioAsset("you-died.mp3", vol);
    return () => {
      gameBgmRef.current?.removeEventListener("ended", onGame1End);
      gameBgm2Ref.current?.removeEventListener("ended", onGame2End);
      cleanupAudioAsset(menuBgmRef.current);
      cleanupAudioAsset(gameBgmRef.current);
      cleanupAudioAsset(gameBgm2Ref.current);
      cleanupAudioAsset(rollSfxRef.current);
      cleanupAudioAsset(killSfxRef.current);
      cleanupAudioAsset(deathSfxRef.current);
    };
  }, []);

  useEffect(() => { draw(); }, [draw, hud, menuState]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const panelStyle = mergeStyle(styles?.panel, {
    background: "rgba(15, 23, 42, 0.9)",
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
    boxShadow: "none",
    filter: "none",
  });

  const menuBgStyle = {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage: 'url("/title-screen.png")',
    backgroundPosition: "center",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#020617",
    overflow: "hidden",
  };

  const menuOverlayStyle = {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(180deg, rgba(2,6,23,0.22), rgba(2,6,23,0.42))",
    pointerEvents: "none",
  };

  const desktopMix = clamp((viewportWidth - 820) / 620, 0, 1);
  const interpolatedRight     = 7.5 + desktopMix * 6;
  const interpolatedTop       = 60.5 - desktopMix * 4;
  const interpolatedGap       = Math.round(10 + desktopMix * 4);
  const interpolatedFontSize  = Math.round(41 + desktopMix * 26);
  const interpolatedDotWidth  = Math.round(18 + desktopMix * 4);
  const interpolatedDotMargin = Math.round(8  + desktopMix * 2);

  const titleMenuButtonsWrapStyle = {
    position: "absolute",
    right: `${interpolatedRight}%`,
    top: `${interpolatedTop}%`,
    transform: "translateY(-50%)",
    zIndex: 3,
    display: "grid",
    gap: interpolatedGap,
    width: viewportWidth <= 640 ? "min(76vw, 340px)" : "min(34vw, 430px)",
  };

  const titleMenuButtonStyle = (active) => ({
    background: "transparent",
    border: "none",
    color: "#f8fafc",
    cursor: "pointer",
    fontSize: interpolatedFontSize,
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: "0.6px",
    textAlign: "left",
    padding: 0,
    textTransform: "uppercase",
    textShadow: active
      ? "0 0 14px rgba(250, 204, 21, 0.75), 3px 3px 0 #000"
      : "3px 3px 0 #000",
    filter: active ? "brightness(1.08)" : "none",
    transition: "filter 120ms ease, text-shadow 120ms ease",
  });

  const menuDotStyle = {
    color: "#facc15",
    marginRight: interpolatedDotMargin,
    display: "inline-block",
    width: interpolatedDotWidth,
  };

  const menuPanelStyle = {
    position: "relative",
    zIndex: 2,
    width: "min(560px, 92%)",
    border: "2px solid rgba(255,255,255,0.24)",
    borderRadius: 18,
    background: "rgba(2, 6, 23, 0.85)",
    boxShadow: "0 25px 80px rgba(0,0,0,0.6)",
    padding: 34,
  };

  const menuButtonStyle = (active) => ({
    ...btnStyle,
    width: "100%",
    marginBottom: 12,
    textAlign: "left",
    border: active ? "2px solid #facc15" : "1px solid rgba(255,255,255,0.15)",
    boxShadow: active ? "0 0 18px rgba(250, 204, 21, 0.3)" : "none",
  });

  // Rebind button — no blue glow, clean readable style
  const rebindBtnStyle = {
    padding: "4px 12px",
    borderRadius: 6,
    border: "1px solid rgba(148,163,184,0.5)",
    background: "#334155",
    color: "#f1f5f9",
    cursor: "pointer",
    fontFamily: '"Courier New", monospace',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.5px",
    boxShadow: "none",
    filter: "none",
  };

  const owned = (id) => Boolean(playerInventory[id]);

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Animation keyframes */}
      <style>{`
        @keyframes d20wobble {
          0%   { transform: rotate(-11deg) scale(1.06); }
          100% { transform: rotate(11deg)  scale(0.96); }
        }
        @keyframes d20settle {
          0%   { transform: scale(1.18); }
          60%  { transform: scale(0.92); }
          100% { transform: scale(1.00); }
        }
      `}</style>

      {/* ── Shop modal ──────────────────────────────────────────────────── */}
      {shopOpen && menuState === "game" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }}>
          <div style={{ background: "#0f172a", borderRadius: 16, padding: 24, minWidth: 340, maxWidth: 540, boxShadow: "0 8px 40px #000b", border: "1px solid rgba(148,163,184,0.3)" }}>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4, textAlign: "center", color: "#fff" }}>⚔ Dungeon Store</div>
            <div style={{ marginBottom: 6, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Spend gold to buy upgrades for this run.</div>
            <div style={{ marginBottom: 14, textAlign: "center" }}>
              <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: 18 }}>Gold: {hud.gold}</span>
            </div>
            <div style={{ display: "grid", gap: 8, maxHeight: "55vh", overflowY: "auto", paddingRight: 4 }}>
              {STORE_ITEMS.map(item => {
                const isOwned = !item.consumable && owned(item.id);
                const canAfford = hud.gold >= item.cost;
                return (
                  <div key={item.id} style={{ background: "#1e293b", border: isOwned ? "1px solid #4ade80" : "1px solid rgba(148,163,184,0.25)", borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{item.name}</span>
                      <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" }}>{item.cost}g</span>
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>{item.desc}</div>
                    <button
                      style={{ ...rebindBtnStyle, width: "100%", fontSize: 13, padding: "6px 10px", background: isOwned ? "#14532d" : canAfford ? "#1d4ed8" : "#374151", color: isOwned || canAfford ? "#fff" : "#6b7280", cursor: isOwned || !canAfford ? "not-allowed" : "pointer" }}
                      disabled={isOwned || !canAfford}
                      onClick={() => {
                        if (isOwned || !canAfford) return;
                        const g = gameRef.current;
                        g.gold -= item.cost;
                        if (item.id === "healPotion") {
                          g.lives = Math.min(6, g.lives + 1);
                          pushNotice("Healing Draught used! +1 life.");
                        } else if (item.id === "greaterHeal") {
                          g.lives = Math.min(6, g.lives + 2);
                          pushNotice("Greater Healing Potion! +2 lives.");
                        } else if (item.id === "poisonFlask") {
                          g.poisonFlaskActive = true;
                          pushNotice("Poison Flask ready — next combat is easier.");
                        } else {
                          setPlayerInventory(inv => ({ ...inv, [item.id]: true }));
                          pushNotice(`Purchased: ${item.name}.`);
                        }
                        updateHud();
                      }}
                    >
                      {isOwned ? "✓ Owned" : canAfford ? "Buy" : "Need more gold"}
                    </button>
                  </div>
                );
              })}
            </div>
            <button style={{ ...btnStyle, width: "100%", marginTop: 14 }} onClick={() => setShopOpen(false)}>Leave Shop</button>
          </div>
        </div>
      )}

      {/* ── Start menu ──────────────────────────────────────────────────── */}
      {menuState === "start" && (
        <div style={menuBgStyle}>
          <div style={menuOverlayStyle} />
          <div style={titleMenuButtonsWrapStyle}>
            {START_MENU_ITEMS.map((item, index) => {
              const active = menuIndex === index;
              return (
                <button
                  key={item}
                  onMouseEnter={() => setMenuIndex(index)}
                  onFocus={() => setMenuIndex(index)}
                  onClick={() => {
                    setMenuIndex(index);
                    if (item === "START") { setDifficultyIndex(0); setMenuState("difficulty"); }
                    else if (item === "OPTIONS") setMenuState("options");
                    else window.location.href = "/";
                  }}
                  style={titleMenuButtonStyle(active)}
                >
                  <span style={menuDotStyle}>•</span>{item}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Difficulty select ────────────────────────────────────────────── */}
      {menuState === "difficulty" && (
        <div style={menuBgStyle}>
          <div style={menuOverlayStyle} />
          <div style={menuPanelStyle}>
            <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 18, color: "#fff" }}>Select Difficulty</div>
            {difficultyItems.map((item, index) => {
              const active = difficultyIndex === index;
              return (
                <button
                  key={item.key}
                  onMouseEnter={() => setDifficultyIndex(index)}
                  style={menuButtonStyle(active)}
                  onClick={() => {
                    if (item.key === "back") { setMenuState("start"); return; }
                    setDifficulty(item.key);
                    setMenuState("game");
                    setTimeout(() => resetGame(), 0);
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Options ─────────────────────────────────────────────────────── */}
      {menuState === "options" && (
        <div style={menuBgStyle}>
          <div style={menuOverlayStyle} />
          <div style={menuPanelStyle}>
            <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 18, color: "#fff" }}>Options</div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 16, marginBottom: 8, display: "block", color: "#cbd5e1" }}>Audio Volume</label>
              <input
                type="range" min={0} max={1} step={0.01}
                value={audioVolume}
                onChange={e => setAudioVolume(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ marginTop: 4, color: "#94a3b8", fontSize: 13 }}>{Math.round(audioVolume * 100)}%</div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 16, marginBottom: 10, display: "block", color: "#cbd5e1" }}>Key Bindings</label>
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(keyBindings).map(([action, key]) => (
                  <div key={action} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 8, padding: "8px 12px" }}>
                    <span style={{ minWidth: 56, textTransform: "capitalize", fontWeight: 700, color: "#93c5fd", fontSize: 13 }}>{action}:</span>
                    <span style={{ flex: 1, color: "#f1f5f9", fontFamily: '"Courier New", monospace', fontSize: 13 }}>
                      {rebindKey === action ? "⌨ Press any key..." : key}
                    </span>
                    <button style={rebindBtnStyle} onClick={() => setRebindKey(action)}>
                      Rebind
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              style={{ ...btnStyle, width: "100%" }}
              onClick={() => { setRebindKey(null); setMenuState("start"); }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Game view ───────────────────────────────────────────────────── */}
      {menuState === "game" && (
        <div style={mergeStyle(styles?.page, {
          minHeight: "100vh",
          color: "#fff",
          padding: isMobile ? 10 : 18,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxWidth: 1240,
          width: "100%",
          margin: "0 auto",
        })}>
          {/* Title bar */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={styles?.logo}>Dungeon Roll</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>Bosses: Dragon · Gollum · Doppelganger · Lich · Minotaur · Vampire</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={{ ...btnStyle, minWidth: 120 }} onClick={onBack}>Back</button>
              <button style={{ ...btnStyle, minWidth: 150 }} onClick={() => setMenuState("start")}>Main Menu</button>
              <button style={{ ...btnStyle, minWidth: 150 }} onClick={resetGame}>Restart</button>
            </div>
          </div>

          {/* HUD */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(6, 1fr)", gap: 10 }}>
            <div style={panelStyle}>
              <div style={styles?.label}>Floor</div>
              <div style={styles?.value}>{hud.level}/{gameRef.current.maxLevels || MAX_LEVELS}</div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>Lives</div>
              <div style={{ ...styles?.value, color: hud.lives <= 1 ? "#ef4444" : "#fff" }}>{"❤".repeat(hud.lives)}</div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>Gold 🪙</div>
              <div style={{ ...styles?.value, color: "#fbbf24" }}>{hud.gold}</div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>Score</div>
              <div style={styles?.value}>{hud.score}</div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>Shield</div>
              <div style={styles?.value}>{hud.shieldStatus}</div>
            </div>
            <div style={panelStyle}>
              <div style={styles?.label}>Modifier</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd" }}>{hud.modifier}</div>
            </div>
          </div>

          {/* Main layout */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 290px", gap: 14, alignItems: "start" }}>
            {/* Canvas */}
            <div style={panelStyle}>
              <canvas
                ref={canvasRef}
                width={GRID_SIZE * TILE}
                height={GRID_SIZE * TILE}
                onClick={handleRestartOverlayClick}
                style={{
                  width: "100%", height: "auto", display: "block",
                  imageRendering: "pixelated",
                  border: "2px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  background: "#020617",
                  cursor: (gameRef.current.gameOver || gameRef.current.victory) ? "pointer" : "default",
                }}
              />
              <div style={{ marginTop: 8, color: "#fef08a", fontSize: 12, textAlign: "center", minHeight: 18 }}>{notice}</div>
            </div>

            {/* Sidebar */}
            <div style={{ display: "grid", gap: 10 }}>
              <div style={panelStyle}>
                <div style={styles?.label}>Status</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  <span>State: {hud.state}</span><br />
                  <span>Key: {hud.keyStatus}</span><br />
                  <span>Streak: {hud.streak}</span><br />
                  <span>Monsters: {hud.monsterCount}</span>
                  {hud.nextBonus > 0 && <><br /><span style={{ color: "#4ade80" }}>Next roll +{hud.nextBonus}</span></>}
                  {gameRef.current.poisonFlaskActive && <><br /><span style={{ color: "#a78bfa" }}>☠ Poison Flask ready</span></>}
                  {gameRef.current.ringOfFireBonus > 0 && <><br /><span style={{ color: "#fb923c" }}>🔥 Ring +{gameRef.current.ringOfFireBonus}</span></>}
                </div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Inventory</div>
                <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
                  {Object.entries(playerInventory).map(([k, v]) => {
                    if (!v) return null;
                    const item = STORE_ITEMS.find(s => s.id === k);
                    return <div key={k} style={{ color: "#4ade80" }}>✓ {item?.name || k}</div>;
                  })}
                  {!Object.values(playerInventory).some(Boolean) && (
                    <div style={{ color: "#475569" }}>No items yet — visit the shop!</div>
                  )}
                </div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Records</div>
                <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                  <div>Best Floor: {hud.bestLevel}</div>
                  <div>Best Streak: {hud.bestStreak}</div>
                  <div>Best Score: {hud.bestScore}</div>
                  <div>Total Kills: {hud.totalKills}</div>
                  <div>Total Wins: {hud.totalWins}</div>
                </div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Controls</div>
                <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
                  <div>Move: arrows / WASD</div>
                  <div>Roll: {keyBindings.roll === " " ? "Space" : keyBindings.roll}</div>
                  <div>Double-tap roll = fast roll</div>
                  <div>Walk onto chest to open it</div>
                  <div>Walk onto shop NPC to buy</div>
                </div>
              </div>

              <div style={panelStyle}>
                <div style={styles?.label}>Map Legend</div>
                <div style={{ fontSize: 11, lineHeight: 1.8, color: "#94a3b8" }}>
                  <div>🟡 Yellow = Key</div>
                  <div>🔵 Cyan = Shield</div>
                  <div>🟢 Green = Exit portal</div>
                  <div>🟠 Orange tile = Boss event</div>
                  <div>🔷 Cyan tile = Loot event</div>
                  <div>🟤 Brown = Chest</div>
                  <div>🔴 Red spikes = Trap!</div>
                  <div>🟡 Small gold = Treasure</div>
                  <div>🔵 NPC = Shopkeeper</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Combat modal ─────────────────────────────────────────────────── */}
      {combat.open && menuState === "game" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1800, padding: 20 }}>
          <div style={{ background: "#0f172a", border: "2px solid rgba(148,163,184,0.3)", borderRadius: 18, padding: "28px 24px", width: "min(440px,100%)", textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 10, color: "#fff", textTransform: "uppercase", letterSpacing: 1 }}>⚔ Combat</div>
            <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>{combat.message}</div>

            {/* D20 dice */}
            <D20Dice value={combat.diceValue} rolling={combat.rolling} />

            <div style={{ minHeight: 22, color: "#93c5fd", marginBottom: 18, marginTop: 14, fontSize: 14, fontWeight: 600 }}>
              {combat.result}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                style={{ ...btnStyle, fontSize: 18, minWidth: 160, padding: "14px 20px" }}
                onClick={() => handleRoll(false)}
                disabled={combat.rolling}
              >
                {combat.rolling ? "Rolling..." : "🎲 Roll D20"}
              </button>

              {combat.canReroll && (
                <button
                  style={{ ...btnStyle, fontSize: 14, minWidth: 130, background: "#7c3aed", border: "1px solid #a78bfa" }}
                  onClick={handleReroll}
                  disabled={combat.rolling}
                >
                  ✨ Reroll (Charm)
                </button>
              )}
            </div>

            <div style={{ marginTop: 14, fontSize: 11, color: "#475569" }}>
              Double-tap Space to skip animation
            </div>
          </div>
        </div>
      )}

      {/* ── Game Over recap modal ─────────────────────────────────────────── */}
      {gameOverRecap && menuState === "game" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2500, padding: 20 }}>
          <div style={{ background: "#0f172a", border: "2px solid #ef4444", borderRadius: 18, padding: 32, width: "min(420px,100%)", textAlign: "center", boxShadow: "0 0 40px rgba(239,68,68,0.3)" }}>
            <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 6, color: "#ef4444" }}>DEFEATED</div>
            <div style={{ color: "#94a3b8", marginBottom: 24, fontSize: 13 }}>Better luck next time, adventurer.</div>
            <div style={{ display: "grid", gap: 8, marginBottom: 24, textAlign: "left", background: "#1e293b", borderRadius: 10, padding: 16 }}>
              {[
                ["Floor Reached",  gameOverRecap.level],
                ["Score",          gameOverRecap.score],
                ["Gold Collected", `${gameOverRecap.gold} 🪙`],
                ["Total Kills",    gameOverRecap.kills],
                ["Best Streak",    gameOverRecap.streak],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: "#94a3b8" }}>{label}</span>
                  <span style={{ fontWeight: 700, color: "#fff" }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={{ ...btnStyle, minWidth: 150 }} onClick={() => { setGameOverRecap(null); resetGame(); }}>Try Again</button>
              <button style={{ ...btnStyle, minWidth: 150, background: "#1e293b" }} onClick={() => { setGameOverRecap(null); setMenuState("start"); }}>Main Menu</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
