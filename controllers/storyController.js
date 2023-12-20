import { v4 as uuidv4 } from "uuid";

import Story from "../moongoose_schema/storiesSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import sharpify from "../utlis/sharp/sharp.js";
import { getUrl, s3upload } from "../services/s3-bucket/s3.js";
import redisClient from "../services/redis/redis.js";

export const getFeedStories = async (req, res) => {
	try {
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

		let reStructuredStories = result.map(async (document) => {
			const storyImgsKeyArray = document.value.img;

			let storyImgsUrl = storyImgsKeyArray.map(async (imgKey) => {
				return await getUrl(imgKey);
			});

			storyImgsUrl = await Promise.all(storyImgsUrl);

			let userImg = document.value.userImg;
			if (userImg !== CONSTANTS.DEFAULT_USER_IMG_URL) {
				userImg = await getUrl(userImg);
			}

			const storyId = document.id.split(":")[1];

			const storyObj = {
				_id: storyId,
				img: storyImgsUrl,
				user: {
					_id: document.value.userId,
					name: document.value.userName,
					img: userImg,
				},
				createdAt: document.value.createdAt,
			};

			return storyObj;
		});

		reStructuredStories = await Promise.all(reStructuredStories);

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: reStructuredStories,
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

		const isStoryAdded = await redisClient.ft.search(
			`idx:stories`,
			`@userId:{${userId}}`
		);

		if (isStoryAdded.total > 0) {
			const storyFromRedis = JSON.parse(JSON.stringify(isStoryAdded))
				.documents[0];

			const updatedStoryImgArray = [
				...storyFromRedis.value.img,
				`${userId}/${key}.jpg`,
			];

			const storyId = storyFromRedis.id.split(":")[1];

			await redisClient.json.merge(
				storyFromRedis.id,
				"img",
				updatedStoryImgArray
			);

			const updatedStoryInDataBase = await Story.findByIdAndUpdate(
				storyId,
				{
					$push: { img: `${userId}/${key}.jpg` },
				},
				{
					new: true,
				}
			);

			return res.status(200).json({
				status: CONSTANTS.SUCCESSFUL,
				data: updatedStoryInDataBase,
			});
		}

		const story = await Story.create({
			user: userId,
			img: [`${userId}/${key}.jpg`],
		});

		let userImgUrl = req.user.img;

		if (userImgUrl !== CONSTANTS.DEFAULT_USER_IMG_URL) {
			userImgUrl = `${userId}/${CONSTANTS.PROFILE_PIC_POST_ID}.jpg`;
		}

		await redisClient.json.set(`story:${story._id}`, "$", {
			img: story.img,
			userId: story.user.toString(),
			userImg: userImgUrl,
			userName: req.user.name,
			createdAt: story.createdAt.getTime(),
		});

		// redisClient.expire(`story:${story._id}`, 3600);

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

		const storyInRedis = await redisClient.json.get(`story:${storyId}`);

		console.log(storyInRedis);

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
