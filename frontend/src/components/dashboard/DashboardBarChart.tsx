import React from 'react';

export type DashboardChartTone = 'emerald' | 'sky' | 'amber' | 'violet' | 'blue' | 'rose';

export interface DashboardChartDatum {
  label: string;
  value: number;
  tone: DashboardChartTone;
}

interface DashboardBarChartProps {
  title: string;
  description: string;
  data: DashboardChartDatum[];
  formatValue?: (value: number) => string;
  emptyMessage: string;
}

const barTones: Record<DashboardChartTone, string> = {
  emerald: 'bg-emerald-600',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
  blue: 'bg-blue-500',
  rose: 'bg-rose-500',
};

export function DashboardBarChart({
  title,
  description,
  data,
  formatValue = (value) => value.toLocaleString('fr-FR'),
  emptyMessage,
}: DashboardBarChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6">
        <h2 className="text-base font-bold text-stone-900">{title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">{description}</p>
      </div>

      {maxValue <= 0 ? (
        <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-5" role="list" aria-label={title}>
          {data.map((item) => {
            const width = item.value > 0 ? Math.max((item.value / maxValue) * 100, 2) : 0;
            return (
              <div key={item.label} role="listitem">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-stone-700">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${barTones[item.tone]}`} aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-stone-900">
                    {formatValue(item.value)}
                  </span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-stone-100"
                  role="meter"
                  aria-label={item.label}
                  aria-valuemin={0}
                  aria-valuemax={maxValue}
                  aria-valuenow={item.value}
                >
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out ${barTones[item.tone]}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
