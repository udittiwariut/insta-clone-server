import nodemailer from "nodemailer";

const sendMail = async (receiver, receiverName) => {
	let transpoter = nodemailer.createTransport({
		service: "gmail",
		auth: {
			user: "udittiwariut@gmail.com",
			pass: "gqkkafovretmheco",
		},
		tls: {
			rejectUnauthorized: false,
		},
	});

	const mailOPtion = {
		from: "Udit Tiwari <udittiwariut@gmail.com>",
		to: receiver,
		subject: "Welcome to MEMORIES",
		text: `Hey ${receiverName}, we welcome to to memories here you can set up youur profile and share it with your friends`,
	};

	return await transpoter.sendMail(mailOPtion, function (err, succsess) {
		if (err) {
			console.log(err);
		} else {
			console.log("email sent sucessfully");
		}
	});
};
export default sendMail;
