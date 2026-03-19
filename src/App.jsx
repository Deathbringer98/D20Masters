import React, { useCallback, useEffect, useState } from "react";
import D20DiceRoller from "./D20DiceRoller";
import MTGLifeTracker from "./MTGLifeTracker";
import Legal from "./Legal";
import DungeonRollMiniGame from "./DungeonRollMiniGame";
import "./styles.css";

const PAGE_TO_PATH = {
  home: "/",
  mtg: "/mtg-life",
  legal: "/legal",
  "dungeon-roll": "/dungeon-roll",
};

function getGithubPagesBasePath() {
  if (typeof window === "undefined") return "";

  const isProjectPages =
    window.location.hostname.endsWith("github.io") &&
    window.location.pathname.split("/").filter(Boolean).length > 0;

  if (!isProjectPages) return "";

  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  return firstSegment ? `/${firstSegment}` : "";
}

function withBase(pathname) {
  const basePath = getGithubPagesBasePath();
  if (!basePath) return pathname;
  return pathname === "/" ? `${basePath}/` : `${basePath}${pathname}`;
}

function stripBase(pathname) {
  const basePath = getGithubPagesBasePath();
  if (!basePath) return pathname;

  if (pathname === basePath || pathname === `${basePath}/`) return "/";
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || "/";
  }

  return pathname;
}

function pageFromLocation() {
  if (typeof window === "undefined") return "home";

  const params = new URLSearchParams(window.location.search || "");
  const redirectedPath = params.get("p");
  if (redirectedPath) {
    const nextPath = redirectedPath.startsWith("/")
      ? redirectedPath
      : `/${redirectedPath}`;
    const normalizedNextPath = stripBase(nextPath);
    const nextUrl = `${withBase(normalizedNextPath)}${window.location.hash || ""}`;
    window.history.replaceState({ page: "home" }, "", nextUrl);
  }

  const normalizedPath = (stripBase(window.location.pathname || "/") || "/")
    .toLowerCase()
    .replace(/\/+$/, "") || "/";
  const normalizedHash = (window.location.hash || "").toLowerCase();

  if (normalizedPath.endsWith("/dungeon-roll") || normalizedHash === "#/dungeon-roll") {
    return "dungeon-roll";
  }
  if (normalizedPath.endsWith("/mtg-life") || normalizedHash === "#/mtg-life") {
    return "mtg";
  }
  if (normalizedPath.endsWith("/legal") || normalizedHash === "#/legal") {
    return "legal";
  }

  return "home";
}

export default function App() {
  const [page, setPage] = useState(pageFromLocation); // "home" | "mtg" | "legal" | "dungeon-roll"

  const setPageAndPath = useCallback((nextPage, options = {}) => {
    const { replace = false } = options;
    setPage(nextPage);

    if (typeof window === "undefined") return;

    const targetPath = withBase(PAGE_TO_PATH[nextPage] || "/");
    const targetUrl = `${targetPath}${window.location.search}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (targetUrl === currentUrl) return;

    const state = { page: nextPage };
    if (replace) window.history.replaceState(state, "", targetUrl);
    else window.history.pushState(state, "", targetUrl);
  }, []);

  useEffect(() => {
    function syncPageWithLocation() {
      setPage(pageFromLocation());
    }

    window.addEventListener("popstate", syncPageWithLocation);
    window.addEventListener("hashchange", syncPageWithLocation);
    return () => {
      window.removeEventListener("popstate", syncPageWithLocation);
      window.removeEventListener("hashchange", syncPageWithLocation);
    };
  }, []);

  if (page === "legal") return <Legal onBack={() => setPageAndPath("home")} />;
  if (page === "mtg") return <MTGLifeTracker onBack={() => setPageAndPath("home")} />;
  if (page === "dungeon-roll") {
    return <DungeonRollMiniGame onBack={() => setPageAndPath("home")} />;
  }

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
          onClick={() => setPageAndPath("home")}
          style={tabBtn(page === "home")}
        >
          🎲 D20 Roller
        </button>
        <button
          onClick={() => setPageAndPath("mtg")}
          style={tabBtn(page === "mtg")}
        >
          ⚔️ MTG Life
        </button>
        <button
          onClick={() => setPageAndPath("dungeon-roll")}
          style={tabBtn(page === "dungeon-roll")}
        >
          Dungeon Roll (mini-game)
        </button>
      </div>
      <D20DiceRoller onLegalClick={() => setPageAndPath("legal")} />
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
