import User from "./../moongoose_schema/userSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { getUrl, s3upload } from "../services/s3-bucket/s3.js";
import Post from "../moongoose_schema/postSchema.js";
import mongoose from "mongoose";
import storySeenInfo from "../utlis/storySeen/storySeenInfo.js";
import {
	NOTIFICATION_EVENT,
	createNotification,
} from "../utlis/notification/notification.js";
import Notification from "../moongoose_schema/notificationSchema.js";

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
			toUpdateField.img = `${userId}/${postId}.jpg`;
			if (!upload.$metadata.httpStatusCode === 200)
				throw new Error("some thing wrong with s3");
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
		const user = req.user;

		if (!user) {
			throw new Error("No user found");
		}

		const isStorySeen = await storySeenInfo(user._id, user._id);

		user._doc.isStory = isStorySeen.isStory;
		user._doc.isSeen = isStorySeen.isSeen;
		user._doc.following = user.following.length;
		user._doc.followers = user.followers.length;

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: user,
		});
	} catch (error) {
		console.log(error);
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
		const mainUserId = req.user._id;
		const userId = req.params.userId;

		const posts = await Post.find({ user: userId }).sort({
			createdAt: -1,
			_id: -1,
		});

		let user = await User.aggregate([
			{
				$match: { _id: mongoose.Types.ObjectId(userId) },
			},
			{
				$set: {
					isFollowing: { $in: [mainUserId, "$followers"] },
					following: { $size: "$following" },
					followers: { $size: "$followers" },
				},
			},
			{
				$replaceWith: {
					$unsetField: {
						field: "password",
						input: "$$ROOT",
					},
				},
			},
		]);

		user = user[0];

		if (user.img !== CONSTANTS.DEFAULT_USER_IMG_URL) {
			const userId = user._id;
			const key = `${userId}/${CONSTANTS.PROFILE_PIC_POST_ID}.jpg`;
			const imgUrl = await getUrl(key);
			user.img = imgUrl;
		}

		const { isStory, isSeen } = await storySeenInfo(user._id, mainUserId);

		user.isStory = isStory;
		user.isSeen = isSeen;

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
		const otherUserId = req.params.userId;
		const currentFollowState = req.query.followState;

		let OPERATOR;

		const actionTriggerQuery = {};
		const otherUserQuery = {};

		if (currentFollowState === "follow") {
			OPERATOR = "$push";
			createNotification({
				userId: mongoose.Types.ObjectId(otherUserId),
				eventText: NOTIFICATION_EVENT.FOLLOWED_YOU,
				interactedUser: mongoose.Types.ObjectId(actionTriggerUserId),
				interactedWith: NOTIFICATION_EVENT.INTERACTED_WITH_USER,
				relatedImg: null,
				relatedPost: null,
				type: NOTIFICATION_EVENT.FOLLOW,
			});
		}
		if (currentFollowState === "following") {
			OPERATOR = "$pull";

			// first time precautions

			await Notification.findOneAndUpdate(
				{
					user: otherUserId,
					interactedUser: actionTriggerUserId,
					relatedPost: null,
				},
				[
					{
						$set: { isDeleted: { $eq: [false, "$isDeleted"] } },
					},
				]
			);
		}

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

export const getConnectedUser = async (req, res) => {
	try {
		const path = req.query.path;
		const userId = req.params.id;
		const fieldToGet = {};

		fieldToGet[path] = 1;

		let user = await User.findById(userId, fieldToGet).populate({
			path: path,
			select: "name img",
		});

		const connectedUser = user[path];

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: connectedUser,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
