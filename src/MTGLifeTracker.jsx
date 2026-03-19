import React, { useState, useCallback } from "react";

const PRESET_STARTS = [20, 40];

// ─── tiny helpers ────────────────────────────────────────────────────────────
function clamp(v) {
  return Math.max(-999, Math.min(9999, v));
}

// ─── sub-component: a single life / damage counter ───────────────────────────
function Counter({ counter, onChange, onRemove, flipped, isMain }) {
  const big = isMain;

  const adjust = (delta) => onChange({ ...counter, value: clamp(counter.value + delta) });

  const containerStyle = {
    background: isMain ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.28)",
    border: isMain
      ? "1px solid rgba(255,215,0,0.35)"
      : "1px solid rgba(255,255,255,0.1)",
    borderRadius: "20px",
    padding: isMain ? "16px 12px 12px" : "10px 10px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: isMain ? "8px" : "6px",
    position: "relative",
    minWidth: 0,
  };

  const labelStyle = {
    fontSize: isMain ? "11px" : "10px",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: isMain ? "#fbbf24" : "#94a3b8",
    fontWeight: 700,
    textAlign: "center",
  };

  const valueStyle = {
    fontSize: isMain ? "clamp(52px,10vw,80px)" : "clamp(28px,5vw,40px)",
    fontWeight: 900,
    lineHeight: 1,
    color: counter.value <= 0 && isMain ? "#ef4444" : "#fff",
    transition: "color 0.3s",
    fontVariantNumeric: "tabular-nums",
  };

  const btnRow = {
    display: "flex",
    gap: isMain ? "8px" : "6px",
  };

  const btn = (color, small = false) => ({
    border: "none",
    borderRadius: "12px",
    background: color,
    color: "#fff",
    fontWeight: 800,
    fontSize: small ? "14px" : (isMain ? "20px" : "15px"),
    padding: small
      ? "4px 10px"
      : isMain
      ? "10px 18px"
      : "6px 14px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "manipulation",
    minWidth: small ? 36 : (isMain ? 52 : 40),
  });

  return (
    <div style={containerStyle}>
      {!isMain && onRemove && (
        <button
          onClick={onRemove}
          style={{
            position: "absolute",
            top: "6px",
            right: "8px",
            background: "rgba(239,68,68,0.18)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: "8px",
            color: "#f87171",
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 7px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      )}

      <div style={labelStyle}>{counter.label}</div>
      <div style={valueStyle}>{counter.value}</div>

      {/* quick +/- big steps for main life */}
      {isMain && (
        <div style={{ display: "flex", gap: "8px", marginBottom: "2px" }}>
          <button style={btn("rgba(239,68,68,0.75)", true)} onClick={() => adjust(-5)}>−5</button>
          <button style={btn("rgba(239,68,68,0.75)")} onClick={() => adjust(-1)}>−1</button>
          <button style={btn("rgba(34,197,94,0.75)")} onClick={() => adjust(+1)}>+1</button>
          <button style={btn("rgba(34,197,94,0.75)", true)} onClick={() => adjust(+5)}>+5</button>
        </div>
      )}

      {!isMain && (
        <div style={btnRow}>
          <button style={btn("rgba(239,68,68,0.65)")} onClick={() => adjust(-1)}>−</button>
          <button style={btn("rgba(34,197,94,0.65)")} onClick={() => adjust(+1)}>+</button>
        </div>
      )}
    </div>
  );
}

// ─── sub-component: one player's panel ───────────────────────────────────────
function PlayerPanel({ player, onUpdate, flipped }) {
  const updateCounter = (idx, updated) => {
    const counters = player.counters.map((c, i) => (i === idx ? updated : c));
    onUpdate({ ...player, counters });
  };

  const removeCounter = (idx) => {
    onUpdate({ ...player, counters: player.counters.filter((_, i) => i !== idx) });
  };

  const addCounter = () => {
    const labels = ["Commander Dmg", "Poison", "Energy", "Experience", "Custom"];
    const used = player.counters.map((c) => c.label);
    const next = labels.find((l) => !used.includes(l)) || "Custom";
    onUpdate({
      ...player,
      counters: [...player.counters, { label: next, value: 0, id: Date.now() }],
    });
  };

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(player.name);

  const commitName = () => {
    onUpdate({ ...player, name: nameInput.trim() || player.name });
    setEditingName(false);
  };

  const panelStyle = {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    transform: flipped ? "rotate(180deg)" : "none",
    padding: "12px 8px",
  };

  const nameStyle = {
    textAlign: "center",
    fontSize: "15px",
    fontWeight: 700,
    color: "#e2e8f0",
    letterSpacing: "0.08em",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "8px",
    border: editingName ? "1px solid rgba(251,191,36,0.6)" : "1px solid transparent",
    background: editingName ? "rgba(0,0,0,0.4)" : "transparent",
    outline: "none",
    width: "100%",
    color: "#fbbf24",
  };

  const addBtnStyle = {
    border: "1px dashed rgba(255,255,255,0.25)",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.04)",
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: 600,
    padding: "8px 0",
    cursor: "pointer",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    width: "100%",
    transition: "all 0.2s",
  };

  const mainCounter = player.counters[0];
  const extraCounters = player.counters.slice(1);

  return (
    <div style={panelStyle}>
      {/* Player name */}
      {editingName ? (
        <input
          autoFocus
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === "Enter" && commitName()}
          style={nameStyle}
        />
      ) : (
        <div style={nameStyle} onClick={() => { setEditingName(true); setNameInput(player.name); }}>
          {player.name} ✎
        </div>
      )}

      {/* Main life counter */}
      <Counter
        counter={mainCounter}
        onChange={(u) => updateCounter(0, u)}
        isMain={true}
        flipped={flipped}
      />

      {/* Extra counters */}
      {extraCounters.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: extraCounters.length >= 2 ? "1fr 1fr" : "1fr", gap: "8px" }}>
          {extraCounters.map((c, i) => (
            <Counter
              key={c.id}
              counter={c}
              onChange={(u) => updateCounter(i + 1, u)}
              onRemove={() => removeCounter(i + 1)}
              isMain={false}
              flipped={flipped}
            />
          ))}
        </div>
      )}

      {/* Add counter button */}
      <button
        style={addBtnStyle}
        onClick={addCounter}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#e2e8f0"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#94a3b8"; }}
      >
        + Add Counter
      </button>
    </div>
  );
}

// ─── helper to build a fresh player ──────────────────────────────────────────
function makePlayer(name, startLife) {
  return {
    id: Date.now() + Math.random(),
    name,
    counters: [{ label: "Life", value: startLife, id: 1 }],
  };
}

// ─── main exported component ─────────────────────────────────────────────────
export default function MTGLifeTracker({ onBack }) {
  const [startLife, setStartLife] = useState(20);
  const [players, setPlayers] = useState(() => [
    makePlayer("Player 1", 20),
    makePlayer("Player 2", 20),
  ]);
  const [flipped, setFlipped] = useState(true); // player 2 flipped for face-to-face
  const [confirmReset, setConfirmReset] = useState(false);

  const updatePlayer = useCallback((idx, updated) => {
    setPlayers((prev) => prev.map((p, i) => (i === idx ? updated : p)));
  }, []);

  const addPlayer = (side) => {
    // side: "left" adds after last odd, "right" adds after last even – we just push to end of that side
    const name = `Player ${players.length + 1}`;
    setPlayers((prev) => {
      if (side === "left") {
        // Insert after the last left player (even indices: 0,2,4…)
        const insertAt = prev.reduce((acc, _, i) => (i % 2 === 0 ? i + 1 : acc), 1);
        const next = [...prev];
        next.splice(insertAt, 0, makePlayer(name, startLife));
        return next;
      } else {
        // Insert after the last right player (odd indices: 1,3,5…)
        const insertAt = prev.reduce((acc, _, i) => (i % 2 !== 0 ? i + 1 : acc), 2);
        const next = [...prev];
        next.splice(Math.min(insertAt, next.length), 0, makePlayer(name, startLife));
        return next;
      }
    });
  };

  const removePlayer = (idx) => {
    if (players.length <= 2) return;
    setPlayers((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetAll = () => {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        counters: p.counters.map((c, i) =>
          i === 0 ? { ...c, value: startLife } : { ...c, value: 0 }
        ),
      }))
    );
    setConfirmReset(false);
  };

  const handleStartLifeChange = (v) => {
    setStartLife(v);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        counters: p.counters.map((c, i) => (i === 0 ? { ...c, value: v } : c)),
      }))
    );
  };

  // Split players into left column (even indices) and right column (odd indices)
  const leftPlayers = players.filter((_, i) => i % 2 === 0);
  const rightPlayers = players.filter((_, i) => i % 2 !== 0);

  const bg = "linear-gradient(135deg, #0f0c29 0%, #1a0a2e 50%, #0d1b2a 100%)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg,
        color: "#fff",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,215,0,0.15)",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "10px",
            color: "#cbd5e1",
            fontSize: "13px",
            fontWeight: 600,
            padding: "7px 14px",
            cursor: "pointer",
          }}
        >
          ← D20
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8", letterSpacing: "0.15em", textTransform: "uppercase" }}>Start</span>
          {PRESET_STARTS.map((v) => (
            <button
              key={v}
              onClick={() => handleStartLifeChange(v)}
              style={{
                background: startLife === v ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.06)",
                border: startLife === v ? "1px solid rgba(251,191,36,0.7)" : "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                color: startLife === v ? "#fbbf24" : "#cbd5e1",
                fontSize: "13px",
                fontWeight: 700,
                padding: "6px 14px",
                cursor: "pointer",
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setFlipped((f) => !f)}
            title="Toggle P2 flip for face-to-face play"
            style={{
              background: flipped ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.06)",
              border: flipped ? "1px solid rgba(251,191,36,0.5)" : "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px",
              color: flipped ? "#fbbf24" : "#94a3b8",
              fontSize: "13px",
              fontWeight: 600,
              padding: "7px 12px",
              cursor: "pointer",
            }}
          >
            ⇅ Flip
          </button>

          {confirmReset ? (
            <>
              <button
                onClick={resetAll}
                style={{ background: "rgba(239,68,68,0.7)", border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, padding: "7px 14px", cursor: "pointer" }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "10px", color: "#cbd5e1", fontSize: "13px", fontWeight: 600, padding: "7px 12px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.35)",
                borderRadius: "10px",
                color: "#f87171",
                fontSize: "13px",
                fontWeight: 600,
                padding: "7px 14px",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Title ── */}
      <div style={{ textAlign: "center", padding: "14px 16px 4px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.3em", textTransform: "uppercase", color: "#fbbf24", marginBottom: "2px" }}>MTG Life Tracker</div>
      </div>

      {/* ── Player grid ── */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0",
          padding: "0 4px 80px",
        }}
      >
        {/* Left column */}
        <div
          style={{
            borderRight: "1px solid rgba(255,215,0,0.12)",
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
        >
          {leftPlayers.map((p, localIdx) => {
            const globalIdx = localIdx * 2;
            return (
              <div
                key={p.id}
                style={{
                  borderBottom: localIdx < leftPlayers.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  position: "relative",
                }}
              >
                <PlayerPanel
                  player={p}
                  onUpdate={(updated) => updatePlayer(globalIdx, updated)}
                  flipped={false}
                />
                {players.length > 2 && (
                  <button
                    onClick={() => removePlayer(globalIdx)}
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      right: "10px",
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      borderRadius: "8px",
                      color: "#f87171",
                      fontSize: "11px",
                      padding: "3px 8px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}

          {/* Add player to left */}
          <button
            onClick={() => addPlayer("left")}
            style={{
              margin: "8px",
              border: "1px dashed rgba(251,191,36,0.3)",
              borderRadius: "14px",
              background: "transparent",
              color: "#78716c",
              fontSize: "12px",
              fontWeight: 600,
              padding: "10px 0",
              cursor: "pointer",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            + Add Player
          </button>
        </div>

        {/* Right column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0",
          }}
        >
          {rightPlayers.map((p, localIdx) => {
            const globalIdx = localIdx * 2 + 1;
            return (
              <div
                key={p.id}
                style={{
                  borderBottom: localIdx < rightPlayers.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  position: "relative",
                }}
              >
                <PlayerPanel
                  player={p}
                  onUpdate={(updated) => updatePlayer(globalIdx, updated)}
                  flipped={flipped}
                />
                {players.length > 2 && (
                  <button
                    onClick={() => removePlayer(globalIdx)}
                    style={{
                      position: "absolute",
                      bottom: flipped ? "unset" : "12px",
                      top: flipped ? "12px" : "unset",
                      right: "10px",
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      borderRadius: "8px",
                      color: "#f87171",
                      fontSize: "11px",
                      padding: "3px 8px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}

          {/* Add player to right */}
          <button
            onClick={() => addPlayer("right")}
            style={{
              margin: "8px",
              border: "1px dashed rgba(251,191,36,0.3)",
              borderRadius: "14px",
              background: "transparent",
              color: "#78716c",
              fontSize: "12px",
              fontWeight: 600,
              padding: "10px 0",
              cursor: "pointer",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            + Add Player
          </button>
        </div>
      </div>
    </div>
  );
}
