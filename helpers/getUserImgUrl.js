import { getUrl } from "../services/s3-bucket/s3.js";
import CONSTANTS from "../utlis/constants/constants.js";

const getUserImgUrl = async (user) => {
	if (user.img !== CONSTANTS.DEFAULT_USER_IMG_URL) {
		const userId = user._id;
		const key = `${userId}/${CONSTANTS.PROFILE_PIC_POST_ID}.jpg`;
		const imgUrl = await getUrl(key);
		user.img = imgUrl;
	}
	return user;
};

export default getUserImgUrl;
