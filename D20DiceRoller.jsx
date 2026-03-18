import React, { useMemo, useState } from "react";

export default function D20DiceRoller() {
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

  const glow = useMemo(() => `${selectedColor}55`, [selectedColor]);

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

  return (
    <div style={{ backgroundImage: `url(${selectedBackground.image})`, minHeight: "100vh", color: "white" }}>
      <h1>D20Masters</h1>
      <h2>{roll}</h2>
      <button onClick={handleRoll}>Roll</button>
    </div>
  );
}

export { default as LegalPages } from "./LegalPages";
