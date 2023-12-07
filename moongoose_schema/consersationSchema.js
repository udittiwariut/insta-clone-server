import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
	participants: {
		type: [mongoose.Schema.ObjectId],
		required: true,
	},
	text: String,
	sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
	seen: {
		type: Boolean,
		default: false,
	},
});

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
