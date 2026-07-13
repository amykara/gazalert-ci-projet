import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, Eye, EyeSlash, ArrowRight, Users, House, LockKeyOpen, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api, setToken, setRefreshToken } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — GazAlert CI" }] }),
  component: LoginPage,
});

type Mode = "connexion" | "inscription" | "mdp_oublie";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("connexion");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailReset, setEmailReset] = useState('');
  const [resetEnvoye, setResetEnvoye] = useState(false);
  const [typeInscription, setTypeInscription] = useState<"proprietaire" | "famille">("proprietaire");
  const [codeInvit, setCodeInvit] = useState('');
  const [codeValide, setCodeValide] = useState<any>(null);
  const [validantCode, setValidantCode] = useState(false);

  // ─── CONNEXION ──────────────────────────────────────────────────────────────
  const handleConnexion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("pwd") as HTMLInputElement).value;

    setLoading(true);
    try {
      const data = await api.login(email, password);
      setToken(data.access);
      setRefreshToken(data.refresh);
      toast.success("Connexion réussie !");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.detail || "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  // ─── VÉRIFIER CODE INVITATION ───────────────────────────────────────────────
  const verifierCode = async (code: string) => {
    if (code.length < 5) { setCodeValide(null); return; }
    setValidantCode(true);
    try {
      const res = await api.validerInvitation(code.toUpperCase());
      setCodeValide(res);
    } catch {
      setCodeValide(false);
    } finally {
      setValidantCode(false);
    }
  };

  // ─── MOT DE PASSE OUBLIÉ ────────────────────────────────────────────────────
  const handleDemanderReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.demanderReinitialisation(emailReset);
      setResetEnvoye(true);
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  // ─── INSCRIPTION ────────────────────────────────────────────────────────────
  const handleInscription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    const payload: Record<string, string> = {
      nom: (form.elements.namedItem("nom") as HTMLInputElement).value,
      nom_utilisateur: (form.elements.namedItem("nom_utilisateur") as HTMLInputElement).value,
      email: (form.elements.namedItem("email_inscription") as HTMLInputElement).value,
      telephone: (form.elements.namedItem("telephone") as HTMLInputElement).value,
      password: (form.elements.namedItem("password") as HTMLInputElement).value,
      type_inscription: typeInscription,
    };

    if (typeInscription === "proprietaire") {
      payload.nom_foyer = (form.elements.namedItem("nom_foyer") as HTMLInputElement).value;
    } else {
      payload.code_invitation = codeInvit.toUpperCase();
      if (!codeValide?.valide) {
        toast.error("Code d'invitation invalide ou expiré.");
        return;
      }
    }

    setLoading(true);
    try {
      await api.inscription(payload);
      if (typeInscription === "proprietaire") {
        toast.success("Compte créé ! Vous pouvez vous connecter.");
        setMode("connexion");
      } else {
        try {
          const loginRes = await api.login(payload.email, payload.password);
          setToken(loginRes.access);
          setRefreshToken(loginRes.refresh);
          navigate({ to: '/' });
        } catch {
          setMode("connexion");
          toast.success("Inscription réussie ! Connectez-vous.");
        }
      }
    } catch (err: any) {
      const msg = Object.values(err || {}).flat().join(" ");
      toast.error(msg || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Flame size={32} weight="fill" className="text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">GazAlert CI</h1>
          <p className="text-muted-foreground mt-1 text-sm">Détection intelligente de fuites de gaz</p>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-border/50">
          <div className="flex gap-2 mb-6 bg-background/40 rounded-xl p-1">
            <button
              onClick={() => setMode("connexion")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "connexion" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Connexion
            </button>
            <button
              onClick={() => setMode("inscription")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === "inscription" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Inscription
            </button>
          </div>

          {/* ── CONNEXION ── */}
          {mode === "connexion" && (
            <form onSubmit={handleConnexion} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input id="email" name="email" type="email" placeholder="kara@gmail.com" className="bg-background/50 mt-1" required />
              </div>
              <div>
                <Label htmlFor="pwd" className="text-xs">Mot de passe</Label>
                <div className="relative mt-1">
                  <Input id="pwd" name="pwd" type={showPwd ? "text" : "password"} placeholder="••••••••" className="bg-background/50 pr-10" required />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPwd ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="text-right -mt-2">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setMode('mdp_oublie')}
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"} <ArrowRight size={16} weight="bold" />
              </Button>
            </form>
          )}

          {/* ── MOT DE PASSE OUBLIÉ ── */}
          {mode === "mdp_oublie" && (
            <div className="space-y-4">
              {resetEnvoye ? (
                <div className="text-center py-4 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-success/15 flex items-center justify-center mx-auto">
                    <CheckCircle size={24} className="text-success" weight="fill" />
                  </div>
                  <p className="font-semibold">Email envoyé !</p>
                  <p className="text-sm text-muted-foreground">
                    Si cet email existe, vous recevrez un lien de réinitialisation valable 15 minutes.
                  </p>
                  <button className="text-xs text-primary hover:underline" onClick={() => setMode("connexion")}>
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs">Votre adresse email</Label>
                    <Input
                      value={emailReset}
                      onChange={(e) => setEmailReset(e.target.value)}
                      type="email"
                      placeholder="votre@email.com"
                      className="bg-background/40 mt-1"
                    />
                  </div>
                  <Button className="w-full" onClick={handleDemanderReset} disabled={!emailReset || loading}>
                    {loading ? "Envoi..." : "Envoyer le lien"}
                  </Button>
                  <button className="text-xs text-primary hover:underline w-full text-center" onClick={() => setMode("connexion")}>
                    Retour à la connexion
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── INSCRIPTION ── */}
          {mode === "inscription" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  onClick={() => setTypeInscription("proprietaire")}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${typeInscription === "proprietaire" ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  <House size={24} weight={typeInscription === "proprietaire" ? "fill" : "regular"} className={typeInscription === "proprietaire" ? "text-primary" : "text-muted-foreground"} />
                  <span className="text-xs font-medium">Propriétaire</span>
                  <span className="text-[10px] text-muted-foreground text-center">Je crée mon foyer</span>
                </button>
                <button
                  onClick={() => setTypeInscription("famille")}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${typeInscription === "famille" ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  <Users size={24} weight={typeInscription === "famille" ? "fill" : "regular"} className={typeInscription === "famille" ? "text-primary" : "text-muted-foreground"} />
                  <span className="text-xs font-medium">Famille</span>
                  <span className="text-[10px] text-muted-foreground text-center">J'appartiens à un foyer</span>
                </button>
              </div>

              <form onSubmit={handleInscription} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nom complet</Label>
                    <Input name="nom" placeholder="Kara Coulibaly" className="bg-background/50 mt-1" required />
                  </div>
                  <div>
                    <Label className="text-xs">Nom d'utilisateur</Label>
                    <Input name="nom_utilisateur" placeholder="kara_ci" className="bg-background/50 mt-1" required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input name="email_inscription" type="email" placeholder="kara@gmail.com" className="bg-background/50 mt-1" required />
                </div>
                <div>
                  <Label className="text-xs">Téléphone</Label>
                  <Input name="telephone" placeholder="+225 07 ..." className="bg-background/50 mt-1" required />
                </div>
                <div>
                  <Label className="text-xs">Mot de passe</Label>
                  <div className="relative mt-1">
                    <Input name="password" type={showPwd ? "text" : "password"} placeholder="••••••••" className="bg-background/50 pr-10" required />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPwd ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {typeInscription === "proprietaire" && (
                  <div>
                    <Label className="text-xs">Nom du foyer</Label>
                    <Input name="nom_foyer" placeholder="Maison Cocody" className="bg-background/50 mt-1" />
                  </div>
                )}

                {typeInscription === "famille" && (
                  <div className="rounded-xl bg-primary/10 border border-primary/20 p-3">
                    <Label className="text-xs text-primary">Code d'invitation</Label>
                    <Input
                      value={codeInvit}
                      onChange={(e) => {
                        setCodeInvit(e.target.value.toUpperCase());
                        verifierCode(e.target.value);
                      }}
                      placeholder="Ex: GAZ-AB12CD"
                      className="bg-background/40 mt-1 border-primary/30"
                      maxLength={12}
                      required
                    />
                    {validantCode && (
                      <p className="text-[10px] text-muted-foreground mt-1">Vérification...</p>
                    )}
                    {codeValide === false && (
                      <p className="text-[10px] text-destructive mt-1">❌ Code invalide ou expiré</p>
                    )}
                    {codeValide && codeValide.valide && (
                      <p className="text-[10px] text-green-500 mt-1">
                        ✅ Foyer : {codeValide.foyer} — {codeValide.proprietaire}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">Le propriétaire devra approuver votre demande.</p>
                  </div>
                )}

                <Button type="submit" className="w-full gap-2 mt-1" disabled={loading}>
                  {loading ? "Création..." : "Créer mon compte"} <ArrowRight size={16} weight="bold" />
                </Button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          GazAlert CI · Système IoT de détection de fuites de gaz · Abidjan, Côte d'Ivoire
        </p>
      </div>
    </div>
  );
}