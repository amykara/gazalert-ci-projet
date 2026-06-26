export type AlertLevel = "moderate" | "critical";
export type AlertStatus = "active" | "resolved";

export interface GasAlert {
  id: string;
  date: string; // ISO
  level: AlertLevel;
  gasValue: number; // ppm
  lat: number;
  lng: number;
  address: string;
  status: AlertStatus;
}

export interface SmsRecipient {
  id: string;
  name: string;
  phone: string;
  enabled: boolean;
}

export type SystemState = "active" | "preheating" | "moderate" | "critical" | "hors_ligne";
export const mockAlerts: GasAlert[] = [
  {
    id: "a1",
    date: "2026-05-19T07:42:00Z",
    level: "moderate",
    gasValue: 420,
    lat: 5.345317,
    lng: -4.024429,
    address: "Cocody, Abidjan",
    status: "resolved",
  },
  {
    id: "a2",
    date: "2026-05-18T19:11:00Z",
    level: "critical",
    gasValue: 812,
    lat: 5.316667,
    lng: -4.033333,
    address: "Plateau, Abidjan",
    status: "resolved",
  },
  {
    id: "a3",
    date: "2026-05-17T13:25:00Z",
    level: "moderate",
    gasValue: 387,
    lat: 5.36,
    lng: -3.98,
    address: "Riviera, Abidjan",
    status: "resolved",
  },
  {
    id: "a4",
    date: "2026-05-15T22:03:00Z",
    level: "critical",
    gasValue: 905,
    lat: 5.3,
    lng: -4.01,
    address: "Treichville, Abidjan",
    status: "resolved",
  },
  {
    id: "a5",
    date: "2026-05-12T08:50:00Z",
    level: "moderate",
    gasValue: 350,
    lat: 5.35,
    lng: -4.0,
    address: "Marcory, Abidjan",
    status: "resolved",
  },
];

export const mockRecipients: SmsRecipient[] = [
  { id: "r1", name: "Kouassi Adjoua", phone: "+225 07 12 34 56 78", enabled: true },
  { id: "r2", name: "Yao Bernard", phone: "+225 05 98 76 54 32", enabled: true },
  { id: "r3", name: "Akissi Marie", phone: "+225 01 23 45 67 89", enabled: false },
];

export const emergencyContacts = [
  { id: "fire", name: "Pompiers", number: "180", description: "Groupement des sapeurs-pompiers militaires", color: "destructive" },
  { id: "police", name: "Police Secours", number: "111", description: "Police nationale de Côte d'Ivoire", color: "primary" },
  { id: "samu", name: "SAMU", number: "185", description: "Service d'aide médicale urgente", color: "success" },
  { id: "civil", name: "Protection Civile", number: "185", description: "Office national de la protection civile", color: "warning" },
] as const;