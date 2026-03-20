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
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const rollerRef = useRef(0);
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
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(px + 12, py + 8, 24, 30);
      ctx.fillStyle = "#38bdf8";
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
      const gradient = ctx.createRadialGradient(centerX, centerY, 48, centerX, centerY, 240);
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
        const isBossFloor = g.currentLevel === MAX_LEVELS;
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
    g.combatBonusUsed = 0;
    triggerFx("hit");

    resetCombatState();

    if (g.lives <= 0) {
      g.gameOver = true;
      pushNotice("You were defeated.");
      updateMeta();

      updateHud();
      draw();
      return;
    }

    generateLevel();
  }, [draw, generateLevel, pushNotice, resetCombatState, triggerFx, updateHud, updateMeta]);

  const nextLevel = useCallback(() => {
    const g = gameRef.current;

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
        diceDisplay: "D20",
        rolling: false,
      });

      if (g.combatBonusUsed > 0) {
        pushNotice(`Battle focus used: +${g.combatBonusUsed} applied.`);
      }

      updateHud();
    },
    [pushNotice, updateHud]
  );

  const movePlayer = useCallback(
    (dx, dy) => {
      const g = gameRef.current;
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

      if (enemy.x === g.player.x && enemy.y === g.player.y) {
        startCombat(enemy);
        draw();
        return;
      }
    }

    draw();
  }, [draw, isWalkable, startCombat]);

  const resetGame = useCallback(() => {
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

  const handleRoll = useCallback(() => {
    const g = gameRef.current;
    if (!g.inCombat || g.rolling || !g.currentCombatEnemy) return;

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

    g.rolling = true;
    setCombat((prev) => ({ ...prev, rolling: true, result: "Rolling..." }));

    let ticks = 0;
    rollerRef.current = window.setInterval(() => {
      const rollingFace = rand(1, 20);
      setCombat((prev) => ({ ...prev, diceDisplay: String(rollingFace) }));
      ticks += 1;

      if (ticks < 14) return;

      window.clearInterval(rollerRef.current);

      const finalRoll = rand(1, 20);
      setCombat((prev) => ({ ...prev, diceDisplay: String(finalRoll) }));

      if (finalRoll === 20) {
        const enemy = g.currentCombatEnemy;
        if (enemy?.boss && enemy.hp > 1) {
          enemy.hp -= 2;
          if (enemy.hp <= 0) {
            g.enemies = g.enemies.filter((mob) => mob !== enemy);
            g.totalKills += 1;
          }
        } else {
          g.enemies = g.enemies.filter((mob) => mob !== enemy);
          g.totalKills += 1;
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
          result: "Critical hit. Monster destroyed.",
        }));

        window.setTimeout(() => {
          resetCombatState();
          draw();
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
          result: `You rolled ${finalRoll}. Monster killed.`,
        }));

        window.setTimeout(() => {
          resetCombatState();
          draw();
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
    };
  }, [moveEnemies, movePlayer, resetGame]);

  useEffect(() => {
    const playlist = [
      getAssetUrlCandidates("NES TITLE THEME SONG.mp3"),
      getAssetUrlCandidates("TempleOS theme Remix.mp3"),
    ];
    let trackIndex = 0;
    const initialSrc = playlist[trackIndex][0];
    const bgm = new Audio(initialSrc);
    bgm.loop = false;
    bgm.preload = "auto";
    bgm.volume = 0.45;
    bgm.setAttribute("data-src", initialSrc);
    bgm.setAttribute("data-track-index", String(trackIndex));
    bgmRef.current = bgm;

    let interactionHandler = null;
    const playTrack = (nextTrackIndex = trackIndex) => {
      const candidates = playlist[nextTrackIndex] || playlist[0];
      const currentSrc = bgm.getAttribute("data-src") || "";
      const preferredSrc = candidates[0];
      const fallbackSrc = candidates.find((candidate) => candidate !== currentSrc) || candidates[0];

      trackIndex = nextTrackIndex;
      if (bgm.src !== preferredSrc && currentSrc !== preferredSrc) {
        bgm.src = preferredSrc;
        bgm.setAttribute("data-src", preferredSrc);
      }
      bgm.setAttribute("data-track-index", String(trackIndex));
      bgm.currentTime = 0;

      return bgm.play().catch(() => {
        if (fallbackSrc && fallbackSrc !== preferredSrc) {
          bgm.src = fallbackSrc;
          bgm.setAttribute("data-src", fallbackSrc);
          bgm.currentTime = 0;
          return bgm.play().catch(() => {});
        }
        return Promise.resolve();
      });
    };

    const onBgmEnded = () => {
      const nextTrackIndex = (trackIndex + 1) % playlist.length;
      playTrack(nextTrackIndex).catch(() => {});
    };

    bgm.addEventListener("ended", onBgmEnded);

    playTrack(trackIndex).catch(() => {
      interactionHandler = () => {
        playTrack(trackIndex).catch(() => {});
        window.removeEventListener("pointerdown", interactionHandler);
        window.removeEventListener("keydown", interactionHandler);
      };

      window.addEventListener("pointerdown", interactionHandler, { once: true });
      window.addEventListener("keydown", interactionHandler, { once: true });
    });

    return () => {
      if (interactionHandler) {
        window.removeEventListener("pointerdown", interactionHandler);
        window.removeEventListener("keydown", interactionHandler);
      }
      bgm.removeEventListener("ended", onBgmEnded);
      bgm.pause();
      bgm.currentTime = 0;
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
              {hud.level}/{MAX_LEVELS}
            </div>
          </div>
          <div style={styles.panel}>
            <div style={styles.label}>Lives</div>
            <div style={styles.value}>{hud.lives}</div>
          </div>
          <div style={styles.panel}>
            <div style={styles.label}>Key</div>
            <div style={styles.value}>{hud.keyStatus}</div>
          </div>
          <div style={styles.panel}>
            <div style={styles.label}>Chan's Shield</div>
            <div style={styles.value}>{hud.shieldStatus}</div>
          </div>
          <div style={styles.panel}>
            <div style={styles.label}>Monsters</div>
            <div style={styles.value}>{hud.monsterCount}</div>
          </div>
          <div style={styles.panel}>
            <div style={styles.label}>Streak</div>
            <div style={styles.value}>{hud.streak}</div>
          </div>
          <div style={styles.panel}>
            <div style={styles.label}>Score</div>
            <div style={styles.value}>{hud.score}</div>
          </div>
          <div style={styles.panel}>
            <div style={styles.label}>Floor Mod</div>
            <div style={{ ...styles.value, fontSize: 16 }}>{hud.modifier}</div>
          </div>
          <div style={styles.panel}>
            <div style={styles.label}>Roll Bonus</div>
            <div style={styles.value}>{hud.nextBonus > 0 ? `+${hud.nextBonus}` : "No"}</div>
          </div>
          <div style={styles.panel}>
            <div style={styles.label}>State</div>
            <div style={styles.value}>{hud.state}</div>
          </div>
        </div>

        <div
          style={{
            ...styles.main,
            gridTemplateColumns: isMobile ? "1fr" : styles.main.gridTemplateColumns,
          }}
        >
          <div style={styles.gameFrame}>
            <canvas ref={canvasRef} width={768} height={768} style={styles.canvas} />
            {hud.state === "Defeated" || hud.state === "Victory" ? (
              <div
                role="button"
                aria-label="Restart quest"
                style={styles.restartOverlayHitArea}
                onClick={handleRestartOverlayClick}
              />
            ) : null}
            <div style={styles.footerHint}>
              Move with WASD or Arrow Keys. Get the key. Reach the door. Roll to survive.
            </div>
            <div style={styles.noticeText}>{notice}</div>
          </div>

          <div style={styles.sidebar}>
            <div style={styles.panel}>
              <div style={styles.label}>How To Play</div>
              <p style={styles.rulesText}>
                You are the blue hero. Each dungeon is randomly generated. Find the gold key, then
                reach the green exit door. Touching a monster starts D20 combat.
              </p>
              <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
                <li style={styles.rulesText}>Beat 10 levels to win.</li>
                <li style={styles.rulesText}>Fail a combat roll and you lose a life.</li>
                <li style={styles.rulesText}>Roll high enough to kill the monster.</li>
                <li style={styles.rulesText}>Natural 20 is a critical kill.</li>
                <li style={styles.rulesText}>Natural 1 is instant death.</li>
                <li style={styles.rulesText}>Some levels spawn Chan's Shield, which blocks two monster hits.</li>
                <li style={styles.rulesText}>Every 3rd level has an elite monster. Level 10 has a 3-HP boss.</li>
                <li style={styles.rulesText}>Clear all monsters for a Perfect Clear: key auto-unlocks and +50 score.</li>
                <li style={styles.rulesText}>Shrines can bless or curse. Event tiles add random surprises.</li>
              </ul>
            </div>

            <div style={styles.panel}>
              <div style={styles.label}>Records</div>
              <div style={styles.rulesText}>Best level: {hud.bestLevel}</div>
              <div style={styles.rulesText}>Best streak: {hud.bestStreak}</div>
              <div style={styles.rulesText}>Best score: {hud.bestScore}</div>
              <div style={styles.rulesText}>Total kills: {hud.totalKills}</div>
              <div style={styles.rulesText}>Total wins: {hud.totalWins}</div>
            </div>

            <div style={styles.panel}>
              <div style={styles.label}>Legend</div>
              <div style={styles.legend}>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#38bdf8" }} /> Hero
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#ef4444" }} /> Monster
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#facc15" }} /> Key
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#38bdf8" }} /> Chan's Shield
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#22c55e" }} /> Exit
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#7c3aed" }} /> Shrine
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#06b6d4" }} /> Teleport Trap
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#f59e0b" }} /> Treasure Chest
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#dc2626" }} /> Mimic Event
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#22c55e" }} /> Healing Fountain
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#64748b" }} /> Wall
                </div>
                <div style={styles.legendItem}>
                  <span style={{ ...styles.swatch, background: "#1f2937" }} /> Floor
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {combat.open ? (
        <div style={styles.modal}>
          <div style={styles.combatCard}>
            <div style={styles.combatTitle}>D20 Combat</div>
            <div style={styles.combatText}>{combat.message}</div>
            <div style={styles.diceBox}>{combat.diceDisplay}</div>
            <button
              style={{ ...styles.btn, opacity: combat.rolling ? 0.7 : 1 }}
              onClick={handleRoll}
              disabled={combat.rolling}
            >
              Roll Die
            </button>
            <div style={styles.resultText}>{combat.result}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
