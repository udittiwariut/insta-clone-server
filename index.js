import express from "express";
import "dotenv/config";
import bodyParser from "body-parser";
import connectMongoes from "./services/mongoose/mongoose.js";
import cors from "cors";
import postRouter from "./routes/postRoute.js";
import userRouter from "./routes/userRoute.js";
import commentRouter from "./routes/commentRoute.js";
import chatRouter from "./routes/chatRoute.js";
import { init } from "./services/s3-bucket/s3.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded(true));
app.use(cors("*"));

connectMongoes();

app.use(
	cors({
		origin: ["http://localhost:3000"],
		methods: ["GET", "POST", "PUT", "DELETE"],
		credentials: true,
	})
);

// app.use((req, res, next) => {
// 	const allowedOrigins = [
// 		"http://localhost:5000/api/v1/user/login",
// 		"http://localhost:5000/api/v1/post",
// 		"http://localhost:5000/api/v1/post/like",
// 	];
// 	const origin = req.headers.origin;
// 	if (allowedOrigins.includes(origin)) {
// 		res.setHeader("Access-Control-Allow-Origin", origin);
// 	}
// 	res.header("Access-Control-Allow-Origin", origin);
// 	res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT");
// 	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
// 	res.header("Access-Control-Allow-Credentials", true);
// 	return next();
// });
app.use(
	"/api/v1/comment",
	(req, res, next) => {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Methods", "GET, POST");
		res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
		return next();
	},
	commentRouter
);
app.use("/api/v1/post", postRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/uploadPost", init);

app.listen("5000", () => {
	console.log("SERVER IS LISTEN ON PORT 5000");
});
