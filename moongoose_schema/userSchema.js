import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import CONSTANTS from "../utlis/constants/constants.js";
import { getUrl } from "../services/s3-bucket/s3.js";

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
	},
	followers: {
		type: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
		unique: true,
	},
});

userSchema.post("findOne", function () {
	return;
});

userSchema.post("find", async function (doc) {
	if (!doc || !doc.length) return;
	let userWithImgUrl = doc.map(async (user) => {
		if (user.img !== CONSTANTS.DEFAULT_USER_IMG_URL) {
			const userId = user._id;
			const key = `${userId}/${CONSTANTS.PROFILE_PIC_POST_ID}.jpg`;
			const imgUrl = await getUrl(key);
			user.img = imgUrl;
		}
		return user;
	});
	userWithImgUrl = await Promise.all(userWithImgUrl);
	return userWithImgUrl;
});

userSchema.post(/^find\w/, async function (doc) {
	if (!doc || !doc.img) return;
	if (doc.img !== CONSTANTS.DEFAULT_USER_IMG_URL) {
		const userId = doc._id;
		const key = `${userId}/${CONSTANTS.PROFILE_PIC_POST_ID}.jpg`;
		const imgUrl = await getUrl(key);
		doc.img = imgUrl;
		return doc;
	}
});

userSchema.pre("save", async function (next) {
	this.password = await bcrypt.hash(this.password, 12);
	this.confirmPassword = undefined;
	next();
});

const User = mongoose.model("User", userSchema);

export default User;
