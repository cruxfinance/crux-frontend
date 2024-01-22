import {
  addPaymentInstrumentBalance,
  chargePaymentInstrument,
  createPaymentInstrument,
  findPaymentInstruments,
  getPaymentInstrument,
} from "@server/services/subscription/paymentInstrument";
import { v4 as uuidv4 } from "uuid";
import { NextApiRequest, NextApiResponse } from "next";
import {
  createSubscription,
  findSubscriptions,
  getSubscription,
  renewSubscription,
} from "@server/services/subscription/subscription";
import { getTokenPriceInfo } from "@server/utils/tokenPrice";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // userId: "clrozy0on0002fftsjewneb1h"
    // paideia: "1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489"
    const test = await createPaymentInstrument({
      userId: "clrozy0on0002fftsjewneb1h",
      tokenId: null,
    });
    // const test = await getPaymentInstrument("clrja80tj0003ry2o8lw2gqfz")
    // const test = await addPaymentInstrumentBalance({
    //   paymentInstrumentId: "clrja80tj0003ry2o8lw2gqfz",
    //   address: "9i6UmaoJKWHgWkuq1EJUoYu2hrkRkxAYwQjDotHRHfGrBo16Rss",
    //   amount: 200000000
    // });
    // const test = await createSubscription({
    //   userId: "clrozy0on0002fftsjewneb1h",
    //   paymentInstrumentId: "clrozyzyv0009fftsf3r47f00",
    //   subscriptionConfigId: "monthly_basic_plan",
    // });
    // const test = await getSubscription("clrjafi66000113j40i49ryhp");
    // const test = await renewSubscription("clrjafi66000113j40i49ryhp");
    // const test = await findPaymentInstruments("clrozy0on0002fftsjewneb1h");
    // const test = await findSubscriptions("clrozy0on0002fftsjewneb1h");
    return res.status(200).json(parse(test));
  } catch (e: any) {
    return res.status(400).json(e.message);
  }
};

/**
 * Testing Util
 */
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
