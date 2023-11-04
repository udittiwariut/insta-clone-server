import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
	commentText: {
		type: String,
		required: true,
	},
	user: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
	},
	parentId: {
		type: mongoose.Schema.ObjectId,
		default: null,
	},
	postId: {
		type: mongoose.Schema.ObjectId,
	},
	createdAt: { type: Date, default: Date.now() },
});

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
