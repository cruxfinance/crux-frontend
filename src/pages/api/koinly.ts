import { prisma } from '@server/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  message: string;
};

const API_KEY = process.env.THIS_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method === 'POST') {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
      return res.status(401).json({ message: 'Unauthorized: API Key is invalid or missing.' });
    }

    if (req.headers['content-type'] !== 'application/json') {
      return res.status(415).json({ message: 'Unsupported Media Type: Expected application/json' });
    }

    const { reportId, fileName } = req.body;
    if (typeof reportId !== 'string' || typeof fileName !== 'string' || !reportId.trim() || !fileName.trim()) {
      return res.status(400).json({ message: 'Bad Request: Invalid or missing fields in the payload.' });
    }

    try {
      const updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: { reportFilename: fileName },
      });

      const addedNotification = await prisma.notification.create({
        data: {
          userId: updatedReport.userId,
          body: `Koinly download for ${updatedReport.customName} is now ready`,
          href: `/accounting?report-id=${updatedReport.id}`
        }
      })

      console.log('Webhook received and report updated:', updatedReport);
      res.status(200).json({ message: 'Webhook received and report updated successfully.' });
    } catch (error) {
      console.error('Error updating the report:', error);
      res.status(500).json({ message: 'Internal Server Error: Could not update the report.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
