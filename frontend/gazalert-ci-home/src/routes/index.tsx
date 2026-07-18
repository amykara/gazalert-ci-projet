import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Pulse, MapPin, WifiHigh, Bell, ArrowUpRight, Clock, CheckCircle } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GasGauge } from "@/components/dashboard/GasGauge";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { api, removeToken } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — GazAlert CI" },
      { name: "description", content: "Vue d'ensemble en temps réel de votre détecteur de gaz." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [gasValue, setGasValue] = useState(0);
  const [profil, setProfil] = useState<any>(null);
  const [appareil, setAppareil] = useState<any>(null);
  const [alertes, setAlertes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [derniereAlerte, setDerniereAlerte] = useState<any>(null);
  const [notifPush, setNotifPush] = useState(true);
  const [sonAlerte, setSonAlerte] = useState(true);
  const [enAttente, setEnAttente] = useState<string | null>(null);

  // Améliorations
  const [horsLigneDepuis, setHorsLigneDepuis] = useState<number | null>(null);
  const [tauxResolution, setTauxResolution] = useState<number>(0);
  const [prechauffage, setPrechauffage] = useState(false);
  const [tendance, setTendance] = useState<'hausse' | 'baisse' | 'stable'>('stable');
  const [deltaPpm, setDeltaPpm] = useState<number>(0);

  const dernierStatutRef = useRef<string | null>(null);
  const sonAlerteRef = useRef(sonAlerte);
  sonAlerteRef.current = sonAlerte;
  const prevGasValueRef = useRef<number | null>(null);

  const declencherAlertes = (statut: string) => {
    if (statut !== "alerte_critique" && statut !== "alerte_moderee") return;
    if (dernierStatutRef.current === statut) return;

    if (sonAlerteRef.current) {
      try {
        const fichierSon = statut === "alerte_critique" ? "/alerte_critique.mp3" : "/alerte_moderee.mp3";
        const audio = new Audio(fichierSon);
        audio.play().catch(() => {
          new Audio("/alerte.mp3").play().catch(() => {});
        });
      } catch {}
    }

    if (notifPush && "Notification" in window && Notification.permission === "granted") {
      new Notification("🚨 GazAlert CI", {
        body: statut === "alerte_critique"
          ? "ALERTE CRITIQUE — Évacuez immédiatement !"
          : "⚠️ Alerte modérée — Concentration de gaz inhabituelle détectée",
        icon: "/favicon.ico",
      });
    }

    dernierStatutRef.current = statut;
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    setNotifPush(localStorage.getItem("notif_push") !== "false");
    setSonAlerte(localStorage.getItem("son_alerte") !== "false");

    const chargerDonnees = async () => {
      try {
        const [profilData, alertesData] = await Promise.all([
          api.getProfil(),
          api.getAlertes(),
        ]);
        setProfil(profilData);
        if (profilData.role === 'en_attente') {
          setEnAttente('en_attente');
          setLoading(false);
          return;
        }
        if (profilData.role === 'desapprouve' || profilData.role === null) {
          setEnAttente('desapprouve');
          setLoading(false);
          return;
        }
        setAlertes(alertesData);
        if (alertesData.length > 0) setDerniereAlerte(alertesData[0]);

        const total = alertesData.length;
        const resolues = alertesData.filter((a: any) => a.est_resolue).length;
        setTauxResolution(total > 0 ? Math.round((resolues / total) * 100) : 0);


        try {
          const appareilData = await api.getStatutAppareil();
          setAppareil(appareilData);
          setGasValue(appareilData.valeur_actuelle || 0);
          dernierStatutRef.current = appareilData.statut;
        } catch {
          // Pas d'appareil configuré encore
        }
      } catch {
        removeToken();
        navigate({ to: "/login" });
      } finally {
        setLoading(false);
      }
    };

    chargerDonnees();

    const rafraichirDonnees = async () => {
      try {
        const [appareilData, alertesData] = await Promise.all([
          api.getStatutAppareil(),
          api.getAlertes(),
        ]);

        const valeur = appareilData.valeur_actuelle || 0;

        setAppareil(appareilData);
        setGasValue(valeur);
        setAlertes(alertesData);
        if (alertesData.length > 0) setDerniereAlerte(alertesData[0]);

        const total = alertesData.length;
        const resolues = alertesData.filter((a: any) => a.est_resolue).length;
        setTauxResolution(total > 0 ? Math.round((resolues / total) * 100) : 0);

        setPrechauffage(appareilData.statut === 'prechauffage');

        if (appareilData.statut === 'hors_ligne' && appareilData.derniere_connexion) {
          const diff = Math.floor((Date.now() - new Date(appareilData.derniere_connexion).getTime()) / 60000);
          setHorsLigneDepuis(diff);
        } else {
          setHorsLigneDepuis(null);
        }

        if (appareilData.statut === 'alerte_critique') {
          document.title = `🚨 ALERTE — ${valeur} ppm — GazAlert CI`;
        } else if (appareilData.statut === 'alerte_moderee') {
          document.title = `⚠️ Modérée — ${valeur} ppm — GazAlert CI`;
        } else if (appareilData.statut === 'hors_ligne') {
          document.title = `⚫ Hors ligne — GazAlert CI`;
        } else {
          document.title = `✅ Normal — ${valeur} ppm — GazAlert CI`;
        }

        if (prevGasValueRef.current !== null) {
          const delta = valeur - prevGasValueRef.current;
          setDeltaPpm(Math.abs(delta));
          if (delta > 5) setTendance('hausse');
          else if (delta < -5) setTendance('baisse');
          else setTendance('stable');
        }
        prevGasValueRef.current = valeur;

        if (dernierStatutRef.current !== appareilData.statut) {
          declencherAlertes(appareilData.statut);
          dernierStatutRef.current = appareilData.statut;
        }
      } catch {
        setAppareil((prev: any) => prev ? { ...prev, statut: 'hors_ligne' } : null);
      }
    };

    let compteurInactivite = 0;
    const interval = setInterval(async () => {
      compteurInactivite++;
      await rafraichirDonnees();
      if (compteurInactivite >= 15) {
        compteurInactivite = 0;
        try { await api.verifierInactivite(); } catch {}
      }
    }, 2000);

    // Rafraîchissement immédiat quand l'onglet redevient visible
    // (le navigateur suspend les setInterval en arrière-plan)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') rafraichirDonnees();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.title = "Tableau de bord — GazAlert CI";
    };
  }, []);

  const lastAlert = alertes[0];
  const todayCount = alertes.filter((a) => {
    const today = new Date().toDateString();
    return new Date(a.date_alerte).toDateString() === today;
  }).length;

  const critiquesAujourdhui = alertes.filter((a) => {
    const today = new Date().toDateString();
    return new Date(a.date_alerte).toDateString() === today && a.niveau === "critique";
  }).length;

  if (enAttente) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
          enAttente === 'en_attente' ? 'bg-primary/10' : 'bg-destructive/10'
        }`}>
          <Clock size={32} className={enAttente === 'en_attente' ? 'text-primary' : 'text-destructive'} />
        </div>
        <div>
          <h2 className="font-semibold text-lg">
            {enAttente === 'en_attente' ? "En attente d'approbation" : 'Accès refusé'}
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            {enAttente === 'en_attente'
              ? "Votre demande a été envoyée au propriétaire. Vous aurez accès aux données dès qu'il vous approuvera."
              : "Votre demande a été refusée par le propriétaire. Contactez-le pour obtenir un nouveau code d'invitation."}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Tableau de bord</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">
            {new Date().getHours() < 12 ? "Bonjour" : new Date().getHours() < 18 ? "Bon après-midi" : "Bonsoir"}, {profil?.nom || "..."} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Votre logement est surveillé 24h/24.</p>
        </div>
        <Badge variant="secondary" className="self-start gap-1.5 py-1.5">
          <span className={`h-2 w-2 rounded-full ${appareil?.statut === "hors_ligne" ? "bg-muted-foreground" : "bg-success animate-pulse"}`} />
          {appareil?.statut === "hors_ligne" ? "Système hors ligne" : "Mis à jour à l'instant"}
        </Badge>
      </div>

      <StatusCard state={
        appareil?.statut === "normal" ? "active" :
        appareil?.statut === "prechauffage" ? "preheating" :
        appareil?.statut === "alerte_moderee" ? "moderate" :
        appareil?.statut === "alerte_critique" ? "critical" :
        "hors_ligne"
      } />

      {/* Bandeau préchauffage MQ-2 */}
      {prechauffage && (
        <div className="glass-card border-0 p-4 rounded-2xl flex items-start gap-3 bg-warning/10">
          <Clock size={20} className="text-warning shrink-0 mt-0.5" weight="duotone" />
          <div className="flex-1">
            <div className="font-semibold text-sm">Calibration en cours...</div>
            <div className="text-xs text-muted-foreground mt-1">
              Le capteur MQ-2 se calibre au démarrage. Les mesures seront disponibles dans un instant.
            </div>
            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-warning rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Jauge MQ-2 avec indicateur tendance */}
        <Card className="glass-card lg:col-span-1 p-6 border-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Concentration MQ-2</h3>
              {tendance !== 'stable' && (
                <span className={`text-sm font-medium ${tendance === 'hausse' ? 'text-destructive' : 'text-success'}`}>
                  {tendance === 'hausse' ? '↑' : '↓'} {deltaPpm} ppm
                </span>
              )}
            </div>
            <Pulse size={16} className="text-primary" />
          </div>
          <GasGauge
            value={gasValue}
            seuilModere={appareil?.seuil_modere ?? 300}
            seuilCritique={appareil?.seuil_critique ?? 700}
          />
          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
            <div className="rounded-lg bg-success/10 py-2">
              <div className="text-success font-semibold">
                &lt; {appareil?.seuil_modere ?? 300}
              </div>
              <div className="text-muted-foreground mt-0.5">Normal</div>
            </div>
            <div className="rounded-lg bg-primary/10 py-2">
              <div className="text-primary font-semibold">
                {appareil?.seuil_modere ?? 300}-{appareil?.seuil_critique ?? 700}
              </div>
              <div className="text-muted-foreground mt-0.5">Modéré</div>
            </div>
            <div className="rounded-lg bg-destructive/10 py-2">
              <div className="text-destructive font-semibold">
                &gt; {appareil?.seuil_critique ?? 700}
              </div>
              <div className="text-muted-foreground mt-0.5">Critique</div>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {/* 4 tuiles stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatTile
              icon={Bell}
              label="Alertes aujourd'hui"
              value={todayCount.toString()}
              sub={`${critiquesAujourdhui} critique`}
            />
            <StatTile
              icon={MapPin}
              label="Dernière position"
              value={appareil?.statut === "hors_ligne" ? "Hors ligne" : derniereAlerte ? "GPS actif" : "Aucune alerte"}
              sub="Abidjan, CI"
            />
            <StatTile
              icon={WifiHigh}
              label="Connexion"
              value={appareil?.statut === "hors_ligne" ? "Hors ligne" : appareil ? "Stable" : "Non configuré"}
              sub={
                appareil?.statut === "hors_ligne"
                  ? (horsLigneDepuis !== null && horsLigneDepuis > 0 ? `Hors ligne depuis ${horsLigneDepuis} min` : "Système déconnecté")
                  : "Wi-Fi · GSM"
              }
              success={!!appareil && appareil?.statut !== "hors_ligne"}
            />
            <StatTile
              icon={CheckCircle}
              label="Taux résolution"
              value={`${tauxResolution}%`}
              sub="alertes résolues"
              success={tauxResolution > 75}
            />
          </div>


          {/* Dernière alerte */}
          <Card className="glass-card p-6 border-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Dernière alerte</h3>
                <p className="text-xs text-muted-foreground">Notification la plus récente</p>
              </div>
              <Link to="/alertes">
                <Button variant="ghost" size="sm" className="gap-1">
                  Voir tout <ArrowUpRight size={16} />
                </Button>
              </Link>
            </div>

            {derniereAlerte ? (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Bell size={20} className="text-primary" weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold capitalize">
                      Alerte {derniereAlerte.niveau === "critique" ? "critique" : "modérée"}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {derniereAlerte.est_resolue ? "Résolue" : "Active"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Clock size={14} />
                    {new Date(derniereAlerte.date_alerte).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
                  </div>
                  {derniereAlerte.latitude && (
                    <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <MapPin size={14} />
                      {derniereAlerte.latitude}, {derniereAlerte.longitude}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">Pic mesuré</div>
                  <div className="text-lg font-bold text-primary">{derniereAlerte.valeur_gaz}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Aucune alerte enregistrée
              </div>
            )}
          </Card>

          {derniereAlerte?.latitude && (() => {
            const lat = Number(derniereAlerte.latitude);
            const lon = Number(derniereAlerte.longitude);
            const couleurPoint = derniereAlerte.niveau === "critique" ? "#ef4444" : "#f97316";
            return (
              <Card className="glass-card p-6 border-0 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">Carte des alertes</h3>
                    <p className="text-xs text-muted-foreground">Dernière position GPS connue</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank')}
                  >
                    Ouvrir <ArrowUpRight size={16} />
                  </Button>
                </div>
                <div className="relative h-56 rounded-xl overflow-hidden border border-border">
                  <iframe
                    title="Carte de la dernière alerte"
                    className="w-full h-full"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.015}%2C${lon + 0.02}%2C${lat + 0.015}&layer=mapnik&marker=${lat}%2C${lon}`}
                  />
                  <span
                    className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white pointer-events-none"
                    style={{ background: couleurPoint, boxShadow: `0 0 10px ${couleurPoint}` }}
                  />
                </div>
              </Card>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, sub, success }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  success?: boolean;
}) {
  return (
    <Card className="glass-card p-4 border-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon size={16} className={success ? "text-success" : "text-primary"} weight="fill" />
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </Card>
  );
}
