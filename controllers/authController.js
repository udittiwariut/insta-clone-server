import User from "../moongoose_schema/userSchema.js";
import util from "util";
import jwt from "jsonwebtoken";
import fs from "fs";
import bcrypt from "bcryptjs";
import sendMail from "../services/email/email.js";
import { userInfo } from "os";

export const singUp = async (req, res) => {
	const { name, email, password, confirmPassword } = req.body;

	const data = { name, email, password, confirmPassword };

	if (!name || !email || !password || !confirmPassword) {
		return res.status(400).json({
			message: "Bad request error",
		});
	}

	try {
		const user = await User.create(data);

		const token = await util.promisify(jwt.sign)(
			{ id: user.id },
			"this is your jwt secreat please dont share with anyone",
			{ expiresIn: "90d" }
		);

		// await sendMail(email, name);
		res.cookie("jwt", token);

		return res.status(201).json({
			status: "succsess",
			user,
			token,
		});
	} catch (error) {
		return res.status(400).json({
			message: error.message,
		});
	}
};

export const Login = async (req, res) => {
	const { email, password } = req.body;

	try {
		if (!email || !password) {
			return res.status(400).json({
				message: "Please provide required cradential",
			});
		}

		const user = await User.findOne({ email }).select("+password");

		if (!user || !(await bcrypt.compare(password, user.password))) {
			return res.status(400).json({
				message: "provided cradential are wrong",
			});
		}

		const token = await util.promisify(jwt.sign)(
			{ id: user.id },
			"this is your jwt secreat please dont share with anyone",
			{ expiresIn: "90d" }
		);

		res.cookie("jwt", token);
		return res.status(200).json({
			status: "succsess",
			user,
			token,
			msg: `${userInfo.name} successfully loged in`,
		});
	} catch (error) {
		return res.status(400).json({
			status: "login failed",
			message: error.message,
		});
	}
};

export const protect = async (req, res, next) => {
	let token = "";
	try {
		if (
			req.headers.authorization &&
			req.headers.authorization.startsWith("Bearer")
		) {
			token = req.headers.authorization.split(" ")[1];
		}
		if (!token) {
			return res.status(400).json({
				message: "please login to access to this link",
			});
		}

		let decoded = "";
		decoded = await util.promisify(jwt.verify)(
			token,
			"this is your jwt secreat please dont share with anyone"
		);
		if (!decoded) {
			return res.status(400).json({
				message: "Invelid token",
			});
		}
		const user = await User.findById(decoded.id);

		if (!user) {
			res.status(400).json({ message: "user not found" });
		}

		req.user = user;
		next();
	} catch (error) {
		return console.log(error);
	}
};
