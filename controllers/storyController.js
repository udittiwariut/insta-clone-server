import { v4 as uuidv4 } from "uuid";
import Story from "../moongoose_schema/storiesSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { getUrl, s3delete, s3upload } from "../services/s3-bucket/s3.js";
import redisClient from "../services/redis/redis.js";
import mongoose from "mongoose";
import storySeenInfo from "../utlis/storySeen/storySeenInfo.js";
import {
	redisDelete,
	redisSearch,
	redisSearchSeenBy,
} from "../utlis/redisHelper/redisHelper.js";
import User from "../moongoose_schema/userSchema.js";
import {
	NOTIFICATION_EVENT,
	createNotification,
} from "../utlis/notification/notification.js";
import Notification from "../moongoose_schema/notificationSchema.js";

export const getFeedStories = async (req, res) => {
	try {
		const mainUserId = req.user._id;
		const userFollowingList = await User.findById(mainUserId, { following: 1 });

		const redisSearchQuery = `${userFollowingList.following
			.toString()
			.split(",")
			.join(" | ")}`;

		let result = await redisSearch(redisSearchQuery);

		result = JSON.parse(JSON.stringify(result)).documents;

		let feedStoriesIds = result.map((doc) =>
			mongoose.Types.ObjectId(doc.id.split(":")[1])
		);

		let feedStories = await Story.aggregate([
			{
				$match: { _id: { $in: feedStoriesIds } },
			},
			{
				$sort: { createdAt: -1, _id: -1 },
			},
			{
				$group: {
					_id: "$user",
					storiesArray: { $push: "$$ROOT" },
				},
			},
			{
				$addFields: {
					user: "$_id",
				},
			},
			{
				$unset: ["_id"],
			},
		]);

		feedStories = await Story.populate(feedStories, {
			path: "user",
			select: "name img",
		});

		let seenStories = [];
		let unSeenStories = [];

		feedStories = feedStories.map(async ({ storiesArray, user }) => {
			let isSeenWhole = true;
			let storiesWithImgUrls = storiesArray.map(async (story) => {
				const storyImgUrl = await getUrl(story.img);
				const isSeen = await redisClient.json.get(
					`${CONSTANTS.STORY_SEEN_BY}${story._id}-${mainUserId}`
				);
				if (!isSeen) {
					isSeenWhole = false;
					story.isSeen = false;
				} else {
					story.isSeen = true;
				}
				story.img = storyImgUrl;

				return story;
			});

			storiesWithImgUrls = await Promise.all(storiesWithImgUrls);

			const storyObj = { user, storiesArray: storiesWithImgUrls, isSeenWhole };

			if (isSeenWhole) seenStories.push(storyObj);
			else unSeenStories.push(storyObj);

			return storyObj;
		});

		await Promise.all(feedStories);

		const sortStories = (storiesArray) => {
			return storiesArray.sort(function (a, b) {
				const getStoryCreatedDate = (o) => {
					return new Date(o.storiesArray[o.storiesArray.length - 1].createdAt);
				};
				const date1 = getStoryCreatedDate(a);

				const date2 = getStoryCreatedDate(b);

				return date1 - date2;
			});
		};

		const sortedAccordingToSeenStatus = [
			...sortStories(unSeenStories),
			...sortStories(seenStories),
		];

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: sortedAccordingToSeenStatus,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const postStory = async (req, res) => {
	try {
		const userId = req.user._id;
		const img = req.body.img;
		const key = `stories/${uuidv4()}`;

		const buffer = await sharpify(img);

		const upload = await s3upload(userId, key, buffer);

		if (!upload.$metadata.httpStatusCode === 200)
			throw new Error("Some thing wrong with s3");

		const story = await Story.create({
			user: userId,
			img: `${userId}/${key}.jpg`,
		});

		await redisClient.json.set(`story:${story._id}`, "$", {
			userId: story.user.toString(),
		});

		redisClient.expire(`story:${story._id}`, 3600 * 24);

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: story,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const updateSeenBy = async (req, res) => {
	try {
		const userId = req.user._id;
		const storyId = req.params.id;

		let ttlOfStory = await redisClient.ttl(`story:${storyId}`);

		const redisJsonKey = `${CONSTANTS.STORY_SEEN_BY}${storyId}-${userId}`;

		const isAlreadySeen = await redisClient.json.get(redisJsonKey);

		if (isAlreadySeen) {
			throw new Error("Already Seen! can't have 2 seen on same story");
		}

		await redisClient.json.set(redisJsonKey, "$", {
			storyId: storyId,
			isLiked: 0,
			userId: userId,
		});

		redisClient.expire(redisJsonKey, ttlOfStory);

		return res.status(200).json({
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

export const likeToggle = async (req, res) => {
	try {
		const storyId = req.params.id;
		const user = req.user;
		const isLiked = req.query.isLiked;

		const storyKey = `${CONSTANTS.STORY_SEEN_BY}${storyId}-${user._id}`;

		if (isLiked === "true") {
			await redisClient.json.merge(storyKey, "$.isLiked", 0);
		} else await redisClient.json.merge(storyKey, "$.isLiked", 1);

		const story = await Story.findById(storyId, {
			user: 1,
			img: 1,
		});

		createNotification({
			userId: story.user,
			interactedUser: user,
			relatedPost: storyId,
			relatedImg: story.img,
			eventText: NOTIFICATION_EVENT.LIKED_YOUR_STORY,
			type: NOTIFICATION_EVENT.LIKE,
			interactedWith: NOTIFICATION_EVENT.INTERACTED_WITH_STORY,
		});

		return res.status(200).json({
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

export const getSpecificUserStory = async (req, res) => {
	try {
		const userId = req.params.userId;
		const mainUserId = req.user._id;

		let result = await redisSearch(userId);

		if (result.total === 0) throw new Error("No story found");

		result = JSON.parse(JSON.stringify(result)).documents;

		let storiesIds = result.map((doc) =>
			mongoose.Types.ObjectId(doc.id.split(":")[1])
		);

		const storiesArray = await Story.aggregate([
			{
				$match: { _id: { $in: storiesIds } },
			},
			{
				$sort: { createdAt: 1, _id: 1 },
			},
			{
				$project: { img: 1 },
			},
		]);

		let isSeenWhole = true;

		let storiesWithImgUrls = storiesArray.map(async (story) => {
			const storyImgUrl = await getUrl(story.img);
			const redisJsonKey = `${CONSTANTS.STORY_SEEN_BY}${story._id}-${mainUserId}`;

			const seenByObj = await redisClient.json.get(redisJsonKey);

			if (seenByObj === null) {
				isSeenWhole = false;
				story.isSeen = false;
				story.isLiked = false;
			} else {
				story.isSeen = true;
				story.isLiked = Boolean(seenByObj.isLiked);
			}

			story.img = storyImgUrl;

			/// double = to match value not type
			if (userId == mainUserId) {
				let seenBy = await redisSearchSeenBy(story._id.toString(), true);
				const userIds = seenBy.documents.map(({ value }) => value.userId);

				const users = await User.find({ _id: { $in: userIds } }, { img: 1 });

				seenBy = {
					count: seenBy.total,
					topUsers: users,
				};

				story.seenBy = seenBy;
			}

			return story;
		});

		storiesWithImgUrls = await Promise.all(storiesWithImgUrls);

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: { storiesArray: storiesWithImgUrls, isSeenWhole },
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getSeenInfo = async (req, res) => {
	try {
		const storyByUserId = req.params.userId;
		const mainUserId = req.user._id;

		const seenInfo = await storySeenInfo(storyByUserId, mainUserId);

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: seenInfo,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getInteractionDetail = async (req, res) => {
	try {
		const storyId = req.params.id;

		const { documents } = await redisSearchSeenBy(storyId, false);

		const users = documents.map(({ value }) => {
			const userObj = {};
			userObj.user = value.userId;
			userObj.isLiked = Boolean(value.isLiked);
			return userObj;
		});

		const interactedUser = await User.populate(users, {
			path: "user",
			select: "name img",
		});

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: interactedUser,
		});
	} catch (error) {
		console.log(error.message);
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getIndividualStory = async (req, res) => {
	try {
		const storyId = req.params.storyId;
		const user = await User.findById(req.user._id, { name: 1, img: 1 });

		const story = await Story.findById(storyId);

		const storyImgUrl = await getUrl(story.img);

		story.img = storyImgUrl;

		const resObject = {
			isSeenWhole: true,
			user: { _id: user._id, name: user.name, img: user.img },
			storiesArray: [],
		};

		const isStoryPresent = await redisClient.json.get(`story:${storyId}`);

		let seenBy = CONSTANTS.STORY_EXPIRED;

		if (isStoryPresent) {
			let redisSearchResult = await redisSearchSeenBy(storyId, true);

			const userIds = redisSearchResult.documents.map(
				({ value }) => value.userId
			);

			const users = await User.find({ _id: { $in: userIds } }, { img: 1 });

			seenBy = {
				count: redisSearchResult.total,
				topUsers: users,
			};
		}

		story._doc.seenBy = seenBy;
		story._doc.isSeen = true;

		resObject.storiesArray = [story];

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: resObject,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const deleteStory = async (req, res) => {
	try {
		const storyId = req.params.id;

		const deletedStory = await Story.findByIdAndDelete(storyId);

		await redisDelete(deletedStory._id);

		const SAf = await Notification.deleteMany({
			relatedPost: deletedStory._id.toString(),
		});

		s3delete(deletedStory.img);

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: deletedStory,
		});
	} catch (error) {
		console.log(error);
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
