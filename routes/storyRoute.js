import express from "express";
import {
	getFeedStories,
	postStory,
	updateSeenBy,
	getSpecificUserStory,
	getSeenInfo,
} from "../controllers/storyController.js";
import { protect } from "../controllers/authController.js";
import multer from "multer";

const upload = multer({ limits: { fieldSize: 25 * 1024 * 1024 } });

const storyRouter = express.Router();

storyRouter
	.route("/")
	.get(protect, getFeedStories)
	.post(protect, upload.single("img"), postStory);

storyRouter.route("/:id").patch(protect, updateSeenBy);

storyRouter.route("/seen/:userId").get(protect, getSeenInfo);

storyRouter.route("/user/:userId").get(protect, getSpecificUserStory);

export default storyRouter;
