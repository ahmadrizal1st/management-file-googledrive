import { NextApiRequest, NextApiResponse } from "next";
import { google } from "googleapis";
import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import formidable from "formidable";
import fs from "fs";

const prisma = new PrismaClient();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const session = await getSession({ req });

  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const form = formidable({
    uploadDir: "./tmp",
    keepExtensions: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Error parsing form:", err);
      return res.status(500).json({ message: "Error uploading file" });
    }

    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.NEXTAUTH_URL + "/api/auth/callback/google"
      );

      // TODO: Retrieve access token and refresh token from database for the user
      // For now, this is a placeholder. In a real app, you'd store and retrieve these.
      auth.setCredentials({
        refresh_token: "YOUR_USER_REFRESH_TOKEN_FROM_DB",
        access_token: "YOUR_USER_ACCESS_TOKEN_FROM_DB",
      });

      const drive = google.drive({ version: "v3", auth });

      const fileMetadata = {
        name: file.originalFilename || "uploaded_file",
        parents: ["root"], // You can specify a folder ID here
      };

      const media = {
        mimeType: file.mimetype || "application/octet-stream",
        body: fs.createReadStream(file.filepath),
      };

      const driveResponse = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id,webViewLink",
      });

      if (!driveResponse.data.id || !driveResponse.data.webViewLink) {
        throw new Error("Failed to upload file to Google Drive");
      }

      // Save file metadata to MongoDB
      const newFile = await prisma.file.create({
        data: {
          fileName: file.originalFilename || "uploaded_file",
          fileSize: file.size,
          mimeType: file.mimetype || "application/octet-stream",
          driveFileId: driveResponse.data.id,
          driveLink: driveResponse.data.webViewLink,
          ownerId: session.user.id,
        },
      });

      // Clean up temporary file
      fs.unlinkSync(file.filepath);

      res
        .status(200)
        .json({ message: "File uploaded successfully", file: newFile });
    } catch (error) {
      console.error(
        "Error uploading file to Google Drive or saving to DB:",
        error
      );
      res.status(500).json({ message: "Error uploading file" });
    }
  });
}
