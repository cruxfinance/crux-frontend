import {
  addPaymentInstrumentBalance,
  chargePaymentInstrument,
  createPaymentInstrument,
  getPaymentInstrument,
} from "@server/services/subscription/paymentInstrument";
import { v4 as uuidv4 } from "uuid";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // userId: "clrghro8f0000ij620r1cgghw"
    // paideia: "1fd6e032e8476c4aa54c18c1a308dce83940e8f4a28f576440513ed7326ad489"
    // const test = await createPaymentInstrument({
    //   userId: "clrghro8f0000ij620r1cgghw",
    //   tokenId: null,
    // });
    // const test = await chargePaymentInstrument({
    //   paymentInstrumentId: "clrhujnnz0001t8jgs32y5qpp",
    //   amount: 1000000,
    //   tokenId: null,
    //   idempotencyKey: uuidv4(),
    // });
    const test = await getPaymentInstrument("clrhujnnz0001t8jgs32y5qpp")
    // const test = await addPaymentInstrumentBalance({
    //   paymentInstrumentId: "clrhujnnz0001t8jgs32y5qpp",
    //   address: "9i6UmaoJKWHgWkuq1EJUoYu2hrkRkxAYwQjDotHRHfGrBo16Rss",
    //   amount: 2000000
    // });
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
