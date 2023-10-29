import User from "../moongoose_schema/userSchema.js";
import util from "util";
import jwt from "jsonwebtoken";
import fs from "fs";
import bcrypt from "bcryptjs";
import sendMail from "../services/email/email.js";
import { userInfo } from "os";

export const singUp = async (req, res) => {
	try {
		const { name, email, password, confirmPassword } = req.body;

		const data = { name, email, password, confirmPassword };

		if (!name || !email || !password || !confirmPassword) {
			return res.status(400).json({
				message: "Bad request error",
			});
		}

		const isEmailTaken = await User.findOne({ email });
		if (isEmailTaken) {
			return res.status(400).json({
				message: "Email already taken",
			});
		}

		const user = await User.create(data);

		const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
			expiresIn: process.env.TOKEN_EXPIRE,
		});

		// await sendMail(email, name);
		return res.status(201).json({
			status: "success",
			user,
			token,
		});
	} catch (error) {
		return res.status(400).json({
			status: "failed",
			message: error.message,
		});
	}
};

export const Login = async (req, res) => {
	try {
		const { email, password } = req.body;
		console.log(email, password);

		if (!email || !password) {
			return res.status(400).json({
				message: "Please provide required credential",
			});
		}

		const user = await User.findOne({ email }).select("+password");

		if (!user || !(await bcrypt.compare(password, user.password))) {
			return res.status(400).json({
				message: "provided credential are wrong",
			});
		}

		const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
			expiresIn: process.env.TOKEN_EXPIRE,
		});

		let { password: userPass, ...rest } = user._doc;

		return res.status(200).json({
			status: "success",
			user: rest,
			token,
			msg: `${user.name} successfully logged in`,
		});
	} catch (error) {
		return res.status(400).json({
			status: "failed",
			message: error.message,
		});
	}
};

export const protect = async (req, res, next) => {
	try {
		let token = "";

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

		let decoded = jwt.verify(token, process.env.JWT_SECRET);

		if (!decoded.id) {
			return res.status(400).json({
				message: "Invalid token or session expired ",
			});
		}
		const user = await User.findById(decoded.id);

		if (!user) {
			return res.status(400).json({
				message: "Invalid token or session expired ",
			});
		}

		req.user = user;
		next();
	} catch (error) {
		return console.log(error);
	}
};

export const refresh = (req, res) => {
	const cookies = req.headers.authorization.split(" ")[1];
	if (!cookies) {
		return res.status(403).json({
			status: "un-authorized",
		});
	}
	jwt.verify(
		cookies,
		"this is your jwt secreat please dont share with anyone",
		async (err, decoded) => {
			if (err) return res.status(403).json({ status: "un-authorized" });
			const user = await User.findById(decoded?.id);
			const token = await util.promisify(jwt.sign)(
				{ id: user?.id },
				"this is your jwt secreat please dont share with anyone",
				{ expiresIn: "90d" }
			);
			return res.status(200).json({
				status: "succsess",
				user,
				token,
				msg: `${userInfo.name} successfully loged in`,
			});
		}
	);
};
