import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1033',
    background: '#F5F3FF',
    card: '#FFFFFF',
    tint: '#7C3AED',
    icon: '#8B7DB5',
    tabIconDefault: '#8B7DB5',
    tabIconSelected: '#7C3AED',
    accent: '#F59E0B',
    success: '#10B981',
    danger: '#EF4444',
    info: '#3B82F6',
    border: '#E5E7EB',
    subtext: '#6B7280',
  },
  dark: {
    text: '#F3F0FF',
    background: '#1A1030',
    card: '#2D2050',
    tint: '#A78BFA',
    icon: '#8B7DB5',
    tabIconDefault: '#8B7DB5',
    tabIconSelected: '#A78BFA',
    accent: '#F59E0B',
    success: '#34D399',
    danger: '#F87171',
    info: '#60A5FA',
    border: '#3D3060',
    subtext: '#9CA3AF',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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
