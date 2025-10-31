import { Router } from "express";
import { getSubscribedChannels, toggleSubscription } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT)

router.route("/channels").get(getSubscribedChannels)

router.route("/:channelId").post(toggleSubscription)

export default router;