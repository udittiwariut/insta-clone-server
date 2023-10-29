import express from "express";

import { protect } from "../controllers/authController.js";

import { getFollowingUser } from "../controllers/userController.js";

const chatRouter = express.Router();

chatRouter.route("/").get(protect, getFollowingUser);

export default chatRouter;
