import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
	commentText: {
		type: String,
		required: true,
	},
	user: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
		required: true,
	},
	parentId: {
		type: mongoose.Schema.ObjectId,
		default: null,
	},
	replyTo: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
		default: null,
	},
	postId: {
		type: mongoose.Schema.ObjectId,
		required: true,
	},
	likes: {
		type: [],
		default: [],
	},
	createdAt: { type: Date, default: Date.now() },
});

commentSchema.pre(/^find/, async function (next) {
	if (this.options.disableMiddlewares) next();
	this.populate({ path: "user", select: "name img" });
	next();
});

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
