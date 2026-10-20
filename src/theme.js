export const themes = [
  {
    name: "sage",
    background: "#f5f6ef",
    accent: "#596d45",
    deep: "#435532",
    soft: "#e9efdf",
    border: "#cbd6bf",
  },
  {
    name: "powder-blue",
    background: "#f1f5f8",
    accent: "#506b7c",
    deep: "#3d5667",
    soft: "#e4edf3",
    border: "#c6d7e2",
  },
  {
    name: "lilac",
    background: "#f7f2f7",
    accent: "#756078",
    deep: "#5d4861",
    soft: "#eee5f0",
    border: "#dacbdd",
  },
  {
    name: "peach",
    background: "#faf4ef",
    accent: "#89654e",
    deep: "#704d39",
    soft: "#f3e6dc",
    border: "#e2cdbd",
  },
  {
    name: "butter",
    background: "#faf7eb",
    accent: "#6d7045",
    deep: "#54582e",
    soft: "#f0eed8",
    border: "#dcd8b6",
  },
];
export function applyTheme() {
  let previous;
  try {
    previous = sessionStorage.getItem("matchaccino-theme");
  } catch {}
  const choices = themes.filter((theme) => theme.name !== previous);
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const theme = choices[bytes[0] % choices.length];
  const root = document.documentElement;
  root.dataset.theme = theme.name;
  for (const [key, value] of Object.entries(theme))
    if (key !== "name") root.style.setProperty(`--theme-${key}`, value);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.background);
  try {
    sessionStorage.setItem("matchaccino-theme", theme.name);
  } catch {}
  return theme;
}
