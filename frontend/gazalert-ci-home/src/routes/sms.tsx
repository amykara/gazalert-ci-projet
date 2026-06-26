import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChatText, Plus, Trash, Warning } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/sms")({
  head: () => ({ meta: [{ title: "Destinataires SMS — GazAlert CI" }] }),
  component: SmsPage,
});

const MAX = 5;

function SmsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    api.getProfil().then((p) => setRole(p.role || 'membre')).catch(() => setRole('membre'));
  }, []);

  useEffect(() => {
    api.getContacts()
      .then(setContacts)
      .catch(() => toast.error("Erreur lors du chargement des contacts"))
      .finally(() => setLoading(false));
  }, []);

  if (role === null) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Chargement...
    </div>
  );

  if (role === 'membre') {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Vous n'avez pas accès à cette page.</p>
      </div>
    );
  }

  const add = async () => {
    if (contacts.length >= MAX) return toast.error(`Maximum ${MAX} destinataires`);
    if (!name.trim() || !phone.trim()) return toast.error("Nom et numéro requis");
    setSaving(true);
    try {
      const nouveau = await api.ajouterContact({ nom: name, telephone: phone, est_actif: true });
      setContacts([...contacts, nouveau]);
      setName("");
      setPhone("");
      toast.success("Destinataire ajouté");
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (contact: any) => {
    try {
      const updated = await api.modifierContact(contact.id, { est_actif: !contact.est_actif });
      setContacts(contacts.map((c) => (c.id === contact.id ? updated : c)));
    } catch {
      toast.error("Erreur lors de la modification");
    }
  };

  const supprimer = async () => {
    if (!confirm) return;
    try {
      await api.supprimerContact(confirm);
      setContacts(contacts.filter((c) => c.id !== confirm));
      toast.success("Destinataire supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Notifications SMS</div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Destinataires</h1>
          <p className="text-muted-foreground mt-1 text-sm">{contacts.length} / {MAX} numéros configurés</p>
        </div>
        <Card className="glass-card border-0 px-4 py-3 flex items-center gap-3 text-sm">
          <Warning size={16} className="text-primary" weight="fill" />
          <span>Tous les destinataires actifs reçoivent les alertes critiques.</span>
        </Card>
      </div>

      <Card className="glass-card p-6 border-0">
        <h2 className="font-semibold mb-3">Ajouter un destinataire</h2>
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
          <div>
            <Label htmlFor="rname" className="text-xs">Nom</Label>
            <Input
              id="rname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Maman"
              className="bg-background/50 mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rphone" className="text-xs">Numéro de téléphone</Label>
            <Input
              id="rphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 07 ..."
              className="bg-background/50 mt-1"
            />
          </div>
          <Button
            onClick={add}
            disabled={contacts.length >= MAX || saving}
            className="md:self-end gap-2 h-10"
          >
            <Plus size={16} weight="bold" />
            {saving ? "Ajout..." : "Ajouter"}
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucun destinataire configuré
          </div>
        ) : (
          contacts.slice(0, MAX).map((c, i) => (
            <Card
              key={c.id}
              className="glass-card border-0 p-4 flex items-center gap-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${c.est_actif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                <ChatText size={20} weight={c.est_actif ? "fill" : "regular"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{c.nom}</div>
                <div className="text-sm text-muted-foreground tabular-nums">{c.telephone}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {c.est_actif ? "Actif" : "Désactivé"}
                </span>
                <Switch checked={c.est_actif} onCheckedChange={() => toggle(c)} />
                <Button size="icon" variant="ghost" onClick={() => setConfirm(c.id)}>
                  <Trash size={16} className="text-destructive" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce destinataire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce numéro ne recevra plus les alertes SMS de GazAlert CI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={supprimer}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}