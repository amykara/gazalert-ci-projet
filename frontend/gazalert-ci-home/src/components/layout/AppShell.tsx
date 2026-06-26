import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  SquaresFour, ClockCounterClockwise, PhoneCall, ChatText,
  ShieldCheck, Gear, Bell, Users, Sun, Moon, SignOut,
  BellRinging, WifiSlash, UserCirclePlus, Warning
} from "@phosphor-icons/react";
import { Logo } from "./Logo";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { removeToken, api } from "@/lib/api";

type NavItem = { to: string; label: string; icon: React.ElementType; exact?: boolean };

const getNav = (role: string): NavItem[] => {
  const base: NavItem[] = [
    { to: "/", label: "Tableau de bord", icon: SquaresFour, exact: true },
    { to: "/alertes", label: "Historique", icon: ClockCounterClockwise },
    { to: "/urgences", label: "Urgences", icon: PhoneCall },
    { to: "/securite", label: "Sécurité", icon: ShieldCheck },
    { to: "/parametres", label: "Paramètres", icon: Gear },
  ];

  if (role === 'proprietaire' || role === 'gestionnaire') {
    base.splice(3, 0, { to: "/sms", label: "Destinataires", icon: ChatText });
  }

  if (role === 'proprietaire') {
    base.splice(4, 0, { to: "/famille", label: "Ma Famille", icon: Users });
  }

  return base;
};

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [initiale, setInitiale] = useState("?");
  const [role, setRole] = useState<string>('membre');
  const [notifCount, setNotifCount] = useState(0);
  const [statutAppareil, setStatutAppareil] = useState<string>("hors_ligne");
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifDetails, setNotifDetails] = useState<any[]>([]);
  const [isVerified, setIsVerified] = useState(true);
  const [renvoyant, setRenvoyant] = useState(false);


  useEffect(() => {
    if (pathname === "/login") return;

    // Charger le profil pour l'initiale et le rôle
    api.getProfil()
      .then((p) => {
        setInitiale(p.nom?.charAt(0).toUpperCase() || "?");
        setRole(p.role || 'membre');
        setIsVerified(p.is_verified || false);
      })
      .catch(() => {});

    // Charger les notifications
    let ancienCount = -1;
    const chargerNotifs = () => {
      api.getNotifications()
        .then((notifs) => {
          const nonLues = notifs.filter((n: any) => !n.est_lue);

          // Jouer son si nouvelles notifications
          if (nonLues.length > ancienCount && ancienCount >= 0) {
            const derniereNotif = nonLues[0];
            if (derniereNotif?.type_notification === 'demande_approbation') {
              new Audio('/notif_approbation.mp3').play().catch(() => {});
            } else if (derniereNotif?.type_notification === 'systeme_inactif') {
              new Audio('/notif_inactif.mp3').play().catch(() => {});
            }
          }
          ancienCount = nonLues.length;

          setNotifCount(nonLues.length);
          setNotifDetails(notifs.slice(0, 10));
        })
        .catch(() => {});
    };

    chargerNotifs();
    const chargerStatut = () => {
  api.getStatutAppareil()
    .then((a) => setStatutAppareil(a.statut))
    .catch(() => setStatutAppareil("hors_ligne"));
};

chargerStatut();
const intervalStatut = setInterval(chargerStatut, 5000);
    const interval = setInterval(chargerNotifs, 5000);
return () => {
  clearInterval(interval);
  clearInterval(intervalStatut);
};  }, [pathname]);

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  const handleDeconnexion = () => {
    removeToken();
    navigate({ to: "/login" });
  };

  const renvoyerEmail = async () => {
    setRenvoyant(true);
    try {
      await api.envoyerVerification();
      toast.success("Email de vérification envoyé !");
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setRenvoyant(false);
    }
  };

  if (pathname === "/login") {
    return (
      <>
        <Outlet />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <div className="min-h-screen flex w-full text-foreground">
      {/* ── Sidebar desktop ── */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl sticky top-0 h-screen">
        <div className="px-6 py-6 border-b border-sidebar-border">
          <Logo />
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {getNav(role).map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_oklch(0.7_0.2_38/0.25)]"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} />
                <span>{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
         <div className="glass-card rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${statutAppareil === "hors_ligne" ? "bg-muted-foreground" : "bg-success animate-pulse"}`} />
              <span className="text-muted-foreground">
                {statutAppareil === "hors_ligne" ? "Capteur déconnecté" :
                statutAppareil === "alerte_critique" ? "Alerte critique !" :
                statutAppareil === "alerte_moderee" ? "Alerte modérée" :
                statutAppareil === "prechauffage" ? "Préchauffage..." :
                "Capteur MQ-2 connecté"}
              </span>
            </div>
          </div>
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent transition-all"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === "dark" ? "Mode clair" : "Mode sombre"}</span>
          </button>
          <button
            onClick={handleDeconnexion}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <SignOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!isVerified && pathname !== "/login" && (
          <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Warning size={16} className="text-primary shrink-0" weight="fill" />
              <span>Votre email n'est pas vérifié. Consultez votre boîte email.</span>
            </div>
            <button
              className="text-xs text-primary hover:underline shrink-0"
              onClick={renvoyerEmail}
              disabled={renvoyant}
            >
              {renvoyant ? "Envoi..." : "Renvoyer"}
            </button>
          </div>
        )}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-16">
            <div className="lg:hidden"><Logo compact /></div>
            <div className="hidden lg:block">
              <h1 className="text-sm text-muted-foreground">Surveillance temps réel · MQ-2 Gaz</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggle}>
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </Button>

              {/* Dropdown notifications */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => setShowNotifs(!showNotifs)}
                >
                  <Bell size={20} />
                  {notifCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-bold">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </Button>

                {showNotifs && (
                  <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                  <div className="absolute right-0 top-12 w-80 z-50 rounded-xl border border-border bg-background/95 backdrop-blur-xl shadow-xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="font-semibold text-sm">Notifications</span>
                      <button
                        className="text-xs text-primary"
                        onClick={async () => {
                          const nonLues = notifDetails.filter((n: any) => !n.est_lue);
                          await Promise.all(nonLues.map((n: any) => api.marquerLue(n.id)));
                          setNotifCount(0);
                          setNotifDetails(notifDetails.map((n: any) => ({ ...n, est_lue: true })));
                        }}
                      >
                        Tout marquer lu
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                      {notifDetails.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          Aucune notification
                        </div>
                      ) : (
                        notifDetails.map((n: any) => (
                          <div
                            key={n.id}
                            className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${!n.est_lue ? 'bg-primary/5' : ''}`}
                            onClick={async () => {
                              if (!n.est_lue) {
                                await api.marquerLue(n.id);
                                setNotifCount(prev => Math.max(0, prev - 1));
                                setNotifDetails(notifDetails.map((x: any) => x.id === n.id ? { ...x, est_lue: true } : x));
                              }
                              setShowNotifs(false);
                              navigate({ to: '/alertes' });
                            }}
                          >
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              n.type_notification === 'alerte_gaz' ? 'bg-destructive/15 text-destructive' :
                              n.type_notification === 'systeme_inactif' ? 'bg-muted text-muted-foreground' :
                              'bg-primary/15 text-primary'
                            }`}>
                              {n.type_notification === 'alerte_gaz' ? <BellRinging size={16} weight="fill" /> :
                               n.type_notification === 'systeme_inactif' ? <WifiSlash size={16} weight="fill" /> :
                               <UserCirclePlus size={16} weight="fill" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium">
                                {n.type_notification === 'alerte_gaz' ? '🚨 Alerte gaz' :
                                 n.type_notification === 'systeme_inactif' ? '⚠️ Système inactif' :
                                 '👤 Demande d\'approbation'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {n.message || (n.alerte_detail ? `Niveau ${n.alerte_detail.niveau} — ${n.alerte_detail.valeur_gaz} ppm` : '')}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(n.date_envoi).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                              </div>
                            </div>
                            {!n.est_lue && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-4 py-2 border-t border-border">
                      <button
                        className="text-xs text-primary w-full text-center"
                        onClick={() => { setShowNotifs(false); navigate({ to: '/alertes' }); }}
                      >
                        Voir tout l'historique
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>

              {/* Déconnexion mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeconnexion}
                className="lg:hidden text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                title="Déconnexion"
              >
                <SignOut size={20} />
              </Button>

              {/* Avatar avec initiale dynamique */}
              <div className="hidden lg:flex h-9 w-9 rounded-full bg-gradient-to-br from-primary to-[oklch(0.65_0.22_28)] items-center justify-center text-sm font-semibold text-primary-foreground cursor-pointer">
                {initiale}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Bottom nav mobile ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${getNav(role).length}, minmax(0, 1fr))` }}>
          {getNav(role).map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon size={20} weight={active ? "fill" : "regular"} />
                <span className="truncate max-w-full px-1">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster position="top-right" richColors />
    </div>
  );
}