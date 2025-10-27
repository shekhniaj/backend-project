import { Router } from "express";
import { getChannel } from "../controllers/channel.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/@:username").get(verifyJWT, getChannel)

export default router;