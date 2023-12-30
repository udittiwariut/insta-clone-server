import redisClient from "./services/redis/redis.js";
import { SchemaFieldTypes } from "redis";
import CONSTANTS from "./utlis/constants/constants.js";

const createIndexStory = async () => {
	try {
		await redisClient.ft.create(
			"idx:stories",
			{
				"$.userId": {
					type: SchemaFieldTypes.TAG,
					AS: "userId",
				},
			},
			{
				ON: "JSON",
				PREFIX: "story:",
			}
		);
		console.log(CONSTANTS.SUCCESSFUL);
		process.exit(1);
	} catch (e) {
		if (e.message === "Index already exists") {
			console.log("Index exists already, skipped creation.");
		} else {
			// Something went wrong, perhaps RediSearch isn't installed...
			console.error(e);
			process.exit(1);
		}
	}
};

const createIndexStoryInteractions = async () => {
	try {
		await redisClient.ft.create(
			"idx:storyInteractions",
			{
				"$.storyId": {
					type: SchemaFieldTypes.TAG,
					AS: "storyId",
				},
				"$.isLiked": {
					type: SchemaFieldTypes.NUMERIC,
					AS: "isLiked",
					SORTABLE: true,
				},
			},
			{
				ON: "JSON",
				PREFIX: CONSTANTS.STORY_SEEN_BY,
			}
		);
		console.log(CONSTANTS.SUCCESSFUL);
		process.exit(1);
	} catch (e) {
		if (e.message === "Index already exists") {
			console.log("Index exists already, skipped creation.");
		} else {
			// Something went wrong, perhaps RediSearch isn't installed...
			console.error(e);
			process.exit(1);
		}
	}
};

createIndexStoryInteractions();
// createIndexStory();
