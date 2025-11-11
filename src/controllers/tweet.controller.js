import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";

const getUserTweets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageVal = parseInt(page, 10);
  const limitVal = parseInt(limit, 10);

  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, "user id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "invalid user id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "user not found");
  }

  const tweets = await Tweet.find({ owner: userId })
    .sort({ createdAt: -1 })
    .skip((pageVal - 1) * limitVal)
    .limit(limitVal);

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "tweets fetched successfully"));
});

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body || {};

  if (!content?.trim()) {
    throw new ApiError(400, "content is required");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "tweet added successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body || {};

  if (!content?.trim()) {
    throw new ApiError(400, "content is required");
  }

  const { tweetId } = req.params;

  if (!tweetId) {
    throw new ApiError(400, "tweet id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "invalid tweet id");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are unauthorized to update the tweet");
  }

  tweet.content = content;
  await tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new ApiError(400, "tweet id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "invalid tweet id");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are unauthorized to delete the tweet");
  }

  await tweet.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "tweet deleted successfully"));
});

export { createTweet, updateTweet, deleteTweet, getUserTweets };
