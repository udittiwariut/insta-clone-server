import Chat from "../moongoose_schema/chatSchema.js";
import CONSTANTS from "../utlis/constants/constants.js";
import User from "../moongoose_schema/userSchema.js";
import { io, getSocketId } from "../utlis/socket/Socket.js";
import SOCKET_CONST from "../utlis/socket/socketConts.js";
import Conversation from "../moongoose_schema/consersationSchema.js";

export const getAllChat = async (req, res) => {
	try {
		const userId = req.user._id;

		let conversations = await Conversation.find({
			participants: userId,
		}).sort({ updatedAt: -1, _id: -1 });

		conversations = conversations.map(async (conversation) => {
			const [chatWithUserId] = conversation.participants.filter(
				(id) => !id.equals(userId)
			);
			const user = await User.findById(chatWithUserId, {
				img: 1,
				name: 1,
				_id: 1,
			});

			conversation._doc.chatWith = user;
			return conversation;
		});

		const allChatsWithUser = await Promise.all(conversations);

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: allChatsWithUser,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const getChat = async (req, res) => {
	try {
		const chatWithUserId = req.params.chatWithUserId;
		const userId = req.user._id;

		let conversation = await Conversation.findOne({
			participants: { $all: [userId, chatWithUserId] },
		});

		let chats = [];

		if (conversation) {
			chats = await Chat.find({
				conversationId: conversation._id,
			}).sort({
				createdAt: 1,
			});
		}

		const chatWithUser = await User.findById(chatWithUserId, {
			img: 1,
			name: 1,
			_id: 1,
		});

		const resObj = { chats, chatWithUser, seen: false };

		if (conversation) {
			resObj.seen = conversation.seen;
		}

		res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			data: resObj,
		});
	} catch (error) {
		res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};

export const sendText = async (req, res) => {
	try {
		const senderId = req.user._id;
		const receiverId = req.params.chatWithUserId;
		const storyId = req.query.storyId;
		const text = req.body.text;

		let isNewConversation = false;

		let conversation = await Conversation.findOneAndUpdate(
			{ participants: { $all: [senderId, receiverId] } },
			{
				$set: {
					text: text,
					sender: senderId,
					seen: false,
					updatedAt: Date.now(),
					isRepliedToStory: storyId ? true : false,
				},
			},
			{ new: true }
		);

		if (!conversation) {
			conversation = await Conversation.create({
				participants: [senderId, receiverId],
				text: text,
				sender: senderId,
				isRepliedToStory: storyId ? true : false,
			});
			isNewConversation = true;
		}

		const chat = await Chat.create({
			sender: senderId,
			conversationId: conversation._id,
			text,
			isRepliedToStory: storyId ? storyId : false,
		});

		const recipientSocketId = getSocketId(receiverId);

		if (recipientSocketId !== SOCKET_CONST.OFFLINE) {
			if (!isNewConversation) {
				const chatBody = {
					_id: chat._id,
					sender: senderId,
					receiver: receiverId,
					text: text,
					formServer: true,
				};
				io.to(recipientSocketId).emit(
					SOCKET_CONST.MESSAGE_SENT_FROM_SERVER,
					chatBody
				);
			}

			if (isNewConversation) {
				const conversationWithSenderUser = conversation;
				const user = await User.findById(senderId, {
					img: 1,
					name: 1,
					_id: 1,
				});
				conversationWithSenderUser._doc.chatWith = user;
				io.to(recipientSocketId).emit(
					SOCKET_CONST.CONVERSATION_SENT_FROM_SERVER,
					conversationWithSenderUser
				);
			}
		}

		const successfulRes = {
			status: CONSTANTS.SUCCESSFUL,
		};

		if (isNewConversation) {
			const conversationWithReceiverUser = conversation;
			const user = await User.findById(receiverId, {
				img: 1,
				name: 1,
				_id: 1,
			});
			conversationWithReceiverUser._doc.chatWith = user;
			successfulRes.conversation = conversationWithReceiverUser;
		}

		return res.status(200).json(successfulRes);
	} catch (error) {
		return res.status(400).json({
			status: CONSTANTS.FAILED,
			message: error.message,
		});
	}
};
