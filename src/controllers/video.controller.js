import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import {
  removeFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";
import { getChannelVideos, getFeedVideos } from "../services/videoService.js";

const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body || {};

  // we can add more validation here
  if ([title, description].some((field) => !field || field?.trim() === "")) {
    throw new ApiError(400, "title and description are required");
  }

  // get files temporary local path
  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "videoFile and thumbnail are required");
  }

  // upload them on cloudinary
  const videoFile = await uploadOnCloudinary(videoLocalPath);

  if (!videoFile || !videoFile.secure_url) {
    throw new ApiError(500, "error while videofile uploading on cloudinary");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail || !thumbnail.secure_url) {
    // remove videofile from cloudinary
    await removeFromCloudinary(videoFile.public_id, "video");
    throw new ApiError(500, "error while thumbnail uploading on cloudinary");
  }

  // create video document on db
  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.secure_url,
    videoFilePublicId: videoFile.public_id,
    thumbnail: thumbnail.secure_url,
    thumbnailPublicId: thumbnail.public_id,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  if (!video || !video._id) {
    throw new ApiError(500, "video creation failed");
  }

  const { videoFilePublicId, thumbnailPublicId, ...responseVideo } =
    video.toObject();

  return res
    .status(201)
    .json(new ApiResponse(201, responseVideo, "video uploaded successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "video id is missing");
  }

  // check if it is a valid object id
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "invalid video id");
  }

  const video = await Video.findById(videoId).select(
    "-videoFilePublicId -thumbnailPublicId"
  );

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "video id is missing");
  }

  // check if it is a valid object id
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (req.user._id.toString() !== video.owner.toString()) {
    throw new ApiError(403, "Not authorized to delete this video");
  }

  // remove thumbnail and video file from cloudinary
  await removeFromCloudinary(video.videoFilePublicId, "video");
  await removeFromCloudinary(video.thumbnailPublicId, "image");

  await video.deleteOne();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { id: video._id }, "video deleted successfully")
    );
});

const getAllVideos = asyncHandler(async (req, res) => {
  const { type, channelId, page = 1, limit = 5 } = req.query || {};

  if (!type) {
    throw new ApiError(400, "type is required");
  }

  if (type !== "feed" && !channelId) {
    throw new ApiError(400, "channelId is required");
  }

  let videos;

  if (type === "feed") {
    videos = await getFeedVideos({ page, limit });
  } else {
    videos = await getChannelVideos({ channelId, page, limit });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "videos fetched successfully"));
});

const updateVideoDetails = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "video id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "invalid video id");
  }

  const { title, description } = req.body || {};

  if (!title?.trim() && !description?.trim()) {
    throw new ApiError(400, "at least one field is required");
  }

  const video = await Video.findById(videoId)
    .select("-videoFilePublicId -thumbnailPublicId")
    .populate({
      path: "owner",
      select: "username fullname avatar",
    });

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (video.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are unauthorized to update video details");
  }

  video.title = title?.trim() ? title.trim() : video.title;
  video.description = description?.trim()
    ? description.trim()
    : video.description;

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video details updated successfully"));
});

const updateThumbnail = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "video id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "invalid video id");
  }

  // find the video with populated owner field
  const video = await Video.findById(videoId).populate({
    path: "owner",
    select: "username fullname avatar",
  });

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (video.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are unauthorized to update video thumbnail");
  }

  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file is missing");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail || !thumbnail.secure_url) {
    throw new ApiError(500, "error while uploading on cloudinary");
  }

  // remove previous thumbnail from cloudinary
  await removeFromCloudinary(video.thumbnailPublicId, "image");

  video.thumbnail = thumbnail.secure_url;
  video.thumbnailPublicId = thumbnail.public_id;

  await video.save({ validateBeforeSave: false });

  const { videoFilePublicId, thumbnailPublicId, ...responseVideo } =
    video.toObject();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        responseVideo,
        "video thumbnail updated successfully"
      )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "video id is missing");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "invalid video id");
  }

  const video = await Video.findById(videoId)
    .select("-videoFilePublicId -thumbnailPublicId")
    .populate({
      path: "owner",
      select: "username fullname avatar",
    });

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (video.owner._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "you are unauthorized to update video details");
  }

  video.isPublished = !video.isPublished;

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "published status toggled successfully"));
});

export {
  uploadVideo,
  getVideoById,
  deleteVideo,
  getAllVideos,
  updateVideoDetails,
  updateThumbnail,
  togglePublishStatus,
};
