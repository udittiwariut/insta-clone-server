import mongoose from "mongoose";
import Notification from "./notificationSchema.js";

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
		type: [mongoose.Schema.ObjectId],
	},
	createdAt: { type: Date, default: Date.now },
});

commentSchema.pre(/^find/, async function (next) {
	if (this.options.disableMiddlewares) return;
	this.populate({ path: "user", select: "name img" });
	next();
});

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
