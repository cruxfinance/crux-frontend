import { prisma } from "@server/prisma";
import { getUnsignedTransaction } from "@server/utils/ergoClient";

const convertToSmallestUnit = (amounts: SimpleTransactionAmount[]): { tokenId: string, amount: number }[] => {
  return amounts.map(({ amount, tokenId, decimals }) => {
    const factor = Math.pow(10, decimals);
    // Ensuring the result is a number within the safe integer range
    const total = Math.floor(amount * factor); // Use Math.floor to ensure it's an integer
    if (total > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Amount exceeds safe integer limit for tokenId: ${tokenId}`);
    }
    return { tokenId, amount: total };
  });
};

export const createTransaction = async (
  input: SimpleTransactionInputs
) => {
  const { address, amounts, userId } = input;
  const amountsInSmallestUnit = convertToSmallestUnit(amounts);

  const RECIPIENT = process.env.ADMIN_ADDRESS;

  if (RECIPIENT) {
    try {
      const tx = await getUnsignedTransaction(address, RECIPIENT, amountsInSmallestUnit);
      const transaction = await prisma.simpleTransaction.create({
        data: {
          id: tx.id,
          userId,
          amounts: JSON.stringify(amountsInSmallestUnit),
        },
      });
      return {
        unsignedTransaction: tx,
        transactionStatus: transaction,
        txId: tx.id,
      };
    } catch (e: any) {
      throw e;
    }
  } else {
    throw new Error('Recipient address not defined')
  }
};