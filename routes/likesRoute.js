import express from "express";
import { protect } from "../controllers/authController.js";
import { getLikes } from "../controllers/likeController.js";

const likeRouter = express.Router();

likeRouter.route("/:postId").get(protect, getLikes);

export default likeRouter;
