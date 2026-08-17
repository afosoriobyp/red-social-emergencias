export const CATEGORIES = [
  "reporte",
  "donaciones",
  "acopio",
  "voluntarios",
  "medico",
  "albergues",
  "noti",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  reporte: "Reporte",
  donaciones: "Donaciones",
  acopio: "Punto Acopio",
  voluntarios: "Voluntarios",
  medico: "Atención Médica",
  albergues: "Albergues",
  noti: "Noti/Novedades",
};

export const EMERGENCY_TYPES = [
  "terremoto",
  "incendio",
  "inundacion",
  "derrumbe",
  "accidente",
  "conflicto",
  "medicina",
  "ropa",
  "alimentos",
  "agua",
  "higiene",
  "herramientas",
  "logistica",
  "primeros_auxilios",
  "transporte",
  "rescate",
  "urgencia",
  "consulta",
  "vacunacion",
  "psicologico",
  "refugio_temporal",
  "refugio_permanente",
  "capacidad",
  "aviso",
  "informacion",
  "otro",
] as const;
export type EmergencyType = (typeof EMERGENCY_TYPES)[number];

export const TYPE_LABELS: Record<EmergencyType, string> = {
  terremoto: "Terremoto",
  incendio: "Incendio",
  inundacion: "Inundación",
  derrumbe: "Derrumbe",
  accidente: "Accidente",
  conflicto: "Conflicto / Guerra",
  medicina: "Medicina",
  ropa: "Ropa",
  alimentos: "Alimentos",
  agua: "Agua",
  higiene: "Higiene",
  herramientas: "Herramientas",
  logistica: "Logística",
  primeros_auxilios: "Primeros auxilios",
  transporte: "Transporte",
  rescate: "Rescate",
  urgencia: "Urgencia",
  consulta: "Consulta",
  vacunacion: "Vacunación",
  psicologico: "Apoyo psicológico",
  refugio_temporal: "Refugio temporal",
  refugio_permanente: "Refugio permanente",
  capacidad: "Capacidad",
  aviso: "Aviso",
  informacion: "Información",
  otro: "Otro",
};

export const CATEGORY_TYPES: Record<Category, readonly EmergencyType[]> = {
  reporte: [
    "terremoto",
    "incendio",
    "inundacion",
    "derrumbe",
    "accidente",
    "conflicto",
    "otro",
  ],
  donaciones: ["medicina", "ropa", "alimentos", "agua", "higiene", "otro"],
  acopio: ["alimentos", "medicina", "ropa", "agua", "herramientas", "otro"],
  voluntarios: [
    "logistica",
    "primeros_auxilios",
    "transporte",
    "rescate",
    "otro",
  ],
  medico: ["urgencia", "consulta", "vacunacion", "psicologico", "otro"],
  albergues: [
    "refugio_temporal",
    "refugio_permanente",
    "capacidad",
    "otro",
  ],
  noti: ["aviso", "informacion", "otro"],
};

export const GRAVITY_LEVELS = ["critica", "alta", "media", "baja"] as const;
export type Gravity = (typeof GRAVITY_LEVELS)[number];

export const GRAVITY_META: Record<
  Gravity,
  { label: string; color: string; glow: string }
> = {
  critica: { label: "Crítica", color: "#dc2626", glow: "rgba(220,38,38,0.5)" },
  alta: { label: "Alta", color: "#f97316", glow: "rgba(249,115,22,0.5)" },
  media: { label: "Media", color: "#eab308", glow: "rgba(234,179,8,0.5)" },
  baja: { label: "Baja", color: "#22c55e", glow: "rgba(34,197,94,0.5)" },
};

export const STATUS_LEVELS = ["activo", "en_proceso", "resuelto"] as const;
export type Status = (typeof STATUS_LEVELS)[number];

export const ROLES = ["usuario", "voluntario", "coordinador", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  usuario: "Usuario",
  voluntario: "Voluntario",
  coordinador: "Coordinador",
  admin: "Administrador",
};

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  status: "pendiente" | "activo" | "bloqueado";
  zona?: string;
  whatsapp?: string;
  pushSubscriptions?: PushSubscriptionData[];
  createdAt: Date;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const USER_STATUS_LABELS: Record<User["status"], string> = {
  pendiente: "Pendiente",
  activo: "Activo",
  bloqueado: "Bloqueado",
};

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityId?: string;
  detail?: string;
  createdAt: Date;
}

export interface ReportInput {
  title: string;
  type: EmergencyType;
  category: Category;
  gravity: Gravity;
  description: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  contactPhone?: string;
  status?: Status;
  createdBy?: string;
  createdByName?: string;
  image?: string;
}

export interface Report extends ReportInput {
  id: string;
  upvotes: number;
  status?: Status;
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  solution?: string;
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  reactions?: Record<string, number>;
  createdAt: Date;
}

export const REACTION_EMOJIS = ["👍", "💧", "🍞", "🏥", "🚛"] as const;

export interface CommentInput {
  reportId: string;
  authorId?: string;
  authorName: string;
  content: string;
}

export interface Comment extends CommentInput {
  id: string;
  createdAt: Date;
}