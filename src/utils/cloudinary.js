import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //file has been uploaded successfully
    // console.log("file is uploaded on cloudinary", response.secure_url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // remove the local temporary file as the upload got failed
    console.log("error while uploading on cloudinary", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const removeFromCloudinary = async (publicId, type) => {
  try {
    if (!publicId) return null;

    // delete from cloudinary
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: type,
    });

    return response;
  } catch (error) {
    console.log("error while deleting from cloudinary", error);
  }
};

export { uploadOnCloudinary, removeFromCloudinary };
