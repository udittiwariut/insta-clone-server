import express from "express";
import { protect } from "../controllers/authController.js";
import {
	postComment,
	getPostComment,
	getReplies,
	likeHandler,
	getCommentForModal,
	deleteComment,
} from "../controllers/commentController.js";

const commentRouter = express.Router();

commentRouter
	.route("/:postId")
	.get(protect, getPostComment)
	.post(protect, postComment)
	.patch(protect, likeHandler);

commentRouter.route("/comment/:id").delete(protect, deleteComment);

commentRouter.route("/individual/:commentId").get(protect, getCommentForModal);

commentRouter.route("/replies/:parentId").get(protect, getReplies);

export default commentRouter;
