export const GRID_SIZE = 16;
export const TILE = 48;
export const FLOOR = 0;
export const WALL = 1;
export const MAX_LEVELS = 10;
export const META_STORAGE_KEY = "dungeon-roll-meta-v2";
export const BALANCE = {
  minEnemyStartDistance: 5,
  shrineSpawnChance: 25,
  eventSpawnChance: 45,
  shieldSpawnChance: 35,
  lootDropChance: 28,
  chestKeyChance: 35,
  bossHp: 2,
};

export const LEVEL_MODIFIERS = [
  { id: "normal", name: "Classic", desc: "Standard rules." },
  { id: "haste", name: "Haste Floor", desc: "Monsters move faster." },
  { id: "blessing", name: "Blessed Floor", desc: "Combat rolls are easier." },
  { id: "dark", name: "Dark Floor", desc: "Visibility is reduced." },
];

export const EVENT_TYPES = ["teleport", "chest", "mimic", "fountain"];
export const DEFAULT_NOTICE = "Find the key and make it to the exit.";

export const styles = {
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
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
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
    position: "relative",
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
  noticeText: {
    marginTop: "8px",
    color: "#fef08a",
    fontSize: "12px",
    textAlign: "center",
    minHeight: "18px",
  },
  restartOverlayHitArea: {
    position: "absolute",
    top: "12px",
    left: "12px",
    right: "12px",
    bottom: "38px",
    cursor: "pointer",
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

export function createInitialHudState() {
  return {
    level: 1,
    lives: 3,
    keyStatus: "No",
    shieldStatus: "No",
    streak: 0,
    score: 0,
    modifier: "Classic",
    nextBonus: 0,
    monsterCount: 0,
    state: "Playing",
    bestLevel: 1,
    bestStreak: 0,
    bestScore: 0,
    totalKills: 0,
    totalWins: 0,
  };
}

export function createInitialCombatState() {
  return {
    open: false,
    message: "Roll high enough to kill the monster.",
    result: "",
    diceDisplay: "D20",
    rolling: false,
  };
}

export function createInitialGameState() {
  return {
    currentLevel: 1,
    lives: 3,
    hasKey: false,
    hasShield: false,
    shieldCharges: 0,
    streak: 0,
    score: 0,
    levelModifier: LEVEL_MODIFIERS[0],
    nextRollBonus: 0,
    gameOver: false,
    victory: false,
    inCombat: false,
    rolling: false,
    perfectClearClaimed: false,
    shrine: null,
    events: [],
    flashTicks: 0,
    flashColor: "",
    shakeTicks: 0,
    bestLevel: 1,
    bestStreak: 0,
    bestScore: 0,
    totalKills: 0,
    totalWins: 0,
    grid: [],
    player: { x: 1, y: 1 },
    key: { x: 2, y: 2 },
    shield: null,
    exitTile: { x: 14, y: 14 },
    enemies: [],
    currentCombatEnemy: null,
    requiredRoll: 0,
    combatBonusUsed: 0,
  };
}