import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
  updateUserDetails,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// secured routes
router.route("/me/password").patch(verifyJWT, changeCurrentPassword);

router
  .route("/me")
  .get(verifyJWT, getCurrentUser)
  .patch(verifyJWT, updateUserDetails);

router
  .route("/me/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router
  .route("/me/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

export default router;
