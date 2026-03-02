const DEFAULT_FLAGS: Record<string, boolean> = {
  blog: false,
  vendor_directory: false,
  community_challenges: false,
};

export function isFeatureEnabled(flag: string): boolean {
  try {
    const stored = localStorage.getItem('pptides_feature_flags');
    if (stored) {
      const overrides = JSON.parse(stored) as Record<string, boolean>;
      if (flag in overrides) return overrides[flag];
    }
  } catch { /* corrupted localStorage — fall through */ }
  return DEFAULT_FLAGS[flag] ?? false;
}
