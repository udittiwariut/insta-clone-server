import User from "../moongoose_schema/userSchema.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import CONSTANTS from "../utlis/constants/constants.js";

export const singIn = async (req, res) => {
	try {
		const { name, email, password, confirmPassword } = req.body;

		const data = { name, email, password, confirmPassword };

		if (!name || !email || !password || !confirmPassword) {
			return res.status(400).json({
				message: "Bad request error",
			});
		}

		const existingUser = await User.findOne({ $or: [{ email }, { name }] });

		if (existingUser) {
			if (existingUser.email === email)
				return res.status(400).json({
					message: "Email already taken",
				});
			if (existingUser.name === name)
				return res.status(400).json({
					message: "Username already taken",
				});
		}

		const user = await User.create(data);

		const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
			expiresIn: process.env.TOKEN_EXPIRE,
		});

		// await sendMail(email, name);
		return res.status(201).json({
			status: CONSTANTS.SUCCESSFUL,
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

		if (!email || !password) {
			throw new Error("Please provide required credential");
		}

		const user = await User.findOne({ email }).select("+password");

		if (!user) throw new Error("User with this Email does not exist");

		if (!(await bcrypt.compare(password, user.password)))
			throw new Error("Required credential are wrong");

		const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
			expiresIn: process.env.TOKEN_EXPIRE,
		});
		// don't delete it men't to be unused
		let { password: userPass, ...rest } = user._doc;

		return res.status(200).json({
			status: CONSTANTS.SUCCESSFUL,
			user: rest,
			token,
		});
	} catch (error) {
		return res.status(400).json({
			status: CONSTANTS.SUCCESSFUL,
			message: error.message,
		});
	}
};

export const protect = async (req, res, next) => {
	try {
		let token = "";
		let decoded;

		if (
			req.headers.authorization &&
			req.headers.authorization.startsWith("Bearer")
		) {
			token = req.headers.authorization.split(" ")[1];
		}
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch (error) {
			throw new Error("Invalid token or session expired");
		}

		if (!decoded.id) {
			throw new Error("Invalid token or session expired");
		}
		const user = await User.findById(decoded.id);

		if (!user) {
			throw new Error("User not found");
		}

		req.user = user;
		next();
	} catch (error) {
		console.log(error.message);
		return res.status(400).json({
			message: error.message,
		});
	}
};
