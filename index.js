import "dotenv/config";
import connectMongoes from "./services/mongoose/mongoose.js";
import postRouter from "./routes/postRoute.js";
import userRouter from "./routes/userRoute.js";
import commentRouter from "./routes/commentRoute.js";
import chatRouter from "./routes/chatRoute.js";
import { server, app } from "./utlis/socket/Socket.js";

connectMongoes();

app.use("/api/v1/post", postRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/chat", chatRouter);

server.listen(process.env.PORT, () => {
	console.log("SERVER IS LISTEN ON PORT " + process.env.PORT);
});
