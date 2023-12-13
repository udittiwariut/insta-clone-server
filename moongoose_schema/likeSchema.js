import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
	postId: {
		type: mongoose.Schema.ObjectId,
		required: true,
		ref: "Post",
	},
	user: {
		type: mongoose.Schema.ObjectId,
		required: true,
		ref: "User",
	},
	createdAt: { type: Date, default: Date.now() },
});

likeSchema.index({ postId: 1, user: 1 }, { unique: true, dropDups: true });

const Like = mongoose.model("Like", likeSchema);

export default Like;
