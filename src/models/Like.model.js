import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    contentType: {
      type: String,
      enum: ["video", "comment", "tweet"],
      required: true,
    },
  },
  { timestamps: true }
);

// to avoid duplicate like document
likeSchema.index({ likedBy: 1, content: 1, contentType: 1 }, { unique: true });

export const Like = mongoose.model("Like", likeSchema);
