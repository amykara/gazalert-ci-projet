import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface Props {
  value: number;
  max?: number;
  seuilModere?: number;
  seuilCritique?: number;
}

export function GasGauge({ value, max = 1000, seuilModere = 300, seuilCritique = 700 }: Props) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  
  const color =
    value >= seuilCritique ? "oklch(0.65 0.25 25)" :
    value >= seuilModere ? "oklch(0.7 0.2 38)" :
    "oklch(0.72 0.19 150)";

  const data = [{ name: "gas", value: pct, fill: color }];

  return (
    <div className="relative w-full aspect-square max-w-[260px] mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="78%"
          outerRadius="100%"
          data={data}
          startAngle={220}
          endAngle={-40}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: "oklch(1 0 0 / 0.06)" }} dataKey="value" cornerRadius={20} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Niveau de gaz</div>
        <div className="mt-1 text-5xl font-bold tabular-nums" style={{ color }}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground mt-1">ppm · seuil {seuilCritique}</div>
      </div>
    </div>
  );
}