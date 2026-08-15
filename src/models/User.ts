import { Schema, model, models, Model } from "mongoose";
import { ROLES, PushSubscriptionData } from "@/lib/types";

export interface IUser {
  name: string;
  phone: string;
  email?: string;
  passwordHash: string;
  role: (typeof ROLES)[number];
  status: "pendiente" | "activo" | "bloqueado";
  zona?: string;
  whatsapp?: string;
  pushSubscriptions?: PushSubscriptionData[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "usuario" },
    status: {
      type: String,
      enum: ["pendiente", "activo", "bloqueado"],
      default: "activo",
    },
    zona: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    pushSubscriptions: { type: [Object], default: [] },
  },
  { timestamps: true },
);

export const UserModel: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);