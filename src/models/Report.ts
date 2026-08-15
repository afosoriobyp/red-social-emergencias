import { Schema, model, models, Model } from "mongoose";
import {
  CATEGORIES,
  EMERGENCY_TYPES,
  GRAVITY_LEVELS,
  STATUS_LEVELS,
} from "@/lib/types";

interface IReport {
  title: string;
  type: (typeof EMERGENCY_TYPES)[number];
  category: (typeof CATEGORIES)[number];
  gravity: (typeof GRAVITY_LEVELS)[number];
  description: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  address?: string;
  contactPhone?: string;
  createdBy?: string;
  createdByName?: string;
  image?: string;
  status: (typeof STATUS_LEVELS)[number];
  assignedTo?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  solution?: string;
  verified?: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
  upvotes: number;
  reactions: Record<string, number>;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: EMERGENCY_TYPES, required: true },
    category: { type: String, enum: CATEGORIES, required: true },
    gravity: { type: String, enum: GRAVITY_LEVELS, required: true },
    description: { type: String, required: true, maxlength: 1000 },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], required: true },
    },
    address: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    createdBy: { type: String, default: "" },
    createdByName: { type: String, default: "" },
    image: { type: String, default: "" },
    status: {
      type: String,
      enum: STATUS_LEVELS,
      default: "activo",
    },
    assignedTo: { type: String, default: "" },
    resolvedBy: { type: String, default: "" },
    resolvedAt: { type: Date },
    solution: { type: String, default: "" },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: String, default: "" },
    verifiedAt: { type: Date },
    upvotes: { type: Number, default: 0 },
    reactions: { type: Object, default: {} },
  },
  { timestamps: true },
);

ReportSchema.index({ location: "2dsphere" });

export const ReportModel: Model<IReport> =
  (models.Report as Model<IReport>) || model<IReport>("Report", ReportSchema);