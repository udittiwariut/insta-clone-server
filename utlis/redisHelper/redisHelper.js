import redisClient from "../../services/redis/redis.js";

export const redisSearch = async (query) => {
	let result = await redisClient.ft.search(
		`idx:stories`,
		`@userId:{${query}}`,
		{
			LIMIT: {
				size: 3000000,
				from: 0,
			},
		}
	);
	return result;
};
