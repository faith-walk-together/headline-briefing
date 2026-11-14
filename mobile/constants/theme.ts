import { Platform } from 'react-native';

// Magazine Paper (Light) & Magazine Dark palettes (auto-synced with device OS theme)
const tintColorLight = '#1C1917'; // Deep editorial ink
const tintColorDark = '#FBBF24';  // Warm magazine amber

export const Colors = {
  light: {
    text: '#1C1917',           // Stone 900
    subtext: '#57534E',        // Stone 600
    background: '#F6F2EA',     // Warm Magazine Paper
    chrome: '#EFECE4',         // Header / TabBar warm stone
    card: '#FAF8F4',           // Elevated paper surface
    modal: '#FAF7F2',          // Reader bottom-sheet surface
    border: '#D6D3CD',         // Editorial rule border
    divider: '#E5E0D8',        // Section divider
    tint: tintColorLight,
    accent: '#92400E',         // Editorial amber-brown
    icon: '#57534E',
    tabIconDefault: '#A8A29E',
    tabIconSelected: tintColorLight,
    primary: tintColorLight,
    bull: '#DC2626',           // 호재 (Red)
    bullBg: '#FEF2F2',
    bear: '#2563EB',           // 악재 (Blue)
    bearBg: '#EFF6FF',
  },
  dark: {
    text: '#F4F4F5',           // Zinc 100
    subtext: '#A1A1AA',        // Zinc 400
    background: '#09090B',     // Deep Zinc 950
    chrome: '#121215',         // Header / TabBar dark surface
    card: '#18181B',           // Zinc 900
    modal: '#18181B',          // Reader bottom-sheet surface
    border: '#27272A',         // Zinc 800
    divider: '#18181B',        // Section divider
    tint: tintColorDark,
    accent: '#FBBF24',         // Amber 400
    icon: '#A1A1AA',
    tabIconDefault: '#52525B',
    tabIconSelected: tintColorDark,
    primary: tintColorDark,
    bull: '#F87171',           // 호재 (Red 400)
    bullBg: 'rgba(239, 68, 68, 0.16)',
    bear: '#60A5FA',           // 악재 (Blue 400)
    bearBg: 'rgba(59, 130, 246, 0.16)',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'Georgia',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Noto Serif KR', 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
