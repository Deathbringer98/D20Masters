import React, { useState } from "react";
import D20DiceRoller from "./D20DiceRoller";
import Legal from "./Legal";
import "./styles.css";

export default function App() {
  const [showLegal, setShowLegal] = useState(false);

  return showLegal ? (
    <Legal onBack={() => setShowLegal(false)} />
  ) : (
    <D20DiceRoller onLegalClick={() => setShowLegal(true)} />
  );
}
