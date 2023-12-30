import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
	},
	interactedUser: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
	},
	eventText: String,
	relatedPost: {
		type: mongoose.Schema.Types.Mixed,
		default: null,
	},
});

export default notificationSchema;
