import { useStore } from '../store/useStore'
import { THEMES, FONT_SCALES } from './themes'

export function useTheme() {
  const themeKey = useStore((s) => s.theme) || 'dark'
  const fontScale = useStore((s) => s.fontScale) || 'md'
  const colors = THEMES[themeKey] || THEMES.dark
  const fontSize = FONT_SCALES[fontScale] || 16
  return { colors, fontSize, themeKey, fontScale }
}
