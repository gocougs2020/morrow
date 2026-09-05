import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, themeInitScript } from "@/lib/theme-script";

afterEach(() => {
  vi.unstubAllGlobals();
});

function runThemeInit(options: { stored: string | null; prefersDark?: boolean }) {
  const root = {
    classList: { remove: vi.fn(), add: vi.fn() },
    style: { colorScheme: "" },
  };

  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("localStorage", { getItem: (key: string) => {
    expect(key).toBe(THEME_STORAGE_KEY);
    return options.stored;
  } });
  vi.stubGlobal("window", {
    matchMedia: (query: string) => {
      expect(query).toBe("(prefers-color-scheme: dark)");
      return { matches: Boolean(options.prefersDark) };
    },
  });

  const run = new Function(themeInitScript) as () => void;
  run();
  return root;
}

describe("themeInitScript", () => {
  it("applies a stored light or dark theme", () => {
    const root = runThemeInit({ stored: "dark" });
    expect(root.classList.remove).toHaveBeenCalledWith("light", "dark");
    expect(root.classList.add).toHaveBeenCalledWith("dark");
    expect(root.style.colorScheme).toBe("dark");
  });

  it("resolves the system preference when no theme is stored", () => {
    const root = runThemeInit({ stored: null, prefersDark: true });
    expect(root.classList.add).toHaveBeenCalledWith("dark");
    expect(root.style.colorScheme).toBe("dark");
  });
});
