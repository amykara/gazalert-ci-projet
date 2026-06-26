import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, SpeakerHigh, User, MapPin, Gauge, FloppyDisk, UserCirclePlus, LockKey, Copy, House } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { api, removeToken, getToken } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/parametres")({
  head: () => ({ meta: [{ title: "Paramètres — GazAlert CI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [push, setPush] = useState(() => typeof window !== 'undefined' ? localStorage.getItem("notif_push") !== "false" : true);
  const [sound, setSound] = useState(() => typeof window !== 'undefined' ? localStorage.getItem("son_alerte") !== "false" : true);
  const [moderate, setModerate] = useState([300]);
  const [critical, setCritical] = useState([700]);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string>('membre');
  const [codeInvit, setCodeInvit] = useState('');
  const [codeValide, setCodeValide] = useState<any>(null);
  const [envoyerDemande, setEnvoyerDemande] = useState(false);
  const [sansFoyer, setSansFoyer] = useState(false);
  const [token, setToken] = useState('');
  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [changingMdp, setChangingMdp] = useState(false);

  // Profil
  const [nom, setNom] = useState("");
  const [nomUtilisateur, setNomUtilisateur] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");

  // Foyer
  const [nomFoyer, setNomFoyer] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [adresseRepere, setAdresseRepere] = useState("");

  useEffect(() => {
    const charger = async () => {
      try {
        const profilData = await api.getProfil();
        setNom(profilData.nom || "");
        setNomUtilisateur(profilData.nom_utilisateur || "");
        setTelephone(profilData.telephone || "");
        setEmail(profilData.email || "");
        setRole(profilData.role || 'membre');

        if (!profilData.role || profilData.role === 'membre') {
          try {
            const foyerData = await api.getFoyer();
            setNomFoyer(foyerData.nom_foyer || "");
            setLatitude(foyerData.latitude || "");
            setLongitude(foyerData.longitude || "");
            setAdresseRepere(foyerData.adresse_repere || "");
          } catch {
            setSansFoyer(true);
          }
        } else {
          const foyerData = await api.getFoyer();
          setNomFoyer(foyerData.nom_foyer || "");
          setLatitude(foyerData.latitude || "");
          setLongitude(foyerData.longitude || "");
          setAdresseRepere(foyerData.adresse_repere || "");
        }
      } catch (e: any) {
        if (
          e?.detail === 'No active account found with the given credentials' ||
          e?.code === 'token_not_valid' ||
          !getToken()
        ) {
          removeToken();
          navigate({ to: '/login' });
        } else {
          toast.error("Erreur lors du chargement des paramètres");
        }
      }

      try {
        const appareilData = await api.getStatutAppareil();
        setModerate([appareilData.seuil_modere || 300]);
        setCritical([appareilData.seuil_critique || 700]);
        setToken(appareilData.token || '');
      } catch {
        // Pas d'appareil, valeurs par défaut
      }
    };

    charger();
  }, []);

  const changerMotDePasse = async () => {
    if (nouveauMdp !== confirmMdp) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (nouveauMdp.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setChangingMdp(true);
    try {
      await api.changerMotDePasse(ancienMdp, nouveauMdp);
      toast.success("Mot de passe modifié avec succès");
      setAncienMdp('');
      setNouveauMdp('');
      setConfirmMdp('');
    } catch (e: any) {
      toast.error(e?.detail || "Erreur lors du changement de mot de passe");
    } finally {
      setChangingMdp(false);
    }
  };

  const verifierCode = async (code: string) => {
    if (code.length < 5) { setCodeValide(null); return; }
    try {
      const res = await api.validerInvitation(code.toUpperCase());
      setCodeValide(res);
    } catch {
      setCodeValide(false);
    }
  };

  const envoyerDemandeApprobation = async () => {
    setEnvoyerDemande(true);
    try {
      await api.rejoindreForyer(codeInvit.toUpperCase());
      toast.success("Demande envoyée ! En attente d'approbation.");
      setSansFoyer(false);
    } catch (e: any) {
      toast.error(e?.detail || "Erreur lors de l'envoi de la demande");
    } finally {
      setEnvoyerDemande(false);
    }
  };

  const enregistrer = async () => {
    setSaving(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem("notif_push", push.toString());
      localStorage.setItem("son_alerte", sound.toString());
    }
    try {
      const promises: Promise<any>[] = [api.updateProfil({ nom, telephone })];
      if (role === 'proprietaire') {
        promises.push(api.updateFoyer({ nom_foyer: nomFoyer, latitude, longitude, adresse_repere: adresseRepere }));
      }
      await Promise.all(promises);
      toast.success("Paramètres enregistrés");
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const estProprietaire = role === 'proprietaire';

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Configuration</div>
        <h1 className="text-3xl md:text-4xl font-bold mt-1">Paramètres</h1>
        <p className="text-muted-foreground mt-1 text-sm">Personnalisez votre système GazAlert.</p>
      </div>

      {/* Rejoindre un foyer */}
      {sansFoyer && (
        <Card className="glass-card border-0 p-6 border border-primary/30">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <UserCirclePlus size={20} weight="duotone" />
            </div>
            <div>
              <h2 className="font-semibold">Rejoindre un foyer</h2>
              <p className="text-xs text-muted-foreground">
                Vous n'appartenez à aucun foyer. Envoyez une demande à un propriétaire.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Code d'invitation</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={codeInvit}
                  onChange={(e) => {
                    setCodeInvit(e.target.value.toUpperCase());
                    verifierCode(e.target.value);
                  }}
                  placeholder="Ex: GAZ-AB12CD"
                  className="bg-background/50 flex-1"
                  maxLength={12}
                />
                {codeValide === false && (
                  <span className="text-destructive flex items-center text-xs">❌ Code invalide ou expiré</span>
                )}
                {codeValide && codeValide.valide && (
                  <span className="text-success flex items-center text-xs">✅ {codeValide.foyer}</span>
                )}
              </div>
            </div>
            <Button
              onClick={envoyerDemandeApprobation}
              disabled={!codeValide?.valide || envoyerDemande}
              className="w-full gap-2"
            >
              {envoyerDemande ? "Envoi..." : "Envoyer la demande"}
            </Button>
          </div>
        </Card>
      )}

      {/* Seuils */}
      <Card className="glass-card border-0 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Gauge size={20} weight="duotone" />
          </div>
          <div>
            <h2 className="font-semibold">Seuils d'alerte</h2>
            <p className="text-xs text-muted-foreground">Calculés automatiquement par le capteur MQ-2 au démarrage</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-background/50 border border-border/40">
            <div>
              <div className="text-sm font-medium">Alerte modérée</div>
              <div className="text-xs text-muted-foreground">Calculé automatiquement par calibration au démarrage du système.</div>
            </div>
            <span className="text-lg tabular-nums text-primary font-bold shrink-0 ml-4">{moderate[0]} ppm</span>
          </div>
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-background/50 border border-border/40">
            <div>
              <div className="text-sm font-medium">Alerte critique</div>
              <div className="text-xs text-muted-foreground">Calculé automatiquement par calibration au démarrage du système.</div>
            </div>
            <span className="text-lg tabular-nums text-destructive font-bold shrink-0 ml-4">{critical[0]} ppm</span>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="glass-card border-0 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <Bell size={20} weight="duotone" />
          </div>
          <div>
            <h2 className="font-semibold">Notifications</h2>
            <p className="text-xs text-muted-foreground">Préférences d'alerte</p>
          </div>
        </div>
        <div className="space-y-1">
          <Row icon={Bell} title="Notifications push" desc="Recevoir les alertes dans le navigateur" value={push} onChange={setPush} />
          <Separator className="my-1" />
          <Row icon={SpeakerHigh} title="Son d'alerte" desc="Jouer une sirène à chaque alerte critique" value={sound} onChange={setSound} />
        </div>
      </Card>

      {/* Profil */}
      <Card className="glass-card border-0 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <User size={20} weight="duotone" />
          </div>
          <div>
            <h2 className="font-semibold">Profil utilisateur</h2>
            <p className="text-xs text-muted-foreground">Informations personnelles</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Nom complet</Label>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} className="bg-background/50 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Nom d'utilisateur</Label>
            <Input value={nomUtilisateur} disabled className="bg-background/50 mt-1 opacity-60" />
          </div>
          <div>
            <Label className="text-xs">Téléphone</Label>
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} className="bg-background/50 mt-1" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={email} disabled type="email" className="bg-background/50 mt-1 opacity-60" />
          </div>
          {!sansFoyer && (
            <div className="md:col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <House size={12} /> Nom du foyer
              </Label>
              {estProprietaire ? (
                <Input
                  value={nomFoyer}
                  onChange={(e) => setNomFoyer(e.target.value)}
                  placeholder="Ex: Foyer Famille Kouamé"
                  className="bg-background/50 mt-1"
                />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground px-3 py-2 rounded-md bg-background/50 border border-border/40">
                  {nomFoyer || "—"}
                </p>
              )}
            </div>
          )}
          {estProprietaire && token && (
            <div className="md:col-span-2">
              <Label className="text-xs">Token de l'appareil</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={token}
                  disabled
                  className="bg-background/50 flex-1 font-mono text-xs opacity-80"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(token);
                      toast.success("Token copié !");
                    } catch {
                      const el = document.createElement('textarea');
                      el.value = token;
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand('copy');
                      document.body.removeChild(el);
                      toast.success("Token copié !");
                    }
                  }}
                  title="Copier le token"
                  className="shrink-0"
                >
                  <Copy size={16} />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Ce token est utilisé pour connecter votre capteur GazAlert à l'application.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button size="lg" className="gap-2" onClick={enregistrer} disabled={saving}>
            <FloppyDisk size={18} weight="fill" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </Card>

      {/* Localisation */}
      {!sansFoyer && (
        <Card className="glass-card border-0 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <MapPin size={20} weight="duotone" />
            </div>
            <div>
              <h2 className="font-semibold">Localisation</h2>
              <p className="text-xs text-muted-foreground">
                Position GPS du capteur
                {!estProprietaire && " — lecture seule"}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {latitude && longitude ? (
              <div className="rounded-xl overflow-hidden border border-border/50 h-64">
                <iframe
                  src={`https://www.google.com/maps?q=${latitude},${longitude}&output=embed`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  title="Localisation du foyer"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground">
                Aucune coordonnée GPS enregistrée — le capteur mettra à jour la position automatiquement.
              </div>
            )}
            <div>
              <Label className="text-xs">Adresse / Repère (quartier, rue, terminus...)</Label>
              {estProprietaire ? (
                <Input
                  value={adresseRepere}
                  onChange={(e) => setAdresseRepere(e.target.value)}
                  placeholder="Ex: Quartier Cocody, Rue des Jardins, Terminus Adjamé..."
                  className="bg-background/50 mt-1"
                />
              ) : (
                <p className="mt-1 text-sm text-muted-foreground px-3 py-2 rounded-md bg-background/50 border border-border/40">
                  {adresseRepere || "—"}
                </p>
              )}
            </div>
          </div>
          {estProprietaire && (
            <div className="flex justify-end mt-4">
              <Button size="lg" className="gap-2" onClick={enregistrer} disabled={saving}>
                <FloppyDisk size={18} weight="fill" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Changer le mot de passe */}
      <Card className="glass-card border-0 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <LockKey size={20} weight="duotone" />
          </div>
          <div>
            <h2 className="font-semibold">Changer le mot de passe</h2>
            <p className="text-xs text-muted-foreground">Mettez à jour votre mot de passe</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Ancien mot de passe</Label>
            <Input
              value={ancienMdp}
              onChange={(e) => setAncienMdp(e.target.value)}
              type="password"
              placeholder="Votre mot de passe actuel"
              className="bg-background/50 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Nouveau mot de passe</Label>
            <Input
              value={nouveauMdp}
              onChange={(e) => setNouveauMdp(e.target.value)}
              type="password"
              placeholder="Min. 6 caractères"
              className="bg-background/50 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Confirmer le mot de passe</Label>
            <Input
              value={confirmMdp}
              onChange={(e) => setConfirmMdp(e.target.value)}
              type="password"
              placeholder="Répétez le nouveau mot de passe"
              className="bg-background/50 mt-1"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button
            onClick={changerMotDePasse}
            disabled={changingMdp || !ancienMdp || !nouveauMdp || !confirmMdp}
            className="gap-2"
          >
            <LockKey size={16} weight="fill" />
            {changingMdp ? "Modification..." : "Modifier le mot de passe"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Row({ icon: Icon, title, desc, value, onChange }: {
  icon: React.ElementType;
  title: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-2">
      <Icon size={16} className="text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
