import express from "express";

import { protect } from "../controllers/authController.js";
import {
	getAllChat,
	getChat,
	sendText,
} from "../controllers/chatController.js";

const chatRouter = express.Router();

chatRouter.route("/").get(protect, getAllChat);

chatRouter
	.route("/:chatWithUserId")
	.get(protect, getChat)
	.post(protect, sendText);

export default chatRouter;
