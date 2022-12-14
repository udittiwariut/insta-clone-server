import express from "express";
import { singUp, Login, protect } from "../controllers/authController.js";
import {
	uploadProfilePic,
	getUser,
	followRequest,
} from "../controllers/userController.js";
import { uploadPhoto, resizeImg } from "../services/multer.js";
const userRouter = express.Router();

userRouter.route("/singin").post(singUp);
userRouter.route("/login").post(Login);
userRouter.route("/").get(protect, getUser);
userRouter.route("/profile_pic").patch(protect, uploadProfilePic);
userRouter.route("/followReq").patch(protect, followRequest);

export default userRouter;
