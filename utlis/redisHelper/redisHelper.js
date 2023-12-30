import redisClient from "../../services/redis/redis.js";

const options = {
	LIMIT: {
		size: 3000000,
		from: 0,
	},
};

export const redisSearch = async (query) => {
	let result = await redisClient.ft.search(
		`idx:stories`,
		`@userId:{${query}}`,
		options
	);
	return result;
};

export const redisSearchSeenBy = async (storyId, getTopUsersOnly) => {
	const size = getTopUsersOnly ? 3 : 3000000;
	let result = await redisClient.ft.search(
		`idx:storyInteractions`,
		`@storyId:{${storyId}}`,
		{
			LIMIT: {
				size: size,
				from: 0,
			},
			SORTBY: { BY: "isLiked", DIRECTION: "DESC" },
		}
	);
	result = JSON.parse(JSON.stringify(result));
	return result;
};
