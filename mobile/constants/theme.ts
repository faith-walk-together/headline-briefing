import { Platform } from 'react-native';

const tintColorLight = '#2563EB'; // primary blue
const tintColorDark = '#3B82F6';

export const Colors = {
  light: {
    text: '#111827',
    subtext: '#6B7280',
    background: '#F9FAFB',
    card: '#FFFFFF',
    border: '#E5E7EB',
    tint: tintColorLight,
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    primary: tintColorLight,
  },
  dark: {
    text: '#F9FAFB',
    subtext: '#9CA3AF',
    background: '#121212',
    card: '#1E1E1E',
    border: '#374151',
    tint: tintColorDark,
    icon: '#D1D5DB',
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorDark,
    primary: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
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
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
