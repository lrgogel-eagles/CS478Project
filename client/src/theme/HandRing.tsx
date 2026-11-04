const RINGS = {
  wide: { viewBox: '0 0 120 44', path: 'M14 30C4 18 30 6 62 6c30 0 52 8 50 20-2 12-34 16-60 14C26 38 8 30 12 18' },
  small: { viewBox: '0 0 60 34', path: 'M8 20c-2-9 14-15 27-14 13 1 20 6 18 13-2 8-19 11-31 9C12 27 5 21 9 13' },
} as const;

export function HandRing({ size = 'wide' }: { size?: keyof typeof RINGS }) {
  const ring = RINGS[size];
  return (
    <svg className="hand-ring" viewBox={ring.viewBox} preserveAspectRatio="none" aria-hidden="true">
      <path d={ring.path} />
    </svg>
  );
}

export function PaperFilters() {
  return (
    <svg width="0" height="0" className="paper-filters" aria-hidden="true">
      <filter id="hand-wobble">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="5" />
        <feDisplacementMap in="SourceGraphic" scale="3" />
      </filter>
    </svg>
  );
}
