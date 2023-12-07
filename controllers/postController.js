import mongoose from "mongoose";
import Post from "../moongoose_schema/postSchema.js";
import Comment from "../moongoose_schema/commentSchema.js";
import { getUrl, s3delete, s3upload } from "../services/s3-bucket/s3.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { v4 as uuidv4 } from "uuid";

export const getFeedPost = async (req, res) => {
	try {
		const following = [...req.user.following, req.user._id];
		const page = parseInt(req.query.page);
		const limit = 5;

		const startIndex = page !== 0 ? limit * page + 1 : 0;

		const posts = await Post.find({ user: { $in: following } })
			.sort({ createdAt: -1, _id: -1 })
			.limit(limit)
			.skip(startIndex)
			.populate({
				path: "user",
				select: "name img",
			});

		const postsWithUrlsPromise = posts.map(async (post) => {
			const postUrl = await getUrl(post.img);
			post.img = postUrl;
			if (post.user.img !== CONSTANTS.DEFAULT_USER_IMG_URL) {
				const userProfilePicUrl = await getUrl(post.user.img);
				post.user.img = userProfilePicUrl;
			}

			return post;
		});

		let postsWithUrl = await Promise.all(postsWithUrlsPromise);

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: postsWithUrl,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
export const getUserPost = async (req, res) => {
	try {
		const userPost = await Post.find({ user: req.user._id }).populate({
			path: "user",
			select: "name img",
		});

		const postsWithUrlsPromise = userPost.map(async (post) => {
			const postUrl = await getUrl(post.img);
			const userProfilePicUrl = await getUrl(post.user.img);
			post.img = postUrl;
			post.user.img = userProfilePicUrl;
			return post;
		});

		let postsWithUrlPromisified = await Promise.allSettled(
			postsWithUrlsPromise
		);

		const postsWithUrl = postsWithUrlPromisified.map((post) => {
			return post.value;
		});

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: postsWithUrl,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const createPost = async (req, res) => {
	try {
		const userId = req.user._id;
		const img = req.body.img;
		const caption = req.body.caption;
		const postId = uuidv4();

		const buffer = await sharpify(img);

		const upload = await s3upload(userId, postId, buffer);

		if (!upload.$metadata.httpStatusCode === 200)
			throw new Error("some thing wrong with s3");

		const post = await Post.create({
			caption: caption,
			user: userId,
			img: `${userId}/${postId}.jpg`,
		});

		const postWithUser = await post.populate({
			path: "user",
			select: "name img",
		});

		const postUrl = await getUrl(postWithUser.img);
		const profilePicUrl = await getUrl(postWithUser.user.img);

		postWithUser.img = postUrl;
		postWithUser.user.img = profilePicUrl;

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: postWithUser,
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
		const postId = req.params.postId;

		const userId = req.user._id;

		await Post.findByIdAndUpdate(postId, [
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
		]);

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

export const getLikes = async (req, res) => {
	try {
		const postId = req.params.postId;
		const userId = req.user._id;

		let postLikesInfo = await Post.aggregate([
			{
				$match: {
					_id: mongoose.Types.ObjectId(postId),
				},
			},
			{
				$project: {
					likes: { $size: "$likes" },
					isLiked: { $cond: [{ $in: [userId, "$likes"] }, true, false] },
				},
			},
		]);

		postLikesInfo = postLikesInfo[0];

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: postLikesInfo,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const deletePost = async (req, res) => {
	try {
		const postId = req.params.postId;
		const object = await Post.findByIdAndDelete(postId);
		await Comment.deleteMany({ postId });
		await s3delete(object.img);
		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
		});
	} catch (error) {
		console.log(error.message);
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
