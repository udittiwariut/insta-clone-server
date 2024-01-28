import { createClient } from "redis";
import { SchemaFieldTypes } from "redis";
import CONSTANTS from "../../utlis/constants/constants.js";

const redisClient = createClient({ pingInterval: 100 });

redisClient
	.connect()
	.then(() => {
		redisClient.ft.configSet("MAXSEARCHRESULTS", "3000000");

		console.log(
			"CONNECTION TO REDIS SUCCESSFUL ON PORT " + process.env.REDIS_PORT
		);
	})
	.then(() => {
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
			} catch (e) {
				if (e.message === "Index already exists") {
					console.log("Index exists already, skipped creation.");
				} else {
					// Something went wrong, perhaps RediSearch isn't installed...
					console.error(e);
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
		createIndexStory();
	})
	.catch((error) => {
		console.log(error);
	});

export default redisClient;
