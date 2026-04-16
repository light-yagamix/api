const { S3Client } = require("@aws-sdk/client-s3");

// S3 Service Model
const s3Configuration = {
  region: process.env.CLOUD_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
};
const s3 = new S3Client(s3Configuration);

module.exports = s3;
