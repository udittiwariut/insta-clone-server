import { createClient } from "redis";

const redisClient = createClient(process.env.REDIS_PORT, "127.0.0.1");

redisClient
	.connect()
	.then(() => {
		redisClient.ft.configSet("MAXSEARCHRESULTS", "3000000");

		console.log(
			"CONNECTION TO REDIS SUCCESSFUL ON PORT " + process.env.REDIS_PORT
		);
	})
	.catch((error) => {
		console.log(error);
	});

export default redisClient;
