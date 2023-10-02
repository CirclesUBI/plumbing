const { S3Client, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const config = require('./config.json');
const { User } = require('./models/users');

const REGION = process.env.AWS_REGION || 'eu-central-1';
const AWS_S3_DOMAIN = 's3.amazonaws.com';
const bucket = config.AWS_S3_BUCKET;

const s3 = new S3Client({
    region: REGION,
    credentials:{
        accessKeyId: config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY
    }
});

async function avatarExists(contentKey) {
    const url = `https://${bucket}.${AWS_S3_DOMAIN}/${contentKey}`;
    console.log(url);
    try {
        const avatarExists = await User.findOne({
            where: {
                avatarUrl: url,
            },
        });
        console.log(avatarExists);
        if (avatarExists) {
            console.log(`Avatar image cannot be deleted: ${contentKey}`);
            return true;
        } else {
            console.log(`Delete entry: ${contentKey}`);
            return false;
            // const params = {
            //     Bucket: bucket, // The name of the bucket.
            //     Key: contentKey, // The name of the object.
            // };
            // const results = await s3.send(new DeleteObjectCommand(params));
            // rconsole.log(results.$metadata.httpStatusCode);
        }
    }
    catch (error) {
        next(error);
    }
}

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
          // const contentsList = Contents.map((c) => ` • ${c.Key}`).join("\n");

          // Remove the S3 object if they are not present in api db
          Contents.forEach(async (avatarImage) => {
            if (! await avatarExists(avatarImage.Key)) {
                removedObjects += 1;
            }
          })


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

async function deleteS3Object(fileName) {
    
    const key = `uploads/avatars/${fileName}`;

    return await s3.send(new DeleteObjectCommand({
        Bucket: bucket, // The name of the bucket.
        Key: key, // The name of the object.
    }));
}

module.exports = {
    cleanUnusedImagesS3,
}
