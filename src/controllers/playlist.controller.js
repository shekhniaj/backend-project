import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";

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

export {
  createPlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  updatePlaylist,
};
