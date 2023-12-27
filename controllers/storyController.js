import { v4 as uuidv4 } from "uuid";
import Story from "../moongoose_schema/storiesSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { getUrl, s3upload } from "../services/s3-bucket/s3.js";
import redisClient from "../services/redis/redis.js";
import mongoose from "mongoose";
import storySeenInfo from "../utlis/storySeen/storySeenInfo.js";
import { redisSearch } from "../utlis/redisHelper/redisHelper.js";

export const getFeedStories = async (req, res) => {
	try {
		const followingUser = req.user.following;

		const redisSearchQuery = `${followingUser
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
				const isSeen = await redisClient.get(
					`${CONSTANTS.STORY_SEEN}-${story._id}-${req.user._id}`
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

		let getTtlOfStory = await redisClient.ttl(`story:${storyId}`);

		await redisClient.set(
			`${CONSTANTS.STORY_SEEN}-${storyId}-${userId}`,
			"true",
			{ EX: getTtlOfStory }
		);

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

export const likeToggle = async (req, res) => {
	try {
		const storyId = req.params.id;
		const userId = req.user._id;

		await Story.findByIdAndUpdate(storyId, [
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

export const getSpecificUserStory = async (req, res) => {
	try {
		const userId = req.params.userId;

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
				$addFields: {
					isLiked: { $cond: [{ $in: [userId, "$likes"] }, true, false] },
				},
			},
			{
				$project: { img: 1, isLiked: 1 },
			},
		]);

		let isSeenWhole = true;

		let storiesWithImgUrls = storiesArray.map(async (story) => {
			const storyImgUrl = await getUrl(story.img);
			const isSeen = await redisClient.get(
				`${CONSTANTS.STORY_SEEN}-${story._id}-${req.user._id}`
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

		res.status(200).json({
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
