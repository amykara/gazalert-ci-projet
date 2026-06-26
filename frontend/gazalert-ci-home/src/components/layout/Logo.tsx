import { Flame } from "@phosphor-icons/react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <div className="absolute inset-0 rounded-xl bg-primary/30 blur-lg" />
        <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-[oklch(0.65_0.22_28)] flex items-center justify-center shadow-[var(--shadow-glow)]">
          <Flame size={20} weight="fill" className="text-primary-foreground" />
        </div>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-bold text-base tracking-tight">
            Gaz<span className="text-gradient-primary">Alert</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Côte d'Ivoire</div>
        </div>
      )}
    </div>
  );
}
