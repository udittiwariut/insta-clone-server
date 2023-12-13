import Like from "../moongoose_schema/likeSchema.js";
import { getUrl } from "../services/s3-bucket/s3.js";

const postMetaDataCompleter = async (posts, isLikedUserId) => {
	const postsWithUrlsPromise = posts.map(async (post) => {
		const postUrl = await getUrl(post.img);
		const isLiked = await Like.findOne({
			user: isLikedUserId,
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
