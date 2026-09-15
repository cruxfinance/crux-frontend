import { putPublicObject } from "./client";

export const uploadFile = async (fileName: string, data: string) => {
  try {
    const _type = fileName.split(".").pop() ?? "";
    if (!["jpeg", "jpg", "png"].includes(_type)) {
      throw new Error("Unsupported file type. Only supports jpeg/png.");
    }
    const type = _type === "jpg" ? "jpeg" : _type;
    const body = Buffer.from(
      data.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    await putPublicObject(fileName, body, `image/${type}`);

    return {
      fileUrl: `/api/files/public/${fileName}`,
    };
  } catch (e: any) {
    console.error("Error uploading file to storage:", e.message);
    throw e;
  }
};
