import express from "express";
import { protect } from "../controllers/authController.js";
import {
	postComment,
	getPostComment,
	getReplies,
	likeHandler,
	getLikes,
} from "../controllers/commentController.js";

const commentRouter = express.Router();

commentRouter
	.route("/:postId")
	.get(protect, getPostComment)
	.post(protect, postComment)
	.patch(protect, likeHandler);

commentRouter.route("/like/:commentId").get(protect, getLikes);

commentRouter.route("/replies/:parentId").get(protect, getReplies);

export default commentRouter;
