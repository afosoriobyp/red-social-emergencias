import {
  ReportInput,
  Report,
  User,
  AuditLog,
  Role,
  PushSubscriptionData,
  Comment,
  CommentInput,
} from "./types";
import { dbConnect } from "./db";
import { ReportModel } from "../models/Report";
import { UserModel } from "../models/User";
import { AuditLogModel } from "../models/AuditLog";
import { CommentModel } from "../models/Comment";

export interface ReportFilter {
  category?: string;
  gravity?: string;
  status?: string;
  q?: string;
  createdBy?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export interface ReportPatch {
  title?: string;
  description?: string;
  address?: string;
  contactPhone?: string;
  status?: Report["status"];
  gravity?: Report["gravity"];
  assignedTo?: string;
  resolvedBy?: string;
  solution?: string;
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  status: "pendiente" | "activo" | "bloqueado";
  passwordHash: string;
}

export interface ListOptions {
  page?: number;
  limit?: number;
}

export interface ReportListResult {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface Store {
  listReports(
    filter?: ReportFilter,
    opts?: ListOptions,
  ): Promise<ReportListResult>;
  getReport(id: string): Promise<Report | null>;
  createReport(input: ReportInput): Promise<Report>;
  upvoteReport(id: string): Promise<Report | null>;
  reactReport(
    id: string,
    emoji: string,
    delta: number,
  ): Promise<Report | null>;
  updateReport(id: string, patch: ReportPatch): Promise<Report | null>;
  deleteReport(id: string): Promise<boolean>;
  addComment(input: CommentInput): Promise<Comment>;
  listComments(reportId: string): Promise<Comment[]>;
  commentCountsByReport(reportIds?: string[]): Promise<Record<string, number>>;
  createUser(data: {
    name: string;
    phone: string;
    passwordHash: string;
    role: Role;
    status?: "pendiente" | "activo" | "bloqueado";
  }): Promise<User>;
  listUsers(): Promise<User[]>;
  updateUserRole(id: string, role: Role): Promise<User | null>;
  updateUserStatus(
    id: string,
    status: "pendiente" | "activo" | "bloqueado",
  ): Promise<User | null>;
  updatePassword(id: string, passwordHash: string): Promise<User | null>;
  addPushSubscription(id: string, sub: PushSubscriptionData): Promise<User | null>;
  removePushSubscription(id: string, endpoint: string): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
  deleteUserReports(userId: string): Promise<string[]>;
  findUserByIdentifier(identifier: string): Promise<AuthUser | null>;
  logAudit(entry: Omit<AuditLog, "id" | "createdAt">): Promise<void>;
  listAudit(limit?: number): Promise<AuditLog[]>;
}

let store: Store | null = null;

export function getStore(): Store {
  if (!store) {
    store = process.env.MONGODB_URI ? mongoStore() : memoryStore();
  }
  return store;
}

export function storeMode(): "mongodb" | "memory" {
  return process.env.MONGODB_URI ? "mongodb" : "memory";
}

function toReport(doc: unknown): Report {
  const d = doc as Record<string, unknown>;
  const loc = (d.location ?? {}) as { coordinates?: [number, number] };
  const lat = (loc.coordinates?.[1] ?? d.lat) as number;
  const lng = (loc.coordinates?.[0] ?? d.lng) as number;
  return {
    id: String(d._id),
    title: d.title as string,
    type: d.type as Report["type"],
    category: d.category as Report["category"],
    gravity: d.gravity as Report["gravity"],
    description: d.description as string,
    lat,
    lng,
    address: (d.address as string) ?? "",
    contactPhone: (d.contactPhone as string) ?? "",
    createdBy: (d.createdBy as string) ?? "",
    createdByName: (d.createdByName as string) ?? "",
    image: (d.image as string) ?? "",
    status: (d.status as Report["status"]) ?? "activo",
    upvotes: (d.upvotes as number) ?? 0,
    assignedTo: (d.assignedTo as string) ?? "",
    resolvedBy: (d.resolvedBy as string) ?? "",
    resolvedAt: d.resolvedAt ? new Date(d.resolvedAt as Date | string) : undefined,
    solution: (d.solution as string) ?? "",
    verified: (d.verified as boolean) ?? false,
    verifiedBy: (d.verifiedBy as string) ?? "",
    verifiedAt: d.verifiedAt ? new Date(d.verifiedAt as Date | string) : undefined,
    reactions: (d.reactions as Record<string, number>) ?? {},
    createdAt: new Date((d.createdAt as Date | string | undefined) ?? Date.now()),
  };
}

function toComment(doc: unknown): Comment {
  const d = doc as Record<string, unknown>;
  return {
    id: String(d._id),
    reportId: d.reportId as string,
    authorId: (d.authorId as string) || undefined,
    authorName: d.authorName as string,
    content: d.content as string,
    createdAt: new Date((d.createdAt as Date | string | undefined) ?? Date.now()),
  };
}

function toUser(doc: unknown): User {
  const d = doc as Record<string, unknown>;
  return {
    id: String(d._id),
    name: d.name as string,
    phone: d.phone as string,
    email: (d.email as string) || undefined,
    role: (d.role as Role) ?? "usuario",
    status: (d.status as User["status"]) ?? "activo",
    zona: (d.zona as string) || undefined,
    whatsapp: (d.whatsapp as string) || undefined,
    pushSubscriptions: (d.pushSubscriptions as PushSubscriptionData[]) ?? [],
    createdAt: new Date((d.createdAt as Date | string | undefined) ?? Date.now()),
  };
}

function toAuthUser(doc: unknown): AuthUser {
  const d = doc as Record<string, unknown>;
  return {
    id: String(d._id),
    name: d.name as string,
    phone: d.phone as string,
    role: (d.role as Role) ?? "usuario",
    status: (d.status as AuthUser["status"]) ?? "activo",
    passwordHash: d.passwordHash as string,
  };
}

function toAudit(doc: unknown): AuditLog {
  const d = doc as Record<string, unknown>;
  return {
    id: String(d._id),
    actorId: d.actorId as string,
    actorName: d.actorName as string,
    action: d.action as string,
    entityId: (d.entityId as string) || undefined,
    detail: (d.detail as string) || undefined,
    createdAt: new Date((d.createdAt as Date | string | undefined) ?? Date.now()),
  };
}

function mongoStore(): Store {
  return {
    async listReports(filter: ReportFilter = {}, opts: ListOptions = {}) {
      await dbConnect();
      const query: Record<string, unknown> = {};
      if (filter.category) query.category = filter.category;
      if (filter.gravity) query.gravity = filter.gravity;
      if (filter.status) query.status = filter.status;
      if (filter.q) {
        query.$or = [
          { title: { $regex: filter.q, $options: "i" } },
          { description: { $regex: filter.q, $options: "i" } },
        ];
      }
      if (filter.createdBy) query.createdBy = filter.createdBy;
      if (filter.lat !== undefined && filter.lng !== undefined) {
        query.location = {
          $near: {
            $geometry: { type: "Point", coordinates: [filter.lng, filter.lat] },
            $maxDistance: (filter.radius ?? 25) * 1000,
          },
        };
      }
      const page = Math.max(1, Math.trunc(opts.page ?? 1));
      const limit = Math.min(200, Math.max(1, Math.trunc(opts.limit ?? 200)));
      const total = await ReportModel.countDocuments(query);
      const docs = await ReportModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      return {
        reports: docs.map(toReport),
        total,
        page,
        limit,
        hasMore: page * limit < total,
      };
    },
    async getReport(id: string) {
      await dbConnect();
      const doc = await ReportModel.findById(id).lean();
      return doc ? toReport(doc) : null;
    },
    async createReport(input: ReportInput) {
      await dbConnect();
      const doc = await ReportModel.create({
        ...input,
        location: {
          type: "Point",
          coordinates: [input.lng, input.lat],
        },
      });
      return toReport(doc.toObject());
    },
    async upvoteReport(id: string) {
      await dbConnect();
      const doc = await ReportModel.findByIdAndUpdate(
        id,
        { $inc: { upvotes: 1 } },
        { new: true },
      ).lean();
      return doc ? toReport(doc) : null;
    },
    async reactReport(id: string, emoji: string, delta: number) {
      await dbConnect();
      const doc = await ReportModel.findByIdAndUpdate(
        id,
        { $inc: { [`reactions.${emoji}`]: delta } },
        { new: true },
      ).lean();
      return doc ? toReport(doc) : null;
    },
    async updateReport(id: string, patch: ReportPatch) {
      await dbConnect();
      const upd: Record<string, unknown> = {};
      if (patch.title !== undefined) upd.title = patch.title;
      if (patch.description !== undefined) upd.description = patch.description;
      if (patch.address !== undefined) upd.address = patch.address;
      if (patch.contactPhone !== undefined) upd.contactPhone = patch.contactPhone;
      if (patch.status) upd.status = patch.status;
      if (patch.gravity) upd.gravity = patch.gravity;
      if (patch.assignedTo !== undefined) upd.assignedTo = patch.assignedTo;
      if (patch.resolvedBy !== undefined) upd.resolvedBy = patch.resolvedBy;
      if (patch.solution !== undefined) upd.solution = patch.solution;
      if (patch.verified !== undefined) {
        upd.verified = patch.verified;
        upd.verifiedBy = patch.verifiedBy ?? "";
        upd.verifiedAt = patch.verifiedAt ?? null;
      }
      if (patch.status === "resuelto") upd.resolvedAt = new Date();
      if (upd.status !== "resuelto") upd.resolvedAt = null;
      const doc = await ReportModel.findByIdAndUpdate(id, upd, {
        new: true,
      }).lean();
      return doc ? toReport(doc) : null;
    },
    async deleteReport(id: string) {
      await dbConnect();
      const res = await ReportModel.findByIdAndDelete(id).lean();
      return !!res;
    },
    async addComment(input: CommentInput) {
      await dbConnect();
      const doc = await CommentModel.create(input);
      return toComment(doc.toObject());
    },
    async listComments(reportId: string) {
      await dbConnect();
      const docs = await CommentModel.find({ reportId })
        .sort({ createdAt: 1 })
        .limit(200)
        .lean();
      return docs.map(toComment);
    },
    async commentCountsByReport(reportIds?: string[]) {
      await dbConnect();
      const match =
        reportIds && reportIds.length ? { reportId: { $in: reportIds } } : {};
      const docs = await CommentModel.aggregate([
        { $match: match },
        { $group: { _id: "$reportId", count: { $sum: 1 } } },
      ]);
      const out: Record<string, number> = {};
      for (const d of docs) out[String(d._id)] = d.count;
      return out;
    },
    async createUser(data) {
      await dbConnect();
      const doc = await UserModel.create({
        name: data.name,
        phone: data.phone,
        passwordHash: data.passwordHash,
        role: data.role,
        status: data.status ?? "activo",
      });
      return toUser(doc.toObject());
    },
    async findUserByIdentifier(identifier: string) {
      await dbConnect();
      const doc = await UserModel.findOne({
        $or: [{ phone: identifier }, { email: identifier }],
      }).lean();
      return doc ? toAuthUser(doc) : null;
    },
    async listUsers() {
      await dbConnect();
      const docs = await UserModel.find().sort({ createdAt: 1 }).lean();
      return docs.map(toUser);
    },
    async updateUserRole(id: string, role: Role) {
      await dbConnect();
      const doc = await UserModel.findByIdAndUpdate(
        id,
        { role },
        { new: true },
      ).lean();
      return doc ? toUser(doc) : null;
    },
    async updateUserStatus(id: string, status: User["status"]) {
      await dbConnect();
      const doc = await UserModel.findByIdAndUpdate(
        id,
        { status },
        { new: true },
      ).lean();
      return doc ? toUser(doc) : null;
    },
    async updatePassword(id: string, passwordHash: string) {
      await dbConnect();
      const doc = await UserModel.findByIdAndUpdate(
        id,
        { passwordHash },
        { new: true },
      ).lean();
      return doc ? toUser(doc) : null;
    },
    async addPushSubscription(id: string, sub: PushSubscriptionData) {
      await dbConnect();
      await UserModel.findByIdAndUpdate(
        id,
        { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } },
        { new: true },
      ).lean();
      const doc2 = await UserModel.findByIdAndUpdate(
        id,
        { $push: { pushSubscriptions: sub } },
        { new: true },
      ).lean();
      return doc2 ? toUser(doc2) : null;
    },
    async removePushSubscription(id: string, endpoint: string) {
      await dbConnect();
      const doc = await UserModel.findByIdAndUpdate(
        id,
        { $pull: { pushSubscriptions: { endpoint } } },
        { new: true },
      ).lean();
      return doc ? toUser(doc) : null;
    },
    async deleteUser(id: string) {
      await dbConnect();
      const res = await UserModel.findByIdAndDelete(id).lean();
      return Boolean(res);
    },
    async deleteUserReports(userId: string) {
      await dbConnect();
      const docs = await ReportModel.find({ createdBy: userId }).lean();
      await ReportModel.deleteMany({ createdBy: userId });
      return docs.map((d) => String(d._id));
    },
    async logAudit(entry) {
      await dbConnect();
      await AuditLogModel.create({
        actorId: entry.actorId,
        actorName: entry.actorName,
        action: entry.action,
        entityId: entry.entityId ?? "",
        detail: entry.detail ?? "",
      });
    },
    async listAudit(limit = 50) {
      await dbConnect();
      const docs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(limit).lean();
      return docs.map(toAudit);
    },
  };
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function seedReports(): Report[] {
  const base: Array<ReportInput & { createdAt: Date }> = [
    {
      title: "Derrumbe bloquea vía principal",
      type: "derrumbe",
      category: "reporte",
      gravity: "critica",
      description:
        "Deslizamiento de tierra sobre la avenida principal. Hay personas atrapadas en un vehículo y la vía está intransitable.",
      lat: -16.4897,
      lng: -68.1193,
      address: "Av. Principal, zona centro",
      contactPhone: "59171234567",
      createdAt: new Date(Date.now() - 15 * 60000),
    },
    {
      title: "Necesitan donaciones de agua y frazadas",
      type: "terremoto",
      category: "donaciones",
      gravity: "alta",
      description:
        "El albergue municipal solicita agua embotellada, frazadas y kits de higiene para 300 familias damnificadas.",
      lat: -16.5053,
      lng: -68.1273,
      address: "Albergue municipal, calle 1",
      contactPhone: "59178889900",
      createdAt: new Date(Date.now() - 45 * 60000),
    },
    {
      title: "Punto de acopio habilitado en el coliseo",
      type: "terremoto",
      category: "acopio",
      gravity: "media",
      description:
        "Centro de acopio operativo de 8:00 a 20:00. Reciben alimentos no perecibles, ropa y medicamentos.",
      lat: -16.4947,
      lng: -68.1461,
      address: "Coliseo cerrado, zona norte",
      contactPhone: "59172223344",
      createdAt: new Date(Date.now() - 2 * 60 * 60000),
    },
    {
      title: "Voluntarios para reparto de ayuda",
      type: "terremoto",
      category: "voluntarios",
      gravity: "media",
      description:
        "Se necesitan voluntarios para clasificar y repartir ayuda humanitaria en el barrio San Martín.",
      lat: -16.4781,
      lng: -68.1155,
      address: "Barrio San Martín",
      contactPhone: "59175556677",
      createdAt: new Date(Date.now() - 3 * 60 * 60000),
    },
    {
      title: "Atención médica urgente en el hospital",
      type: "accidente",
      category: "medico",
      gravity: "critica",
      description:
        "El hospital de campaña requiere médicos, enfermeras y suministros. Hay heridos graves tras el sismo.",
      lat: -16.5128,
      lng: -68.1302,
      address: "Hospital de campaña, zona sur",
      contactPhone: "59176667788",
      createdAt: new Date(Date.now() - 5 * 60 * 60000),
    },
  ];
  return base.map((r) => ({
    ...r,
    id: uid(),
    upvotes: 3,
    reactions: { "👍": 2 },
  }));
}

let memUsers: Array<
  AuthUser & { createdAt: Date; pushSubscriptions?: PushSubscriptionData[] }
> = [];
let memAudit: AuditLog[] = [];
let memComments: Comment[] = [];

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function memoryStore(): Store {
  let rows: Report[] = seedReports();

  return {
    async listReports(filter: ReportFilter = {}, opts: ListOptions = {}) {
      let out = [...rows].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      if (filter.category) out = out.filter((r) => r.category === filter.category);
      if (filter.gravity) out = out.filter((r) => r.gravity === filter.gravity);
      if (filter.status) out = out.filter((r) => r.status === filter.status);
      if (filter.createdBy) out = out.filter((r) => r.createdBy === filter.createdBy);
      if (filter.q) {
        const q = filter.q.toLowerCase();
        out = out.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q),
        );
      }
      if (
        filter.lat !== undefined &&
        filter.lng !== undefined &&
        Number.isFinite(filter.lat) &&
        Number.isFinite(filter.lng)
      ) {
        const maxKm = filter.radius ?? 25;
        out = out.filter(
          (r) =>
            haversineKm(filter.lat!, filter.lng!, r.lat, r.lng) <= maxKm,
        );
      }
      const page = Math.max(1, Math.trunc(opts.page ?? 1));
      const limit = Math.min(200, Math.max(1, Math.trunc(opts.limit ?? 200)));
      const total = out.length;
      const reports = out.slice((page - 1) * limit, page * limit);
      return { reports, total, page, limit, hasMore: page * limit < total };
    },
    async getReport(id: string) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async createReport(input: ReportInput) {
      const report: Report = {
        ...input,
        id: uid(),
        upvotes: 0,
        reactions: {},
        createdAt: new Date(),
      };
      rows = [report, ...rows];
      return report;
    },
    async upvoteReport(id: string) {
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      row.upvotes += 1;
      return row;
    },
    async reactReport(id: string, emoji: string, delta: number) {
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      row.reactions = row.reactions ?? {};
      const next = (row.reactions[emoji] ?? 0) + delta;
      row.reactions[emoji] = Math.max(0, next);
      return row;
    },
    async updateReport(id: string, patch: ReportPatch) {
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.description !== undefined) row.description = patch.description;
      if (patch.address !== undefined) row.address = patch.address;
      if (patch.contactPhone !== undefined) row.contactPhone = patch.contactPhone;
      if (patch.status) row.status = patch.status;
      if (patch.gravity) row.gravity = patch.gravity;
      if (patch.assignedTo !== undefined) row.assignedTo = patch.assignedTo;
      if (patch.resolvedBy !== undefined) row.resolvedBy = patch.resolvedBy;
      if (patch.solution !== undefined) row.solution = patch.solution;
      if (patch.verified !== undefined) {
        row.verified = patch.verified;
        row.verifiedBy = patch.verifiedBy ?? "";
        row.verifiedAt = patch.verifiedAt;
      }
      if (patch.status === "resuelto") row.resolvedAt = new Date();
      else row.resolvedAt = undefined;
      return row;
    },
    async deleteReport(id: string) {
      const before = rows.length;
      rows = rows.filter((r) => r.id !== id);
      return rows.length < before;
    },
    async addComment(input: CommentInput) {
      const comment: Comment = {
        ...input,
        id: uid(),
        createdAt: new Date(),
      };
      memComments = [...memComments, comment];
      return comment;
    },
    async listComments(reportId: string) {
      return memComments
        .filter((c) => c.reportId === reportId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },
    async commentCountsByReport(reportIds?: string[]) {
      const out: Record<string, number> = {};
      for (const c of memComments) {
        if (reportIds && reportIds.length && !reportIds.includes(c.reportId)) {
          continue;
        }
        out[c.reportId] = (out[c.reportId] ?? 0) + 1;
      }
      return out;
    },
    async createUser(data) {
      const user: AuthUser & { createdAt: Date } = {
        id: uid(),
        name: data.name,
        phone: data.phone,
        role: data.role,
        status: data.status ?? "activo",
        passwordHash: data.passwordHash,
        createdAt: new Date(),
      };
      memUsers = [...memUsers, user];
      return toUser(user);
    },
    async findUserByIdentifier(identifier: string) {
      const user = memUsers.find(
        (u) => u.phone === identifier || u.phone === identifier,
      );
      return user ?? null;
    },
    async listUsers() {
      return memUsers.map(toUser);
    },
    async updateUserRole(id: string, role: Role) {
      const user = memUsers.find((u) => u.id === id);
      if (!user) return null;
      user.role = role;
      return toUser(user);
    },
    async updateUserStatus(id: string, status: User["status"]) {
      const user = memUsers.find((u) => u.id === id);
      if (!user) return null;
      user.status = status;
      return toUser(user);
    },
    async updatePassword(id: string, passwordHash: string) {
      const user = memUsers.find((u) => u.id === id);
      if (!user) return null;
      user.passwordHash = passwordHash;
      return toUser(user);
    },
    async addPushSubscription(id: string, sub: PushSubscriptionData) {
      const user = memUsers.find((u) => u.id === id);
      if (!user) return null;
      const subs = user.pushSubscriptions ?? [];
      const without = subs.filter((s) => s.endpoint !== sub.endpoint);
      user.pushSubscriptions = [...without, sub];
      return toUser(user);
    },
    async removePushSubscription(id: string, endpoint: string) {
      const user = memUsers.find((u) => u.id === id);
      if (!user) return null;
      user.pushSubscriptions = (user.pushSubscriptions ?? []).filter(
        (s) => s.endpoint !== endpoint,
      );
      return toUser(user);
    },
    async deleteUser(id: string) {
      const idx = memUsers.findIndex((u) => u.id === id);
      if (idx === -1) return false;
      memUsers.splice(idx, 1);
      return true;
    },
    async deleteUserReports(userId: string) {
      const removed = rows
        .filter((r) => r.createdBy === userId)
        .map((r) => r.id);
      rows = rows.filter((r) => r.createdBy !== userId);
      return removed;
    },
    async logAudit(entry) {
      memAudit = [
        { ...entry, id: uid(), createdAt: new Date() },
        ...memAudit,
      ];
    },
    async listAudit(limit = 50) {
      return memAudit.slice(0, limit);
    },
  };
}