import express from "express";
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(cookieParser())

// routes import
import userRouter from './routes/user.routes.js'
import authRouter from './routes/auth.routes.js'
import channelRouter from './routes/channel.routes.js'
import subscriptionRouter from './routes/subscription.routes.js'
import videoRouter from './routes/video.routes.js'

// routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/channels", channelRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)

export { app };


// add suffix to the multer file name
// add proper validation for sign up fields
// add email verification for sign up
// modify response data for register controller. remove extra db call
// add email in updateUserDetails controller
// add validation in changeCurrentPassword controller
// add filefilter to multer so that it prevents wrong file type


// add optional verifyjwt in channel router for the logged out user
// optimize the getchannel controller's aggregation