import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
	img: {
		type: String,
	},
	caption: {
		type: String,
		required: [true, "caption is required for post"],
	},
	likes: {
		type: [mongoose.Schema.ObjectId],
		default: [],
	},
	createdAt: {
		type: Date,
		default: Date.now(),
	},
	user: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
		required: [true, "Post should be done by a user"],
	},
});

const Post = mongoose.model("Post", PostSchema);

export default Post;
