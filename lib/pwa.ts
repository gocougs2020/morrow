/** Light/dark colors matching `app/globals.css` `--background`. */
export const pwaThemeColor = {
  light: "#f7f7f7",
  dark: "#171717",
} as const;

export const pwaIconSizes = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "512-maskable": { size: 512, maskable: true },
} as const;

export type PwaIconSize = keyof typeof pwaIconSizes;

export function isPwaIconSize(value: string): value is PwaIconSize {
  return value in pwaIconSizes;
}
