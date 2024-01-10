import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    return res.status(200).json({ message: "Hello World!" });
  } catch (e: any) {
    return res.status(400).json(e.message);
  }
};

export default handler;
