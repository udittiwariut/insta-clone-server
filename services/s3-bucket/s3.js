import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	ListObjectsV2Command,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import Post from "./../../moongoose_schema/postSchema.js";
import CONSTANTS from "../../utlis/constants/constants.js";

const s3Client = new S3Client({
	region: "ap-south-1",
	credentials: {
		accessKeyId: process.env.AWS_S3_ACCESS_KEY,
		secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
	},
});

export const BUCKET_NAME = "instagram-clone-udit";

export const getUrl = async (key) => {
	try {
		const cmd = new GetObjectCommand({
			Bucket: BUCKET_NAME,
			Key: key,
		});
		return await getSignedUrl(s3Client, cmd);
	} catch (error) {
		console.log("Cannot get img url");
		return CONSTANTS.DEFAULT_USER_IMG_URL;
	}
};

export const s3upload = async (userId, key, buffer) => {
	const params = {
		Bucket: BUCKET_NAME,
		Key: `${userId}/${key}.jpg`,
		Body: buffer,
	};

	const command = new PutObjectCommand(params);

	try {
		const upload = await s3Client.send(command);
		return upload;
	} catch (error) {
		console.error(error);
		throw new Error("Failed to upload image");
	}
};

export const s3delete = async (key) => {
	const params = {
		Bucket: BUCKET_NAME,
		Key: key,
	};

	const command = new DeleteObjectCommand(params);

	try {
		await s3Client.send(command);
		return;
	} catch (error) {
		throw new Error(error.message);
	}
};

export const init = async () => {
	const command = new ListObjectsV2Command({
		Bucket: "instagram-clone-udit",
		Prefix: "65392bffe5a6174d311b713e",
	});
	const all_photos = await s3Client.send(command);
	all_photos.Contents.forEach(async (post) => {
		if (post.Size === 0 || post.Size === "0") return;

		Post.create({
			caption: "Test Caption",
			img: post.Key,
			user: "65392bffe5a6174d311b713e",
		})
			.then(() => {
				console.log("done");
			})
			.catch((err) => {
				console.log(err.message);
			});
	});
};
