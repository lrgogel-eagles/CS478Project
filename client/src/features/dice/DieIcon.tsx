import { LABEL_SPOTS, shadedFaces } from './die-faces';
import type { DieKind } from './notation';
import './die-icon.css';

type DieIconProps = {
  kind: DieKind;
  value?: string;
  className?: string;
};

export function DieIcon({ kind, value = '', className = '' }: DieIconProps) {
  const [labelX, labelY] = LABEL_SPOTS[kind];
  return (
    <svg className={`die ${className}`.trim()} viewBox="0 0 48 50" aria-hidden="true">
      <g className="die-body">
        {shadedFaces(kind).map((face) => (
          <polygon
            key={face.points}
            points={face.points}
            fill={face.isLit ? 'var(--die-light)' : `color-mix(in srgb, var(--die-dark) ${face.shade}%, var(--die-base))`}
          />
        ))}
      </g>
      {value !== '' && (
        <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" className="die-number" data-digits={value.length}>
          {value}
        </text>
      )}
    </svg>
  );
}
