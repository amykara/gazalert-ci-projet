//contient les fonctions pour appeler le Backend djan

const BASE_URL = import.meta.env.VITE_API_URL
  ?? (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000/api`
    : 'http://localhost:8000/api');// ─── GESTION DU TOKEN JWT ─────────────────────────────────────────────────────
export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const setToken = (token: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
};
export const isAuthenticated = () => !!getToken();

// ─── FONCTION DE BASE POUR LES REQUÊTES ──────────────────────────────────────
async function request(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw data;
  return data;
}

// ─── AUTHENTIFICATION ─────────────────────────────────────────────────────────
export const api = {
  // Connexion
  login: (email: string, password: string) =>
    request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Inscription
  inscription: (data: object) =>
    request('/auth/inscription/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Vérifier si un propriétaire existe
  verifierProprietaire: (nom_utilisateur: string) =>
    request(`/auth/verifier-proprietaire/?nom_utilisateur=${nom_utilisateur}`),

  // Vérification email
  envoyerVerification: () =>
    request('/auth/envoyer-verification/', { method: 'POST' }),

  verifierEmail: (token: string) =>
    request('/auth/verifier-email/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  demanderReinitialisation: (email: string) =>
    request('/auth/demander-reinitialisation/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  reinitialiserMotDePasse: (token: string, nouveau_mot_de_passe: string) =>
    request('/auth/reinitialiser-mot-de-passe/', {
      method: 'POST',
      body: JSON.stringify({ token, nouveau_mot_de_passe }),
    }),

  // Changer mot de passe (authentifié)
  changerMotDePasse: (ancien_mot_de_passe: string, nouveau_mot_de_passe: string) =>
    request('/auth/changer-mot-de-passe/', {
      method: 'POST',
      body: JSON.stringify({ ancien_mot_de_passe, nouveau_mot_de_passe }),
    }),

  // Mot de passe oublié
  motDePasseOublie: (email: string, nouveau_mot_de_passe: string) =>
    request('/auth/mot-de-passe-oublie/', {
      method: 'POST',
      body: JSON.stringify({ email, nouveau_mot_de_passe }),
    }),

  // ─── PROFIL ────────────────────────────────────────────────────────────────
  getProfil: () => request('/profil/'),
  updateProfil: (data: object) =>
    request('/profil/', { method: 'PUT', body: JSON.stringify(data) }),

  // ─── FOYER ─────────────────────────────────────────────────────────────────
  getFoyer: () => request('/foyer/'),
  updateFoyer: (data: object) =>
    request('/foyer/', { method: 'PUT', body: JSON.stringify(data) }),

  // ─── APPAREIL ──────────────────────────────────────────────────────────────
  getStatutAppareil: () => request('/appareil/statut/'),
  verifierInactivite: () =>
    request('/appareil/verifier-inactivite/', { method: 'POST' }),

  // ─── ALERTES ───────────────────────────────────────────────────────────────
  getAlertes: () => request('/alertes/'),

  // ─── CONTACTS SMS ──────────────────────────────────────────────────────────
  getContacts: () => request('/contacts/'),
  ajouterContact: (data: object) =>
    request('/contacts/', { method: 'POST', body: JSON.stringify(data) }),
  modifierContact: (id: number, data: object) =>
    request(`/contacts/${id}/`, { method: 'PUT', body: JSON.stringify(data) }),
  supprimerContact: (id: number) =>
    request(`/contacts/${id}/`, { method: 'DELETE' }),

  // ─── FAMILLE ───────────────────────────────────────────────────────────────
  genererInvitation: () =>
    request('/famille/generer-invitation/', { method: 'POST' }),

  validerInvitation: (code: string) =>
    request('/famille/valider-invitation/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  rejoindreForyer: (code_invitation: string) =>
    request('/famille/rejoindre/', {
      method: 'POST',
      body: JSON.stringify({ code_invitation }),
    }),
  getMembres: () => request('/famille/'),
  membreAction: (id: number, data: object) =>
    request(`/famille/${id}/action/`, { method: 'PUT', body: JSON.stringify(data) }),
  supprimerMembre: (id: number) =>
    request(`/famille/${id}/supprimer/`, { method: 'DELETE' }),

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  getNotifications: () => request('/notifications/'),
  marquerLue: (id: number) =>
    request(`/notifications/${id}/lire/`, { method: 'PUT' }),

  // ─── CONSEILS ──────────────────────────────────────────────────────────────
  getConseils: () => request('/conseils/'),

  // ─── RÔLES ─────────────────────────────────────────────────────────────────
  getRoles: () => request('/roles/'),
};