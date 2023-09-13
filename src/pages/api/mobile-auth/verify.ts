import { prisma } from '@server/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { verificationId } = req.query;
    const { signedMessage, proof } = req.body;

    await prisma.loginRequest.update({
      where: { verificationId: verificationId?.toString() },
      data: {
        status: 'SIGNED',
        signedMessage,
        proof
      }
    });

    console.log('message: ' + signedMessage)
    console.log('proof: ' + proof)

    return res.status(200).json({
      status: 'SIGNED',
      signedMessage,
      proof
    });
  }

  return res.status(405).end(); // Method Not Allowed if not a POST request
}