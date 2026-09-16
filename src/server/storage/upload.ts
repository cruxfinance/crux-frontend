import { putPublicObject } from "./client";

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_BASE64_PAYLOAD_CHARS = 3 * 1024 * 1024; // 3 MB

export class UploadValidationError extends Error {}

export const uploadFile = async (fileName: string, data: string) => {
  try {
    const _type = fileName.split(".").pop() ?? "";
    if (!["jpeg", "jpg", "png"].includes(_type)) {
      throw new UploadValidationError(
        "Unsupported file type. Only supports jpeg/png."
      );
    }
    const type = _type === "jpg" ? "jpeg" : _type;

    if (data.length > MAX_BASE64_PAYLOAD_CHARS) {
      throw new UploadValidationError("File too large. Maximum size is 2 MB.");
    }

    const body = Buffer.from(
      data.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    if (body.length > MAX_UPLOAD_BYTES) {
      throw new UploadValidationError("File too large. Maximum size is 2 MB.");
    }

    await putPublicObject(fileName, body, `image/${type}`);

    return {
      fileUrl: `/api/files/public/${fileName}`,
    };
  } catch (e: any) {
    console.error("Error uploading file to storage:", e.message);
    throw e;
  }
};
