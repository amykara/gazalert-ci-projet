import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, UserCirclePlus, CheckCircle, XCircle, ClockCounterClockwise, Trash, PencilSimple, ArrowsClockwise, Plus } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/famille")({
  head: () => ({ meta: [{ title: "Ma Famille — GazAlert CI" }] }),
  component: FamillePage,
});

function initials(nom: string) {
  return nom.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function FamillePage() {
  const [membres, setMembres] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [confirmSupprimer, setConfirmSupprimer] = useState<number | null>(null);
  const [confirmDesapprouver, setConfirmDesapprouver] = useState<number | null>(null);
  const [codeInvitation, setCodeInvitation] = useState<string | null>(null);
  const [expireInvitation, setExpireInvitation] = useState<string | null>(null);
  const [generant, setGenerant] = useState(false);

  useEffect(() => {
    api.getProfil().then((p) => setRole(p.role || 'membre')).catch(() => setRole('membre'));
  }, []);

  useEffect(() => {
    Promise.all([api.getMembres(), api.getRoles()])
      .then(([membresData, rolesData]) => {
        setMembres(membresData);
        setRoles(rolesData);
      })
      .catch(() => toast.error("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, []);

  if (role === null) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Chargement...
    </div>
  );

  if (role !== 'proprietaire') {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Vous n'avez pas accès à cette page.</p>
      </div>
    );
  }

  const approuver = async (id: number) => {
    try {
      const updated = await api.membreAction(id, { action: "approuver" });
      setMembres(membres.map((m) => m.id === id ? updated : m));
      toast.success("Membre approuvé");
    } catch {
      toast.error("Erreur lors de l'approbation");
    }
  };

  const desapprouver = async (id: number) => {
    try {
      const updated = await api.membreAction(id, { action: "desapprouver" });
      setMembres(membres.map((m) => m.id === id ? updated : m));
      toast.success("Membre désapprouvé");
    } catch {
      toast.error("Erreur lors de la désapprobation");
    }
  };

  const supprimer = async (id: number) => {
    try {
      await api.supprimerMembre(id);
      setMembres(membres.filter((m) => m.id !== id));
      toast.success("Membre retiré");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const changerRole = async (id: number, role_id: number) => {
    try {
      const updated = await api.membreAction(id, { action: "changer_role", role_id });
      setMembres(membres.map((m) => m.id === id ? updated : m));
      setEditingRole(null);
      toast.success("Rôle modifié");
    } catch {
      toast.error("Erreur lors du changement de rôle");
    }
  };

  const genererInvitation = async () => {
    setGenerant(true);
    try {
      const res = await api.genererInvitation();
      setCodeInvitation(res.code);
      setExpireInvitation(res.expire_le);
      toast.success("Code d'invitation généré !");
    } catch {
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerant(false);
    }
  };

  const approuves = membres.filter((m) => m.statut === "approuve");
  const enAttente = membres.filter((m) => m.statut === "en_attente");
  const desapprouves = membres.filter((m) => m.statut === "desapprouve");

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-3xl">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Gestion</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">Ma Famille</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gérez les membres qui peuvent accéder à votre tableau de bord en temps réel.
        </p>
      </div>

      {/* Droits par rôle */}
      <Card className="glass-card border-0 p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Droits par rôle</p>
        <div className="grid grid-cols-4 gap-3 text-xs">
        {[
          { label: "Action", col1: "Propriétaire", col2: "Gestionnaire", col3: "Membre" },
          { label: "Voir le tableau de bord", col1: "✅", col2: "✅", col3: "✅" },
          { label: "Voir l'historique", col1: "✅", col2: "✅", col3: "✅" },
          { label: "Recevoir les notifications", col1: "✅", col2: "✅", col3: "✅" },
          { label: "Gérer les contacts SMS", col1: "✅", col2: "✅", col3: "❌" },
          { label: "Modifier le profil foyer", col1: "✅", col2: "✅", col3: "❌" },
          { label: "Approuver les membres", col1: "✅", col2: "❌", col3: "❌" },
        ].map((row, i) => (
          <div key={i} className="contents">
            <span className={`py-1 ${i === 0 ? "font-semibold text-muted-foreground" : ""}`}>{row.label}</span>
            <span className={`py-1 text-center ${i === 0 ? "font-semibold" : ""}`}>{row.col1}</span>
            <span className={`py-1 text-center ${i === 0 ? "font-semibold" : ""}`}>{row.col2}</span>
            <span className={`py-1 text-center ${i === 0 ? "font-semibold" : ""}`}>{row.col3}</span>
          </div>
        ))}
      </div>
      </Card>

      {/* Demandes en attente */}
      {enAttente.length > 0 && (
        <Card className="glass-card border-0 border-l-4 border-l-primary p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClockCounterClockwise size={18} className="text-primary" weight="fill" />
            <h2 className="font-semibold text-sm">Demandes en attente ({enAttente.length})</h2>
          </div>
          <div className="space-y-3">
            {enAttente.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border">
                <div className="h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {initials(m.utilisateur_detail?.nom || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{m.utilisateur_detail?.nom}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.utilisateur_detail?.email} · Demande le {new Date(m.date_demande).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="gap-1.5 h-8" onClick={() => approuver(m.id)}>
                    <CheckCircle size={14} weight="fill" /> Approuver
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-destructive hover:text-destructive" onClick={() => setConfirmSupprimer(m.id)}>
                    <XCircle size={14} weight="fill" /> Refuser
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Membres actifs */}
      <Card className="glass-card border-0 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-success" weight="fill" />
          <h2 className="font-semibold text-sm">Membres actifs ({approuves.length})</h2>
        </div>
        {approuves.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <UserCirclePlus size={36} className="mx-auto mb-2 opacity-30" />
            <p>Aucun membre actif pour l'instant</p>
          </div>
        ) : (
          <div className="space-y-3">
            {approuves.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-border"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="h-10 w-10 rounded-xl bg-success/15 text-success flex items-center justify-center font-bold text-sm shrink-0">
                  {initials(m.utilisateur_detail?.nom || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{m.utilisateur_detail?.nom}</span>
                    {editingRole === m.id ? (
                      <Select
                        value={m.role_detail?.id?.toString()}
                        onValueChange={(v) => changerRole(m.id, parseInt(v))}
                      >
                        <SelectTrigger className="h-6 text-[11px] w-36 bg-background/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={r.id.toString()}>{r.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/15 text-primary">
                        {m.role_detail?.nom}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.utilisateur_detail?.email}</div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => setEditingRole(editingRole === m.id ? null : m.id)}
                  >
                    {editingRole === m.id
                      ? <ArrowsClockwise size={15} className="text-primary" />
                      : <PencilSimple size={15} />}
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setConfirmDesapprouver(m.id)}
                  >
                    <XCircle size={16} />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => setConfirmSupprimer(m.id)}
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Membres désapprouvés */}
      {desapprouves.length > 0 && (
        <Card className="glass-card border-0 p-5">
          <div className="flex items-center gap-2 mb-4">
            <XCircle size={18} className="text-muted-foreground" />
            <h2 className="font-semibold text-sm text-muted-foreground">Désapprouvés ({desapprouves.length})</h2>
          </div>
          <div className="space-y-3">
            {desapprouves.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/20 border border-border opacity-60">
                <div className="h-10 w-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm shrink-0">
                  {initials(m.utilisateur_detail?.nom || "?")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{m.utilisateur_detail?.nom}</div>
                  <div className="text-xs text-muted-foreground">{m.utilisateur_detail?.email}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="gap-1.5 h-8 text-success hover:text-success" onClick={() => approuver(m.id)}>
                    <CheckCircle size={14} weight="fill" /> Réactiver
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setConfirmSupprimer(m.id)}>
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Inviter un membre */}
      <Card className="glass-card border-0 p-5 border border-dashed border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserCirclePlus size={20} />
            </div>
            <div>
              <div className="font-medium text-sm">Inviter un membre</div>
              <div className="text-xs text-muted-foreground mt-1">
                Générez un code valable 24h et partagez-le.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={genererInvitation}
            disabled={generant}
            className="gap-2"
          >
            <Plus size={14} weight="bold" />
            {generant ? "Génération..." : "Générer"}
          </Button>
        </div>

        {codeInvitation && (
          <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="text-xs text-muted-foreground mb-1">Code d'invitation</div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold tracking-widest text-primary">
                {codeInvitation}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(codeInvitation!);
                    toast.success("Code copié !");
                  } catch {
                    const el = document.createElement('textarea');
                    el.value = codeInvitation!;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                    toast.success("Code copié !");
                  }
                }}
              >
                Copier
              </Button>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ⏱ Expire le {expireInvitation} — usage unique
            </div>
          </div>
        )}
      </Card>

      <AlertDialog open={!!confirmSupprimer} onOpenChange={(o) => !o && setConfirmSupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre sera retiré définitivement de votre foyer. Il devra faire une nouvelle demande pour rejoindre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { supprimer(confirmSupprimer!); setConfirmSupprimer(null); }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDesapprouver} onOpenChange={(o) => !o && setConfirmDesapprouver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désapprouver ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre perdra l'accès au tableau de bord. Vous pourrez le réactiver plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { desapprouver(confirmDesapprouver!); setConfirmDesapprouver(null); }}>
              Désapprouver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}