import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
	postId: {
		type: mongoose.Schema.ObjectId,
		required: true,
	},
	user: {
		type: mongoose.Schema.ObjectId,
		required: true,
		ref: "User",
	},
	createdAt: { type: Date },
});

likeSchema.pre("save", async function (next) {
	const date = new Date();
	this.createdAt = date.getTime();
	next();
});

const Like = mongoose.model("Like", likeSchema);

export default Like;
