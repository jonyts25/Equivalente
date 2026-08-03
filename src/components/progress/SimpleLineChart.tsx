type ChartPoint = { date: string; value: number };

interface SimpleLineChartProps {
  title: string;
  data: ChartPoint[];
  unit: string;
  color?: string;
}

export function SimpleLineChart({
  title,
  data,
  unit,
  color = "#059669",
}: SimpleLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-2 text-xs text-slate-500">Sin datos suficientes.</p>
      </div>
    );
  }

  const width = 280;
  const height = 120;
  const pad = 16;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - ((d.value - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-sm font-medium">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full max-w-sm">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points.join(" ")}
        />
        {data.map((d, i) => {
          const x = pad + (i / Math.max(data.length - 1, 1)) * (width - pad * 2);
          const y = height - pad - ((d.value - min) / range) * (height - pad * 2);
          return <circle key={d.date} cx={x} cy={y} r="3" fill={color} />;
        })}
      </svg>
      <p className="text-xs text-slate-500">
        {data[0]?.date} → {data[data.length - 1]?.date} · {unit}
      </p>
    </div>
  );
}
