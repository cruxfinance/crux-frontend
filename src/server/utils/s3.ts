import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY ?? "";
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY ?? "";
const AMAZON_REGION = process.env.AMAZON_REGION ?? "eu-central-1";
const S3_BUCKET = process.env.CRUX_PUBLIC_BUCKET ?? "";
const REPORTS_BUCKET = process.env.CRUX_REPORTS_BUCKET ?? ""

const client = new S3Client({
  region: AMAZON_REGION,
  credentials: {
    accessKeyId: AMAZON_ACCESS_KEY,
    secretAccessKey: AMAZON_SECRET_KEY,
  },
});

export const uploadFile = async (fileName: string, data: string) => {
  try {
    const _type = fileName.split(".").pop() ?? "";
    if (!["jpeg", "jpg", "png"].includes(_type)) {
      throw new Error("Unsupported file type. Only supports jpeg/png.");
    }
    const type = _type === "jpg" ? "jpeg" : _type;
    await client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: Buffer.from(
          data.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        ),
        ContentEncoding: "base64",
        ContentType: `image/${type}`
      })
    );
    return {
      fileUrl: `https://${S3_BUCKET}.s3.${AMAZON_REGION}.amazonaws.com/${fileName}`,
    };
  } catch (e: any) {
    console.error("Error uploading file to S3:", e.message);
    throw e;
  }
};

export const generateDownloadLink = async (fileName: string) => {
  const command = new GetObjectCommand({
    Bucket: REPORTS_BUCKET,
    Key: fileName,
  });

  const urlExpiry = 3600;

  try {
    const url = await getSignedUrl(client, command, { expiresIn: urlExpiry });
    return url;
  } catch (error: any) {
    console.error("Error generating download link:", error.message);
    throw error
  }
};
