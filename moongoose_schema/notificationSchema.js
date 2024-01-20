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
	relatedImg: {
		type: mongoose.Schema.Types.Mixed,
		default: null,
	},
	isNew: {
		type: Boolean,
		default: true,
	},
	isDeleted: {
		type: Boolean,
		default: false,
	},
	type: {
		type: String,
		enum: ["LIKE", "COMMENT", "FOLLOW"],
	},
	interactedWith: {
		type: String,
		enum: ["post", "story", "comment", "user"],
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});
const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
