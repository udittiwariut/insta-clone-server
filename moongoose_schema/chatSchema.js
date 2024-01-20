import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
	sender: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
		required: true,
	},
	conversationId: {
		type: mongoose.Schema.ObjectId,
		ref: "Conversation",
	},
	text: {
		type: String,
		required: true,
	},
	isRepliedToStory: {
		type: mongoose.Schema.Types.Mixed,
		default: false,
	},
	createdAt: { type: Date, default: Date.now },
});

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
