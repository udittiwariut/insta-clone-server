import redisClient from "../../services/redis/redis.js";
import CONSTANTS from "../constants/constants.js";
import { redisSearch } from "../redisHelper/redisHelper.js";

const storySeenInfo = async (storyByUserId, mainUserId) => {
	const userProfileStoryInfo = {
		isStory: false,
		isSeen: true,
	};

	let result = await redisSearch(storyByUserId);
	result = JSON.parse(JSON.stringify(result));

	if (result.total > 0) {
		// eslint-disable-next-line no-inner-declarations
		async function isSeenFn() {
			let isSeenWhole = true;
			const storyPromise = result.documents.map(async (doc) => {
				let storyObjectId = doc.id.split(":")[1];
				const isSeen = await redisClient.get(
					`${CONSTANTS.STORY_SEEN}-${storyObjectId}-${mainUserId}`
				);
				if (isSeen === null) {
					isSeenWhole = false;
				}
			});

			await Promise.all(storyPromise);
			return isSeenWhole;
		}

		userProfileStoryInfo.isSeen = await isSeenFn();
		userProfileStoryInfo.isStory = true;
	}

	return userProfileStoryInfo;
};

export default storySeenInfo;
