import User from "./../moongoose_schema/userSchema.js";
export const uploadProfilePic = async (req, res) => {
	try {
		const newImg = req.body.img;

		await User.findByIdAndUpdate(req.user.id, { img: newImg });

		res.status(200).json({
			message: "done",
		});
	} catch (error) {
		res.status(400).json({
			message: error,
		});
	}
};

export const getUser = async (req, res) => {
	try {
		const user = await User.findById(req.user.id);
		res.status(200).json({
			user,
		});
	} catch (error) {
		res.status(400).json({
			message: error,
		});
	}
};

export const followRequest = async (req, res) => {
	try {
		const followingReq = await User.findByIdAndUpdate(req.body.userId, {
			$push: { followers: req.user.id },
		});
		const followerReq = await User.findByIdAndUpdate(req.user.id, {
			$push: { following: req.body.userId },
		});

		res.status(200).json({
			message: "Following req compleate",
		});
	} catch (error) {
		res.status(400).json({
			message: error.message,
		});
	}
};
