import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
	{
		img: {
			type: String,
		},
		caption: {
			type: String,
			required: [true, "caption is required for post"],
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
	},
	{
		toJson: { virtuals: true },
		toObject: { virtuals: true },
	}
);

PostSchema.virtual("likes", {
	ref: "Like",
	localField: "_id",
	foreignField: "postId",
	count: true,
});

PostSchema.pre("find", function () {
	this.populate("likes");
});

const Post = mongoose.model("Post", PostSchema);

export default Post;
