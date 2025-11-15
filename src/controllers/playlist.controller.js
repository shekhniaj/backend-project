import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!userId) {
    throw new ApiError(400, "user id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "invalid user id");
  }

  const userExists = await User.exists({ _id: userId });

  if(!userExists){
    throw new ApiError(400, "user not found")
  }

  const pageVal = parseInt(page, 10);
  const limitVal = parseInt(limit, 10);
  const skipVal = (pageVal - 1) * limitVal;

  // we will update it later and send first video thumbnail in the response
  const playlists = await Playlist.find({ owner: userId })
    .sort({
      createdAt: -1,
    })
    .skip(skipVal)
    .limit(limitVal)
    .select("name")
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "user playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    throw new ApiError(400, "playlist id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  // by using lean we only get a plain js object instead of heavy mongoose object. whenever we just need to read the data we should use lean
  const playlist = await Playlist.findById(playlistId)
    .select("-videos")
    .populate({
      path: "owner",
      select: "username avatar",
    })
    .lean();

  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched successfully"));
});

const getPlaylistVideos = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageVal = parseInt(page, 10);
  const limitVal = parseInt(limit, 10);
  const skipVal = (pageVal - 1) * limitVal;

  if (!playlistId) {
    throw new ApiError(400, "playlist id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const result = await Playlist.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(playlistId) },
    },
    {
      $project: {
        videos: { $slice: ["$videos", skipVal, limitVal] },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videosInfo",
        pipeline: [
          {
            $project: {
              thumbnail: 1,
              title: 1,
              duration: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        videosInfo: 1,
        _id: 0,
      },
    },
  ]);

  const videosInfo = result?.[0]?.videosInfo || [];

  return res
    .status(200)
    .json(
      new ApiResponse(200, videosInfo, "playlist videos fetched successfully")
    );
});

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body || {};

  if (!name?.trim() || !description?.trim()) {
    throw new ApiError(400, "name and description are required");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "playlist created successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!videoId || !playlistId) {
    throw new ApiError(400, "video id and playlist id are required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "invalid video id");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId).populate({
    path: "owner",
    select: "username avatar",
  });

  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  if (playlist.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "you are unauthorized to add video to the playlist"
    );
  }

  // check if video exists or not. using Video.exists instead of findById because it is faster.
  const videoExists = await Video.exists({ _id: videoId });

  if (!videoExists) {
    throw new ApiError(404, "video not found");
  }

  // check if video already in playlist
  const alreadyInPlaylist = playlist.videos.some(
    (id) => id.toString() === videoId
  );

  if (alreadyInPlaylist) {
    throw new ApiError(400, "video already in playlist");
  }

  playlist.videos.push(videoId);
  await playlist.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "video added to the playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!videoId || !playlistId) {
    throw new ApiError(400, "video id and playlist id are required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "invalid video id");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId).populate({
    path: "owner",
    select: "username avatar",
  });

  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  if (playlist.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "you are unauthorized to remove video from the playlist"
    );
  }

  // In this case I am not checking is the video id exists in the array
  // remove videoId from the videos array
  playlist.videos.pull(videoId);
  await playlist.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "video removed from playlist successfully")
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  const { name, description } = req.body || {};

  if (!name?.trim() && !description?.trim()) {
    throw new ApiError(400, "at least one field is required");
  }

  if (!playlistId) {
    throw new ApiError(400, "playlist id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId).populate({
    path: "owner",
    select: "username avatar",
  });

  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  if (playlist.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are unauthorized to update the playlist");
  }

  if (name?.trim()) playlist.name = name.trim();
  if (description?.trim()) playlist.description = description.trim();

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist updated successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!playlistId) {
    throw new ApiError(400, "playlist id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "invalid playlist id");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are unauthorized to delete the playlist");
  }

  await playlist.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "playlist deleted successfully"));
});

export {
  getUserPlaylists,
  getPlaylistById,
  getPlaylistVideos,
  createPlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  updatePlaylist,
  deletePlaylist,
};

// like getting code

// const [data] = await Like.aggregate([
//   { $match: { video: new mongoose.Types.ObjectId(videoId) } },
//   {
//     $group: {
//       _id: null,
//       likesCount: { $sum: 1 },
//       likedByCurrentUser: { $addToSet: "$likedBy" },
//     },
//   },
// ]);
// const isLiked = data?.likedByCurrentUser.includes(userId);
