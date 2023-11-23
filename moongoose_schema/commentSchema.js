import mongoose from "mongoose";
import CONSTANTS from "../utlis/constants/constants.js";
import { getUrl } from "../services/s3-bucket/s3.js";

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

commentSchema.post(/^find/, async function (doc) {
	if (this.options.disableMiddlewares) return doc;
	try {
		const commentsWithUserImgUrl = doc.map(async (comment) => {
			if (comment.user.img !== CONSTANTS.DEFAULT_USER_IMG_URL) {
				const key = comment.user.img;
				const imgUrl = await getUrl(key);
				comment.user.img = imgUrl;
			}
			return comment;
		});

		let commentWithUrlPromisified = await Promise.allSettled(
			commentsWithUserImgUrl
		);

		const commentsWithUrl = commentWithUrlPromisified.map((comment) => {
			return comment.value;
		});
		return commentsWithUrl;
	} catch (error) {
		throw new Error("Something wrong with s3");
	}
});
const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
