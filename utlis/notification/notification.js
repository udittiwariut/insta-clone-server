import Notification from "../../moongoose_schema/notificationSchema.js";
import { io, getSocketId } from "../socket/Socket.js";
import SOCKET_CONST from "../socket/socketConts.js";

export const NOTIFICATION_EVENT = {
	LIKED_YOUR_POST: "liked your post.",
	LIKED_YOUR_STORY: "liked your story. ",
	LIKED_YOU_COMMENT: "liked your comment: ",
	COMMENTED_ON_YOUR_POST: "Commented on you post: ",
	FOLLOWED_YOU: "Started Following you. ",
	LIKE: "LIKE",
	COMMENT: "COMMENT",
	FOLLOW: "FOLLOW",
	INTERACTED_WITH_STORY: "story",
	INTERACTED_WITH_COMMENT: "comment",
	INTERACTED_WITH_POST: "post",
	INTERACTED_WITH_USER: "user",
};

export const createNotification = async ({
	userId,
	eventText,
	interactedUser,
	relatedImg,
	relatedPost,
	type,
	interactedWith,
}) => {
	try {
		if (userId.toString() === interactedUser._id.toString()) return;

		let isNotificationAlreadyPresent = await Notification.findOneAndUpdate(
			{
				user: userId,
				interactedUser: interactedUser._id,
				relatedPost,
			},
			[
				{
					$set: { isDeleted: { $eq: [false, "$isDeleted"] } },
				},
			]
		);

		if (isNotificationAlreadyPresent) {
			return;
		}

		let notification = await Notification.create({
			user: userId,
			eventText: eventText,
			interactedUser: interactedUser._id,
			relatedImg: relatedImg,
			relatedPost,
			type,
			interactedWith,
		});

		const recipientSocketId = getSocketId(notification.user);
		if (recipientSocketId !== SOCKET_CONST.OFFLINE) {
			io.to(recipientSocketId).emit(
				SOCKET_CONST.NEW_NOTIFICATION,
				notification
			);
		}
	} catch (error) {
		console.log(error.message, "----------notification error");
	}
};
