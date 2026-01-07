/**
 * Color scales for D3 charts - reads from CSS variables for theme consistency.
 * Fallback values match the CSS defaults for SSR/initial render.
 */

// Helper to get CSS variable value (with fallback for SSR/tests)
function getCSSColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${name}`)
    .trim();
  return value || fallback;
}

// Static fallback colors (match CSS :root defaults)
const fallbackColors = {
  // Construct colors - semantic meaning
  distress: '#dc2626',      // Red - Emotional Distress mediator
  engagement: '#2563eb',    // Blue - Quality of Engagement mediator
  fast: '#f97316',          // Orange - FASt treatment status
  nonfast: '#6b7280',       // Gray - Non-FASt control
  credits: '#eab308',       // Yellow - Credit dose

  // Outcome subdimensions
  belonging: '#16a34a',     // Green
  gains: '#3b82f6',         // Blue (adjusted for visibility)
  support: '#8b5cf6',       // Purple
  satisfaction: '#a16207',  // Brown

  // Adjustment overall
  adjustment: '#16a34a',    // Green (positive outcome)

  // Significance
  significant: '#16a34a',
  nonsignificant: '#6b7280',
  positive: '#16a34a',
  negative: '#dc2626',

  // Race/ethnicity palette (not in CSS, keep static)
  hispanic: '#e377c2',
  white: '#7f7f7f',
  asian: '#bcbd22',
  black: '#17becf',
  other: '#9467bd',
} as const;

// Dynamic color getter that reads CSS variables
export function getColor(name: keyof typeof fallbackColors): string {
  return getCSSColor(name, fallbackColors[name]);
}

// Static colors object for backward compatibility
// Use getColor() for theme-aware colors in D3 charts
export const colors = fallbackColors;

// Get color for a pathway
export function getPathwayColor(pathway: 'distress' | 'engagement' | 'direct'): string {
  switch (pathway) {
    case 'distress': return getColor('distress');
    case 'engagement': return getColor('engagement');
    case 'direct': return getColor('nonfast');
  }
}

// Get color for effect direction
export function getEffectColor(value: number): string {
  if (value > 0) return getColor('positive');
  if (value < 0) return getColor('negative');
  return getColor('nonsignificant');
}

// Get color for significance
export function getSignificanceColor(pvalue: number, threshold = 0.05): string {
  return pvalue < threshold ? getColor('significant') : getColor('nonsignificant');
}

// Race/ethnicity color mapping
export function getRaceColor(race: string): string {
  const raceColors: Record<string, string> = {
    'Hispanic/Latino': colors.hispanic,
    'White': colors.white,
    'Asian': colors.asian,
    'Black/African American': colors.black,
    'Other/Multiracial/Unknown': colors.other,
  };
  return raceColors[race] || colors.nonfast;
}

// Opacity for non-highlighted elements
export function getHighlightOpacity(isHighlighted: boolean, highlightActive: boolean): number {
  if (!highlightActive) return 1;
  return isHighlighted ? 1 : 0.2;
}
