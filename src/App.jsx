import React, { useState } from "react";
import D20DiceRoller from "./D20DiceRoller";
import MTGLifeTracker from "./MTGLifeTracker";
import Legal from "./Legal";
import "./styles.css";

export default function App() {
  const [page, setPage] = useState("home"); // "home" | "mtg" | "legal"

  if (page === "legal") return <Legal onBack={() => setPage("home")} />;
  if (page === "mtg") return <MTGLifeTracker onBack={() => setPage("home")} />;

  return (
    <>
      {/* Page-switcher tab bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(10,5,20,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => setPage("home")}
          style={tabBtn(true)}
        >
          🎲 D20 Roller
        </button>
        <button
          onClick={() => setPage("mtg")}
          style={tabBtn(false)}
        >
          ⚔️ MTG Life
        </button>
      </div>
      <D20DiceRoller onLegalClick={() => setPage("legal")} />
    </>
  );
}

function tabBtn(active) {
  return {
    flex: 1,
    border: "none",
    background: active ? "rgba(255,255,255,0.1)" : "transparent",
    color: active ? "#fbbf24" : "#94a3b8",
    fontSize: "14px",
    fontWeight: 700,
    padding: "14px 0 calc(14px + env(safe-area-inset-bottom, 0px))",
    cursor: "pointer",
    letterSpacing: "0.04em",
    borderTop: active ? "2px solid #fbbf24" : "2px solid transparent",
    transition: "all 0.2s",
  };
}
