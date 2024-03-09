import { prisma } from '@server/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { p2pkAddress, verificationId } = req.query;

  if (!verificationId || typeof verificationId !== 'string' ||
    !p2pkAddress || typeof p2pkAddress !== 'string') {
    return res.status(400).json({ error: 'Missing verification ID or Address' });
  }

  if (p2pkAddress.includes('multiple')) {
    return res.status(400).json({ error: 'Requires a single address' });
  }

  try {
    const keyExists = await prisma.mobileVerification.findUnique({
      where: {
        verificationId
      }
    })

    if (!keyExists) {
      return res.status(404).json({
        error: "Verification ID not found. You must login through the website.",
        message: "Verification ID not found."
      });
    }

    await prisma.mobileVerification.update({
      where: {
        verificationId: verificationId
      },
      data: {
        address: p2pkAddress
      },
    });

    return res.status(200).json({
      message: "Address added successfully.",
      messageSeverity: "INFORMATION"
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
