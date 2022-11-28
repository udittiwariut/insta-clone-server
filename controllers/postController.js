import express from "express";
import Post from "../moongoose_schema/postSchema.js";

import bodyParser from "body-parser";

import fs from "fs";

const app = express();
app.use(express.json());
app.use(bodyParser.json());

export const getFeedPost = async (req, res) => {
	try {
		const following = req.user.following;
		const page = parseInt(req.query.page);
		const limit = 4;

		const startIndex = (page - 1) * limit;

		const posts = await Post.find({ user: { $in: following } })
			.limit(limit)
			.skip(startIndex)
			.populate({
				path: "user",
				select: "name img",
			});
		res.status(200).json({
			status: "Successful",
			data: { posts },
		});
	} catch (error) {
		res.status(400).json({
			status: "failed",
			message: error.message,
		});
	}
};
export const getUserPost = async (req, res) => {
	try {
		const userPost = await Post.find({ user: req.user._id });
		res.status(200).json({
			status: `Successfull`,
			length: userPost.length,
			userPost,
		});
	} catch (error) {
		res.status(400).json({
			status: `Failed getting user post`,
			message: error.message,
		});
	}
};

export const createPost = async (req, res) => {
	try {
		const doc = await Post.create({
			caption: req.body.caption,
			img: req.body.img,
			user: req.user.id,
		});
		res.status(200).json({
			status: "Successful",
		});
	} catch (error) {
		res.status(400).json({
			status: "createPost failed",
			message: error.message,
		});
	}
};

export const likeHnadler = async (req, res) => {
	try {
		const { postId } = req.body;
		if (req.unlike === "true") {
			await Post.findByIdAndUpdate(postId, {
				$pull: { likes: req.user.id },
			});
		}

		if (req.like === "true") {
			await Post.findByIdAndUpdate(postId, {
				$push: { likes: req.user.id },
			});
		}
		const recalculatedLike = await Post.findById(postId, { likes: 1 });
		return res.status(200).json({
			likes: recalculatedLike,
		});
	} catch (error) {
		res.json({
			error: error.message,
		});
		return console.log(error.message);
	}
};
export const update = async (req, res) => {
	try {
		await Post.updateMany({}, { $set: { likes: [] } });
		res.send("done");
	} catch (error) {
		console.log(error.message);
	}
};
