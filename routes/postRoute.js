import express from "express";
import multer from "multer";
import { protect } from "../controllers/authController.js";
import { getUserPostWWithUrl } from "../middleWare/getPostWithUrl.js";
import {
	getFeedPost,
	createPost,
	getUserPost,
	likeHandler,
	deletePost,
	getTrendingPost,
} from "../controllers/postController.js";

const postRouter = express.Router();
const upload = multer();

postRouter
	.route("/")
	.get(protect, getFeedPost)
	.post(protect, upload.single("img"), createPost);

postRouter.route("/userprofile").get(protect, getUserPost, getUserPostWWithUrl);

postRouter.route("/explore").get(protect, getTrendingPost);

postRouter
	.route("/:postId")
	.post(protect, likeHandler)
	.delete(protect, deletePost);

export default postRouter;
