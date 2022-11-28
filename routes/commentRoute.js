import express from "express";
import { protect } from "../controllers/authController.js";
import {
	postComment,
	getPostComment,
} from "../controllers/commentController.js";

const commentRouter = express.Router();

commentRouter.route("/:post_id").get(protect, getPostComment);
commentRouter.route("/").post(protect, postComment);

export default commentRouter;
