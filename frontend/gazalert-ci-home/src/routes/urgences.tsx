import { createFileRoute } from "@tanstack/react-router";
import { Phone, Fire, ShieldCheck, FirstAid, HardHat } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/urgences")({
  head: () => ({ meta: [{ title: "Numéros d'urgence — GazAlert CI" }] }),
  component: EmergencyPage,
});

const urgences = [
  { id: "fire", name: "Pompiers", number: "180", description: "Incendie, fuite de gaz, secours", icon: Fire, color: "destructive" },
  { id: "police", name: "Police secours", number: "111", description: "Police nationale, urgences", icon: ShieldCheck, color: "primary" },
  { id: "samu", name: "SAMU", number: "185", description: "Urgences médicales", icon: FirstAid, color: "success" },
  { id: "civil", name: "Protection Civile", number: "185", description: "Catastrophes, sinistres", icon: HardHat, color: "warning" },
];

const accentMap: Record<string, { ring: string; bg: string; text: string }> = {
  destructive: { ring: "ring-destructive/30", bg: "bg-destructive/15", text: "text-destructive" },
  primary: { ring: "ring-primary/30", bg: "bg-primary/15", text: "text-primary" },
  success: { ring: "ring-success/30", bg: "bg-success/15", text: "text-success" },
  warning: { ring: "ring-[oklch(0.78_0.17_75)]/30", bg: "bg-[oklch(0.78_0.17_75)]/15", text: "text-[oklch(0.78_0.17_75)]" },
};

function EmergencyPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Numéros d'urgence</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">Contacts vitaux 🇨🇮</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Appelez en un clic les services d'urgence de Côte d'Ivoire.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {urgences.map((c, i) => {
          const Icon = c.icon;
          const a = accentMap[c.color];
          return (
            <Card
              key={c.id}
              className={`glass-card p-5 border-0 ring-1 ${a.ring} animate-fade-in-up`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`h-14 w-14 rounded-2xl ${a.bg} ${a.text} flex items-center justify-center`}>
                  <Icon size={28} weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.description}</div>
                  <div className={`mt-2 text-3xl font-bold tabular-nums ${a.text}`}>{c.number}</div>
                </div>
              </div>
              <a href={`tel:${c.number}`} className="block mt-4">
                <Button className="w-full gap-2 h-11" size="lg">
                  <Phone size={16} weight="fill" /> Appeler maintenant
                </Button>
              </a>
            </Card>
          );
        })}
      </div>

      <Card className="glass-card border-0 p-5 text-center">
        <p className="text-sm text-muted-foreground">
          🚒 En cas de fuite de gaz, appelez immédiatement les pompiers :{" "}
          <a href="tel:180" className="text-destructive font-bold text-lg">180</a>
        </p>
      </Card>
    </div>
  );
}