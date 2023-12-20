import { createClient } from "redis";

const redisClient = createClient(6379, "127.0.0.1");

await redisClient.connect();
redisClient.on("error", (err) => {
	console.log(err);
	console.log("Error occured while connecting or accessing redis server");
});

export default redisClient;
