import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getPlaylistVideos,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/users/:userId").get(getUserPlaylists);

router.route("/:playlistId").get(getPlaylistById);

router.route("/videos/:playlistId").get(getPlaylistVideos);

router.use(verifyJWT);

router.route("/").post(createPlaylist);

router.route("/:playlistId/videos").post(addVideoToPlaylist);

router.route("/:playlistId/videos/:videoId").delete(removeVideoFromPlaylist);

router.route("/:playlistId").patch(updatePlaylist).delete(deletePlaylist);

export default router;
