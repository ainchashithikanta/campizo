import { describe, it, expect } from 'vitest';
import {
  resolveTheme,
  generateCssVariables,
  calculateContrastRatio,
  CollegeBrandingSchema,
  type CollegeBranding
} from '../src/index.js';

describe('Multi-Tenant Theme Engine & Design System', () => {
  const stanfordBranding: CollegeBranding = {
    primaryColor: '#8C1515',
    secondaryColor: '#000000',
    logoUrl: 'https://stanford.edu/logo.png',
    faviconUrl: 'https://stanford.edu/favicon.ico',
    darkModeDefault: true
  };

  it('should validate valid college branding and reject malformed hex colors', () => {
    expect(() => CollegeBrandingSchema.parse(stanfordBranding)).not.toThrow();

    const invalidBranding = {
      ...stanfordBranding,
      primaryColor: 'invalid-hex-color'
    };
    expect(() => CollegeBrandingSchema.parse(invalidBranding)).toThrow();
  });

  it('should resolve per-college primary and secondary colors', () => {
    const theme = resolveTheme(stanfordBranding, 'light');
    expect(theme.colors.primary).toBe('#8C1515');
    expect(theme.colors.secondary).toBe('#000000');
    expect(theme.colors.background).toBe('#FFFFFF');
  });

  it('should apply per-module accent color overrides', () => {
    const marketplaceTheme = resolveTheme(stanfordBranding, 'light', 'marketplace');
    expect(marketplaceTheme.colors.accent).toBe('#10B981'); // Marketplace Green Accent

    const confessionsTheme = resolveTheme(stanfordBranding, 'light', 'confessions');
    expect(confessionsTheme.colors.accent).toBe('#8B5CF6'); // Confessions Purple Accent
  });

  it('should resolve dark mode tokens', () => {
    const darkTheme = resolveTheme(stanfordBranding, 'dark');
    expect(darkTheme.colors.background).toBe('#0F172A');
    expect(darkTheme.colors.text).toBe('#F8FAFC');
  });

  it('should generate valid CSS custom properties via generateCssVariables()', () => {
    const theme = resolveTheme(stanfordBranding, 'light', 'marketplace');
    const cssVars = generateCssVariables(theme);

    expect(cssVars).toContain('--ch-color-primary: #8C1515;');
    expect(cssVars).toContain('--ch-color-accent: #10B981;');
    expect(cssVars).toContain('--ch-font-sans: Inter');
  });

  it('should calculate WCAG 2.1 AA relative contrast ratios correctly', () => {
    // Black text on White background ratio is ~21:1 (passes WCAG AA 4.5:1 requirement)
    const ratio = calculateContrastRatio('#000000', '#FFFFFF');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
