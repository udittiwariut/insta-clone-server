import mongoose from "mongoose";
import Comment from "../moongoose_schema/commentSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import storySeenInfo from "../utlis/storySeen/storySeenInfo.js";
import getDateDiff from "../utlis/dateDiff/getDateDiff.js";
import {
	NOTIFICATION_EVENT,
	createNotification,
} from "../utlis/notification/notification.js";
import { getIndividualPost } from "./postController.js";
import Notification from "../moongoose_schema/notificationSchema.js";
import Post from "../moongoose_schema/postSchema.js";

const ObjectId = mongoose.Types.ObjectId;

export const postComment = async (req, res) => {
	try {
		// eslint-disable-next-line no-unused-vars
		const { following, email, followers, bio, ...user } = req.user._doc;

		const postId = req.params.postId;
		const parentId = req.query.parentId === "null" ? null : req.query.parentId;
		const replyTo = req.query.replyToId === "null" ? null : req.query.replyToId;
		const userId = req.user._id;
		const commentText = req.body.commentText;

		let newComment = await Comment.create({
			postId,
			user: userId,
			commentText,
			parentId,
			replyTo,
		});
		newComment._doc.user = user;

		newComment._doc.commentAge = getDateDiff(newComment.createdAt);

		const { isStory, isSeen } = await storySeenInfo(userId, userId);

		newComment.user.isStory = isStory;
		newComment.user.isSeen = isSeen;

		const post = await Post.findById(
			postId,
			{ user: 1, img: 1 },
			{ disableMiddlewares: true }
		);

		createNotification({
			userId: post.user,
			eventText:
				NOTIFICATION_EVENT.COMMENTED_ON_YOUR_POST + newComment.commentText,
			interactedUser: newComment.user,
			relatedImg: post.img,
			relatedPost: newComment._id,
			type: NOTIFICATION_EVENT.COMMENT,
			interactedWith: NOTIFICATION_EVENT.INTERACTED_WITH_COMMENT,
		});
		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: newComment,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getPostComment = async (req, res) => {
	try {
		const postId = req.params.postId;
		const userId = req.user._id;

		let commentsArray = await Comment.aggregate([
			{
				$match: {
					postId: mongoose.Types.ObjectId(postId),
					parentId: null,
				},
			},
			{
				$sort: {
					createdAt: -1,
					_id: -1,
				},
			},
			{
				$addFields: {
					isLiked: { $cond: [{ $in: [userId, "$likes"] }, true, false] },
					isOurComment: { $eq: ["$user", userId] },
				},
			},

			{
				$set: {
					likes: { $size: "$likes" },
				},
			},
			{
				$lookup: {
					from: "comments",
					let: {
						parentId: "$_id",
					},
					pipeline: [
						{
							$match: { $expr: { $eq: ["$parentId", "$$parentId"] } },
						},
						{
							$count: "count",
						},
					],
					as: "replies",
				},
			},
			{ $unwind: { path: "$replies", preserveNullAndEmptyArrays: true } },
		]);

		let commentsWithUser = await Comment.populate(commentsArray, {
			path: "user",
			select: "name img",
		});

		let commentsWithUserAndStoryInfo = commentsWithUser.map(async (comment) => {
			const commentUserId = comment.user._id;
			const { isSeen, isStory } = await storySeenInfo(commentUserId, userId);
			comment.user._doc.isStory = isStory;
			comment.user._doc.isSeen = isSeen;
			comment.commentAge = getDateDiff(comment.createdAt, Date.now());
			return comment;
		});

		commentsWithUserAndStoryInfo = await Promise.all(
			commentsWithUserAndStoryInfo
		);

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: commentsWithUserAndStoryInfo,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
export const getReplies = async (req, res) => {
	try {
		const parentId = req.params.parentId;
		const userId = req.user._id;

		let replies = await Comment.aggregate([
			{ $match: { parentId: ObjectId(parentId) } },
			{
				$addFields: {
					isLiked: { $cond: [{ $in: [userId, "$likes"] }, true, false] },
					isOurComment: { $eq: ["$user", userId] },
				},
			},
			{
				$set: {
					likes: { $size: "$likes" },
				},
			},
		]);

		replies = replies.map((reply) => {
			reply.commentAge = getDateDiff(reply.createdAt, Date.now());
			return reply;
		});

		const commentWithUserImg = await Comment.populate(replies, {
			path: "user",
			select: "name img",
		});

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: commentWithUserImg,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const likeHandler = async (req, res) => {
	try {
		const commentId = req.params.postId;

		const user = req.user;
		const userId = user._id;

		const comment = await Comment.findByIdAndUpdate(
			commentId,
			[
				{
					$set: {
						likes: {
							$cond: [
								{ $in: [userId, "$likes"] },
								{
									$filter: {
										input: "$likes",
										as: "like",
										cond: { $ne: ["$$like", userId] },
									},
								},
								{ $concatArrays: ["$likes", [userId]] },
							],
						},
					},
				},
			],
			{
				disableMiddlewares: true,
				new: true,
				projection: { user: 1, postId: 1, commentText: 1, _id: 1 },
			}
		).populate({
			path: "postId",
			model: "Post",
			select: "img _id",
			options: { disableMiddlewares: true },
		});

		createNotification({
			userId: comment.user,
			eventText: NOTIFICATION_EVENT.LIKED_YOU_COMMENT + comment.commentText,
			interactedUser: user,
			relatedImg: comment.postId.img,
			relatedPost: comment._id,
			type: NOTIFICATION_EVENT.LIKE,
			interactedWith: NOTIFICATION_EVENT.INTERACTED_WITH_COMMENT,
		});

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getCommentForModal = async (req, res) => {
	try {
		const commentId = req.params.commentId;

		const comment = await Comment.findById(
			commentId,
			{ postId: 1 },
			{ disableMiddlewares: true }
		);

		if (!comment) {
			throw Error("This post is no longer exist");
		}

		req.params.postId = comment.postId;

		getIndividualPost(req, res);
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const deleteComment = async (req, res) => {
	try {
		const commentId = mongoose.Types.ObjectId(req.params.id);

		let allEffectingCommnetId = await Comment.aggregate([
			{
				$match: {
					$expr: {
						$or: [
							{ $eq: ["$_id", commentId] },
							{ $eq: ["$replyTo", commentId] },
							{ $eq: ["$parentId", commentId] },
						],
					},
				},
			},
			{ $project: { _id: 1 } },
		]);

		allEffectingCommnetId = allEffectingCommnetId.map((obj) => obj._id);

		const commentPromis = Comment.deleteMany({
			_id: { $in: allEffectingCommnetId },
		});

		const notificationPromis = Notification.deleteMany({
			relatedPost: { $in: allEffectingCommnetId },
		});

		await Promise.all([commentPromis, notificationPromis]);

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
