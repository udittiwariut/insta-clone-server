import Like from "../moongoose_schema/likeSchema.js";
import { getUrl } from "../services/s3-bucket/s3.js";
import storySeenInfo from "../utlis/storySeen/storySeenInfo.js";

const postMetaDataCompleter = async (
	posts,
	mainUserId,
	userProfile = false
) => {
	const postsWithUrlsPromise = posts.map(async (post) => {
		const postUrl = await getUrl(post.img);

		if (!userProfile) {
			const isStorySeen = await storySeenInfo(post.user._id, mainUserId);
			post.user._doc.isStory = isStorySeen.isStory;
			post.user._doc.isSeen = isStorySeen.isSeen;
		}

		const isLiked = await Like.findOne({
			user: mainUserId,
			postId: post._id,
		});
		post.img = postUrl;
		post._doc.isLiked = isLiked ? true : false;
		post._doc.likes = post.likes;
		return post;
	});

	let postsWithUrl = await Promise.all(postsWithUrlsPromise);

	return postsWithUrl;
};
export default postMetaDataCompleter;
