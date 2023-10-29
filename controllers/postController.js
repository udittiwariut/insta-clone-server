import Post from "../moongoose_schema/postSchema.js";
import { getUrl, s3upload } from "../services/s3-bucket/s3.js";
import sharpify from "../utlis/sharp/sharp.js";
import { v4 as uuidv4 } from "uuid";

export const getFeedPost = async (req, res) => {
	try {
		const following = req.user.following;
		const page = parseInt(req.query.page);
		const limit = 5;

		const startIndex = (page - 1) * limit;

		const posts = await Post.find({ user: { $in: following } })
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(startIndex)
			.populate({
				path: "user",
				select: "name img",
			});

		const postsWithUrlsPromise = posts.map(async (post) => {
			const url = await getUrl(post.img);
			return { ...post._doc, img: url };
		});

		let postsWithUrlPromisified = await Promise.allSettled(
			postsWithUrlsPromise
		);

		const postsWithUrl = postsWithUrlPromisified.map((post) => {
			return post.value;
		});

		res.status(200).json({
			status: "Successful",
			data: postsWithUrl,
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
		const userId = req.user._id;
		const img = req.body.img.split(",")[1];
		const caption = req.body.caption;
		const postId = uuidv4();

		const buffer = await sharpify(img);

		const upload = await s3upload(userId, postId, buffer);

		if (!upload.$metadata.httpStatusCode === 200)
			throw new Error("some thing wrong with s3");

		const post = await Post.create({
			caption: caption,
			user: userId,
			img: `${userId}/${postId}.jpg`,
		});

		if (post) {
			const postUrl = await getUrl(post.img);
			res.status(200).json({
				status: "Successful",
				data: { ...post._doc, img: postUrl },
			});
		}
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
