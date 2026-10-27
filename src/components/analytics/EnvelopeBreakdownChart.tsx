import React, { useMemo } from 'react';
import { PieChart, Sparkles } from 'lucide-react';
import type { EnvelopeWithDetails } from '@/lib/api/envelopes';
import { formatINR } from '@/lib/accounting/currency';

interface EnvelopeBreakdownChartProps {
  envelopes: EnvelopeWithDetails[];
}

interface Segment {
  id: string;
  name: string;
  color: string;
  amountPaise: bigint;
  percent: number;
}

const DEFAULT_COLORS = [
  '#38bdf8', // sky-400
  '#f43f5e', // rose-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#6366f1', // indigo-500
];

export const EnvelopeBreakdownChart: React.FC<EnvelopeBreakdownChartProps> = ({ envelopes }) => {
  const { segments, totalPaise, isShowingAllocated } = useMemo(() => {
    // Check if any envelope has spent money
    const totalSpent = envelopes.reduce((sum, e) => sum + e.spentPaise, 0n);

    // If total spent is 0, visualize allocated budget distribution
    const useAllocated = totalSpent === 0n;
    const baseTotal = useAllocated
      ? envelopes.reduce((sum, e) => sum + e.allocatedPaise, 0n)
      : totalSpent;

    const segs: Segment[] = envelopes
      .map((env, index) => {
        const amt = useAllocated
          ? env.allocatedPaise
          : env.spentPaise;
        const percent =
          baseTotal > 0n ? Number((amt * 10000n) / baseTotal) / 100 : 0;

        return {
          id: env.id,
          name: env.name,
          color: env.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
          amountPaise: amt,
          percent,
        };
      })
      .filter((s) => s.amountPaise > 0n)
      .sort((a, b) => (b.amountPaise > a.amountPaise ? 1 : -1));

    return {
      segments: segs,
      totalPaise: baseTotal,
      isShowingAllocated: useAllocated,
    };
  }, [envelopes]);

  // Compute SVG Donut Chart Paths
  const donutPaths = useMemo(() => {
    let cumulativeAngle = 0;
    const radius = 64;
    const cx = 80;
    const cy = 80;

    return segments.map((seg) => {
      const angle = (seg.percent / 100) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;

      // Handle single slice 100% case
      if (angle >= 359.9) {
        return {
          ...seg,
          d: `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius}`,
          isFull: true,
        };
      }

      const x1 = cx + radius * Math.cos(((startAngle - 90) * Math.PI) / 180);
      const y1 = cy + radius * Math.sin(((startAngle - 90) * Math.PI) / 180);
      const x2 = cx + radius * Math.cos(((endAngle - 90) * Math.PI) / 180);
      const y2 = cy + radius * Math.sin(((endAngle - 90) * Math.PI) / 180);

      const largeArcFlag = angle > 180 ? 1 : 0;
      const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

      return {
        ...seg,
        d,
        isFull: false,
      };
    });
  }, [segments]);

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-5 max-w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <PieChart className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">Envelope Spending Distribution</h4>
          </div>
          <p className="text-xs text-neutral-400">
            {isShowingAllocated
              ? 'Showing current allocation budget proportions'
              : 'Showing actual expenditure across categories'}
          </p>
        </div>

        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-white/5 font-mono">
          Total: {formatINR(totalPaise)}
        </span>
      </div>

      {segments.length === 0 ? (
        <div className="p-8 text-center text-xs text-neutral-500 flex flex-col items-center justify-center space-y-2">
          <Sparkles className="w-6 h-6 text-neutral-600" />
          <span>Allocate or spend from envelopes to visualize category distribution.</span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Donut Chart SVG */}
          <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="64"
                fill="none"
                stroke="#1f2937"
                strokeWidth="18"
              />
              {donutPaths.map((slice) => (
                <path
                  key={slice.id}
                  d={slice.d}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="18"
                  strokeLinecap="round"
                  className="hover:opacity-80 transition duration-200 cursor-pointer"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-neutral-400 font-medium">Categories</span>
              <span className="text-base font-bold font-mono text-white">
                {segments.length}
              </span>
            </div>
          </div>

          {/* Legend and Percentages List */}
          <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
            {segments.map((seg) => (
              <div
                key={seg.id}
                className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/40 hover:bg-neutral-900/80 border border-white/5 text-xs transition"
              >
                <div className="flex items-center space-x-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-medium text-neutral-200 truncate">{seg.name}</span>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0 font-mono text-[11px]">
                  <span className="text-neutral-400 font-semibold">{seg.percent.toFixed(1)}%</span>
                  <span className="text-white font-medium">{formatINR(seg.amountPaise)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
