import express from "express";
import multer from "multer";
import { protect } from "../controllers/authController.js";
import {
	getFeedPost,
	createPost,
	getUserPost,
	likeHandler,
	getLikes,
	deletePost,
} from "../controllers/postController.js";

const postRouter = express.Router();
const upload = multer();

postRouter
	.route("/")
	.get(protect, getFeedPost)
	.post(protect, upload.single("img"), createPost);

postRouter.route("/userprofile").get(protect, getUserPost);

postRouter
	.route("/:postId")
	.patch(protect, likeHandler)
	.get(protect, getLikes)
	.delete(protect, deletePost);

export default postRouter;
