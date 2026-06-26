import { CheckCircle, SpinnerGap, Warning, Siren, WifiSlash } from "@phosphor-icons/react";import type { SystemState } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const config: Record<SystemState, { label: string; sub: string; color: string; bg: string; Icon: React.ElementType; pulse?: boolean }> = {
  active: {
    label: "Système actif",
    sub: "Toutes les conditions sont normales",
    color: "oklch(0.72 0.19 150)",
    bg: "from-[oklch(0.72_0.19_150/0.2)] to-[oklch(0.72_0.19_150/0.05)]",
    Icon: CheckCircle,
  },
  preheating: {
    label: "Préchauffage en cours",
    sub: "Le capteur MQ-2 se stabilise (≈ 60s)",
    color: "oklch(0.78 0.17 75)",
    bg: "from-[oklch(0.78_0.17_75/0.2)] to-[oklch(0.78_0.17_75/0.05)]",
    Icon: SpinnerGap,
  },
  moderate: {
    label: "ALERTE MODÉRÉE",
    sub: "Concentration de gaz inhabituelle détectée",
    color: "oklch(0.7 0.2 38)",
    bg: "from-[oklch(0.7_0.2_38/0.25)] to-[oklch(0.7_0.2_38/0.05)]",
    Icon: Warning,
    pulse: true,
  },
  critical: {
    label: "ALERTE CRITIQUE",
    sub: "Évacuez immédiatement et appelez les pompiers",
    color: "oklch(0.65 0.25 25)",
    bg: "from-[oklch(0.65_0.25_25/0.3)] to-[oklch(0.65_0.25_25/0.08)]",
    Icon: Siren,
    pulse: true,
  },
  hors_ligne: {
    label: "Système hors ligne",
    sub: "Aucune donnée reçue",
    color: "oklch(0.55 0.05 240)",
    bg: "from-[oklch(0.55_0.05_240/0.2)] to-[oklch(0.55_0.05_240/0.05)]",
    Icon: WifiSlash,
  },
};

export function StatusCard({ state }: { state: SystemState }) {
  const c = config[state];
  const Icon = c.Icon;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br p-6 md:p-8",
        c.bg
      )}
    >
      <div
        className="absolute -right-10 -top-10 h-48 w-48 rounded-full blur-3xl opacity-40"
        style={{ background: c.color }}
      />
      <div className="relative flex items-center gap-5">
        <div
          className={cn(
            "h-16 w-16 rounded-2xl flex items-center justify-center shrink-0",
            c.pulse && "animate-pulse-alert"
          )}
          style={{ background: c.color, boxShadow: `0 0 30px ${c.color}` }}
        >
          <Icon
            size={32}
            weight="fill"
            className={cn("text-background", state === "preheating" && "animate-spin")}
          />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">État du système</div>
          <div className="text-2xl md:text-3xl font-bold mt-1" style={{ color: c.color }}>
            {c.label}
          </div>
          <div className="text-sm text-muted-foreground mt-1">{c.sub}</div>
        </div>
      </div>
    </div>
  );
}
