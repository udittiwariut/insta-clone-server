import mongoose from "mongoose";
import Comment from "../moongoose_schema/commentSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
const ObjectId = mongoose.Types.ObjectId;

export const postComment = async (req, res) => {
	try {
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

		newComment = await newComment.populate({
			path: "user",
			select: "name img",
		});

		newComment._doc.replies = 0;

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

		const commentsArray = await Comment.aggregate([
			{
				$facet: {
					parentComment: [
						{
							$match: {
								postId: mongoose.Types.ObjectId(postId),
								parentId: null,
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
					],
					replies: [
						{
							$match: {
								postId: mongoose.Types.ObjectId(postId),
								parentId: { $ne: null },
							},
						},
						{
							$group: {
								_id: "$parentId",
								count: { $sum: 1 },
							},
						},
					],
				},
			},
		]);

		let commentsWithReplyCount = commentsArray[0].parentComment.map(
			(rootComment) => {
				const replyCount = commentsArray[0].replies.find((reply) => {
					return reply._id.toString() === rootComment._id.toString();
				});
				if (replyCount) return { ...rootComment, replies: replyCount.count };
				else return { ...rootComment, replies: 0 };
			}
		);

		const commentsWithUser = await Comment.populate(commentsWithReplyCount, {
			path: "user",
			select: "name img",
		});

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: commentsWithUser,
		});
	} catch (error) {
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
