import Post from "../moongoose_schema/postSchema.js";
import Comment from "../moongoose_schema/commentSchema.js";
import { getUrl, s3delete, s3upload } from "../services/s3-bucket/s3.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { v4 as uuidv4 } from "uuid";
import Like from "../moongoose_schema/likeSchema.js";
import postMetaDataCompleter from "../helpers/postMetaDataCompleter.js";

export const getFeedPost = async (req, res) => {
	try {
		const userId = req.user._id;
		const following = [...req.user.following, userId];
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

		let postsWithUrl = await postMetaDataCompleter(posts, userId);

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
		const user = req.user;
		const img = req.body.img;
		const caption = req.body.caption;

		const key = `posts/${uuidv4()}`;

		const buffer = await sharpify(img);

		const upload = await s3upload(user._id, key, buffer);

		if (!upload.$metadata.httpStatusCode === 200)
			throw new Error("some thing wrong with s3");

		const post = await Post.create({
			caption: caption,
			user: user._id,
			img: `${user._id}/${key}.jpg`,
		});

		post.user = user;

		const postWithUser = post;

		const postUrl = await getUrl(postWithUser.img);

		postWithUser.img = postUrl;

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

		const isLiked = req.query.isLiked;

		if (isLiked === "true") {
			await Like.deleteOne({
				postId,
				user: userId,
			});
		}
		if (isLiked === "false") {
			await Like.create({
				postId,
				user: userId,
			});
		}

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

export const deletePost = async (req, res) => {
	try {
		const postId = req.params.postId;
		const object = await Post.findByIdAndDelete(postId);
		await Comment.deleteMany({ postId });
		await Like.deleteMany({ postId });
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

export const getUserPost = async (req, res, next) => {
	try {
		const userId = req.user._id;

		const posts = await Post.find({ user: userId }).sort({
			createdAt: -1,
		});
		req.userPosts = posts;
		res.user = req.user;
		next();
	} catch (error) {
		res.status(400).json({
			message: error.message,
		});
	}
};

export const getTrendingPost = async (req, res) => {
	try {
		const userId = req.user._id;
		const toSubNumber = req.query.upToDate;
		const fromDate = new Date();
		const upToDate = new Date();

		fromDate.setDate(fromDate.getDate() - parseInt(toSubNumber));
		upToDate.setDate(fromDate.getDate() - 3);

		const sortedAccordingLikes = await Like.aggregate([
			{
				$match: { createdAt: { $gt: upToDate, $lte: fromDate } },
			},
			{
				$group: {
					_id: "$postId",
					count: { $sum: 1 },
				},
			},
			{ $sort: { count: -1, _id: -1 } },
			{ $limit: 3 },
			{
				$lookup: {
					localField: "_id",
					from: "posts",
					foreignField: "_id",
					as: "post",
				},
			},
			{ $unset: ["count", "_id"] },
			{
				$unwind: "$post",
			},
			{ $replaceRoot: { newRoot: "$post" } },
			{
				$lookup: {
					from: "users",
					let: { userId: "$user" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
						{
							$project: { name: 1, img: 1 },
						},
					],
					as: "user",
				},
			},
			{ $unwind: "$user" },
		]);

		const postWithLikeCount = await Post.populate(sortedAccordingLikes, {
			path: "likes",
		});

		const postsWithUrlsPromise = postWithLikeCount.map(async (post) => {
			const postUrl = await getUrl(post.img);
			let userImgUrl = post.user.img;

			if (userImgUrl !== CONSTANTS.DEFAULT_USER_IMG_URL) {
				userImgUrl = await getUrl(userImgUrl);
				post.user.img = userImgUrl;
			}
			const isLiked = await Like.findOne({
				user: userId,
				postId: post._id,
			});
			post.img = postUrl;
			post.isLiked = isLiked ? true : false;
			return post;
		});

		const postsWithUrlObj = {};

		let postsWithUrl = await Promise.all(postsWithUrlsPromise);

		postsWithUrl.forEach((post) => {
			postsWithUrlObj[post._id] = post;
		});

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: postsWithUrlObj,
		});
	} catch (error) {
		return res.status(400).json({
			message: error.message,
		});
	}
};
