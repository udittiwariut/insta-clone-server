import Chat from "./moongoose_schema/chatSchema.js";
import connectMongoes from "./services/mongoose/mongoose.js";
import "dotenv/config";

connectMongoes();

Chat.create({
	sender: "6540c7ec851b84c32704b57c",
	receiver: "655f5a16e97b9a5273a69309",
	text: "Hello",
	conversationId: "awfegjhgfhtherwsfdgfnhtg",
})
	.then(() => {
		console.log("successFull");
	})
	.catch((error) => {
		console.log(error);
	});
