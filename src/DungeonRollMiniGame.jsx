import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BALANCE,
  DEFAULT_NOTICE,
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

const START_MENU_ITEMS = ["START", "OPTIONS", "EXIT"];
const BOSS_TYPES = ["dragon", "gollum", "clone"];

const STORE_ITEMS = [
  {
    id: "vision",
    name: "Lantern Lens",
    desc: "Lets you see farther in dark floors.",
    cost: 35,
  },
  {
    id: "standing",
    name: "Standing Position Tonic",
    desc: "Prevents one lethal hit this run.",
    cost: 45,
  },
  {
    id: "skip",
    name: "Phase Step Elixir",
    desc: "Skip one level when using an exit.",
    cost: 50,
  },
  {
    id: "bossBlade",
    name: "Wyrmfang Blade",
    desc: "+3 combat roll bonus versus all bosses.",
    cost: 60,
  },
  {
    id: "gollumCharm",
    name: "Echo Charm",
    desc: "First hit against Gollum boss always lands.",
    cost: 55,
  },
  {
    id: "mirrorWard",
    name: "Mirror Ward",
    desc: "Clone boss attacks are weakened.",
    cost: 55,
  },
];

function mergeStyle(base, extra = {}) {
  return { ...(base || {}), ...extra };
}

function getMaxLevelsForDifficulty(difficulty) {
  if (difficulty === "easy") return 10;
  if (difficulty === "medium") return 20;
  return 30;
}

function isBossEnemy(enemy) {
  return Boolean(enemy?.boss);
}

function makeBossEnemy(type) {
  if (type === "dragon") {
    return {
      x: Math.floor(GRID_SIZE / 2),
      y: Math.floor(GRID_SIZE / 2),
      stepDelay: 11,
      tick: 0,
      elite: true,
      boss: true,
      hp: 8,
      bossType: "dragon",
    };
  }

  if (type === "gollum") {
    return {
      x: Math.floor(GRID_SIZE / 2),
      y: Math.floor(GRID_SIZE / 2),
      stepDelay: 8,
      tick: 0,
      elite: true,
      boss: true,
      hp: 6,
      bossType: "gollum",
    };
  }

  return {
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2),
    stepDelay: 9,
    tick: 0,
    elite: true,
    boss: true,
    hp: 7,
    bossType: "clone",
  };
}

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
  });
  const rafRef = useRef(0);
  const rollerRef = useRef(0);
  const fastRollResolverRef = useRef(null);
  const lastRollTapRef = useRef(0);

  const difficultyItems = useMemo(
    () => [
      { key: "easy", label: "Easy (10 floors)" },
      { key: "medium", label: "Medium (20 floors)" },
      { key: "hard", label: "Hard (30 floors)" },
      { key: "back", label: "Back" },
    ],
    []
  );

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

  const pushNotice = useCallback((text) => setNotice(text), []);

  const resetCombatState = useCallback(() => {
    setCombat(createInitialCombatState());
  }, []);

  const isInside = useCallback((x, y) => x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE, []);

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

    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (let i = 0; i < 260; i += 1) {
      const [dx, dy] = dirs[rand(0, dirs.length - 1)];
      cx = Math.max(1, Math.min(GRID_SIZE - 2, cx + dx));
      cy = Math.max(1, Math.min(GRID_SIZE - 2, cy + dy));
      g.grid[cy][cx] = FLOOR;

      if (rand(1, 100) <= 18) {
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

    function drawFloor(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = g.bossRoomActive ? "#151210" : "#1f2937";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = g.bossRoomActive ? "#1f1b18" : "#111827";
      ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
    }

    function drawWall(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#475569";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#334155";
      ctx.fillRect(px + 8, py + 10, 14, 10);
      ctx.fillRect(px + 24, py + 26, 16, 10);
    }

    function drawHero(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      const lowLife = g.lives <= 1;

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 12, py + 8, 24, 30);
      ctx.fillStyle = lowLife ? "#fb923c" : "#38bdf8";
      ctx.fillRect(px + 16, py + 10, 16, 10);
      ctx.fillRect(px + 14, py + 20, 20, 12);
      ctx.fillRect(px + 10, py + 24, 6, 10);
      ctx.fillRect(px + 32, py + 24, 6, 10);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(px + 18, py + 12, 4, 4);
      ctx.fillRect(px + 26, py + 12, 4, 4);
    }

    function drawEnemy(enemy) {
      const px = enemy.x * TILE;
      const py = enemy.y * TILE;

      if (enemy.bossType === "dragon") {
        ctx.fillStyle = "#7c2d12";
        ctx.fillRect(px + 8, py + 8, 32, 28);
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(px + 12, py + 12, 24, 16);
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(px + 16, py + 16, 16, 6);
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

      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(px + 12, py + 8, 24, 30);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(px + 14, py + 10, 20, 10);
      ctx.fillRect(px + 10, py + 20, 28, 12);
      ctx.fillStyle = "#fff";
      ctx.fillRect(px + 16, py + 12, 4, 4);
      ctx.fillRect(px + 28, py + 12, 4, 4);
    }

    function drawKey(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#facc15";
      ctx.fillRect(px + 18, py + 18, 14, 8);
      ctx.fillRect(px + 28, py + 22, 8, 4);
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
    }

    function drawExit(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = "#14532d";
      ctx.fillRect(px + 10, py + 6, 28, 36);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(px + 14, py + 10, 20, 28);
    }

    function drawEventTile(eventTile) {
      const px = eventTile.x * TILE;
      const py = eventTile.y * TILE;
      ctx.fillStyle = eventTile.type === "boss_event" ? "#f97316" : "#06b6d4";
      ctx.fillRect(px + 12, py + 12, 24, 24);
      ctx.fillStyle = "#fff";
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
    }

    function drawOverlay(title, sub) {
      ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
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

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (g.grid?.[y]?.[x] === WALL) drawWall(x, y);
        else drawFloor(x, y);
      }
    }

    if (!g.hasKey && g.key?.x >= 0 && g.key?.y >= 0) drawKey(g.key.x, g.key.y);
    if (g.shield && !g.hasShield) drawShield(g.shield.x, g.shield.y);
    g.events.forEach(drawEventTile);

    if (
      g.exitTile?.x >= 0 &&
      g.exitTile?.y >= 0 &&
      (!g.bossRoomActive || g.exitUnlockedByBoss)
    ) {
      drawExit(g.exitTile.x, g.exitTile.y);
    }

    if (g.shopkeeper) drawShopkeeper(g.shopkeeper.x, g.shopkeeper.y);

    g.enemies.forEach(drawEnemy);
    drawHero(g.player.x, g.player.y);

    if (g.levelModifier?.id === "dark") {
      const centerX = g.player.x * TILE + TILE / 2;
      const centerY = g.player.y * TILE + TILE / 2;
      const baseRadius = playerInventory.vision ? 88 : 34;
      const gradient = ctx.createRadialGradient(centerX, centerY, 8, centerX, centerY, baseRadius);
      gradient.addColorStop(0, "rgba(2, 6, 23, 0.52)");
      gradient.addColorStop(0.35, "rgba(2, 6, 23, 0.85)");
      gradient.addColorStop(1, "rgba(2, 6, 23, 0.97)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (g.gameOver) drawOverlay("GAME OVER", "Click the board to restart");
    if (g.victory) drawOverlay("YOU WIN", "Click the board to play again");
  }, [playerInventory.vision]);

  const applyLootDrop = useCallback(() => {
    const g = gameRef.current;
    if (rand(1, 100) > BALANCE.lootDropChance) return;

    const roll = rand(1, 100);
    if (roll <= 40) {
      g.lives = Math.min(5, g.lives + 1);
      pushNotice("Loot drop: Healing potion (+1 life).");
      return;
    }

    if (roll <= 70) {
      g.nextRollBonus += 2;
      pushNotice("Loot drop: Battle focus (+2 next roll).");
      return;
    }

    g.score += 20;
    pushNotice("Loot drop: Treasure cache (+20 score).");
  }, [pushNotice]);

  const checkPerfectClear = useCallback(() => {
    const g = gameRef.current;
    if (g.enemies.length > 0 || g.perfectClearClaimed) return;

    g.perfectClearClaimed = true;
    if (!g.bossRoomActive) g.hasKey = true;
    g.score += 50;
    pushNotice("Perfect Clear! +50 score.");
  }, [pushNotice]);

  const enterBossRoom = useCallback(
    (bossType) => {
      const g = gameRef.current;
      g.bossRoomActive = true;
      g.bossRoomType = bossType;
      g.exitUnlockedByBoss = false;
      g.events = [];
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

      pushNotice(`Boss Event: ${bossType.toUpperCase()} room. Kill the boss to unlock the exit.`);
      updateHud();
      draw();
    },
    [draw, pushNotice, updateHud]
  );

  const resolveEventTile = useCallback(
    (eventTile) => {
      const g = gameRef.current;
      g.events = g.events.filter((tile) => tile !== eventTile);

      if (eventTile.type === "boss_event") {
        enterBossRoom(pickRandom(BOSS_TYPES));
        return;
      }

      g.score += 15;
      pushNotice("Event: You found hidden loot (+15 score).");
    },
    [enterBossRoom, pushNotice]
  );

  const hitPlayer = useCallback(() => {
    const g = gameRef.current;

    if (playerInventory.standing && !g._standingUsed) {
      g._standingUsed = true;
      setPlayerInventory((inv) => ({ ...inv, standing: false }));
      pushNotice("Standing Position Tonic saved you.");
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
      resetCombatState();
      updateHud();
      draw();
      return;
    }

    g.lives -= 1;
    g.streak = 0;
    g.inCombat = false;
    g.currentCombatEnemy = null;
    g.requiredRoll = 0;
    g.rolling = false;
    g.combatBonusUsed = 0;

    if (g.lives <= 0) {
      g.gameOver = true;
      pushNotice("You were slain.");
    } else {
      pushNotice("You lost 1 life.");
    }

    resetCombatState();
    updateHud();
    draw();
  }, [draw, playerInventory.standing, pushNotice, resetCombatState, updateHud]);

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
      const bladeBonus = playerInventory.bossBlade && enemy.boss ? 3 : 0;
      const mirrorBonus = playerInventory.mirrorWard && enemy.bossType === "clone" ? 2 : 0;

      g.combatBonusUsed = g.nextRollBonus;
      g.requiredRoll = clamp(
        baseRoll + elitePenalty + bossPenalty - blessingBonus - g.combatBonusUsed - bladeBonus - mirrorBonus,
        3,
        20
      );
      g.nextRollBonus = 0;

      const enemyName = enemy.boss
        ? enemy.bossType === "dragon"
          ? "Dragon Boss"
          : enemy.bossType === "gollum"
          ? "Gollum Boss"
          : "Clone Boss"
        : enemy.elite
        ? "Elite Monster"
        : "Monster";

      setCombat({
        open: true,
        message: `${enemyName}: roll ${g.requiredRoll}+ to win.${enemy.boss ? ` Boss HP ${enemy.hp}.` : ""}`,
        result: "",
        diceDisplay: "?",
        rolling: false,
      });

      updateHud();
      draw();
    },
    [draw, playerInventory.bossBlade, playerInventory.mirrorWard, updateHud]
  );

  const generateLevel = useCallback(() => {
    const g = gameRef.current;
    let ready = false;

    g.levelModifier = g.currentLevel === 1 ? LEVEL_MODIFIERS[0] : pickRandom(LEVEL_MODIFIERS);
    g.perfectClearClaimed = false;
    g.shopkeeper = null;
    g.bossRoomActive = false;
    g.bossRoomType = null;
    g.exitUnlockedByBoss = false;

    while (!ready) {
      carveSimpleDungeon();
      const used = new Set();

      g.exitTile = randomFloorCell(used);
      used.add(coordKey(g.exitTile.x, g.exitTile.y));

      g.player = { x: g.exitTile.x, y: g.exitTile.y };

      g.key = randomFloorCell(used);
      used.add(coordKey(g.key.x, g.key.y));

      if (!reachable(g.player, g.key) || !reachable(g.key, g.exitTile)) continue;

      g.events = [];
      const eventCount = rand(1, 2);
      for (let i = 0; i < eventCount; i += 1) {
        const eventCell = randomFloorCell(used);
        if (!reachable(g.player, eventCell)) continue;
        g.events.push({ ...eventCell, type: i === 0 ? "boss_event" : "loot_event" });
        used.add(coordKey(eventCell.x, eventCell.y));
      }

      g.shield = null;
      if (!g.hasShield && rand(1, 100) <= BALANCE.shieldSpawnChance) {
        const shieldCell = randomFloorCell(used);
        if (reachable(g.player, shieldCell)) {
          g.shield = shieldCell;
          used.add(coordKey(shieldCell.x, shieldCell.y));
        }
      }

      g.enemies = [];
      const enemyCount = Math.min(1 + g.currentLevel, 6);
      let placed = 0;
      let attempts = 0;

      while (placed < enemyCount && attempts < 400) {
        attempts += 1;
        const enemyPos = randomFloorCell(used);

        if (manhattanDistance(enemyPos, g.player) < BALANCE.minEnemyStartDistance) continue;
        if (!reachable(g.player, enemyPos)) continue;

        used.add(coordKey(enemyPos.x, enemyPos.y));

        g.enemies.push({
          x: enemyPos.x,
          y: enemyPos.y,
          stepDelay: g.levelModifier?.id === "haste" ? rand(14, 22) : rand(20, 34),
          tick: 0,
          elite: false,
          boss: false,
          hp: 1,
        });

        placed += 1;
      }

      if (placed < enemyCount) continue;

      if (g.currentLevel % 3 === 0 && g.enemies.length > 0) {
        const eliteIndex = rand(0, g.enemies.length - 1);
        g.enemies[eliteIndex].elite = true;
        g.enemies[eliteIndex].stepDelay = clamp(g.enemies[eliteIndex].stepDelay - 4, 10, 40);
      }

      if (g.shopLevels?.includes(g.currentLevel)) {
        const shopCell = randomFloorCell(used);
        if (reachable(g.player, shopCell)) {
          g.shopkeeper = shopCell;
          used.add(coordKey(shopCell.x, shopCell.y));
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
    pushNotice(`${g.levelModifier.name}: ${g.levelModifier.desc}`);
    updateHud();
    draw();
  }, [carveSimpleDungeon, draw, pushNotice, randomFloorCell, reachable, resetCombatState, updateHud]);

  const nextLevel = useCallback(() => {
    const g = gameRef.current;

    if (playerInventory.skip && !g._skipUsed && g.currentLevel < (g.maxLevels || MAX_LEVELS)) {
      g._skipUsed = true;
      setPlayerInventory((inv) => ({ ...inv, skip: false }));
      pushNotice("Phase Step Elixir used. Level skipped.");
      g.currentLevel += 1;
      generateLevel();
      return;
    }

    if (g.currentLevel >= (g.maxLevels || MAX_LEVELS)) {
      g.victory = true;
      g.totalWins += 1;
      g.score += 100;
      pushNotice("Victory! Dungeon conquered.");
      updateMeta();
      updateHud();
      draw();
      return;
    }

    g.currentLevel += 1;
    generateLevel();
  }, [draw, generateLevel, playerInventory.skip, pushNotice, updateHud, updateMeta]);

  const movePlayer = useCallback(
    (dx, dy) => {
      const g = gameRef.current;
      if (menuState !== "game") return;
      if (g.gameOver || g.victory || g.inCombat) return;

      const nx = g.player.x + dx;
      const ny = g.player.y + dy;
      if (!isWalkable(nx, ny)) return;

      g.player.x = nx;
      g.player.y = ny;

      if (g.shopkeeper && g.player.x === g.shopkeeper.x && g.player.y === g.shopkeeper.y) {
        setShopOpen(true);
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

      const eventTile = g.events.find((tile) => tile.x === g.player.x && tile.y === g.player.y);
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

      if (g.player.x === g.exitTile.x && g.player.y === g.exitTile.y) {
        if (g.bossRoomActive && !g.exitUnlockedByBoss) {
          pushNotice("The room is sealed. Kill the boss to unlock the exit.");
        } else if (g.hasKey || g.bossRoomActive) {
          nextLevel();
          return;
        }
      }

      updateMeta();
      updateHud();
      draw();
    },
    [draw, isWalkable, menuState, nextLevel, pushNotice, resolveEventTile, startCombat, updateHud, updateMeta]
  );

  const moveEnemies = useCallback(() => {
    const g = gameRef.current;
    if (menuState !== "game") return;
    if (g.gameOver || g.victory || g.inCombat) return;

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

      const chaseBoss = Boolean(enemy.boss);
      if (chaseBoss) {
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
              !(g.shield && pos.x === g.shield.x && pos.y === g.shield.y)
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
  }, [draw, isWalkable, menuState, startCombat]);

  const handleRoll = useCallback(
    (skipAnimation = false) => {
      const g = gameRef.current;
      if (!g.inCombat || !g.currentCombatEnemy) return;

      if (g.rolling) {
        if (skipAnimation && fastRollResolverRef.current) fastRollResolverRef.current();
        return;
      }

      const resolveFinalRoll = (inputRoll) => {
        let finalRoll = inputRoll;
        fastRollResolverRef.current = null;
        setCombat((prev) => ({ ...prev, diceDisplay: String(finalRoll) }));

        const enemy = g.currentCombatEnemy;
        if (
          enemy?.bossType === "gollum" &&
          playerInventory.gollumCharm &&
          !g._gollumCharmUsed
        ) {
          g._gollumCharmUsed = true;
          finalRoll = 20;
        }

        if (finalRoll === 1) {
          setCombat((prev) => ({ ...prev, rolling: false, result: "Natural 1. You were struck down." }));
          g.rolling = false;
          window.setTimeout(() => hitPlayer(), 650);
          return;
        }

        if (finalRoll >= g.requiredRoll) {
          let bossDefeated = false;
          if (enemy?.boss && enemy.hp > 1) {
            enemy.hp -= 1;
            setCombat((prev) => ({
              ...prev,
              rolling: false,
              result: `You hit the boss. ${enemy.hp} HP left.`,
              message: `Boss still standing. Roll ${g.requiredRoll}+ again.`,
            }));
            g.rolling = false;
            updateHud();
            draw();
            return;
          }

          g.enemies = g.enemies.filter((mob) => mob !== enemy);
          g.totalKills += 1;
          bossDefeated = isBossEnemy(enemy);

          g.streak += 1;
          g.score += bossDefeated ? 45 : enemy?.elite ? 20 : 10;
          g.inCombat = false;
          g.currentCombatEnemy = null;
          g.rolling = false;
          g.combatBonusUsed = 0;

          if (bossDefeated && g.bossRoomActive) {
            g.exitUnlockedByBoss = true;
            g.hasKey = true;
            pushNotice("Boss slain. Exit unlocked. Reach the portal to leave the room.");
          }

          updateMeta();
          applyLootDrop();
          checkPerfectClear();
          updateHud();

          setCombat((prev) => ({
            ...prev,
            rolling: false,
            result: bossDefeated ? `Boss defeated with ${finalRoll}!` : `You rolled ${finalRoll}. Monster killed.`,
          }));

          window.setTimeout(() => {
            resetCombatState();
            draw();
          }, 550);
          return;
        }

        if (enemy?.bossType === "clone" && playerInventory.mirrorWard) {
          setCombat((prev) => ({
            ...prev,
            rolling: false,
            result: `Mirror Ward blocked the clone's counterattack.`,
          }));
          g.inCombat = false;
          g.currentCombatEnemy = null;
          g.rolling = false;
          window.setTimeout(() => resetCombatState(), 550);
          updateHud();
          draw();
          return;
        }

        setCombat((prev) => ({
          ...prev,
          rolling: false,
          result: `You rolled ${finalRoll}. Not enough.`,
        }));
        g.rolling = false;
        window.setTimeout(() => hitPlayer(), 650);
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
        setCombat((prev) => ({ ...prev, diceDisplay: String(rand(1, 20)) }));
        ticks += 1;
        if (ticks < 12) return;

        window.clearInterval(rollerRef.current);
        resolveFinalRoll(rand(1, 20));
      }, 80);
    },
    [applyLootDrop, checkPerfectClear, draw, hitPlayer, playerInventory.gollumCharm, playerInventory.mirrorWard, pushNotice, resetCombatState, updateHud, updateMeta]
  );

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

    setShopOpen(false);
    setPlayerInventory({
      vision: false,
      standing: false,
      skip: false,
      bossBlade: false,
      gollumCharm: false,
      mirrorWard: false,
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
    g._standingUsed = false;
    g._skipUsed = false;
    g._gollumCharmUsed = false;
    g.bossRoomActive = false;
    g.bossRoomType = null;
    g.exitUnlockedByBoss = false;

    pushNotice("A new quest begins.");
    generateLevel();
  }, [difficulty, generateLevel, pushNotice]);

  const handleRestartOverlayClick = useCallback(() => {
    const g = gameRef.current;
    if (!g.gameOver && !g.victory) return;
    resetGame();
  }, [resetGame]);

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
      if (shopOpen) return;
      if (rebindKey) return;

      if (menuState === "start") {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
          e.preventDefault();
          setMenuIndex((prev) => (prev - 1 + START_MENU_ITEMS.length) % START_MENU_ITEMS.length);
          return;
        }

        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          e.preventDefault();
          setMenuIndex((prev) => (prev + 1) % START_MENU_ITEMS.length);
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
            window.location.href = "/";
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
          setDifficulty(selected.key);
          setMenuState("game");
          setTimeout(() => resetGame(), 0);
        }
        return;
      }

      if (menuState === "options" && e.key === "Escape") {
        e.preventDefault();
        setMenuState("start");
        return;
      }

      if (menuState !== "game") return;

      const rollKeys = [keyBindings.roll, " ", "Space"];
      if (rollKeys.includes(e.key) || rollKeys.includes(e.code)) {
        e.preventDefault();
        const now = typeof window !== "undefined" && window.performance ? window.performance.now() : Date.now();
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
  }, [difficultyIndex, difficultyItems, handleRoll, keyBindings, menuIndex, menuState, movePlayer, rebindKey, resetGame, shopOpen]);

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

    function onResize() {
      setIsMobile(window.innerWidth <= 920);
      setViewportWidth(window.innerWidth);
    }

    onResize();
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
      fastRollResolverRef.current = null;
    };
  }, [moveEnemies]);

  useEffect(() => {
    draw();
  }, [draw, hud, menuState]);

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
  const interpolatedRight = 7.5 + desktopMix * 6;
  const interpolatedTop = 60.5 - desktopMix * 4;
  const interpolatedGap = Math.round(10 + desktopMix * 4);
  const interpolatedFontSize = Math.round(41 + desktopMix * 26);
  const interpolatedDotWidth = Math.round(18 + desktopMix * 4);
  const interpolatedDotMargin = Math.round(8 + desktopMix * 2);

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

  return (
    <>
      {shopOpen && menuState === "game" && (
        <div
          style={mergeStyle(styles?.modal, {
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: 20,
          })}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: 16,
              padding: 24,
              minWidth: 320,
              maxWidth: 520,
              boxShadow: "0 8px 32px #000a",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, textAlign: "center" }}>
              Dungeon Store
            </div>
            <div style={{ marginBottom: 12, textAlign: "center", color: "#cbd5e1" }}>
              Spend score to buy permanent run upgrades.
            </div>
            <div style={{ marginBottom: 16, textAlign: "center", color: "#fde68a", fontWeight: 700 }}>
              Current Score: {gameRef.current.score}
            </div>

            <div style={{ display: "grid", gap: 10, maxHeight: "52vh", overflowY: "auto", paddingRight: 6 }}>
              {STORE_ITEMS.map((item) => {
                const owned = Boolean(playerInventory[item.id]);
                const canAfford = gameRef.current.score >= item.cost;
                return (
                  <div
                    key={item.id}
                    style={{
                      background: "#0f172a",
                      border: "1px solid rgba(148, 163, 184, 0.35)",
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div style={{ fontWeight: 700 }}>{item.name}</div>
                      <div style={{ color: "#facc15", fontWeight: 700 }}>{item.cost}</div>
                    </div>
                    <div style={{ color: "#cbd5e1", margin: "8px 0 12px" }}>{item.desc}</div>
                    <button
                      style={{ ...btnStyle, width: "100%" }}
                      disabled={owned || !canAfford}
                      onClick={() => {
                        if (owned || !canAfford) return;
                        const g = gameRef.current;
                        g.score = Math.max(0, g.score - item.cost);
                        setPlayerInventory((inv) => ({ ...inv, [item.id]: true }));
                        pushNotice(`Purchased ${item.name}.`);
                        updateHud();
                      }}
                    >
                      {owned ? "Owned" : canAfford ? "Buy" : "Need More Score"}
                    </button>
                  </div>
                );
              })}
            </div>

            <button style={{ ...btnStyle, width: "100%", marginTop: 16 }} onClick={() => setShopOpen(false)}>
              Leave Shop
            </button>
          </div>
        </div>
      )}

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
                    if (item === "START") {
                      setDifficultyIndex(0);
                      setMenuState("difficulty");
                    } else if (item === "OPTIONS") {
                      setMenuState("options");
                    } else {
                      window.location.href = "/";
                    }
                  }}
                  style={titleMenuButtonStyle(active)}
                >
                  <span style={menuDotStyle}>•</span>
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {menuState === "difficulty" && (
        <div style={menuBgStyle}>
          <div style={menuOverlayStyle} />
          <div style={menuPanelStyle}>
            <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 18 }}>Select Difficulty</div>
            {difficultyItems.map((item, index) => {
              const active = difficultyIndex === index;
              return (
                <button
                  key={item.key}
                  onMouseEnter={() => setDifficultyIndex(index)}
                  style={menuButtonStyle(active)}
                  onClick={() => {
                    if (item.key === "back") {
                      setMenuState("start");
                      return;
                    }
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

      {menuState === "options" && (
        <div style={menuBgStyle}>
          <div style={menuOverlayStyle} />
          <div style={menuPanelStyle}>
            <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 16 }}>Options</div>

            <div style={{ margin: "20px 0" }}>
              <label style={{ fontSize: 18, marginBottom: 8, display: "block" }}>Audio Volume</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={audioVolume}
                onChange={(e) => setAudioVolume(Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ marginTop: 6 }}>{Math.round(audioVolume * 100)}%</div>
            </div>

            <div style={{ margin: "20px 0" }}>
              <label style={{ fontSize: 18, marginBottom: 8, display: "block" }}>Key Bindings</label>
              {Object.entries(keyBindings).map(([action, key]) => (
                <div key={action} style={{ margin: "8px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ minWidth: 64, textTransform: "capitalize", fontWeight: 700 }}>{action}</span>
                  <span>{rebindKey === action ? "Press any key..." : key}</span>
                  <button style={{ ...btnStyle, fontSize: 13 }} onClick={() => setRebindKey(action)}>
                    Rebind
                  </button>
                </div>
              ))}
            </div>

            <button
              style={{ ...btnStyle, width: "100%" }}
              onClick={() => {
                setRebindKey(null);
                setMenuState("start");
              }}
            >
              Back
            </button>
          </div>
        </div>
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
              <div style={styles?.subtitle}>Boss event rooms now lock exits until the boss dies.</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={{ ...btnStyle, minWidth: 150 }} onClick={onBack}>
                Back
              </button>
              <button style={{ ...btnStyle, minWidth: 180 }} onClick={() => setMenuState("start")}>
                Main Menu
              </button>
              <button style={{ ...btnStyle, minWidth: 180 }} onClick={resetGame}>
                Restart Quest
              </button>
            </div>
          </div>

          <div
            style={mergeStyle(styles?.hud, {
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(6, minmax(0, 1fr))",
              gap: 12,
            })}
          >
            <div style={panelStyle}>
              <div style={styles?.label}>Level</div>
              <div style={styles?.value}>{hud.level}/{gameRef.current.maxLevels || MAX_LEVELS}</div>
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

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 16, alignItems: "start" }}>
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
                  cursor: gameRef.current.gameOver || gameRef.current.victory ? "pointer" : "default",
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
                <div>Blade: {playerInventory.bossBlade ? "Yes" : "No"}</div>
                <div>Echo Charm: {playerInventory.gollumCharm ? "Yes" : "No"}</div>
                <div>Mirror Ward: {playerInventory.mirrorWard ? "Yes" : "No"}</div>
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
              </div>
            </div>
          </div>
        </div>
      )}

      {combat.open && menuState === "game" ? (
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
                fontSize: 64,
                fontWeight: 900,
                lineHeight: 1,
                marginBottom: 18,
                color: combat.rolling ? "#facc15" : "#fff",
              }}
            >
              {combat.diceDisplay || "?"}
            </div>

            <div style={{ minHeight: 24, color: "#93c5fd", marginBottom: 18 }}>{combat.result}</div>

            <button
              style={{ ...btnStyle, fontSize: 20, minWidth: 180 }}
              onClick={() => handleRoll(false)}
              disabled={combat.rolling}
            >
              {combat.rolling ? "Rolling..." : "Roll"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
