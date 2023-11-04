import User from "./../moongoose_schema/userSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { s3upload } from "../services/s3-bucket/s3.js";

export const updateProfile = async (req, res) => {
	try {
		const reqBody = req.body;
		const userId = req.user.id;
		const toUpdateField = Object.keys(req.body).reduce((fields, filed) => {
			if (reqBody[filed]) fields[filed] = reqBody[filed];
			return fields;
		}, {});

		if (toUpdateField.img) {
			const postId = CONSTANTS.PROFILE_PIC_POST_ID;
			const buffer = await sharpify(toUpdateField.img);
			const upload = await s3upload(userId, postId, buffer);
			if (!upload.$metadata.httpStatusCode === 200)
				throw new Error("some thing wrong with s3");

			toUpdateField.img = `${userId}/${postId}.jpg`;
		}

		const updatedUser = await User.findByIdAndUpdate(userId, toUpdateField, {
			new: true,
		});

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: updatedUser,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getUser = async (req, res) => {
	try {
		const userId = req.user.id;
		const user = await User.findById(userId);

		return res.status(200).json({
			data: user,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const followRequest = async (req, res) => {
	try {
		await User.findByIdAndUpdate(req.body.userId, {
			$push: { followers: req.user.id },
		});
		await User.findByIdAndUpdate(req.user.id, {
			$push: { following: req.body.userId },
		});

		res.status(200).json({
			message: "Following req compleate",
		});
	} catch (error) {
		res.status(400).json({
			message: error.message,
		});
	}
};

export const getFollowingUser = async (req, res) => {
	try {
		const following = req.user.following;

		const users = await User.find({ _id: { $in: following } });

		res.status(200).json({
			message: "success",
			user: users.length,
			users,
		});
	} catch (error) {
		res.status(400).json({
			message: "Failed",
			error: error.message,
		});
	}
};
