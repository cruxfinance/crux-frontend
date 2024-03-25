import { prisma } from '@server/prisma';
import { getUnsignedTransaction } from '@server/utils/ergoClient';
import type { NextApiRequest, NextApiResponse } from 'next';

// model KeyValuePair {
//   key       String   @id
//   value     String
//   createdAt DateTime @default(now()) @map("created_at")
//   updatedAt DateTime @updatedAt @map("updated_at")

//   @@map("kv")
// }

const deleteExpiredKeyPairs = async () => {
  const now = new Date();
  try {
    const result = await prisma.keyValuePair.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });
    console.log(`Deleted ${result.count} expired key-value pairs.`);
  } catch (error) {
    console.error("Error deleting expired key-value pairs:", error);
    throw new Error("Failed to delete expired key-value pairs.");
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { verificationId, address } = req.query;

  if (!verificationId || typeof verificationId !== 'string' ||
    !address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Missing verification ID or Address' });
  }

  if (!process.env.ADMIN_ADDRESS) {
    return res.status(400).json({ error: 'Server error: admin address not set. Please contact support.' });
  }

  try {
    const transaction = await prisma.keyValuePair.findFirst({
      where: {
        key: verificationId
      }
    })

    if (!transaction) {
      return res.status(404).json({
        error: "Transaction data not found.",
        message: "Transaction data not found for the provided verification ID."
      });
    }

    const txObject = JSON.parse(transaction.value)

    const tx = await getUnsignedTransaction(address, process.env.ADMIN_ADDRESS, txObject)

    console.log(tx)

    await prisma.keyValuePair.update({
      where: {
        key: verificationId
      },
      data: {
        value: JSON.stringify({ txId: tx.id })
      }
    })

    await deleteExpiredKeyPairs();

    return res.status(200).json({
      message: "Sign the transaction to complete your Crux request. ",
      reducedTx: tx.rawReducedTx,
      address: address
    });
  } catch (error: unknown) {
    // Initialize default error message
    let errorMessage = 'An unexpected error occurred';
    let errorStack = '';

    // Check if error is an instance of Error
    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack || '';
      console.error('Error:', errorMessage, 'Stack:', errorStack);
    } else {
      // Handle non-Error types gracefully
      errorMessage = 'Unexpected error: ' + error;
      console.error(errorMessage);
    }

    // Respond with error message and optionally include the stack in development mode
    res.status(500).json({
      error: 'Internal server error',
      details: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { stack: errorStack }) // Include stack trace only in development environment
    });
  }
}