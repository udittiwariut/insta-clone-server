import Post from "../moongoose_schema/postSchema.js";
import Comment from "../moongoose_schema/commentSchema.js";
import { getUrl, s3delete, s3upload } from "../services/s3-bucket/s3.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { v4 as uuidv4, v4 } from "uuid";
import Like from "../moongoose_schema/likeSchema.js";
import postMetaDataCompleter from "../helpers/postMetaDataCompleter.js";
import storySeenInfo from "../utlis/storySeen/storySeenInfo.js";
import {
	NOTIFICATION_EVENT,
	createNotification,
} from "../utlis/notification/notification.js";
import isDifferenceOneMonth from "../utlis/dateDiff/isDiffIsOneMonth.js";
import Notification from "../moongoose_schema/notificationSchema.js";
import User from "../moongoose_schema/userSchema.js";
import getUserImgUrl from "../helpers/getUserImgUrl.js";

export const getFeedPost = async (req, res) => {
	try {
		const userId = req.user._id;

		const userFollowingList = await User.findById(userId, { following: 1 });

		const following = [...userFollowingList.following, userId];

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
		const userId = req.user._id;
		const img = req.body.img;
		const caption = req.body.caption;

		const key = `posts/${uuidv4()}`;

		const buffer = await sharpify(img);

		const upload = await s3upload(userId, key, buffer);

		if (!upload.$metadata.httpStatusCode === 200)
			throw new Error("some thing wrong with s3");

		let post = await Post.create({
			caption: caption,
			user: userId,
			img: `${userId}/${key}.jpg`,
		});

		post = await Post.populate(post, { path: "user", select: "name img" });

		const postWithUser = post;

		const postUrl = await getUrl(postWithUser.img);

		postWithUser.img = postUrl;

		postWithUser._doc.likes = 0;

		const { isStory, isSeen } = await storySeenInfo(userId, userId);

		post.user._doc.isStory = isStory;
		post.user._doc.isSeen = isSeen;

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: postWithUser,
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
		const postId = req.params.postId;

		const user = req.user;

		const userId = user._id;

		const isLiked = req.query.isLiked;

		const post = await Post.findById(postId, {
			user: 1,
			img: 1,
		});

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

		createNotification({
			userId: post.user,
			interactedUser: user,
			relatedPost: postId,
			relatedImg: post.img,
			eventText: NOTIFICATION_EVENT.LIKED_YOUR_POST,
			type: NOTIFICATION_EVENT.LIKE,
			interactedWith: NOTIFICATION_EVENT.INTERACTED_WITH_POST,
		});

		return res.status(200).json({
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

		await Notification.deleteMany({ relatedImg: object.img });

		s3delete(object.img);

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

export const getUserPost = async (req, res, next) => {
	try {
		const userId = req.user._id;

		// eslint-disable-next-line no-unused-vars

		const user = await User.findById(userId, {
			following: 0,
			email: 0,
			followers: 0,
			bio: 0,
		});

		const posts = await Post.find({ user: userId }).sort({
			createdAt: -1,
		});

		const { isStory, isSeen } = await storySeenInfo(userId, userId);

		user.isStory = isStory;
		user.isSeen = isSeen;

		req.userPosts = posts;
		res.user = user;
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
		const fromDate = new Date(req.query.fromDate);
		const upToDate = new Date(req.query.upToDate);

		if (isDifferenceOneMonth(new Date(), upToDate)) {
			return res.status(200).json({
				status: CONSTANTS.SUCCESSFUL,
				data: CONSTANTS.END_OF_EXPLORE_PAGE,
			});
		}

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
			post.user = await getUserImgUrl(post.user);

			const { isSeen, isStory } = await storySeenInfo(post.user._id, userId);

			post.user.isSeen = isSeen;
			post.user.isStory = isStory;

			const isLiked = await Like.findOne({
				user: userId,
				postId: post._id,
			});
			post.key = v4();
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

export const getIndividualPost = async (req, res) => {
	try {
		const postId = req.params.postId;
		const userId = req.user._id;

		const post = await Post.findById(postId)
			.populate({
				path: "likes",
			})
			.populate({
				path: "user",
				select: "name img",
			});

		const postUrl = await getUrl(post.img);

		post.img = postUrl;

		const isLiked = await Like.findOne({
			user: userId,
			postId: post._id,
		});

		const { isStory, isSeen } = await storySeenInfo(post.user._id, userId);

		post.user._doc.isStory = isStory;
		post.user._doc.isSeen = isSeen;

		post._doc.isLiked = isLiked ? true : false;
		post._doc.likes = post.likes;
		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: post,
		});
	} catch (error) {
		return res.status(400).json({
			message: error.message,
		});
	}
};
