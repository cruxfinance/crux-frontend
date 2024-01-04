import {
  chargeRecurringPaymentSource,
  createRecurringPaymentSource,
  getRecurringPaymentSource,
} from "@server/services/subscription/recurringPaymentSource";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    //   const test = await createRecurringPaymentSource({
    //     amount: 10000000000,
    //     periodSeconds: 600,
    //   });
    // const test = await chargeRecurringPaymentSource({
    //   id: "clqzlqkz20000xpkbx32wbxk2",
    //   address: "9i6UmaoJKWHgWkuq1EJUoYu2hrkRkxAYwQjDotHRHfGrBo16Rss",
    // });
    // const test = await getRecurringPaymentSource("clqzlqkz20000xpkbx32wbxk2");
    // return res.status(200).json(parse(test));
    return res.status(200).json({ message: "Hello World!" });
  } catch (e: any) {
    return res.status(400).json(e.message);
  }
};

const parse = (object: any) => {
  return JSON.parse(
    JSON.stringify(
      object,
      (key, value) =>
        typeof value === "bigint" ? Number(value.toString()) : value // return everything else unchanged
    )
  );
};

export default handler;
