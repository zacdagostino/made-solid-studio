import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { developmentStudioOrigins, developmentStudioUrl, studioSurface } from './studio-surface';

describe('Studio development origins', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { hostname: 'studio.madesolid.com.au' },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('recognises both canonical and compatibility development hosts', () => {
    expect(studioSurface('dev.studio.madesolid.com.au')).toBe('development');
    expect(studioSurface('workspace.madesolid.com.au')).toBe('development');
    expect(studioSurface('studio.madesolid.com.au')).toBe('production');
  });

  it('prefers the canonical configured origin and always retains Workspace compatibility', () => {
    vi.stubEnv('VITE_SITEFORGE_DEVELOPMENT_ORIGIN', 'https://dev.studio.madesolid.com.au');
    vi.stubEnv('VITE_SITEFORGE_DEVELOPMENT_COMPATIBILITY_ORIGINS', 'https://legacy.example.com');
    expect(developmentStudioOrigins()).toEqual([
      'https://dev.studio.madesolid.com.au',
      'https://legacy.example.com',
      'https://workspace.madesolid.com.au',
    ]);
    expect(developmentStudioUrl('#/development')).toBe(
      'https://dev.studio.madesolid.com.au/?__made_solid_route=%23%2Fdevelopment#/development',
    );
    expect(studioSurface('legacy.example.com')).toBe('development');
  });
});
