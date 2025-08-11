import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const session = await getSession({ req });

  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { fileId } = req.query;

  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({ message: 'File ID is required' });
  }

  try {
    const fileRecord = await prisma.file.findUnique({
      where: {
        id: fileId,
        ownerId: session.user.id,
      },
    });

    if (!fileRecord) {
      return res.status(404).json({ message: 'File not found or you do not have permission to delete it' });
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/auth/callback/google'
    );

    // TODO: Retrieve access token and refresh token from database for the user
    auth.setCredentials({
      refresh_token: 'YOUR_USER_REFRESH_TOKEN_FROM_DB',
      access_token: 'YOUR_USER_ACCESS_TOKEN_FROM_DB',
    });

    const drive = google.drive({ version: 'v3', auth });

    await drive.files.delete({ fileId: fileRecord.driveFileId });

    await prisma.file.delete({
      where: {
        id: fileId,
      },
    });

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
}


