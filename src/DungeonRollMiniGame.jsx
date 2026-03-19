import React, { useCallback, useEffect, useRef, useState } from "react";

const GRID_SIZE = 16;
const TILE = 48;
const FLOOR = 0;
const WALL = 1;
const MAX_LEVELS = 10;

const styles = {
  page: {
    margin: 0,
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, #1e293b 0%, #0f172a 40%, #020617 100%)",
    color: "#e2e8f0",
    fontFamily: '"Courier New", monospace',
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "18px",
  },
  shell: {
    width: "min(100%, 1120px)",
    border: "4px solid #94a3b8",
    background: "linear-gradient(180deg, #0f172a, #111827)",
    boxShadow:
      "0 0 0 4px #020617, 0 0 0 8px #475569, 0 18px 60px rgba(0,0,0,0.6)",
    padding: "18px",
  },
  titlebar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },
  logo: {
    display: "inline-block",
    fontSize: "clamp(20px, 2.8vw, 34px)",
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "#fff",
    textShadow: "2px 2px 0 #0f172a, 4px 4px 0 #2563eb, 6px 6px 0 #020617",
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: "14px",
    marginTop: "4px",
  },
  hud: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: "8px",
    marginBottom: "14px",
  },
  panel: {
    background: "#1e293b",
    border: "3px solid #94a3b8",
    boxShadow: "inset -3px -3px 0 #0f172a, inset 3px 3px 0 #475569",
    padding: "10px",
    minHeight: "66px",
  },
  label: {
    color: "#93c5fd",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "1px",
    marginBottom: "4px",
  },
  value: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#fff",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "1fr 280px",
    gap: "14px",
    alignItems: "start",
  },
  gameFrame: {
    background: "#020617",
    border: "4px solid #94a3b8",
    boxShadow: "inset 0 0 0 4px #0f172a",
    padding: "12px",
  },
  canvas: {
    display: "block",
    width: "100%",
    maxWidth: "768px",
    aspectRatio: "1 / 1",
    background: "#000",
    imageRendering: "pixelated",
    border: "4px solid #475569",
    margin: "0 auto",
  },
  sidebar: {
    display: "grid",
    gap: "12px",
  },
  btn: {
    width: "100%",
    border: 0,
    background: "linear-gradient(180deg, #60a5fa, #2563eb)",
    color: "white",
    fontFamily: '"Courier New", monospace',
    fontSize: "16px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1px",
    padding: "12px 10px",
    cursor: "pointer",
    borderWidth: "3px",
    borderStyle: "solid",
    borderColor: "#bfdbfe",
    boxShadow: "inset -3px -3px 0 #1d4ed8, inset 3px 3px 0 #93c5fd",
  },
  rulesText: {
    fontSize: "13px",
    lineHeight: 1.45,
    color: "#dbeafe",
  },
  legend: {
    display: "grid",
    gap: "8px",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
  },
  swatch: {
    width: "18px",
    height: "18px",
    border: "2px solid #fff",
    flex: "0 0 auto",
  },
  footerHint: {
    marginTop: "12px",
    color: "#93c5fd",
    fontSize: "12px",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  modal: {
    position: "fixed",
    inset: 0,
    background: "rgba(2, 6, 23, 0.84)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },
  combatCard: {
    width: "min(100%, 460px)",
    background: "linear-gradient(180deg, #1e293b, #0f172a)",
    border: "4px solid #cbd5e1",
    boxShadow:
      "0 0 0 4px #334155, 0 0 0 8px #020617, 0 18px 60px rgba(0,0,0,0.6)",
    padding: "18px",
    textAlign: "center",
  },
  combatTitle: {
    fontSize: "28px",
    fontWeight: 700,
    textTransform: "uppercase",
    color: "#fff",
    marginBottom: "10px",
    textShadow: "2px 2px 0 #2563eb",
  },
  combatText: {
    fontSize: "15px",
    lineHeight: 1.5,
    color: "#dbeafe",
    minHeight: "48px",
  },
  diceBox: {
    margin: "18px auto",
    width: "132px",
    height: "132px",
    border: "4px solid #fff",
    background: "linear-gradient(180deg, #334155, #0f172a)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "44px",
    fontWeight: 700,
    color: "#facc15",
    textShadow: "2px 2px 0 #000",
    boxShadow: "inset -4px -4px 0 #020617, inset 4px 4px 0 #64748b",
  },
  resultText: {
    minHeight: "26px",
    marginTop: "12px",
    fontSize: "15px",
    color: "#fff",
  },
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function coordKey(x, y) {
  return `${x},${y}`;
}

function getGithubPagesBasePath() {
  if (typeof window === "undefined") return "";

  const pathSegments = (window.location.pathname || "/")
    .split("/")
    .filter(Boolean);
  const isProjectPages =
    window.location.hostname.endsWith("github.io") && pathSegments.length > 0;

  if (!isProjectPages) return "";
  return `/${pathSegments[0]}`;
}

function getAssetUrl(fileName) {
  return getAssetUrlCandidates(fileName)[0];
}

function getAssetUrlCandidates(fileName) {
  const encoded = encodeURIComponent(fileName);
  const basePath = getGithubPagesBasePath();

  return Array.from(
    new Set([
      `${basePath}/dist/${encoded}`,
      `${basePath}/${encoded}`,
      `dist/${encoded}`,
      `/${encoded}`,
      `/dist/${encoded}`,
      `./${encoded}`,
    ])
  );
}

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

  const [hud, setHud] = useState({
    level: 1,
    lives: 3,
    keyStatus: "No",
    monsterCount: 0,
    state: "Playing",
  });

  const [combat, setCombat] = useState({
    open: false,
    message: "Roll high enough to kill the monster.",
    result: "",
    diceDisplay: "D20",
    rolling: false,
  });

  const gameRef = useRef({
    currentLevel: 1,
    lives: 3,
    hasKey: false,
    gameOver: false,
    victory: false,
    inCombat: false,
    rolling: false,
    grid: [],
    player: { x: 1, y: 1 },
    key: { x: 2, y: 2 },
    exitTile: { x: 14, y: 14 },
    enemies: [],
    currentCombatEnemy: null,
    requiredRoll: 0,
  });

  const updateHud = useCallback(() => {
    const g = gameRef.current;
    setHud({
      level: g.currentLevel,
      lives: g.lives,
      keyStatus: g.hasKey ? "Yes" : "No",
      monsterCount: g.enemies.length,
      state: g.victory
        ? "Victory"
        : g.gameOver
        ? "Defeated"
        : g.inCombat
        ? "Combat"
        : "Playing",
    });
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
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (g.grid[y]?.[x] === WALL) drawWall(x, y);
        else drawFloor(x, y);
      }
    }

    if (!g.hasKey) drawKey(g.key.x, g.key.y);
    drawExit(g.exitTile.x, g.exitTile.y);
    g.enemies.forEach((enemy) => drawEnemy(enemy.x, enemy.y));
    drawHero(g.player.x, g.player.y);

    if (g.gameOver) drawOverlay("GAME OVER", "Press Restart Quest");
    if (g.victory) drawOverlay("YOU WIN", "All 10 dungeons cleared");
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

    while (!ready) {
      carveSimpleDungeon();
      const used = new Set();

      g.player = randomFloorCell(used);
      used.add(coordKey(g.player.x, g.player.y));

      g.key = randomFloorCell(used);
      used.add(coordKey(g.key.x, g.key.y));

      g.exitTile = randomFloorCell(used);
      used.add(coordKey(g.exitTile.x, g.exitTile.y));

      if (!reachable(g.player, g.key) || !reachable(g.key, g.exitTile)) continue;

      g.enemies = [];
      const enemyCount = Math.min(2 + g.currentLevel, 7);
      let placed = 0;

      while (placed < enemyCount) {
        const enemyPos = randomFloorCell(used);
        if (!reachable(g.player, enemyPos)) continue;

        used.add(coordKey(enemyPos.x, enemyPos.y));
        g.enemies.push({
          x: enemyPos.x,
          y: enemyPos.y,
          stepDelay: rand(18, 34),
          tick: 0,
        });
        placed += 1;
      }

      ready = true;
    }

    g.hasKey = false;
    g.inCombat = false;
    g.currentCombatEnemy = null;
    g.requiredRoll = 0;
    g.rolling = false;

    setCombat({
      open: false,
      message: "Roll high enough to kill the monster.",
      result: "",
      diceDisplay: "D20",
      rolling: false,
    });

    updateHud();
    draw();
  }, [carveSimpleDungeon, draw, randomFloorCell, reachable, updateHud]);

  const hitPlayer = useCallback(() => {
    const g = gameRef.current;

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
    g.inCombat = false;
    g.currentCombatEnemy = null;
    g.requiredRoll = 0;
    g.rolling = false;

    setCombat({
      open: false,
      message: "Roll high enough to kill the monster.",
      result: "",
      diceDisplay: "D20",
      rolling: false,
    });

    if (g.lives <= 0) {
      g.gameOver = true;
      updateHud();
      draw();
      return;
    }

    generateLevel();
  }, [draw, generateLevel, updateHud]);

  const nextLevel = useCallback(() => {
    const g = gameRef.current;

    if (g.currentLevel >= MAX_LEVELS) {
      g.victory = true;
      updateHud();
      draw();
      return;
    }

    g.currentLevel += 1;
    generateLevel();
  }, [draw, generateLevel, updateHud]);

  const startCombat = useCallback(
    (enemy) => {
      const g = gameRef.current;
      if (g.inCombat || g.gameOver || g.victory) return;

      g.inCombat = true;
      g.currentCombatEnemy = enemy;
      g.requiredRoll = rand(7, 16) + Math.floor(g.currentLevel / 3);

      setCombat({
        open: true,
        message: `You must roll ${g.requiredRoll} or higher to kill the monster.`,
        result: "",
        diceDisplay: "D20",
        rolling: false,
      });

      updateHud();
    },
    [updateHud]
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

      updateHud();
      draw();
    },
    [draw, isWalkable, nextLevel, startCombat, updateHud]
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
            !(pos.x === g.exitTile.x && pos.y === g.exitTile.y)
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
    g.gameOver = false;
    g.victory = false;
    generateLevel();
  }, [generateLevel]);

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
        g.enemies = g.enemies.filter((enemy) => enemy !== g.currentCombatEnemy);
        g.inCombat = false;
        g.currentCombatEnemy = null;
        g.rolling = false;
        updateHud();
        playKillSfx();

        setCombat((prev) => ({
          ...prev,
          rolling: false,
          result: "Critical hit. Monster destroyed.",
        }));

        window.setTimeout(() => {
          setCombat({
            open: false,
            message: "Roll high enough to kill the monster.",
            result: "",
            diceDisplay: "D20",
            rolling: false,
          });
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
        g.enemies = g.enemies.filter((enemy) => enemy !== g.currentCombatEnemy);
        g.inCombat = false;
        g.currentCombatEnemy = null;
        g.rolling = false;
        updateHud();
        playKillSfx();

        setCombat((prev) => ({
          ...prev,
          rolling: false,
          result: `You rolled ${finalRoll}. Monster killed.`,
        }));

        window.setTimeout(() => {
          setCombat({
            open: false,
            message: "Roll high enough to kill the monster.",
            result: "",
            diceDisplay: "D20",
            rolling: false,
          });
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
  }, [draw, hitPlayer, updateHud]);

  useEffect(() => {
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
    const bgmCandidates = getAssetUrlCandidates("NES TITLE THEME SONG.mp3");
    const initialSrc = bgmCandidates[0];
    const bgm = new Audio(initialSrc);
    bgm.loop = true;
    bgm.preload = "auto";
    bgm.volume = 0.45;
    bgm.setAttribute("data-src", initialSrc);
    bgmRef.current = bgm;

    let interactionHandler = null;
    const playWithFallback = () => {
      const currentSrc = bgm.getAttribute("data-src") || "";
      const fallbackSrc =
        bgmCandidates.find((candidate) => candidate !== currentSrc) || bgmCandidates[0];

      return bgm.play().catch(() => {
        if (fallbackSrc && fallbackSrc !== currentSrc) {
          bgm.src = fallbackSrc;
          bgm.setAttribute("data-src", fallbackSrc);
          bgm.currentTime = 0;
          return bgm.play().catch(() => {});
        }
        return Promise.resolve();
      });
    };

    const onBgmEnded = () => {
      // Backup loop path for browsers that occasionally ignore HTMLAudioElement.loop.
      bgm.currentTime = 0;
      playWithFallback();
    };

    bgm.addEventListener("ended", onBgmEnded);

    playWithFallback().catch(() => {
      interactionHandler = () => {
        playWithFallback().catch(() => {});
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
    const initialSrc = getAssetUrl("dice-roll.mp3");
    const rollSfx = new Audio(initialSrc);
    rollSfx.preload = "auto";
    rollSfx.volume = 0.9;
    rollSfx.setAttribute("data-src", initialSrc);
    rollSfxRef.current = rollSfx;

    return () => {
      rollSfx.pause();
      rollSfx.currentTime = 0;
      rollSfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    const initialSrc = getAssetUrl("monster-dying-effect.mp3");
    const killSfx = new Audio(initialSrc);
    killSfx.preload = "auto";
    killSfx.volume = 0.95;
    killSfx.setAttribute("data-src", initialSrc);
    killSfxRef.current = killSfx;

    return () => {
      killSfx.pause();
      killSfx.currentTime = 0;
      killSfxRef.current = null;
    };
  }, []);

  useEffect(() => {
    const initialSrc = getAssetUrl("you-died.mp3");
    const deathSfx = new Audio(initialSrc);
    deathSfx.preload = "auto";
    deathSfx.volume = 0.95;
    deathSfx.setAttribute("data-src", initialSrc);
    deathSfxRef.current = deathSfx;

    return () => {
      deathSfx.pause();
      deathSfx.currentTime = 0;
      deathSfxRef.current = null;
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.titlebar}>
          <div>
            <div style={styles.logo}>Dungeon Roll</div>
            <div style={styles.subtitle}>NES-style browser mini-game for D20Masters</div>
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
            <div style={styles.label}>Monsters</div>
            <div style={styles.value}>{hud.monsterCount}</div>
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
            <div style={styles.footerHint}>
              Move with WASD or Arrow Keys. Get the key. Reach the door. Roll to survive.
            </div>
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
              </ul>
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
                  <span style={{ ...styles.swatch, background: "#22c55e" }} /> Exit
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
