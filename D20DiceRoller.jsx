import React, { useState } from "react";

export default function D20DiceRoller() {
  const [showLegal, setShowLegal] = useState(false);

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
    { name: "Dark Forest", image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=2000&q=80" },
    { name: "Deep Space", image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=2000&q=80" },
    { name: "Underwater", image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=2000&q=80" },
    { name: "Desert Valley", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=80" },
    { name: "Ocean Surface", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80" },
    { name: "Mystic Cabin", image: "https://images.unsplash.com/photo-1482192505345-5655af888cc4?auto=format&fit=crop&w=2000&q=80" },
  ];

  const [selectedColor, setSelectedColor] = useState(colorOptions[0].value);
  const [selectedBackground, setSelectedBackground] = useState(backgroundOptions[0]);
  const [roll, setRoll] = useState(20);
  const [rolling, setRolling] = useState(false);

  function randomD20() {
    return Math.floor(Math.random() * 20) + 1;
  }

  function handleRoll() {
    if (rolling) return;
    setRolling(true);
    setTimeout(() => {
      setRoll(randomD20());
      setRolling(false);
    }, 800);
  }

  if (showLegal) {
    return (
      <div>
        <LegalPages />
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}>
          <button
            onClick={() => setShowLegal(false)}
            className="nav-btn"
            style={{ padding: "10px 20px" }}
          >
            Back to Roller
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="dice-roller"
      style={{ backgroundImage: `url(${selectedBackground.image})` }}
    >
      <div className="header">
        <h1 className="title">D20Masters</h1>
        <div className="nav-buttons">
          <button className="nav-btn" onClick={() => setShowLegal(true)}>
            Legal
          </button>
        </div>
      </div>

      <div className="dice-container">
        <div className={`dice-display ${rolling ? "rolling" : ""}`}>{roll}</div>
        <button className="roll-button" onClick={handleRoll} disabled={rolling}>
          {rolling ? "Rolling..." : "Roll D20"}
        </button>
      </div>

      <div className="customization">
        <div className="customization-row">
          <label className="customization-label">Dice Color</label>
          <div className="color-options">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                className={`color-button ${selectedColor === option.value ? "active" : ""}`}
                style={{ backgroundColor: option.value }}
                onClick={() => setSelectedColor(option.value)}
                title={option.name}
              />
            ))}
          </div>
        </div>

        <div className="customization-row">
          <label className="customization-label">Background</label>
          <div className="background-select">
            {backgroundOptions.map((option) => (
              <button
                key={option.name}
                className={`bg-option ${selectedBackground.name === option.name ? "active" : ""}`}
                style={{ backgroundImage: `url(${option.image})` }}
                onClick={() => setSelectedBackground(option)}
                title={option.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { default as LegalPages } from "./LegalPages";
