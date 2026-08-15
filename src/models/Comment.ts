import { Schema, model, models, Model } from "mongoose";

interface IComment {
  reportId: string;
  authorId?: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    reportId: { type: String, required: true, index: true },
    authorId: { type: String, default: "" },
    authorName: { type: String, required: true },
    content: { type: String, required: true, maxlength: 500 },
  },
  { timestamps: true },
);

export const CommentModel: Model<IComment> =
  (models.Comment as Model<IComment>) || model<IComment>("Comment", CommentSchema);