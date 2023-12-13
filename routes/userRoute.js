import express from "express";
import { singIn, Login, protect } from "../controllers/authController.js";
import { getUserPostWWithUrl } from "../middleWare/getPostWithUrl.js";
import {
	updateProfile,
	getUser,
	getSearchUser,
	getUserProfile,
	handleFollowToggle,
	getConnectedUser,
} from "../controllers/userController.js";
const userRouter = express.Router();

userRouter.route("/sing-in").post(singIn);
userRouter.route("/login").post(Login);
userRouter.route("/").get(protect, getUser);
userRouter.route("/update-profile").patch(protect, updateProfile);
userRouter.route("/search-user").get(protect, getSearchUser);
userRouter.route("/getConnectedUser/:id").get(protect, getConnectedUser);
userRouter
	.route("/:userId")
	.get(protect, getUserProfile, getUserPostWWithUrl)
	.patch(protect, handleFollowToggle);

export default userRouter;
