import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wind, Lightning, DoorOpen, PhoneCall, PhoneSlash, ShieldCheck } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/securite")({
  head: () => ({ meta: [{ title: "Conseils de sécurité — GazAlert CI" }] }),
  component: SafetyPage,
});

const iconMap: Record<number, React.ElementType> = {
  1: Wind,
  2: Lightning,
  3: DoorOpen,
  4: PhoneCall,
  5: PhoneSlash,
  6: ShieldCheck,
};

const colorMap = [
  "from-primary/20 to-primary/5 text-primary ring-primary/30",
  "from-destructive/25 to-destructive/5 text-destructive ring-destructive/30",
  "from-[oklch(0.78_0.17_75)]/25 to-[oklch(0.78_0.17_75)]/5 text-[oklch(0.78_0.17_75)] ring-[oklch(0.78_0.17_75)]/30",
  "from-success/20 to-success/5 text-success ring-success/30",
  "from-primary/20 to-primary/5 text-primary ring-primary/30",
  "from-success/20 to-success/5 text-success ring-success/30",
];

function SafetyPage() {
  const [conseils, setConseils] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConseils()
      .then(setConseils)
      .catch(() => toast.error("Erreur lors du chargement des conseils"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Chargement...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Conseils de sécurité</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">Les bons réflexes</h1>
        <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
          En cas de fuite de gaz, chaque seconde compte. Suivez ces règles essentielles pour protéger votre famille.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {conseils.map((conseil, i) => {
          const Icon = iconMap[conseil.ordre] || ShieldCheck;
          const color = colorMap[i % colorMap.length];
          return (
            <Card
              key={conseil.id}
              className={`relative overflow-hidden border-0 ring-1 bg-gradient-to-br ${color} p-6 animate-fade-in-up`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="absolute -right-8 -top-8 text-[120px] font-black opacity-[0.05] leading-none select-none">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="relative flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-background/40 backdrop-blur flex items-center justify-center shrink-0">
                  <Icon size={24} weight="fill" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-widest opacity-70">Règle {i + 1}</div>
                  <h3 className="text-lg font-bold mt-1 text-foreground">{conseil.titre}</h3>
                  <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{conseil.contenu}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="glass-card border-0 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          🚒 En cas de doute, appelez toujours les pompiers : <a href="tel:180" className="text-primary font-bold">180</a>
        </p>
      </Card>
    </div>
  );
}