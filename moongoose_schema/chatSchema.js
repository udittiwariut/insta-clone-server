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
	createdAt: { type: Date },
});
chatSchema.pre("save", async function (next) {
	const date = new Date();
	this.createdAt = date.getTime();
	next();
});

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
