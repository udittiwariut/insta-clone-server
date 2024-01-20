import express from "express";
import { protect } from "../controllers/authController.js";
import {
	getUserNotiFications,
	getNotificationCount,
} from "../controllers/notificationController.js";

const notificationRouter = express.Router();

notificationRouter.route("/").get(protect, getUserNotiFications);
notificationRouter.route("/count").get(protect, getNotificationCount);

export default notificationRouter;
