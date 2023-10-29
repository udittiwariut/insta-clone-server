import mongoose from "mongoose";

function connectMongoes() {
	mongoose.set("strictQuery", true);

	mongoose
		.connect(process.env.MOGO_CONNECTION_URI, {
			usenewurlparser: true,
			useunifiedtopology: true,
		})
		.then(() => console.log("CONNECTION SUCCESSFUL MONGOOSE"))
		.catch((error) => {
			console.log(error);
		});
}

export default connectMongoes;
