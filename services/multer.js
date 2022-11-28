import multer from "multer";
import sharp from "sharp";
const multerFilter = (req, file, cb) => {
	if (file.mimetype.startsWith("image")) {
		cb(null, true);
	} else {
		cb(Error, false);
	}
};

export const uploadPhoto = multer({
	fileFilter: multerFilter,
	storage: multer.memoryStorage(),
});
export const resizeImg = (opt) => {
	return async (req, res, next) => {
		let resize = [];
		let fileLocation = "";
		if (opt === "post") {
			req.body.imgName = `User-Name-${Date.now()}-post.jpeg`;
			resize = [470, 470];
			fileLocation = `public/img/posts/${req.body.imgName}`;
		}
		if (opt === "profilePic") {
			req.body.imgName = `User-Name-${Date.now()}-profileImg.jpeg`;
			resize = [110, 110];
			fileLocation = `public/img/profile_pic/${req.body.imgName}`;
		}
		try {
			req.body.img = await sharp(req.file.buffer)
				.resize(resize[0], resize[1])
				.toFormat("jpeg")
				.jpeg({ quality: 90 })
				.toFile(fileLocation);
		} catch (error) {
			console.log(error.message);
			next();
		}
	};
};
