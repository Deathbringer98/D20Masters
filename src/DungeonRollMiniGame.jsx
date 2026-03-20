import React, { useCallback, useEffect, useRef, useState } from "react";
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

export default function DungeonRollMiniGame({ onBack }) {
          // Shopkeeper state for boss room
          const [shopkeeper, setShopkeeper] = useState(null);
        // Shop state
        const [shopOpen, setShopOpen] = useState(false);
        const [shopItems, setShopItems] = useState([
          {
            id: "vision",
            name: "Potion of Vision",
            desc: "Enhances vision in dark levels.",
            price: 10,
          },
          {
            id: "standing",
            name: "Potion of Standing Position",
            desc: "If consumed, prevents dungeon randomization after death (once).",
            price: 15,
          },
          {
            id: "skip",
            name: "Potion of Level Skip",
            desc: "Skip the current level (not usable on final level).",
            price: 20,
          },
        ]);
        const [playerInventory, setPlayerInventory] = useState({ vision: false, standing: false, skip: false });
        const [shopkeeperSprite, setShopkeeperSprite] = useState(null); // Placeholder for pixel art
      // Key rebind handler
      useEffect(() => {
        if (!rebindKey) return;
        function handleKey(e) {
          setKeyBindings(prev => ({ ...prev, [rebindKey]: e.key }));
          setRebindKey(null);
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
      }, [rebindKey]);
    // Menu state
    const [menuState, setMenuState] = useState("start"); // start, difficulty, options, game
    const [difficulty, setDifficulty] = useState(null); // easy, medium, hard
    const [audioVolume, setAudioVolume] = useState(0.45);
    const [keyBindings, setKeyBindings] = useState({
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
      roll: "Space",
    });
    // For rebind UI
    const [rebindKey, setRebindKey] = useState(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const rollerRef = useRef(0);
  const fastRollResolverRef = useRef(null);
  const lastSpaceTapRef = useRef(0);
  const bgmRef = useRef(null);
  const rollSfxRef = useRef(null);
  const killSfxRef = useRef(null);
  const deathSfxRef = useRef(null);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 920 : false
  );

  const [hud, setHud] = useState(createInitialHudState);
  const [notice, setNotice] = useState(DEFAULT_NOTICE);

  const [combat, setCombat] = useState(createInitialCombatState);

  const gameRef = useRef(createInitialGameState());

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
    const payload = {
      bestLevel: g.bestLevel,
      bestStreak: g.bestStreak,
      bestScore: g.bestScore,
      totalKills: g.totalKills,
      totalWins: g.totalWins,
    };
    window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(payload));
  }, []);

  const updateMeta = useCallback(() => {
    const g = gameRef.current;
    g.bestLevel = Math.max(g.bestLevel, g.currentLevel);
    g.bestStreak = Math.max(g.bestStreak, g.streak);
    g.bestScore = Math.max(g.bestScore, g.score);
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const g = gameRef.current;
    // Vision potion effect: enhance vision in dark levels
    let visionActive = playerInventory.vision;

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
      // Color based on lives
      let heroColor = "#38bdf8"; // blue (3+ lives)
      if (gameRef.current.lives === 2) heroColor = "#facc15"; // yellow
      if (gameRef.current.lives === 1) heroColor = "#fb923c"; // orange
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

    function drawEnemy(x, y) {
      const px = x * TILE;
      const py = y * TILE;
      // Dragon boss sprite
      if (g.enemies && g.enemies.some(e => e.boss && e.dragon && e.x === x && e.y === y)) {
        ctx.fillStyle = "#a21caf";
        ctx.fillRect(px + 10, py + 10, 28, 28);
        ctx.fillStyle = "#fff";
        ctx.fillRect(px + 22, py + 18, 8, 8);
        ctx.fillStyle = "#f87171";
        ctx.fillRect(px + 18, py + 30, 12, 6);
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(px + 16, py + 16, 16, 8);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(px + 24, py + 24, 8, 4);
        return;
      }
      // ...existing code for normal enemy...
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

    function drawEventTile(event) {
      const px = event.x * TILE;
      const py = event.y * TILE;
      const colorMap = {
        teleport: "#06b6d4",
        chest: "#f59e0b",
        mimic: "#dc2626",
        fountain: "#22c55e",
      };
      ctx.fillStyle = colorMap[event.type] || "#94a3b8";
      ctx.fillRect(px + 12, py + 12, 24, 24);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(px + 18, py + 18, 12, 12);
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
      const sx = rand(-3, 3);
      const sy = rand(-3, 3);
      ctx.translate(sx, sy);
      g.shakeTicks -= 1;
    }

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (g.grid[y]?.[x] === WALL) drawWall(x, y);
        else drawFloor(x, y);
      }
    }

    if (!g.hasKey) drawKey(g.key.x, g.key.y);
    if (g.shield && !g.hasShield) drawShield(g.shield.x, g.shield.y);
    if (g.shrine) drawShrine(g.shrine.x, g.shrine.y);
    g.events.forEach((eventTile) => drawEventTile(eventTile));
    drawExit(g.exitTile.x, g.exitTile.y);
    g.enemies.forEach((enemy) => {
      drawEnemy(enemy.x, enemy.y);
      if (enemy.elite || enemy.boss) drawEliteBadge(enemy.x, enemy.y, enemy.boss);
    });
    drawHero(g.player.x, g.player.y);

    if (g.levelModifier?.id === "dark") {
      const centerX = g.player.x * TILE + TILE / 2;
      const centerY = g.player.y * TILE + TILE / 2;
      // Default: very dark, only 2 tiles visible
      // Potion: restores vision to previous default (240px)
      const visionRadius = visionActive ? 240 : 48;
      const gradient = ctx.createRadialGradient(centerX, centerY, visionActive ? 180 : 24, centerX, centerY, visionRadius);
      gradient.addColorStop(0, "rgba(2, 6, 23, 0)");
      gradient.addColorStop(1, "rgba(2, 6, 23, 0.85)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (g.flashTicks > 0) {
      ctx.fillStyle = g.flashColor || "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      g.flashTicks -= 1;
    }

    ctx.restore();

    if (g.gameOver) drawOverlay("GAME OVER", "Click the screen to restart");
    if (g.victory) drawOverlay("YOU WIN", "Click the screen to play again");
  }, []);

  const isInside = useCallback((x, y) => x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE, []);

  const isWalkable = useCallback(
    (x, y) => isInside(x, y) && gameRef.current.grid[y]?.[x] === FLOOR,
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
      const nx = Math.max(1, Math.min(GRID_SIZE - 2, cx + dx));
      const ny = Math.max(1, Math.min(GRID_SIZE - 2, cy + dy));
      cx = nx;
      cy = ny;
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
        if (g.grid[y][x] === WALL && rand(1, 100) < 10) {
          const neighbors = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].reduce(
            (count, [dx, dy]) => count + (g.grid[y + dy][x + dx] === FLOOR ? 1 : 0),
            0
          );
          if (neighbors >= 2) g.grid[y][x] = FLOOR;
        }
      }
    }
  }, []);

  const randomFloorCell = useCallback(
    (exclusions = new Set()) => {
      let x;
      let y;
      do {
        x = rand(1, GRID_SIZE - 2);
        y = rand(1, GRID_SIZE - 2);
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
          const keyStr = coordKey(nx, ny);
          if (!seen.has(keyStr) && isWalkable(nx, ny)) {
            seen.add(keyStr);
            q.push({ x: nx, y: ny });
          }
        }
      }

      return false;
    },
    [isWalkable]
  );

  const generateLevel = useCallback(() => {
    const g = gameRef.current;
    let ready = false;

    g.levelModifier =
      g.currentLevel === 1 ? LEVEL_MODIFIERS[0] : pickRandom(LEVEL_MODIFIERS);
    g.perfectClearClaimed = false;

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
          used.add(coordKey(shrineCell.x, shrineCell.y));
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
          used.add(coordKey(shieldCell.x, shieldCell.y));
        }
      }

      g.enemies = [];
      const isBossFloor = g.currentLevel === (g.maxLevels || 10);
      const enemyCount = isBossFloor ? 1 : Math.min(1 + g.currentLevel, 6);
      let placed = 0;
      let attempts = 0;
      const maxAttempts = 400;

      while (placed < enemyCount && attempts < maxAttempts) {
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
        g.enemies[0].elite = true;
        g.enemies[0].hp = BALANCE.bossHp;
        g.enemies[0].stepDelay = 14;
      } else if (g.currentLevel % 3 === 0 && g.enemies.length > 0) {
        const eliteIndex = rand(0, g.enemies.length - 1);
        g.enemies[eliteIndex].elite = true;
        g.enemies[eliteIndex].stepDelay = clamp(g.enemies[eliteIndex].stepDelay - 4, 10, 40);
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

  const checkPerfectClear = useCallback(() => {
    const g = gameRef.current;
    if (g.perfectClearClaimed || g.enemies.length > 0) return;

    g.perfectClearClaimed = true;
    g.hasKey = true;
    g.score += 50;
    pushNotice("Perfect Clear! Exit unlocked and +50 score.");
    updateMeta();
  }, [pushNotice, updateMeta]);

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
    (eventTile, startCombat) => {
      const g = gameRef.current;
      g.events = g.events.filter((tile) => tile !== eventTile);

      if (eventTile.type === "teleport") {
        const exclusions = new Set([
          coordKey(g.key.x, g.key.y),
          coordKey(g.exitTile.x, g.exitTile.y),
          ...(g.shield ? [coordKey(g.shield.x, g.shield.y)] : []),
          ...(g.shrine ? [coordKey(g.shrine.x, g.shrine.y)] : []),
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
        if (!g.hasKey && rand(1, 100) <= BALANCE.chestKeyChance) g.hasKey = true;
        pushNotice("Event: Treasure chest opened (+30 score).");
        return;
      }

      if (eventTile.type === "fountain") {
        g.lives = Math.min(5, g.lives + 1);
        if (g.hasShield) g.shieldCharges = 2;
        pushNotice("Event: Healing fountain restored vitality.");
        return;
      }

      // Random event tile: chance to trigger dragon boss battle or dark level
      const randomRoll = rand(1, 100);
      if (randomRoll <= 25) {
        // 25% chance to trigger dragon boss
        pushNotice("Event: You are sent to the dragon boss battle!");
        // Spawn dragon boss in fixed room (center)
        g.bossFight = true;
        const bossX = Math.floor(GRID_SIZE / 2);
        const bossY = Math.floor(GRID_SIZE / 2);
        g.enemies.push({
          x: bossX,
          y: bossY,
          boss: true,
          dragon: true,
          hp: 10,
          stepDelay: 2,
          tick: 0,
        });
        return;
      } else if (randomRoll <= 45) {
        // 20% chance to turn level dark
        g.levelModifier = LEVEL_MODIFIERS.find(m => m.id === "dark");
        pushNotice("Event: The dungeon is plunged into darkness!");
        return;
      } else if (randomRoll <= 60) {
        // 15% chance to set player life to 1 and remove shield
        g.lives = 1;
        g.hasShield = false;
        g.shield = null;
        g.shieldCharges = 0;
        pushNotice("Event: You are cursed! Life set to 1 and shield removed.");
        return;
      } else if (randomRoll <= 75) {
        // 15% chance for auto nat 20 buff
        g._autoNat20Buff = true;
        pushNotice("Event: Divine blessing! All rolls are natural 20 and monsters cannot kill you this stage.");
        return;
      }

      // Random event tile: chance to trigger dragon boss battle
      if (eventTile.type === "dragon" || (eventTile.type !== "dragon" && rand(1, 100) <= 25)) {
        // 25% chance for non-dragon event tile to trigger dragon boss
        pushNotice("Event: You are sent to the dragon boss battle!");
        g.bossFight = true;
        const bossX = Math.floor(GRID_SIZE / 2);
        const bossY = Math.floor(GRID_SIZE / 2);
        g.enemies.push({
          x: bossX,
          y: bossY,
          boss: true,
          dragon: true,
          hp: 10,
          stepDelay: 2,
          tick: 0,
        });
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
      pushNotice("Event: Mimic chest attacks!");
      startCombat(mimic);
    },
    [pushNotice, randomFloorCell, triggerFx]
  );

  const hitPlayer = useCallback(() => {
    const g = gameRef.current;
    // Auto nat 20 buff: monsters cannot kill player
    if (g._autoNat20Buff) {
      pushNotice("Buff: Divine blessing prevents monster damage!");
      return;
    }
    // Standing position potion effect: prevent dungeon randomization after death
    if (playerInventory.standing && !g._standingUsed) {
      g._standingUsed = true;
      setPlayerInventory(inv => ({ ...inv, standing: false }));
      pushNotice("Standing Position potion used! Level will not randomize.");
      // Do NOT call generateLevel(); keep current dungeon
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
      const fallbackSrc = candidates.find((candidate) => candidate !== currentSrc) || candidates[0];

      deathSfx.currentTime = 0;
      deathSfx
        .play()
        .catch(() => {
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
    triggerFx("hit");
    if (g.lives <= 0) {
      g.gameOver = true;
      pushNotice("Shrine curse ended your quest.");
    } else {
      pushNotice("Shrine curse: you lost 1 life.");
    }
  }, [pushNotice, triggerFx]);
        function rollDice(min, max) {
          const g = gameRef.current;
          if (g._autoNat20Buff) return 20;
          return rand(min, max);
        }
      updateMeta();

      updateHud();
      draw();
      return;
    }

    generateLevel();
  }, [draw, generateLevel, pushNotice, resetCombatState, triggerFx, updateHud, updateMeta]);

  const nextLevel = useCallback(() => {
    const g = gameRef.current;
    // Level skip potion effect
    if (playerInventory.skip && !g._skipUsed && g.currentLevel < (g.maxLevels || maxLevels)) {
      g._skipUsed = true;
      setPlayerInventory(inv => ({ ...inv, skip: false }));
      pushNotice("Level Skip potion used! Skipping level.");
      g.currentLevel += 1;
      generateLevel();
      return;
    }

    if (g.currentLevel >= MAX_LEVELS) {
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
    generateLevel();
  }, [draw, generateLevel, pushNotice, updateHud, updateMeta]);

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
        message: `${enemyName}: roll ${g.requiredRoll}+ to win.${
          enemy.boss ? ` Boss HP ${enemy.hp}.` : ""
        }`,
        result: "",
        if (eventTile.type === "dragon" || (eventTile.type !== "dragon" && rand(1, 100) <= 25)) {
          pushNotice("Event: You are sent to the dragon boss battle!");
          // Boss room: open room, no walls
          g.grid = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => FLOOR));
          g.bossFight = true;
          const bossX = Math.floor(GRID_SIZE / 2);
          const bossY = Math.floor(GRID_SIZE / 2);
          g.enemies = [
            {
              x: bossX,
              y: bossY,
              boss: true,
              dragon: true,
              hp: 10,
              stepDelay: 2,
              tick: 0,
            }
          ];
          // Place player at a corner
          g.player = { x: 1, y: 1 };
          // Remove all events, key, shield, shrine, exit
          g.events = [];
          g.key = { x: -1, y: -1 };
          g.shield = null;
          g.shrine = null;
          g.exitTile = { x: -1, y: -1 };
           // Random shopkeeper spawn in boss room
           if (rand(1, 100) <= 40) { // 40% chance
             const shopX = rand(2, GRID_SIZE - 3);
             const shopY = rand(2, GRID_SIZE - 3);
             setShopkeeper({ x: shopX, y: shopY });
             g.shopkeeper = { x: shopX, y: shopY };
           } else {
             setShopkeeper(null);
             g.shopkeeper = null;
           }
          return;
          // Draw shopkeeper in boss room
          if (g.shopkeeper) {
            const px = g.shopkeeper.x * TILE;
            const py = g.shopkeeper.y * TILE;
            ctx.fillStyle = "#2563eb";
            ctx.fillRect(px + 8, py + 8, 32, 32);
            ctx.fillStyle = "#fff";
            ctx.fillRect(px + 20, py + 16, 8, 8);
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(px + 16, py + 24, 16, 4);
            ctx.fillStyle = "#38bdf8";
            ctx.fillRect(px + 12, py + 12, 24, 8);
          }
            // Shopkeeper interaction in boss room
            if (g.shopkeeper && g.player.x === g.shopkeeper.x && g.player.y === g.shopkeeper.y) {
              setShopOpen(true);
              setShopkeeper(null);
              g.shopkeeper = null;
              updateHud();
              draw();
              return;
            }
      if (g.gameOver || g.victory || g.inCombat) return;

      const nx = g.player.x + dx;
      const ny = g.player.y + dy;
      if (!isWalkable(nx, ny)) return;

      g.player.x = nx;
      g.player.y = ny;

      if (!g.hasKey && g.player.x === g.key.x && g.player.y === g.key.y) {
        g.hasKey = true;
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

      const eventTile = g.events.find((tile) => tile.x === g.player.x && tile.y === g.player.y);
      if (eventTile) {
        resolveEventTile(eventTile, startCombat);
        if (g.inCombat) {
          updateHud();
          draw();
          return;
        }
        if (g.gameOver) {
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
      nextLevel,
      resolveEventTile,
      resolveShrine,
      startCombat,
      updateHud,
      updateMeta,
      pushNotice,
    ]
  );

  const moveEnemies = useCallback(() => {
    const g = gameRef.current;
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

      // Dragon boss chase logic
      if (enemy.boss && enemy.dragon) {
        // Move towards player
        let dx = 0, dy = 0;
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
        // Normal enemy wander
        const options = dirs
          .map(([dx, dy]) => ({ x: enemy.x + dx, y: enemy.y + dy }))
          .filter(
            (pos) =>
              isWalkable(pos.x, pos.y) &&
              !(pos.x === g.exitTile.x && pos.y === g.exitTile.y) &&
              !(pos.x === g.key.x && pos.y === g.key.y) &&
              !(g.shield && pos.x === g.shield.x && pos.y === g.shield.y) &&
              !(g.shrine && pos.x === g.shrine.x && pos.y === g.shrine.y) &&
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
  }, [draw, isWalkable, startCombat]);

  const resetGame = useCallback(() => {
        // Shop spawn tracking
        g.shopVisits = 0;
        g.shopLevels = [];
        // Determine shop spawn levels based on difficulty
        if (difficulty === "easy") {
          g.shopLevels = [rand(1, 5)];
        } else if (difficulty === "medium") {
          g.shopLevels = [rand(2, 10), rand(11, 20)];
        } else if (difficulty === "hard") {
          g.shopLevels = [rand(2, 15), rand(16, 30), rand(31, 45)];
        }
        // Open shop if current level matches shop spawn
        if (gameRef.current.shopLevels && gameRef.current.shopLevels.includes(gameRef.current.currentLevel)) {
          setShopOpen(true);
        } else {
          setShopOpen(false);
        }
    const g = gameRef.current;
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
    g.combatBonusUsed = 0;
    pushNotice("A new quest begins.");
    generateLevel();
  }, [generateLevel, pushNotice]);

  const handleRestartOverlayClick = useCallback(() => {
    const g = gameRef.current;
    if (!g.gameOver && !g.victory) return;
    resetGame();
  }, [resetGame]);

  const handleRoll = useCallback((skipAnimation = false) => {
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
      const candidates = getAssetUrlCandidates("dice-roll.mp3");
      const currentSrc = rollSfx.getAttribute("data-src") || "";
      const fallbackSrc = candidates.find((candidate) => candidate !== currentSrc) || candidates[0];

      rollSfx.currentTime = 0;
      rollSfx
        .play()
        .catch(() => {
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
      killSfx
        .play()
        .catch(() => {
          if (fallbackSrc && fallbackSrc !== currentSrc) {
            killSfx.src = fallbackSrc;
            killSfx.setAttribute("data-src", fallbackSrc);
            killSfx.currentTime = 0;
            return killSfx.play().catch(() => {});
          }
          return Promise.resolve();
        });
    };

    const resolveFinalRoll = (finalRoll) => {
      fastRollResolverRef.current = null;
      setCombat((prev) => ({ ...prev, diceDisplay: String(finalRoll) }));

      if (finalRoll === 20) {
        const enemy = g.currentCombatEnemy;
        let bossDefeated = false;
        if (enemy?.boss && enemy.hp > 1) {
          enemy.hp -= 2;
          if (enemy.hp <= 0) {
            g.enemies = g.enemies.filter((mob) => mob !== enemy);
            g.totalKills += 1;
            bossDefeated = true;
          }
        } else {
          g.enemies = g.enemies.filter((mob) => mob !== enemy);
          g.totalKills += 1;
          if (enemy?.boss) bossDefeated = true;
        }

        g.streak += 1;
        g.score += enemy?.boss ? 40 : enemy?.elite ? 20 : 10;
        if (g.streak > 0 && g.streak % 3 === 0) {
          g.nextRollBonus = clamp(g.nextRollBonus + 1, 0, 3);
          pushNotice("Streak reward: +1 next combat roll.");
        }
        g.inCombat = false;
        g.currentCombatEnemy = null;
        g.rolling = false;
        g.combatBonusUsed = 0;
        updateMeta();
        applyLootDrop();
        checkPerfectClear();
        updateHud();
        playKillSfx();
        triggerFx("crit");

        setCombat((prev) => ({
          ...prev,
          rolling: false,
          result: bossDefeated ? "Critical hit. Dragon boss defeated!" : "Critical hit. Monster destroyed.",
        }));

        window.setTimeout(() => {
          resetCombatState();
          draw();
          if (bossDefeated) {
            pushNotice("You defeated the dragon boss! Teleporting to the next level...");
            g.bossFight = false;
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
        g.rolling = false;
        window.setTimeout(() => hitPlayer(), 700);
        return;
      }

      if (finalRoll >= g.requiredRoll) {
        const enemy = g.currentCombatEnemy;
        let bossDefeated = false;
        if (enemy?.boss && enemy.hp > 1) {
          enemy.hp -= 1;
          g.inCombat = true;
          g.currentCombatEnemy = enemy;
          g.rolling = false;
          g.requiredRoll = clamp(g.requiredRoll, 4, 20);
          setCombat((prev) => ({
            ...prev,
            rolling: false,
            result: `You wounded the boss. ${enemy.hp} HP left.`,
            message: `Boss still stands: roll ${g.requiredRoll}+ for the next hit.`,
          }));
          triggerFx("hit");
          updateHud();
          draw();
          return;
        }

        g.enemies = g.enemies.filter((mob) => mob !== enemy);
        g.totalKills += 1;
        if (enemy?.boss) bossDefeated = true;
        g.streak += 1;
        g.score += enemy?.boss ? 40 : enemy?.elite ? 20 : 10;
        if (g.streak > 0 && g.streak % 3 === 0) {
          g.nextRollBonus = clamp(g.nextRollBonus + 1, 0, 3);
          pushNotice("Streak reward: +1 next combat roll.");
        }
        g.inCombat = false;
        g.currentCombatEnemy = null;
        g.rolling = false;
        g.combatBonusUsed = 0;
        updateMeta();
        applyLootDrop();
        checkPerfectClear();
        updateHud();
        playKillSfx();

        setCombat((prev) => ({
          ...prev,
          rolling: false,
          result: bossDefeated ? `You rolled ${finalRoll}. Dragon boss defeated!` : `You rolled ${finalRoll}. Monster killed.`,
        }));

        window.setTimeout(() => {
          resetCombatState();
          draw();
          if (bossDefeated) {
            pushNotice("You defeated the dragon boss! Teleporting to the next level...");
            g.bossFight = false;
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
      g.rolling = false;
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
  }, [
    applyLootDrop,
    checkPerfectClear,
    draw,
    hitPlayer,
    pushNotice,
    resetCombatState,
    triggerFx,
    updateHud,
    updateMeta,
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
        // Ignore corrupted save data.
      }
    }

    function onResize() {
      setIsMobile(window.innerWidth <= 920);
    }

    function onKeyDown(e) {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        const now = typeof window !== "undefined" && window.performance ? window.performance.now() : Date.now();
        const isDoubleTap = now - lastSpaceTapRef.current <= 280;
        lastSpaceTapRef.current = now;
        handleRoll(isDoubleTap);
        return;
      }

      const map = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        a: [-1, 0],
        s: [0, 1],
        d: [1, 0],
        W: [0, -1],
        A: [-1, 0],
        S: [0, 1],
        D: [1, 0],
      };

      const move = map[e.key];
      if (!move) return;
      e.preventDefault();
      movePlayer(move[0], move[1]);
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);

    resetGame();

    function loop() {
      moveEnemies();
      rafRef.current = window.requestAnimationFrame(loop);
    }

    rafRef.current = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.cancelAnimationFrame(rafRef.current);
      window.clearInterval(rollerRef.current);
      fastRollResolverRef.current = null;
    };
  }, [handleRoll, moveEnemies, movePlayer, resetGame]);

  useEffect(() => {
    // Menu and game music
    let menuMusic = null;
    let gameMusic = null;
    // Play menu music when menuState is not 'game'
    if (menuState !== "game") {
      menuMusic = new Audio(getAssetUrlCandidates("menu-theme.mp3")[0]);
      menuMusic.loop = true;
      menuMusic.preload = "auto";
      menuMusic.volume = audioVolume;
      menuMusic.play().catch(() => {});
      bgmRef.current = menuMusic;
    }
    // Play game music when menuState is 'game'
    if (menuState === "game") {
      gameMusic = new Audio(getAssetUrlCandidates("dice-roll.mp3")[0]);
      gameMusic.loop = true;
      gameMusic.preload = "auto";
      gameMusic.volume = audioVolume;
      gameMusic.play().catch(() => {});
      bgmRef.current = gameMusic;
    }
    return () => {
      if (menuMusic) {
        menuMusic.pause();
        menuMusic.currentTime = 0;
      }
      if (gameMusic) {
        gameMusic.pause();
        gameMusic.currentTime = 0;
      }
      bgmRef.current = null;
    };
  }, []);

  useEffect(() => {
    const rollSfx = createAudioAsset("dice-roll.mp3", 0.9);
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
      const allSfx = [rollSfxRef.current, killSfxRef.current, deathSfxRef.current];

      for (const sfx of allSfx) {
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

  return (
    <div style={styles.page}>
      {/* Shop Overlay */}
      {shopOpen && (
        <div style={{ ...styles.modal, zIndex: 2000 }}>
          <div style={{
            background: "linear-gradient(180deg, #1e293b, #2563eb 90%)",
            border: "4px solid #38bdf8",
            boxShadow: "0 0 32px 12px #38bdf8, 0 0 64px 24px #60a5fa",
            padding: "32px",
            borderRadius: "18px",
            width: 420,
            textAlign: "center",
            fontFamily: '"Courier New", monospace',
            color: "#fff",
            position: "relative",
            animation: "glowPulse 1.8s infinite alternate",
          }}>
            {/* Shopkeeper pixel art placeholder */}
            <div style={{ marginBottom: 18 }}>
              <div style={{
                width: 64,
                height: 64,
                margin: "0 auto",
                background: "#fff",
                borderRadius: 8,
                boxShadow: "0 0 8px #38bdf8",
                position: "relative",
                display: "inline-block",
              }}>
                {/* Blue pixel hat */}
                <div style={{
                  width: 48,
                  height: 18,
                  background: "#2563eb",
                  position: "absolute",
                  top: 0,
                  left: 8,
                  borderRadius: 4,
                  boxShadow: "0 2px 8px #60a5fa",
                }} />
                {/* Eyes */}
                <div style={{ width: 8, height: 8, background: "#0f172a", position: "absolute", top: 28, left: 16, borderRadius: 2 }} />
                <div style={{ width: 8, height: 8, background: "#0f172a", position: "absolute", top: 28, left: 40, borderRadius: 2 }} />
                {/* Smile */}
                <div style={{ width: 24, height: 4, background: "#2563eb", position: "absolute", top: 48, left: 20, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 18, color: "#38bdf8", marginTop: 8 }}>Shopkeeper</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Welcome to the NES Shop!</div>
            <div style={{ fontSize: 16, marginBottom: 18 }}>Choose one item to buy:</div>
            <div style={{ display: "grid", gap: 18 }}>
              {shopItems.map(item => (
                <div key={item.id} style={{
                  background: "#0f172a",
                  border: "2px solid #38bdf8",
                  borderRadius: 8,
                  padding: "14px 10px",
                  boxShadow: "0 0 8px #2563eb",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  fontSize: 16,
                }}>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 18 }}>{item.name}</div>
                  <div style={{ color: "#cbd5e1", fontSize: 14, margin: "6px 0 10px 0" }}>{item.desc}</div>
                  <button
                    style={{ ...styles.btn, width: 180, fontSize: 16, margin: 0 }}
                    disabled={playerInventory[item.id] || playerInventory._shopBought}
                    onClick={() => {
                      setPlayerInventory(inv => ({ ...inv, [item.id]: true, _shopBought: true }));
                      setShopOpen(false);
                    }}
                  >
                    {playerInventory[item.id] ? "Purchased" : "Buy"}
                  </button>
                </div>
              ))}
            </div>
            <button style={{ ...styles.btn, width: 180, fontSize: 16, marginTop: 24 }} onClick={() => setShopOpen(false)}>Leave Shop</button>
          </div>
        </div>
      )}
      {/* Start Menu */}
      {menuState === "start" && (
        <div style={{ ...styles.shell, justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <div style={styles.menuOverlay}>
            <div style={{ ...styles.logo, fontSize: 64, marginBottom: 16 }}>Dungeon Roll</div>
            <div style={{ ...styles.subtitle, fontSize: 24, marginBottom: 32 }}>NES-style browser mini-game</div>
            <button style={{ ...styles.btn, fontSize: 28, margin: 12 }} onClick={() => setMenuState("difficulty")}>Start</button>
            <button style={{ ...styles.btn, fontSize: 28, margin: 12 }} onClick={() => setMenuState("options")}>Options</button>
            <button style={{ ...styles.btn, fontSize: 28, margin: 12 }} onClick={() => window.location.href = "/"}>Exit</button>
          </div>
        </div>
      )}

      {/* Options Menu */}
      {menuState === "options" && (
        <div style={{ ...styles.shell, justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <div style={{ ...styles.menuOverlay, maxWidth: 480, margin: "auto" }}>
            <div style={{ ...styles.logo, fontSize: 48, marginBottom: 16 }}>Options</div>
            <div style={{ margin: "24px 0" }}>
              <label style={{ fontSize: 20, marginBottom: 8, display: "block" }}>Audio Volume</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={audioVolume}
                onChange={e => setAudioVolume(Number(e.target.value))}
                style={{ width: 300 }}
              />
              <div style={{ fontSize: 16, marginTop: 4 }}>{Math.round(audioVolume * 100)}%</div>
            </div>
            <div style={{ margin: "24px 0" }}>
              <label style={{ fontSize: 20, marginBottom: 8, display: "block" }}>Key Bindings</label>
              {Object.entries(keyBindings).map(([action, key]) => (
                <div key={action} style={{ margin: "8px 0", fontSize: 16 }}>
                  <span style={{ fontWeight: "bold" }}>{action.charAt(0).toUpperCase() + action.slice(1)}:</span>
                  {rebindKey === action ? (
                    <span style={{ marginLeft: 8, color: "#38bdf8" }}>Press any key...</span>
                  ) : (
                    <span style={{ marginLeft: 8 }}>{key}</span>
                  )}
                  <button style={{ ...styles.btn, fontSize: 14, marginLeft: 12 }} onClick={() => setRebindKey(action)}>Rebind</button>
                </div>
              ))}
              {rebindKey && (
                <div style={{ fontSize: 14, color: "#ef4444", marginTop: 8 }}>
                  Press a key to set binding for <b>{rebindKey}</b>
                </div>
              )}
            </div>
            <button style={{ ...styles.btn, fontSize: 20, margin: 12 }} onClick={() => { setMenuState("start"); setRebindKey(null); }}>Back</button>
          </div>
        </div>
      )}

      {/* Difficulty Menu */}
      {menuState === "difficulty" && (
        <div style={{ ...styles.shell, justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <div style={styles.menuOverlay}>
            <div style={{ ...styles.logo, fontSize: 48, marginBottom: 16 }}>Select Difficulty</div>
            <button style={{ ...styles.btn, fontSize: 24, margin: 12 }} onClick={() => { setDifficulty("easy"); setMenuState("game"); }}>Easy (10 Levels)</button>
            <button style={{ ...styles.btn, fontSize: 24, margin: 12 }} onClick={() => { setDifficulty("medium"); setMenuState("game"); }}>Medium (25 Levels)</button>
            <button style={{ ...styles.btn, fontSize: 24, margin: 12 }} onClick={() => { setDifficulty("hard"); setMenuState("game"); }}>Hard (50 Levels)</button>
            <button style={{ ...styles.btn, fontSize: 20, margin: 12 }} onClick={() => setMenuState("start")}>Back</button>
          </div>
        </div>
      )}

      {/* Game UI */}
      {menuState === "game" && (
        <div style={styles.shell}>
          <div style={styles.titlebar}>
            <div>
              <div style={styles.logo}>Dungeon Roll</div>
              <div style={styles.subtitle}>NES-style browser mini-game from D20Masters.ink</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={{ ...styles.btn, width: "auto", minWidth: 150 }} onClick={onBack}>
                Back
              </button>
              <button style={{ ...styles.btn, width: "auto", minWidth: 190 }} onClick={() => setMenuState("start")}>Main Menu</button>
              <button style={{ ...styles.btn, width: "auto", minWidth: 190 }} onClick={resetGame}>
                Restart Quest
              </button>
            </div>
          </div>

          <div
            style={{
              ...styles.hud,
              gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : styles.hud.gridTemplateColumns,
            }}
          >
            <div style={styles.panel}>
              <div style={styles.label}>Level</div>
              <div style={styles.value}>
                {hud.level}/{maxLevels}
              </div>
            </div>
            {/* ...existing code for other panels... */}
          </div>
          {/* ...existing code for main, sidebar, etc... */}
        </div>
      )}

      {combat.open && menuState === "game" ? (
        // ...existing code...
        <div style={styles.modal}>
          // ...existing code...
        </div>
      ) : null}
    {/* Buy Me a Coffee button, always visible bottom right */}
    <a
      href="https://www.buymeacoffee.com/yourusername" target="_blank" rel="noopener noreferrer"
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
  );
}
