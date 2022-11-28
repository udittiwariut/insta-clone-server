import Comment from "../moongoose_schema/commentSchema.js";
export const postComment = async (req, res) => {
	try {
		const { postId, commentText, parentId } = req.body;

		const { id } = req.user;

		const newComment = await Comment.create({
			postId,
			user: id,
			commentText,
			parentId,
		});

		const comment = await Comment.findById(newComment.id).populate({
			path: "user",
			select: "name img",
		});

		res.status(200).json({
			msg: "Succesfull",
			comment,
		});
	} catch (error) {
		return res.status(400).json({
			error: error.message,
		});
	}
};

export const postReplies = async (req, res) => {
	try {
	} catch (error) {}
};
export const getPostComment = async (req, res) => {
	try {
		const postId = req.params.post_id;

		const comments = await Comment.find({
			postId: postId,
		}).populate({
			path: "user",
			select: "name img",
		});

		res.status(200).json({
			msg: "Successfull",
			comments,
		});
	} catch (error) {
		res.status(400).json({
			msg: "Failed",
			error: error.message,
		});
	}
};
