import { Schema, model, models, Model } from "mongoose";

export interface IAuditLog {
  actorId: string;
  actorName: string;
  action: string;
  entityId?: string;
  detail?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    entityId: { type: String, default: "" },
    detail: { type: String, default: "" },
  },
  { timestamps: true },
);

export const AuditLogModel: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) ||
  model<IAuditLog>("AuditLog", AuditLogSchema);