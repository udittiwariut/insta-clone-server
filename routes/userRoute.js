import express from "express";
import { singIn, Login, protect } from "../controllers/authController.js";
import {
	updateProfile,
	getUser,
	followRequest,
} from "../controllers/userController.js";
const userRouter = express.Router();

userRouter.route("/sing-in").post(singIn);
userRouter.route("/login").post(Login);
userRouter.route("/").get(protect, getUser);
userRouter.route("/update-profile").patch(protect, updateProfile);
userRouter.route("/followReq").patch(protect, followRequest);

export default userRouter;
