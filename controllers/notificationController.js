import Notification from "../moongoose_schema/notificationSchema.js";
import { getUrl } from "../services/s3-bucket/s3.js";
import CONSTANTS from "../utlis/constants/constants.js";
import getDateDiff from "../utlis/dateDiff/getDateDiff.js";
import { NOTIFICATION_EVENT } from "../utlis/notification/notification.js";
import storySeenInfo from "../utlis/storySeen/storySeenInfo.js";

const MILL_SEC_IN_DAY = 1000 * 60 * 60 * 24;

export const getNotificationCount = async (req, res) => {
	try {
		const userId = req.user._id;
		const count = await Notification.aggregate([
			{
				$match: {
					user: userId,
					isNew: true,
					isDeleted: false,
				},
			},
			{
				$group: {
					_id: "$type",
					count: { $sum: 1 },
				},
			},
			{
				$set: {
					type: "$_id",
				},
			},

			{
				$unset: ["_id"],
			},
		]);

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: count,
		});
	} catch (error) {
		return res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getUserNotiFications = async (req, res) => {
	try {
		const userId = req.user._id;

		const updatePromise = Notification.updateMany(
			{ user: userId, isNew: true },
			{
				$set: { isNew: false },
			}
		);

		const notificationsPromis = Notification.aggregate([
			{
				$match: { $and: [{ user: userId }, { isDeleted: false }] },
			},
			{
				$sort: {
					createdAt: -1,
					_id: -1,
				},
			},
			{
				$lookup: {
					from: "users",
					let: { interactedUserId: "$interactedUser", type: "$type" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$_id", "$$interactedUserId"] } } },
						{
							$addFields: {
								isFollowing: {
									$cond: {
										if: { $eq: ["$$type", NOTIFICATION_EVENT.FOLLOW] },
										then: { $in: [userId, "$followers"] },
										else: null,
									},
								},
							},
						},
						{
							$project: { name: 1, img: 1, isFollowing: 1 },
						},
					],
					as: "interactedUser",
				},
			},

			{ $unwind: "$interactedUser" },
			{
				$addFields: {
					daysAgo: {
						$floor: {
							$divide: [
								{
									$subtract: [new Date(), "$createdAt"],
								},
								MILL_SEC_IN_DAY,
							],
						},
					},
				},
			},
			{
				$group: {
					_id: {
						$cond: {
							if: { $lt: ["$daysAgo", 1] },
							then: "Today",
							else: {
								$cond: {
									if: { $lt: ["$daysAgo", 2] },
									then: "Yesterday",
									else: {
										$cond: {
											if: { $lt: ["$daysAgo", 7] },
											then: "ThisWeek",
											else: "Earlier",
										},
									},
								},
							},
						},
					},
					notifications: { $push: "$$ROOT" },
					daysAgo: { $last: "$daysAgo" },
				},
			},
			{ $sort: { daysAgo: 1 } },
			{ $unset: ["daysAgo"] },
		]);

		// eslint-disable-next-line no-unused-vars
		const [_, notifications] = await Promise.all([
			updatePromise,
			notificationsPromis,
		]);

		const notificationObjMain = {};

		const getImgUrl = async (notificationObj) => {
			const interactedUserImg = notificationObj.interactedUser.img;
			if (interactedUserImg !== CONSTANTS.DEFAULT_USER_IMG_URL) {
				notificationObj.interactedUser.img = await getUrl(interactedUserImg);
			}

			notificationObj.relatedImg = await getUrl(notificationObj.relatedImg);
			const { isSeen, isStory } = await storySeenInfo(
				notificationObj.interactedUser._id,
				userId
			);
			notificationObj.interactedUser.isSeen = isSeen;
			notificationObj.interactedUser.isStory = isStory;
			notificationObj.age = getDateDiff(notificationObj.createdAt, Date.now());

			return notificationObj;
		};

		const getNotificationMetaData = async ({ _id, notifications }) => {
			let notificationWithImgUrl = notifications.map(getImgUrl);
			notificationWithImgUrl = await Promise.all(notificationWithImgUrl);
			notificationObjMain[_id] = notificationWithImgUrl;
			return { _id, notifications: notificationWithImgUrl };
		};

		await Promise.all(notifications.map(getNotificationMetaData));

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: notificationObjMain,
		});
	} catch (error) {
		console.log(error);
		return res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
