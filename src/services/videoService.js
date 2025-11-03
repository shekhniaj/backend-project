import { Video } from "../models/video.model";

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
    .select("-videoFilePublicId -thumbnailPublicId");

  return result;
};

const getFeedVideos = async ({ page, limit }) => {
  const pageVal = parseInt(page, 10);
  const limitVal = parseInt(limit, 10);

  const pipeline = [
    {
      $sort: { createdAt: -1 },
    },
    // using skip and limit first so that we can use lookup only on the documents we need
    {
      $skip: (pageVal - 1) * limitVal,
    },
    {
      $limit: limitVal,
    },
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

  const result = await Video.aggregatePaginate(Video.aggregate(pipeline));

  return result;
};

export { getChannelVideos, getFeedVideos };
