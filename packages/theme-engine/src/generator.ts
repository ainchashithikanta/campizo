import { GLOBAL_DESIGN_TOKENS } from './tokens.js';
import { MODULE_ACCENTS, type CollegeBranding, type ThemeMode, type ResolvedTheme } from './types.js';

export function resolveTheme(college: CollegeBranding, mode: ThemeMode = 'light', moduleName?: string): ResolvedTheme {
  const baseColors = mode === 'dark' ? GLOBAL_DESIGN_TOKENS.darkColors : GLOBAL_DESIGN_TOKENS.colors;
  const moduleAccent =
    moduleName && MODULE_ACCENTS[moduleName]
      ? MODULE_ACCENTS[moduleName]
      : { accentColor: college.primaryColor, badgeBg: college.secondaryColor };

  const effectivePrimary = college.primaryColor || baseColors.primary;
  const effectiveSecondary = college.secondaryColor || baseColors.secondary;

  return {
    mode,
    college,
    moduleName,
    colors: {
      primary: effectivePrimary,
      secondary: effectiveSecondary,
      background: baseColors.background,
      surface: baseColors.surface,
      text: baseColors.text,
      textMuted: baseColors.textMuted,
      border: baseColors.border,
      accent: moduleAccent.accentColor,
      badgeBg: moduleAccent.badgeBg
    },
    tokens: GLOBAL_DESIGN_TOKENS
  };
}

export function generateCssVariables(resolvedTheme: ResolvedTheme): string {
  const { colors } = resolvedTheme;
  const t = GLOBAL_DESIGN_TOKENS;

  return `
    :root {
      /* College Branding & Module Theme Accents */
      --ch-color-primary: ${colors.primary};
      --ch-color-secondary: ${colors.secondary};
      --ch-color-background: ${colors.background};
      --ch-color-surface: ${colors.surface};
      --ch-color-text: ${colors.text};
      --ch-color-text-muted: ${colors.textMuted};
      --ch-color-border: ${colors.border};
      --ch-color-accent: ${colors.accent};
      --ch-color-badge-bg: ${colors.badgeBg};

      /* Typography Tokens */
      --ch-font-sans: ${t.typography.fontFamilies.sans};
      --ch-font-mono: ${t.typography.fontFamilies.mono};

      /* Spacing Tokens */
      --ch-spacing-1: ${t.spacing['1']};
      --ch-spacing-2: ${t.spacing['2']};
      --ch-spacing-3: ${t.spacing['3']};
      --ch-spacing-4: ${t.spacing['4']};
      --ch-spacing-6: ${t.spacing['6']};
      --ch-spacing-8: ${t.spacing['8']};

      /* Border Radius */
      --ch-radius-sm: ${t.radius.sm};
      --ch-radius-md: ${t.radius.md};
      --ch-radius-lg: ${t.radius.lg};
      --ch-radius-full: ${t.radius.full};

      /* Shadows & Motion */
      --ch-shadow-glass: ${t.shadows.glassmorphism};
      --ch-motion-duration: ${t.motion.durationNormal};
    }
  `.trim();
}

/**
 * Calculates WCAG 2.1 relative luminance and contrast ratio between two HEX colors.
 * Returns ratio e.g. 7.2 (Passes WCAG AA if >= 4.5)
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string) => {
    let rgb = hex.replace('#', '');
    if (rgb.length === 3)
      rgb = rgb
        .split('')
        .map((c) => c + c)
        .join('');
    const r = parseInt(rgb.substring(0, 2), 16) / 255;
    const g = parseInt(rgb.substring(2, 4), 16) / 255;
    const b = parseInt(rgb.substring(4, 6), 16) / 255;

    const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * (a[0] || 0) + 0.7152 * (a[1] || 0) + 0.0722 * (a[2] || 0);
  };

  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}
