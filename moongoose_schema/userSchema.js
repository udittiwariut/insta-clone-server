import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import CONSTANTS from "../utlis/constants/constants.js";
import getUserImgUrl from "../helpers/getUserImgUrl.js";

const userSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
		validate: validator.isEmail,
	},
	img: {
		type: String,
		default: CONSTANTS.DEFAULT_USER_IMG_URL,
	},
	password: {
		type: String,
		required: true,
		minlength: 8,
		select: false,
	},

	confirmPassword: {
		type: String,
		required: true,
		select: false,
		validate: {
			validator: function (el) {
				el === this.passwordS;
			},
			message: "Both of passwords does not match",
		},
	},
	bio: {
		type: String,
		default: "your Instagram Bio",
	},
	following: {
		type: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
		unique: true,
		select: false,
	},
	followers: {
		type: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
		unique: true,
		select: false,
	},
});

userSchema.post("aggregate", async function (doc) {
	let userWithImgUrl = doc.map(async (user) => {
		return getUserImgUrl(user);
	});
	userWithImgUrl = await Promise.all(userWithImgUrl);
});

userSchema.post(/^find/, async function (doc) {
	if (!doc) return;
	if (this.options.disableMiddlewares) return;

	if (Array.isArray(doc)) {
		let userWithImgUrl = doc.map(async (user) => {
			return getUserImgUrl(user);
		});
		userWithImgUrl = await Promise.all(userWithImgUrl);
	} else await getUserImgUrl(doc);
});

userSchema.pre("save", async function (next) {
	this.password = await bcrypt.hash(this.password, 12);
	this.confirmPassword = undefined;
	next();
});

const User = mongoose.model("User", userSchema);

export default User;
