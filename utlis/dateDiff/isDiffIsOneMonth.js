const oneMonthInMiliSec = 30 * 24 * 60 * 60 * 1000;

function isDifferenceOneMonth(date1, date2) {
	const timeDifference = date1.getTime() - date2.getTime();

	return timeDifference > oneMonthInMiliSec;
}

export default isDifferenceOneMonth;
