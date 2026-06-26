import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DownloadSimple, MapPin, MagnifyingGlass, ArrowSquareOut, WifiSlash, UserCirclePlus } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/alertes")({
  head: () => ({ meta: [{ title: "Historique des alertes — GazAlert CI" }] }),
  component: AlertsPage,
});

function AlertsPage() {
  const [alertes, setAlertes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifSelectionnee, setNotifSelectionnee] = useState<any>(null);
  const [onglet, setOnglet] = useState<'alertes' | 'notifications'>('alertes');

  useEffect(() => {
    const charger = async () => {
      try {
        const [alertesData, notifsData] = await Promise.all([
          api.getAlertes(),
          api.getNotifications(),
        ]);
        setAlertes(alertesData);
        setNotifications(notifsData.filter((n: any) =>
          n.type_notification === 'systeme_inactif' ||
          n.type_notification === 'demande_approbation'
        ));
      } catch {
        toast.error("Erreur lors du chargement des alertes");
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, []);

  const filtered = useMemo(() => {
    return alertes.filter((a) => {
      if (level !== "all" && a.niveau !== level) return false;
      if (query) {
        const coords = `${a.latitude} ${a.longitude}`.toLowerCase();
        if (!coords.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [alertes, level, query]);

  const exportCsv = () => {
    const header = "Date,Niveau,Valeur,Latitude,Longitude,SMS envoyé,Résolue\n";
    const rows = filtered
      .map((a) => `${a.date_alerte},${a.niveau},${a.valeur_gaz},${a.latitude},${a.longitude},${a.sms_envoye},${a.est_resolue}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `gazalert-alertes-${new Date().toISOString().slice(0, 10)}.csv`;
    el.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Historique</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">Alertes &amp; Notifications</h1>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setOnglet('alertes')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              onglet === 'alertes'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Alertes gaz
          </button>
          <button
            onClick={() => setOnglet('notifications')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              onglet === 'notifications'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Notifications système
            {notifications.filter((n: any) => !n.est_lue).length > 0 && (
              <span className="ml-2 bg-destructive text-white text-xs rounded-full px-1.5">
                {notifications.filter((n: any) => !n.est_lue).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {onglet === 'alertes' && (
        <>
          <p className="text-muted-foreground text-sm -mt-2">{filtered.length} alerte(s) enregistrée(s)</p>

          <Card className="glass-card p-4 border-0">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par coordonnées..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 bg-background/50"
                />
              </div>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="md:w-48 bg-background/50">
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  <SelectItem value="moderee">Modérée</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportCsv} className="gap-2">
                <DownloadSimple size={16} weight="bold" /> Exporter CSV
              </Button>
            </div>
          </Card>

          <Card className="glass-card border-0 overflow-hidden">
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MapPin size={40} className="mx-auto opacity-30" />
                <p className="mt-3">Aucune alerte enregistrée</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((a, i) => (
                  <div
                    key={a.id}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-5 hover:bg-white/5 transition-colors"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 md:w-56">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${a.niveau === "critique" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"}`}>
                        <MapPin size={20} weight="fill" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          {new Date(a.date_alerte).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.date_alerte).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {a.latitude ? (
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {parseFloat(a.latitude).toFixed(5)}, {parseFloat(a.longitude).toFixed(5)}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Position non disponible</div>
                      )}
                      {a.message_sms && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.message_sms}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="text-right">
                        <div className="text-sm font-bold tabular-nums">
                          {a.valeur_gaz} <span className="text-xs text-muted-foreground">ppm</span>
                        </div>
                      </div>
                      <Badge variant={a.niveau === "critique" ? "destructive" : "default"}>
                        {a.niveau === "critique" ? "Critique" : "Modérée"}
                      </Badge>
                      <Badge variant="outline" className="text-success border-success/30">
                        {a.est_resolue ? "Résolue" : "Active"}
                      </Badge>
                      {a.latitude && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(`https://www.google.com/maps?q=${a.latitude},${a.longitude}`, '_blank')}
                        >
                          <ArrowSquareOut size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {onglet === 'notifications' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Chargement...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <WifiSlash size={40} className="mx-auto opacity-30" />
              <p className="mt-3">Aucune notification système</p>
            </div>
          ) : (
            notifications.map((n: any) => (
              <Card
                key={n.id}
                className="glass-card border-0 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setNotifSelectionnee(n)}
              >
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    n.type_notification === 'systeme_inactif'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/15 text-primary'
                  }`}>
                    {n.type_notification === 'systeme_inactif'
                      ? <WifiSlash size={16} weight="fill" />
                      : <UserCirclePlus size={16} weight="fill" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {n.type_notification === 'systeme_inactif' ? 'Système inactif' : "Demande d'approbation"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {n.message}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(n.date_envoi).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
                    </div>
                  </div>
                  {!n.est_lue && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <AlertDialog open={!!notifSelectionnee} onOpenChange={(o) => !o && setNotifSelectionnee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {notifSelectionnee?.type_notification === 'systeme_inactif'
                ? '⚠️ Système inactif'
                : "👤 Demande d'approbation"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {notifSelectionnee?.message}
              <div className="mt-2 text-xs text-muted-foreground">
                {notifSelectionnee && new Date(notifSelectionnee.date_envoi).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={async () => {
              if (notifSelectionnee && !notifSelectionnee.est_lue) {
                await api.marquerLue(notifSelectionnee.id);
                setNotifications(notifications.map((n: any) =>
                  n.id === notifSelectionnee.id ? { ...n, est_lue: true } : n
                ));
              }
              setNotifSelectionnee(null);
            }}>
              Fermer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
