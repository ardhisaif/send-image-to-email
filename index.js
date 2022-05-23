require("dotenv").config();
const fs = require("fs");
const AWS = require("aws-sdk");
const express = require("express");
const app = express();
const port = process.env.PORT;
const firebaseAdmin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");


const serviceAccount = require("./firebase.admin.json");
const admin = firebaseAdmin.initializeApp({
	credential: firebaseAdmin.credential.cert(serviceAccount),
});

const storageRef = admin.storage().bucket(`gs://send-email-f5266.appspot.com`);

async function uploadFile(path, filename) {
	// Upload the File
	const storage = await storageRef.upload(path, {
		public: true,
		destination: `/uploads/hashnode/${filename}`,
		metadata: {
			firebaseStorageDownloadTokens: uuidv4(),
		},
	});

	return storage[0].metadata.mediaLink;
}

const file = uuidv4().split("-")[0]

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
	res.send("masuk");
});

app.post("/send-image-to-email", async (req, res) => {
	try {
		fs.writeFile(
			"out.png",
			req.body.image.split(",")[1],
			"base64",
			function (err) {
				if(err !== null){
					console.log(err);
				}
			},
		);

		const url = await uploadFile("./out.png", "my-test.png");
		const email = req.body.email;
		const SES_CONFIG = {
			accessKeyId: process.env.ACCESS_KEY_ID,
			secretAccessKey: process.env.SECRET_ACCESS_KEY,
			region: "ap-southeast-1",
		};

		const AWS_SES = new AWS.SES(SES_CONFIG);
		const params = {
			Source: "noreply@warung.io",
			Destination: {
				ToAddresses: [`${email}`],
			},
			ReplyToAddresses: [],
			Message: {
				Body: {
					Html: {
						Charset: "UTF-8",
						Data: ` <!DOCTYPE html>
							<html lang="en">
							<head>
								<meta charset="UTF-8">
								<meta http-equiv="X-UA-Compatible" content="IE=edge">
								<meta name="viewport" content="width=device-width, initial-scale=1.0">
								<title>Document</title>
							</head>
							<body>
								<div>
									<img src="${url}" alt="Red dot" />
								</div>
							</body>
						 `,
					},
				},
				Subject: {
					Charset: "UTF-8",
					Data: `Hello, `,
				},
			},
		};

		fs.unlinkSync('./out.png')

		res.send({
			meta: {
				message: "email submitted!",
				statusCode: 200,
			},
		});
		return AWS_SES.sendEmail(params).promise();
	} catch (error) {
		res.send(error);
	}
});

app.listen(port, () => {
	console.log(`Server is running in localhost:${port}`);
});
