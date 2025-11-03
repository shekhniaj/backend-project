import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  togglePublishStatus,
  updateThumbnail,
  updateVideoDetails,
  uploadVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router
  .route("/")
  .get(getAllVideos)
  .post(
    verifyJWT,
    upload.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    uploadVideo
  );

router
  .route("/:videoId")
  .get(getVideoById)
  .delete(verifyJWT, deleteVideo)
  .patch(verifyJWT, updateVideoDetails);

router
  .route("/:videoId/thumbnail")
  .patch(verifyJWT, upload.single("thumbnail"), updateThumbnail);

router.route("/:videoId/publish").patch(verifyJWT, togglePublishStatus);

export default router;
