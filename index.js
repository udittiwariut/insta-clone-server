import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mongoose from "mongoose";
import postRouter from "./routes/postRoute.js";
import userRouter from "./routes/userRoute.js";
import commentRouter from "./routes/commentRoute.js";
const app = express();
app.use(express.json({ limit: "200mb", extended: true }));
app.use(
	express.urlencoded({ limit: "200mb", extended: true, parameterLimit: 50000 })
);
app.use(bodyParser.json({ limit: "200mb" }));
app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
mongoose
	.connect(
		"mongodb+srv://udittiwawriut:Udit21211@cluster0.aadib.mongodb.net/Memories_App?retryWrites=true&w=majority",
		{ usenewurlparser: true, useunifiedtopology: true }
	)
	.then(() => console.log("CONNECTION SUCCESSFUL"))
	.catch((error) => {
		console.log(error);
	});

app.use((req, res, next) => {
	const allowedOrigins = [
		"http://localhost:5000/api/v1/user/login",
		"http://localhost:5000/api/v1/post",
		"http://localhost:5000/api/v1/post/like",
	];
	const origin = req.headers.origin;
	if (allowedOrigins.includes(origin)) {
		res.setHeader("Access-Control-Allow-Origin", origin);
	}
	res.header("Access-Control-Allow-Origin", origin);
	res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT");
	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
	res.header("Access-Control-Allow-Credentials", true);
	return next();
});
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

app.listen(5000, () => {
	console.log("server is listing on port 5000");
});
