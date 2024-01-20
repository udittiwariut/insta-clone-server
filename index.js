import "dotenv/config";
import postRouter from "./routes/postRoute.js";
import userRouter from "./routes/userRoute.js";
import commentRouter from "./routes/commentRoute.js";
import chatRouter from "./routes/chatRoute.js";
import storyRouter from "./routes/storyRoute.js";
import { server, app } from "./utlis/socket/Socket.js";
import notificationRouter from "./routes/notificationRoute.js";

app.use("/api/v1/post", postRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/story", storyRouter);
app.use("/api/v1/notifications", notificationRouter);

server.listen(process.env.PORT, () => {
	console.log("SERVER IS LISTEN ON PORT " + process.env.PORT);
});
