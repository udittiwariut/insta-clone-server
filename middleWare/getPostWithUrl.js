import postMetaDataCompleter from "../helpers/postMetaDataCompleter.js";
import CONSTANTS from "../utlis/constants/constants.js";

export const getUserPostWWithUrl = async (req, res) => {
	try {
		const userPost = req.userPosts;
		const user = res.user;

		let postsWithUrl = await postMetaDataCompleter(
			userPost,
			req.user._id,
			true
		);

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
