import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
	participants: {
		type: [mongoose.Schema.ObjectId],
		required: true,
	},
	text: String,
	sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
	isRepliedToStory: {
		type: Boolean,
		default: false,
	},
	seen: {
		type: Boolean,
		default: false,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
