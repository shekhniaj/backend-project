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

router.use(verifyJWT)

// secured routes
router.route("/me/password").patch(changeCurrentPassword);

router
  .route("/me")
  .get(getCurrentUser)
  .patch(updateUserDetails);

router
  .route("/me/avatar")
  .patch(upload.single("avatar"), updateUserAvatar);

router
  .route("/me/cover-image")
  .patch(upload.single("coverImage"), updateUserCoverImage);

export default router;
