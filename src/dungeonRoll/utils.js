export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function coordKey(x, y) {
  return `${x},${y}`;
}

export function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pickRandom(list) {
  return list[rand(0, list.length - 1)];
}

export function getGithubPagesBasePath() {
  if (typeof window === "undefined") return "";

  const pathSegments = (window.location.pathname || "/")
    .split("/")
    .filter(Boolean);
  const isProjectPages =
    window.location.hostname.endsWith("github.io") && pathSegments.length > 0;

  if (!isProjectPages) return "";
  return `/${pathSegments[0]}`;
}

export function getAssetUrl(fileName) {
  return getAssetUrlCandidates(fileName)[0];
}

export function getAssetUrlCandidates(fileName) {
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