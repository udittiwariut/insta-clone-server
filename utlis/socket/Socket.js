import { Server } from "socket.io";
import http from "http";
import express from "express";
import cors from "cors";
import SOCKET_CONST from "./socketConts.js";
import Conversation from "../../moongoose_schema/consersationSchema.js";

const app = express();
app.use(express.json());
app.use(cors("*"));

const server = http.createServer(app);
const io = new Server(server, {
	cors: "*",
});

const users = {};

const getSocketId = (_id) => {
	if (users[_id]) return users[_id];
	return SOCKET_CONST.OFFLINE;
};

io.on("connection", (socket) => {
	const userId = socket.handshake.query.userId;
	if (!users[userId]) users[userId] = socket.id;

	socket.on(SOCKET_CONST.MESSAGE_SEEN, async (data) => {
		const userId = data.userId;
		const chatWithUserId = data.chatWithUserId;
		await Conversation.findOneAndUpdate(
			{
				$all: [userId, chatWithUserId],
			},
			{
				$set: {
					seen: true,
				},
			}
		);
		const chatWithUserSocketId = getSocketId(chatWithUserId);
		if (chatWithUserSocketId) {
			io.to(chatWithUserSocketId).emit(SOCKET_CONST.ON_MESSAGE_SEEN, {
				chatWithUserId: userId,
			});
		}
	});

	socket.on("disconnect", () => {
		delete users[userId];
	});
});

export { io, server, app, getSocketId };
