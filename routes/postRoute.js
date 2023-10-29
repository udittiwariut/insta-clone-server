import express from "express";
import multer from "multer";
import { protect } from "../controllers/authController.js";
import {
	getFeedPost,
	createPost,
	getUserPost,
	likeHnadler,
	update,
} from "../controllers/postController.js";

const postRouter = express.Router();
const upload = multer();

postRouter.route("/update").get(update);

postRouter
	.route("/")
	.get(protect, getFeedPost)
	.post(protect, upload.single("img"), createPost);

postRouter.route("/like").put(
	protect,
	(req, res, next) => {
		req.like = "true";
		next();
	},
	likeHnadler
);
postRouter.route("/unlike").put(
	protect,
	(req, res, next) => {
		req.unlike = "true";
		next();
	},
	likeHnadler
);

postRouter.route("/userprofile").get(protect, getUserPost);

export default postRouter;
