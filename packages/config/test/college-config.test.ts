import { describe, it, expect, beforeEach } from 'vitest';
import { CollegeConfigService, FullCollegeConfigSchema } from '../src/index.js';

describe('Per-College Configuration & Dynamic Customization Engine', () => {
  let service: CollegeConfigService;

  beforeEach(() => {
    service = new CollegeConfigService(5000);
  });

  it('should onboard a new college with zero code changes', () => {
    const stanford = service.onboardCollege({
      collegeId: 'college-stanford-001',
      name: 'Stanford University',
      slug: 'stanford',
      allowedEmailDomains: ['@stanford.edu'],
      branding: {
        primaryColor: '#8C1515',
        secondaryColor: '#000000',
        logoUrl: 'https://stanford.edu/logo.png',
        faviconUrl: 'https://stanford.edu/favicon.ico',
        darkModeDefault: true
      }
    });

    expect(stanford.collegeId).toBe('college-stanford-001');
    expect(stanford.branding.primaryColor).toBe('#8C1515');
    expect(stanford.version).toBe(1);
  });

  it('should provide safe fallback defaults for non-onboarded colleges', () => {
    const fallback = service.getCollegeConfig('college-unknown-999');
    expect(fallback.collegeId).toBe('college-unknown-999');
    expect(fallback.enabledModules).toContain('rate-my-professor');
    expect(fallback.branding.primaryColor).toBe('#4F46E5');
  });

  it('should update per-college module settings dynamically', () => {
    service.onboardCollege({
      collegeId: 'college-mit-002',
      name: 'MIT',
      slug: 'mit',
      allowedEmailDomains: ['@mit.edu']
    });

    const updated = service.updateCollegeConfig('college-mit-002', {
      moduleSettings: {
        marketplace: {
          maxActiveListingsPerStudent: 25,
          allowedCategories: ['TEXTBOOKS', 'ELECTRONICS']
        }
      }
    });

    expect(updated.version).toBe(2);
    expect(updated.moduleSettings.marketplace.maxActiveListingsPerStudent).toBe(25);
  });

  it('should record audit history and support version rollback', () => {
    service.onboardCollege({
      collegeId: 'college-harvard-003',
      name: 'Harvard',
      slug: 'harvard',
      allowedEmailDomains: ['@harvard.edu']
    });

    service.updateCollegeConfig('college-harvard-003', {
      maintenanceMode: {
        enabled: true,
        message: 'Harvard portal undergoing emergency maintenance.',
        allowedRoles: ['SUPER_ADMIN']
      }
    });

    expect(service.getCollegeConfig('college-harvard-003').maintenanceMode.enabled).toBe(true);

    const rolledBack = service.rollbackCollegeConfig('college-harvard-003', 1);
    expect(rolledBack).toBe(true);
    expect(service.getCollegeConfig('college-harvard-003').maintenanceMode.enabled).toBe(false);
  });

  it('should reject malformed config updates via Zod validation', () => {
    expect(() =>
      FullCollegeConfigSchema.parse({
        collegeId: 'test',
        name: 'Test',
        slug: 'test',
        allowedEmailDomains: [] // Empty email domains array fails validation
      })
    ).toThrow();
  });
});
