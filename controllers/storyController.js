import { v4 as uuidv4 } from "uuid";

import Story from "../moongoose_schema/storiesSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { getUrl, s3upload } from "../services/s3-bucket/s3.js";
import redisClient from "../services/redis/redis.js";
import mongoose from "mongoose";

export const getFeedStories = async (req, res) => {
	try {
		const user = req.user;
		const followingUser = req.user.following;

		const redisSearchQuery = `{${followingUser
			.toString()
			.split(",")
			.join(" | ")}}`;

		let result = await redisClient.ft.search(
			`idx:stories`,
			`@userId:${redisSearchQuery}`
		);

		result = JSON.parse(JSON.stringify(result)).documents;

		let feedStoriesIds = result.map((doc) =>
			mongoose.Types.ObjectId(doc.id.split(":")[1])
		);

		let feedStories = await Story.aggregate([
			{
				$match: { _id: { $in: feedStoriesIds } },
			},
			{
				$sort: { createdAt: -1, _id: 1 },
			},
			{
				$addFields: {
					isSeen: { $in: [user._id, "$seenBy"] },
				},
			},
			{
				$unset: ["seenBy,"],
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

		const seenStories = [];
		const unSeenStories = [];

		feedStories = feedStories.map(async ({ storiesArray, user }) => {
			let isSeenWhole = true;
			let storiesWithImgUrls = storiesArray.map(async (story) => {
				const storyImgUrl = await getUrl(story.img);
				if (!story.isSeen) isSeenWhole = false;
				story.img = storyImgUrl;
				return story;
			});

			storiesWithImgUrls = await Promise.all(storiesWithImgUrls);

			storiesWithImgUrls = storiesWithImgUrls.sort(function (o) {
				return -new Date(o.createdAt);
			});

			console.log(storiesWithImgUrls);

			const storyObj = { user, storiesArray: storiesWithImgUrls, isSeenWhole };

			if (isSeenWhole) seenStories.push(storyObj);
			else unSeenStories.push(storyObj);

			return storyObj;
		});

		await Promise.all(feedStories);

		const sortedAccordingToSeenStatus = [...unSeenStories, ...seenStories];

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: sortedAccordingToSeenStatus,
		});
	} catch (error) {
		console.log(error);
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

		redisClient.expire(`story:${story._id}`, 3600 * 3);

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

		await Story.findByIdAndUpdate(storyId, {
			$addToSet: { seenBy: userId },
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
