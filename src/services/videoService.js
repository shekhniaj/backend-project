import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/apiError.js";

const getChannelVideos = async ({ channelId, page, limit }) => {
  const pageVal = parseInt(page, 10);
  const limitVal = parseInt(limit, 10);

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "invalid channel id");
  }

  const result = await Video.find({ owner: channelId })
    .sort({ createdAt: -1 })
    .skip((pageVal - 1) * limitVal)
    .limit(limitVal)
    .select("-videoFilePublicId -thumbnailPublicId -owner");

  return result;
};

const getFeedVideos = async ({ page, limit }) => {
  const pageVal = parseInt(page, 10);
  const limitVal = parseInt(limit, 10);

  const pipeline = [
    {
      $sort: { createdAt: -1 },
    },
    // use skip and limit first so that we can use lookup only on the documents we need, but as we are using paginate v2 package so we will use skip and limit as options. later we will optimize it.
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $project: {
        videoFilePublicId: 0,
        thumbnailPublicId: 0,
      },
    },
  ];

  const options = {
    page: pageVal,
    limit: limitVal,
  };

  const result = await Video.aggregatePaginate(
    Video.aggregate(pipeline),
    options
  );

  return result;
};

export { getChannelVideos, getFeedVideos };
