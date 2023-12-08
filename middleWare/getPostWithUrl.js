import { getUrl } from "../services/s3-bucket/s3.js";
import CONSTANTS from "../utlis/constants/constants.js";

export const getUserPostWWithUrl = async (req, res) => {
	try {
		const userPost = req.userPosts;
		const user = res.user;

		const postsWithUrlsPromise = userPost.map(async (post) => {
			const postUrl = await getUrl(post.img);
			post.img = postUrl;
			return post;
		});

		let postsWithUrl = await Promise.all(postsWithUrlsPromise);

		const response = {
			posts: postsWithUrl,
			user: user,
		};
		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: response,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
