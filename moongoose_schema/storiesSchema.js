import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
	img: {
		type: "String",
	},
	user: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
	},
	createdAt: {
		type: Date,
		default: Date.now(),
	},
});

const Story = mongoose.model("Story", storySchema);

export default Story;
