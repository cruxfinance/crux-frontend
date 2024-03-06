import { prisma } from "@server/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { ergopaySigningRequestId } = req.query;
  if (typeof ergopaySigningRequestId !== "string") {
    return res.status(400).json("ergopaySigningRequestId is required.");
  }
  try {
    const response = await getErgoPaySigningRequest(ergopaySigningRequestId);
    await deleteStaleTransactions();
    return res.status(200).json(response);
  } catch (e: any) {
    return res.status(400).json(e.message);
  }
}

const getErgoPaySigningRequest = async (key: string) => {
  const reducedTx = await prisma.keyValuePair.findFirst({
    where: { key: key },
  });
  if (reducedTx === null) {
    throw new Error(`ErgoPaySigningRequest id ${key} not found.`);
  }
  return {
    reducedTx: reducedTx.value,
    message: "Submit to pay cruxfinance.io",
    messageSeverity: "INFORMATION",
  };
};

const deleteStaleTransactions = async () => {
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  await prisma.keyValuePair.deleteMany({
    where: {
      createdAt: {
        lt: oneHourAgo,
      },
    },
  });
};
