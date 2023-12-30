const MILL_SEC_IN_DAY = 1000 * 60 * 60 * 24;
const MILL_SEC_IN_HOUR = 1000 * 60 * 60;
const MILL_SEC_IN_MIN = 1000 * 60;
const getDateDiff = (date1) => {
	const prevDate = new Date(date1).getTime();
	const diffTime = Date.now() - prevDate;

	let timePassed;

	if (diffTime > MILL_SEC_IN_DAY) {
		timePassed = Math.floor(diffTime / MILL_SEC_IN_DAY);
		return timePassed.toString() + "d";
	}

	if (diffTime > MILL_SEC_IN_HOUR) {
		timePassed = Math.floor(diffTime / MILL_SEC_IN_HOUR);
		return timePassed.toString() + "h";
	}

	if (diffTime > MILL_SEC_IN_MIN) {
		timePassed = Math.floor(diffTime / MILL_SEC_IN_MIN);
		return timePassed.toString() + "m";
	}

	return "Just now";
};
export default getDateDiff;
