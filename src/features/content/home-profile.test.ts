import { describe, expect, it } from 'vitest';
import {
  defaultHomeProfile,
  parseHomeProfileSettings,
  serializeHomeProfile,
} from './home-profile';

describe('home profile settings', () => {
  it('round-trips editable copy, metrics, portrait, and focal point', () => {
    const profile = {
      ...defaultHomeProfile,
      handle: 'khoa@portfolio',
      metrics: ['◆ ML systems', '★ shipping'],
      portraitAssetId: '00000000-0000-4000-8000-000000000001',
      focalX: 35,
      focalY: 64,
    };
    const settings = new Map(
      Object.entries(serializeHomeProfile(profile, 'HOME_DRAFT')),
    );
    expect(
      parseHomeProfileSettings(settings, 'HOME_DRAFT', defaultHomeProfile),
    ).toMatchObject({
      handle: 'khoa@portfolio',
      metrics: ['◆ ML systems', '★ shipping'],
      portraitAssetId: '00000000-0000-4000-8000-000000000001',
      focalX: 35,
      focalY: 64,
    });
  });

  it('keeps published values when a draft key has not been written', () => {
    const published = {
      ...defaultHomeProfile,
      role: 'Published role',
      portraitAssetId: '00000000-0000-4000-8000-000000000002',
      portraitUrl: '/media/assets/published/portrait.png',
    };
    const draft = parseHomeProfileSettings(
      new Map([['HOME_DRAFT_HANDLE', 'Draft handle']]),
      'HOME_DRAFT',
      published,
    );
    expect(draft.handle).toBe('Draft handle');
    expect(draft.role).toBe('Published role');
    expect(draft.portraitUrl).toBe(published.portraitUrl);
  });
});
