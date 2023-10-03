const { S3Client, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const config = require('./config.json');
const { User } = require('./models/users.js');

const REGION = process.env.AWS_REGION || 'eu-central-1';
const AWS_S3_DOMAIN = 's3.amazonaws.com';
const bucket = config.AWS_S3_BUCKET;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY
  }
});

async function cleanUnusedImagesS3() {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
  });

  try {
    let isTruncated = true;
    let removedObjects = 0;
    let totalObjects = 0;

    while (isTruncated) {
      const { Contents, IsTruncated, NextContinuationToken } = await s3.send(command);
      console.log(`Partial contents length: ${Contents.length}`);

      // Remove the S3 object if they are not present in api db
      for await (const avatarImage of Contents) {
        const url = `https://${bucket}.${AWS_S3_DOMAIN}/${avatarImage.Key}`;
        const exists = await User.findOne({
          where: {
            avatarUrl: url,
          },
        });
        if (exists !== null) {
          console.log(`Avatar image cannot be deleted: ${url}`);
        } else {
          console.log(`****Delete entry: ${url}`);
          removedObjects += 1;
          const params = {
            Bucket: bucket, // The name of the bucket.
            Key: avatarImage.Key, // The name of the object.
          };
          const results = await s3.send(new DeleteObjectCommand(params));
          console.log(results.$metadata.httpStatusCode);
        }

      }

      totalObjects += Contents.length;
      isTruncated = IsTruncated;
      command.input.ContinuationToken = NextContinuationToken;
    }
    console.log(`Total objects before: ${totalObjects}`);
    console.log(`Total deleted objects: ${removedObjects}`);
  } catch (err) {
    console.error(err);
  }
}

module.exports = {
  cleanUnusedImagesS3,
}
