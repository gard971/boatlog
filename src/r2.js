const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const path = require("path");

const accountId = process.env.R2_ACCOUNT_ID;

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

function makeKey(originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  const rand = crypto.randomBytes(16).toString("hex");
  const safeExt = ext && ext.length <= 10 ? ext : "";
  return `${Date.now()}_${rand}${safeExt}`;
}

async function uploadToR2({ buffer, mimeType, originalName }) {
  const Bucket = process.env.R2_BUCKET;
  const Key = makeKey(originalName);

  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
    })
  );

  const base = process.env.R2_PUBLIC_BASE_URL;
  const url = base ? `${base}/${Key}` : null;

  return { key: Key, url };
}

async function deleteFromR2(key) {
  const Bucket = process.env.R2_BUCKET;
  await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));
}

module.exports = { uploadToR2, deleteFromR2 };
