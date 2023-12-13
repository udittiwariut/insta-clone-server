import Like from "../moongoose_schema/likeSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";

export const getLikes = async (req, res) => {
	try {
		const postId = req.params.postId;

		let likesUsers = await Like.find({ postId: postId }, { user: 1 }).populate({
			path: "user",
			select: "name img",
		});

		likesUsers = likesUsers.map((user) => user.user);

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: likesUsers,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
