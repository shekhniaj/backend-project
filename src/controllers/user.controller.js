import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if(oldPassword === newPassword){
    throw new ApiError(400, "old and new password shouldn't be the same")
  }

  const user = await User.findById(req.user._id);

  // validate password with validator

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  // const user = await User.findById(req.user._id).select(
  //   "-password -refreshToken"
  // );

  const user = req.user;

  return res.status(200).json(new ApiResponse(200, user, "Success"));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  // will add email later
  const { username, fullname } = req.body || {};
  let user = req.user;

  if (!username && !fullname) {
    throw new ApiError(400, "At least one field is required");
  }

  if (username) user.username = username;
  if (fullname) user.fullname = fullname;

  await user.save({ validateBeforeSave: false });

  user = await User.findById(user._id).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "user details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar || !avatar.secure_url) {
    throw new ApiError(502, "Error while uploading on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.secure_url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage || !coverImage.secure_url) {
    throw new ApiError(502, "Error while uploading on cloudinary");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.secure_url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"));
});

export {
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
