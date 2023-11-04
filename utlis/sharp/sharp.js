import sharp from "sharp";

const sharpify = async (originalFile) => {
	try {
		const mainString = originalFile.split(",")[1];
		const originalFileDecoded = Buffer.from(mainString, "base64");
		const compressedImagePromise = await sharp(originalFileDecoded)
			.toFormat("jpg")
			.resize({
				width: 500,
			})
			.toBuffer();

		return compressedImagePromise;
	} catch (err) {
		throw new Error(err);
	}
};

export default sharpify;
