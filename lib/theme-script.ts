export const THEME_STORAGE_KEY = "theme";

/** Blocking FOUC script. Keep the storage key in sync with ThemeProvider. */
export const themeInitScript = `(function(){try{var stored=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||"system";var theme=stored==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light":stored;var root=document.documentElement;root.classList.remove("light","dark");root.classList.add(theme);if(theme==="light"||theme==="dark")root.style.colorScheme=theme}catch(e){}})();`;
