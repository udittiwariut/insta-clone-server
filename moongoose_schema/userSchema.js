import mongoose, { model } from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";

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
	img: String,
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
		default: "My inta-Bio",
	},
	following: {
		type: [String],
	},
	followers: {
		type: [String],
		default: "0",
	},
});

userSchema.pre("save", async function (next) {
	this.password = await bcrypt.hash(this.password, 12);
	this.confirmPassword = undefined;
	next();
});
userSchema.pre("save", function (next) {
	this.following = this._id;
	next();
});

const User = mongoose.model("User", userSchema);

export default User;
