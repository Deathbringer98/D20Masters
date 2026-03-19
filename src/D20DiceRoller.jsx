import React, { useEffect, useMemo, useRef, useState } from "react";
import diceRollSound from "./sounds/dice-roll.mp3";

const styles = {
  page: (bg) => ({
    minHeight: "100vh",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    position: "relative",
    backgroundImage: `url(${bg})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    fontFamily: "Arial, sans-serif",
    overflowX: "hidden",
    overflowY: "auto",
  }),
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(2px)",
  },
  shell: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    maxWidth: "1200px",
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: "24px",
  },
  card: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "24px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(14px)",
    padding: "28px",
  },
  subtle: { color: "#cbd5e1" },
  heading: { fontSize: "52px", fontWeight: 800, margin: "0 0 8px 0" },
  label: { fontSize: "13px", letterSpacing: "0.25em", textTransform: "uppercase", color: "#cbd5e1", marginBottom: "8px" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "24px", padding: "20px 0" },
  button: (color, disabled = false) => ({
    border: "none",
    borderRadius: "18px",
    padding: "16px 32px",
    fontSize: "18px",
    fontWeight: 700,
    color: "#fff",
    background: color,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
    boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
  }),
  sectionTitle: { fontSize: "28px", fontWeight: 800, margin: "0 0 12px 0" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px" },
  option: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderRadius: "18px",
    border: active ? "1px solid rgba(255,255,255,0.65)" : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.18)",
    padding: "14px 16px",
    textAlign: "left",
    color: "#fff",
    cursor: "pointer",
  }),
  bgOption: (active) => ({
    overflow: "hidden",
    borderRadius: "18px",
    border: active ? "1px solid rgba(255,255,255,0.65)" : "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.18)",
    color: "#fff",
    cursor: "pointer",
    textAlign: "left",
    padding: 0,
  }),
  chip: { width: "24px", height: "24px", borderRadius: "999px", border: "1px solid rgba(255,255,255,0.3)" },
  thumb: (image) => ({ height: "80px", width: "100%", backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }),
  historyCard: {
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.2)",
    padding: "14px 12px",
    textAlign: "center",
  },
  footerBox: {
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.2)",
    padding: "16px",
    color: "#e2e8f0",
  },
};

export default function D20DiceRoller({ onLegalClick }) {
  const colorOptions = [
    { name: "Crimson", value: "#dc2626" },
    { name: "Emerald", value: "#16a34a" },
    { name: "Royal Blue", value: "#2563eb" },
    { name: "Purple", value: "#7c3aed" },
    { name: "Amber", value: "#d97706" },
    { name: "Slate", value: "#475569" },
    { name: "Pink", value: "#db2777" },
    { name: "Black", value: "#111827" },
  ];

  const backgroundOptions = [
    {
      name: "Dark Forest",
      value: "spooky-forest",
      image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2000&q=80",
    },
    {
      name: "Deep Space",
      value: "space",
      image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=2000&q=80",
    },
    {
      name: "Underwater",
      value: "underwater",
      image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=2000&q=80",
    },
    {
      name: "Desert Valley",
      value: "desert-valley",
      image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=80",
    },
    {
      name: "Ocean Surface",
      value: "ocean",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80",
    },
    {
      name: "Mystic Cabin",
      value: "mystic-cabin",
      image: "https://images.unsplash.com/photo-1482192505345-5655af888cc4?auto=format&fit=crop&w=2000&q=80",
    },
  ];

  const [selectedColor, setSelectedColor] = useState(colorOptions[0].value);
  const [selectedBackground, setSelectedBackground] = useState(backgroundOptions[0]);
  const [roll, setRoll] = useState(20);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState([20]);
  const audioRef = useRef(new Audio(diceRollSound));
  const [viewportWidth, setViewportWidth] = useState(typeof window === "undefined" ? 1280 : window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = viewportWidth < 768;
  const isTablet = viewportWidth >= 768 && viewportWidth < 1100;
  const diceSize = isMobile ? 190 : isTablet ? 220 : 256;

  const glow = useMemo(() => `drop-shadow(0 0 30px ${selectedColor}55)`, [selectedColor]);

  function randomD20() {
    return Math.floor(Math.random() * 20) + 1;
  }

  function handleRoll() {
    if (rolling) return;
    setRolling(true);
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    let ticks = 0;
    const interval = setInterval(() => {
      setRoll(randomD20());
      ticks += 1;
      if (ticks >= 12) {
        clearInterval(interval);
        const finalRoll = randomD20();
        setRoll(finalRoll);
        setHistory((prev) => [finalRoll, ...prev].slice(0, 8));
        setRolling(false);
      }
    }, 80);
  }

  return (
    <div
      style={{
        ...styles.page(selectedBackground.image),
        alignItems: isTablet ? "flex-start" : "center",
        padding: isMobile ? "16px 12px 100px" : isTablet ? "20px 16px 108px" : "24px 24px 110px",
      }}
    >
      <div style={styles.overlay} />
      <div style={{ position: "absolute", top: "max(14px, env(safe-area-inset-top))", right: 12, zIndex: 10 }}>
        <button
          onClick={onLegalClick}
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(0,0,0,0.4)",
            color: "white",
            padding: isMobile ? "8px 12px" : "8px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: isMobile ? 12 : 13,
            fontWeight: 600,
            backdropFilter: "blur(8px)",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => (e.target.style.background = "rgba(255,255,255,0.12)")}
          onMouseLeave={(e) => (e.target.style.background = "rgba(0,0,0,0.4)")}
        >
          Legal
        </button>
      </div>
      <div
        style={{
          ...styles.shell,
          gridTemplateColumns: isTablet ? "1fr" : "1.2fr 0.8fr",
          gap: isMobile ? "14px" : "24px",
        }}
      >
        <div style={{ ...styles.card, padding: isMobile ? "16px" : "28px" }}>
          <div style={styles.label}>D20Masters</div>
          <h1 style={{ ...styles.heading, fontSize: isMobile ? "34px" : isTablet ? "42px" : "52px" }}>D20Masters</h1>
          <p style={{ ...styles.subtle, maxWidth: 560, marginTop: 0 }}>
            Roll a 20-sided die and switch the dice color and background instantly.
          </p>

          <div style={styles.center}>
            <div
              style={{
                width: diceSize,
                height: diceSize,
                transition: "transform 0.2s ease",
                transform: rolling ? "scale(1.05)" : "scale(1)",
                filter: glow,
              }}
            >
              <svg
                viewBox="0 0 200 200"
                style={{
                  width: "100%",
                  height: "100%",
                  animation: rolling ? "spin 0.7s linear infinite" : "none",
                }}
              >
                <polygon
                  points="100,10 185,60 160,165 40,165 15,60"
                  fill={selectedColor}
                  stroke="#e5e7eb"
                  strokeWidth="6"
                  strokeLinejoin="round"
                />
                <polygon
                  points="100,25 165,63 145,150 55,150 35,63"
                  fill="rgba(255,255,255,0.08)"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <text
                  x="100"
                  y="112"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ffffff"
                  fontSize="56"
                  fontWeight="bold"
                  fontFamily="Arial, sans-serif"
                >
                  {roll}
                </text>
              </svg>
            </div>

            <button
              onClick={handleRoll}
              disabled={rolling}
              style={{
                ...styles.button(selectedColor, rolling),
                width: isMobile ? "100%" : "auto",
                fontSize: isMobile ? 16 : 18,
                padding: isMobile ? "14px 18px" : "16px 32px",
              }}
            >
              {rolling ? "Rolling..." : "Roll D20"}
            </button>
          </div>
        </div>

        <div style={{ ...styles.card, padding: isMobile ? "16px" : "28px" }}>
          <div>
            <h2 style={{ ...styles.sectionTitle, fontSize: isMobile ? "22px" : "28px" }}>Dice Color</h2>
            <div style={{ ...styles.grid2, gridTemplateColumns: isMobile ? "1fr" : styles.grid2.gridTemplateColumns }}>
              {colorOptions.map((color) => {
                const active = selectedColor === color.value;
                return (
                  <button key={color.value} onClick={() => setSelectedColor(color.value)} style={styles.option(active)}>
                    <span style={{ ...styles.chip, background: color.value }} />
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{color.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <h2 style={{ ...styles.sectionTitle, fontSize: isMobile ? "22px" : "28px" }}>Background Theme</h2>
            <div style={{ ...styles.grid2, gridTemplateColumns: isMobile ? "1fr" : styles.grid2.gridTemplateColumns }}>
              {backgroundOptions.map((bg) => {
                const active = selectedBackground.value === bg.value;
                return (
                  <button key={bg.value} onClick={() => setSelectedBackground(bg)} style={styles.bgOption(active)}>
                    <div style={styles.thumb(bg.image)} />
                    <div style={{ padding: "10px 12px", fontSize: 14, fontWeight: 600 }}>{bg.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <h2 style={{ ...styles.sectionTitle, fontSize: isMobile ? "22px" : "28px" }}>Last Rolls</h2>
            <div style={{ ...styles.grid4, gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : styles.grid4.gridTemplateColumns }}>
              {history.map((value, index) => (
                <div key={`${value}-${index}`} style={styles.historyCard}>
                  <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#cbd5e1" }}>#{index + 1}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28, ...styles.footerBox }}>Use for various games such as D&D</div>
        </div>
      </div>

      <a
        href="https://buymeacoffee.com/ghostbyte"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          right: isMobile ? 12 : 18,
          bottom: isMobile ? "max(12px, env(safe-area-inset-bottom))" : "max(18px, env(safe-area-inset-bottom))",
          zIndex: 30,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          borderRadius: 999,
          padding: isMobile ? "10px 14px" : "12px 18px",
          background: "#f59e0b",
          color: "#111827",
          border: "2px solid rgba(255,255,255,0.55)",
          textDecoration: "none",
          fontWeight: 800,
          fontSize: isMobile ? 13 : 15,
          boxShadow: "0 12px 28px rgba(0,0,0,0.45)",
        }}
      >
        Buy Me a Coffee
      </a>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
