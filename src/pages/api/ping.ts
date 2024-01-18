import {
  addPaymentInstrumentBalance,
  chargePaymentInstrument,
  createPaymentInstrument,
  getPaymentInstrument,
} from "@server/services/subscription/paymentInstrument";
import { v4 as uuidv4 } from "uuid";
import { NextApiRequest, NextApiResponse } from "next";
import { createSubscription, getSubscription, renewSubscription } from "@server/services/subscription/subscription";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // userId: "clrghro8f0000ij620r1cgghw"
    // paideia: "1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489"
    const test = await createPaymentInstrument({
      userId: "clrghro8f0000ij620r1cgghw",
      tokenId: null,
    });
    // const test = await getPaymentInstrument("clrja80tj0003ry2o8lw2gqfz")
    // const test = await addPaymentInstrumentBalance({
    //   paymentInstrumentId: "clrja80tj0003ry2o8lw2gqfz",
    //   address: "9i6UmaoJKWHgWkuq1EJUoYu2hrkRkxAYwQjDotHRHfGrBo16Rss",
    //   amount: 200000000
    // });
    // const test = await createSubscription({
    //   userId: "clrghro8f0000ij620r1cgghw",
    //   paymentInstrumentId: "clrja80tj0003ry2o8lw2gqfz",
    //   subscriptionConfigId: "monthly_basic_plan",
    // });
    // const test = await getSubscription("clrjafi66000113j40i49ryhp");
    // const test = await renewSubscription("clrjafi66000113j40i49ryhp");
    return res.status(200).json(parse(test));
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
