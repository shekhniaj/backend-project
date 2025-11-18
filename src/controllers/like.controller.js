import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { Like } from "../models/Like.model.js";

const toggleLike = asyncHandler(async (req, res) => {
  const { contentId, contentType } = req.body || {};

  if (!contentId || !contentType)
    throw new ApiError(400, "content Id and type are required");

  if (!mongoose.Types.ObjectId.isValid(contentId))
    throw new ApiError(400, "invalid content id");

  const type = ["video", "comment", "tweet"];

  if (!type.includes(contentType))
    throw new ApiError(400, "invalid content type");

  const deletedLike = await Like.findOneAndDelete({
    likedBy: req.user._id,
    content: contentId,
    contentType,
  });

  let message;
  let statusCode = 200;
  if (deletedLike) {
    message = "like deleted successfully";
  } else {
    await Like.create({
      likedBy: req.user._id,
      content: contentId,
      contentType,
    });
    message = "like added successfully";
    statusCode = 201;
  }

  // not sending the like doc on response because there can be so many likes every second and the doc don't have any work in frontend
  return res.status(statusCode).json(new ApiResponse(statusCode, {}, message));
});

const getLikes = asyncHandler(async (req, res) => {
  const { contentId, contentType } = req.params;

  if (!contentId || !contentType)
    throw new ApiError(400, "content Id and type are required");

  if (!mongoose.Types.ObjectId.isValid(contentId))
    throw new ApiError(400, "invalid content id");

  const type = ["video", "comment", "tweet"];

  if (!type.includes(contentType))
    throw new ApiError(400, "invalid content type");

  const userId = new mongoose.Types.ObjectId(req.user._id);

  // we can also use .countdocuments() + .exists() and promise.all to optimize
  const [result] = await Like.aggregate([
    {
      $match: {
        content: new mongoose.Types.ObjectId(contentId),
        contentType,
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: 1 },
        isLiked: {
          $max: { $eq: ["$likedBy", userId] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        totalLikes: 1,
        isLiked: 1,
      },
    },
  ]);

  const data = result || {
    totalLikes: 0,
    isLiked: false,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, data, "like data fetched successfully"));
});

export { toggleLike, getLikes };
