// S3 Service Mutations using AWS SDK v3
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3Client = new S3Client({
  region: process.env.CLOUD_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const getPresignedUrl = async (_, { key, expiresIn = 60, contentType }) => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUD_BUCKET_NAME,
      Key: key,
      ContentType: contentType || "application/octet-stream",
      // Add ACL if you want files to be publicly readable
      // ACL: 'public-read',
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    console.log(
      `Generated presigned URL for key: ${key}, contentType: ${contentType}`
    );
    return url;
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

module.exports.s3Service = {
  getPresignedUrl,
};
