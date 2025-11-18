import { Router } from "express";
import { getLikes, toggleLike } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle").post(toggleLike)

router.route("/:contentId/:contentType").get(getLikes)

export default router;