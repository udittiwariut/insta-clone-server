import User from "./../moongoose_schema/userSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { s3upload } from "../services/s3-bucket/s3.js";
import Post from "../moongoose_schema/postSchema.js";
import mongoose from "mongoose";

export const updateProfile = async (req, res) => {
	try {
		const reqBody = req.body;
		const userId = req.user._id;
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
		const userIdFromParam = req.query.userId;

		let userId = userIdFromParam || req.user._id;

		const user = await User.findById(userId);

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: user,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getSearchUser = async (req, res) => {
	try {
		const getOnlyFollowingUser = req.query.onlyFollowingUser;
		const searchVal = req.query.search;

		let query;

		const forName = { name: { $regex: searchVal, $options: "i" } };

		if (getOnlyFollowingUser === "true") {
			const followingUserIds = req.user.following;
			query = {
				$and: [{ _id: { $in: followingUserIds } }, forName],
			};
		} else query = forName;

		const users = await User.find(query, { name: 1, img: 1 });

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: users,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getUserProfile = async (req, res, next) => {
	try {
		const userId = req.params.userId;
		const posts = await Post.find({ user: userId });
		const user = await User.findById(userId);

		if (!user) {
			throw new Error("Invalid User Id");
		}

		req.userPosts = posts;
		res.user = user;
		next();
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const handleFollowToggle = async (req, res) => {
	try {
		const actionTriggerUserId = req.user._id;
		const otherUserId = mongoose.Types.ObjectId(req.params.userId);
		const currentFollowState = req.query.followState;

		let OPERATOR;

		const actionTriggerQuery = {};
		const otherUserQuery = {};

		if (currentFollowState === "follow") OPERATOR = "$push";
		if (currentFollowState === "following") OPERATOR = "$pull";

		actionTriggerQuery[OPERATOR] = { following: otherUserId };
		otherUserQuery[OPERATOR] = { followers: actionTriggerUserId };

		await User.findByIdAndUpdate(actionTriggerUserId, actionTriggerQuery);
		await User.findByIdAndUpdate(otherUserId, otherUserQuery);

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			prevFollowState: currentFollowState,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
