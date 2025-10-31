import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if(!mongoose.Types.ObjectId.isValid(channelId)){
    throw new ApiError(400, "invalid channel id")
  }

  const subscriberId = req.user._id;

  // check if channel exists
  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "channel not found");
  }

  // if channel exists then create subscription or remove it, we don't have to check for duplicate subscription because it will be checked in model
  const deleted = await Subscription.findOneAndDelete({
    channel: channelId,
    subscriber: subscriberId,
  });

  let message;
  if (deleted) {
    message = "subscription deleted successfully";
  } else {
    await Subscription.create({
      channel: channelId,
      subscriber: subscriberId,
    });
    message = "subscription added successfully";
  }

  const statusCode = deleted ? 200 : 201;

  return res.status(statusCode).json(new ApiResponse(statusCode, {}, message));
});

// we are passing the subscribers count on getChannel controller route

const getSubscribedChannels = asyncHandler(async (req, res) => {
  // get logged in user id
  // we can use find + populate or aggregation to get channel data
  const userId = req.user._id;

  const result = await User.aggregate([
    // find the logged in user document
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    // find the documents where logged in user is subscriber
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    // take channelId from subscribedTo document
    {
      $addFields: {
        channelIds: {
          $map: { input: "$subscribedTo", as: "s", in: "$$s.channel" },
        },
      },
    },
    // now another lookup for channel document
    {
      $lookup: {
        from: "users",
        let: { ids: "$channelIds" }, // work like local field
        as: "subscribedChannels",
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$ids"] } } },
          { $project: { fullname: 1, avatar: 1 } },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        subscribedChannels: 1,
      },
    },
  ]);

  const user = result[0];

  if (!user) {
    throw new ApiError(404, "user not found");
  }

  const subscribedChannels = user.subscribedChannels || [];

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "subscribed channels fetched successfully"
      )
    );
});

export {
   toggleSubscription, 
   getSubscribedChannels 
  };
