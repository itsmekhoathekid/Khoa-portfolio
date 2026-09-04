export type HomeProfile = {
  handle: string;
  role: string;
  currentQuest: string;
  statusText: string;
  core: string;
  systems: string;
  metrics: string[];
  portraitAssetId: string | null;
  portraitUrl: string | null;
  focalX: number;
  focalY: number;
};

export const defaultHomeProfile: HomeProfile = {
  handle: 'itsmekhoathekid@github',
  role: 'AI Engineer · Data Science graduate',
  currentQuest: 'Recommendation MLOps & agentic systems',
  statusText: 'Open to AI/ML engineering opportunities',
  core: 'PyTorch · Recommenders · Transformers · MLOps',
  systems: 'Kafka · Spark/Flink · Kubernetes · MCP/A2A',
  metrics: [
    '◆ B.Sc. Data Science · UIT, VNU-HCM',
    '★ GPA: 3.6 · graduated 2026',
    '● TOEIC L&R: 865',
    'λ TOEIC S&W: 340',
  ],
  portraitAssetId: null,
  portraitUrl: null,
  focalX: 50,
  focalY: 50,
};

export const homeProfileSuffixes = [
  'HANDLE',
  'ROLE',
  'CURRENT_QUEST',
  'STATUS',
  'CORE',
  'SYSTEMS',
  'METRICS',
  'PORTRAIT_ASSET_ID',
  'FOCAL_X',
  'FOCAL_Y',
] as const;

export type HomeProfilePrefix = 'HOME' | 'HOME_DRAFT';

export function homeProfileSettingKey(
  prefix: HomeProfilePrefix,
  suffix: (typeof homeProfileSuffixes)[number],
) {
  return `${prefix}_${suffix}`;
}

export function serializeHomeProfile(
  profile: HomeProfile,
  prefix: HomeProfilePrefix,
) {
  return {
    [homeProfileSettingKey(prefix, 'HANDLE')]: profile.handle,
    [homeProfileSettingKey(prefix, 'ROLE')]: profile.role,
    [homeProfileSettingKey(prefix, 'CURRENT_QUEST')]: profile.currentQuest,
    [homeProfileSettingKey(prefix, 'STATUS')]: profile.statusText,
    [homeProfileSettingKey(prefix, 'CORE')]: profile.core,
    [homeProfileSettingKey(prefix, 'SYSTEMS')]: profile.systems,
    [homeProfileSettingKey(prefix, 'METRICS')]: JSON.stringify(profile.metrics),
    [homeProfileSettingKey(prefix, 'PORTRAIT_ASSET_ID')]:
      profile.portraitAssetId ?? '',
    [homeProfileSettingKey(prefix, 'FOCAL_X')]: String(profile.focalX),
    [homeProfileSettingKey(prefix, 'FOCAL_Y')]: String(profile.focalY),
  };
}

export function parseHomeProfileSettings(
  settings: ReadonlyMap<string, string>,
  prefix: HomeProfilePrefix,
  fallback: HomeProfile = defaultHomeProfile,
): HomeProfile {
  const value = (suffix: (typeof homeProfileSuffixes)[number]) =>
    settings.get(homeProfileSettingKey(prefix, suffix));
  const metrics = safeMetrics(value('METRICS')) ?? fallback.metrics;
  const portraitAssetId = value('PORTRAIT_ASSET_ID');
  return {
    handle: value('HANDLE') ?? fallback.handle,
    role: value('ROLE') ?? fallback.role,
    currentQuest: value('CURRENT_QUEST') ?? fallback.currentQuest,
    statusText: value('STATUS') ?? fallback.statusText,
    core: value('CORE') ?? fallback.core,
    systems: value('SYSTEMS') ?? fallback.systems,
    metrics,
    portraitAssetId:
      portraitAssetId === undefined
        ? fallback.portraitAssetId
        : portraitAssetId || null,
    portraitUrl: portraitAssetId === undefined ? fallback.portraitUrl : null,
    focalX: safeFocal(value('FOCAL_X'), fallback.focalX),
    focalY: safeFocal(value('FOCAL_Y'), fallback.focalY),
  };
}

function safeMetrics(raw?: string) {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
      ? value
      : null;
  } catch {
    return null;
  }
}

function safeFocal(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : fallback;
}
