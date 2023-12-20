import redisClient from "./services/redis/redis.js";
import { SchemaFieldTypes } from "redis";
import CONSTANTS from "./utlis/constants/constants.js";

const createIndex = async () => {
	try {
		await redisClient.ft.create(
			"idx:stories",
			{
				"$.userId": {
					type: SchemaFieldTypes.TAG,
					AS: "userId",
				},
				"$.createdAt": {
					type: SchemaFieldTypes.NUMERIC,
					SORTABLE: true,
					AS: "createdAt",
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

createIndex();
