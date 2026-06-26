import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeSlash, CheckCircle } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  validateSearch: (search) => ({ token: (search.token as string) || '' }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: '/reset-password' });
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [showMdp, setShowMdp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [succes, setSucces] = useState(false);

  const handleReset = async () => {
    if (nouveauMdp !== confirmMdp) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (nouveauMdp.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setLoading(true);
    try {
      await api.reinitialiserMotDePasse(token, nouveauMdp);
      setSucces(true);
    } catch (e: any) {
      toast.error(e?.detail || "Token invalide ou expiré");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🔑</span>
          </div>
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="text-muted-foreground text-sm mt-1">GazAlert CI</p>
        </div>

        {succes ? (
          <div className="text-center space-y-3">
            <CheckCircle size={48} className="text-success mx-auto" weight="fill" />
            <p className="font-semibold">Mot de passe modifié !</p>
            <Button className="w-full" onClick={() => navigate({ to: '/login' })}>
              Se connecter
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nouveau mot de passe</Label>
              <div className="relative mt-1">
                <Input
                  value={nouveauMdp}
                  onChange={(e) => setNouveauMdp(e.target.value)}
                  type={showMdp ? "text" : "password"}
                  placeholder="Min. 6 caractères"
                  className="bg-background/40 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowMdp(!showMdp)}
                >
                  {showMdp ? <EyeSlash size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Confirmer le mot de passe</Label>
              <Input
                value={confirmMdp}
                onChange={(e) => setConfirmMdp(e.target.value)}
                type="password"
                placeholder="Répétez le mot de passe"
                className="bg-background/40 mt-1"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleReset}
              disabled={loading || !nouveauMdp || !confirmMdp}
            >
              {loading ? "Modification..." : "Modifier le mot de passe"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
