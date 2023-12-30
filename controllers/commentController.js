import mongoose from "mongoose";
import Comment from "../moongoose_schema/commentSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import storySeenInfo from "../utlis/storySeen/storySeenInfo.js";
import getDateDiff from "../utlis/dateDiff/getDateDiff.js";
const ObjectId = mongoose.Types.ObjectId;

export const postComment = async (req, res) => {
	try {
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

		console.log(newComment);

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
			comment.commentAge = getDateDiff(comment.createdAt);
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
				},
			},
			{
				$set: {
					likes: { $size: "$likes" },
				},
			},
		]);

		const commentWithUserImg = await Comment.populate(replies, {
			path: "user",
			select: "name img",
		});

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: commentWithUserImg,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const likeHandler = async (req, res) => {
	try {
		const commentId = req.params.postId;

		const userId = req.user._id;

		await Comment.findByIdAndUpdate(
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
			{ disableMiddlewares: true }
		);

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
