import { z } from 'zod';

export type ThemeMode = 'light' | 'dark' | 'high-contrast';

export const CollegeBrandingSchema = z.object({
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be valid hex color'),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be valid hex color'),
  logoUrl: z.string().url(),
  faviconUrl: z.string().url(),
  darkModeDefault: z.boolean().default(false)
});

export type CollegeBranding = z.infer<typeof CollegeBrandingSchema>;

export interface ModuleThemeAccent {
  accentColor: string;
  badgeBg: string;
}

export const MODULE_ACCENTS: Record<string, ModuleThemeAccent> = {
  'rate-my-professor': { accentColor: '#4F46E5', badgeBg: '#EEF2FF' },
  marketplace: { accentColor: '#10B981', badgeBg: '#ECFDF5' },
  confessions: { accentColor: '#8B5CF6', badgeBg: '#F5F3FF' },
  'blind-date': { accentColor: '#EC4899', badgeBg: '#FDF2F8' },
  'materials-pyqs': { accentColor: '#F59E0B', badgeBg: '#FFFBEB' },
  placement: { accentColor: '#3B82F6', badgeBg: '#EFF6FF' }
};

export interface ResolvedTheme {
  mode: ThemeMode;
  college: CollegeBranding;
  moduleName?: string | undefined;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    accent: string;
    badgeBg: string;
  };
  tokens: Record<string, unknown>;
}
