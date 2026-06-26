import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  validateSearch: (search) => ({ token: (search.token as string) || '' }),
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: '/verify-email' });
  const [statut, setStatut] = useState<'loading' | 'succes' | 'erreur'>('loading');

  useEffect(() => {
    if (!token) { setStatut('erreur'); return; }
    api.verifierEmail(token)
      .then(() => setStatut('succes'))
      .catch(() => setStatut('erreur'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto">
          <span className="text-2xl">📧</span>
        </div>
        <h1 className="text-2xl font-bold">GazAlert CI</h1>

        {statut === 'loading' && (
          <p className="text-muted-foreground">Vérification en cours...</p>
        )}

        {statut === 'succes' && (
          <div className="space-y-3">
            <CheckCircle size={48} className="text-success mx-auto" weight="fill" />
            <p className="font-semibold text-lg">Email vérifié !</p>
            <p className="text-sm text-muted-foreground">
              Votre compte est maintenant actif.
            </p>
            <Button className="w-full" onClick={() => { window.location.href = '/'; }}>
              Accéder au tableau de bord
            </Button>
          </div>
        )}

        {statut === 'erreur' && (
          <div className="space-y-3">
            <XCircle size={48} className="text-destructive mx-auto" weight="fill" />
            <p className="font-semibold text-lg">Lien invalide ou expiré</p>
            <p className="text-sm text-muted-foreground">
              Ce lien a expiré ou a déjà été utilisé.
            </p>
            <Button className="w-full" onClick={() => navigate({ to: '/' })}>
              Retour à l'application
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
