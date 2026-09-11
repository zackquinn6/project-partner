import type { ReactNode } from 'react';

/** Small illustrative curves for progress reporting style options. */

const AXIS = 'hsl(var(--muted-foreground) / 0.45)';
const CURVE = 'hsl(var(--primary))';
const LABEL = 'hsl(var(--muted-foreground))';

type GraphProps = {
  className?: string;
};

function ChartFrame({
  children,
  xLabel,
  yLabel,
  className,
}: {
  children: ReactNode;
  xLabel: string;
  yLabel: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 140 96"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Plot area: x 28–128, y 12–72 */}
      <line x1="28" y1="72" x2="128" y2="72" stroke={AXIS} strokeWidth="1" />
      <line x1="28" y1="72" x2="28" y2="12" stroke={AXIS} strokeWidth="1" />
      {children}
      <text
        x="78"
        y="90"
        textAnchor="middle"
        fill={LABEL}
        fontSize="9"
        fontFamily="system-ui, sans-serif"
      >
        {xLabel}
      </text>
      <text
        x="10"
        y="42"
        textAnchor="middle"
        fill={LABEL}
        fontSize="9"
        fontFamily="system-ui, sans-serif"
        transform="rotate(-90 10 42)"
      >
        {yLabel}
      </text>
    </svg>
  );
}

/** Straight diagonal: work done → % complete */
export function LinearProgressGraph({ className }: GraphProps) {
  return (
    <ChartFrame xLabel="Work done" yLabel="% complete" className={className}>
      <line
        x1="28"
        y1="72"
        x2="128"
        y2="12"
        stroke={CURVE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </ChartFrame>
  );
}

/** S-curve: early work reports lower %; effort ramps toward completion */
export function ExponentialProgressGraph({ className }: GraphProps) {
  return (
    <ChartFrame xLabel="Work done" yLabel="% complete" className={className}>
      {/* Classic project S-curve: slow start, steep middle, harder finish */}
      <path
        d="M 28 72 C 52 72, 55 55, 78 42 C 100 30, 105 12, 128 12"
        fill="none"
        stroke={CURVE}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ChartFrame>
  );
}

/** Straight diagonal with time on the x-axis */
export function TimeBasedProgressGraph({ className }: GraphProps) {
  return (
    <ChartFrame xLabel="Time" yLabel="% complete" className={className}>
      <line
        x1="28"
        y1="72"
        x2="128"
        y2="12"
        stroke={CURVE}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </ChartFrame>
  );
}
