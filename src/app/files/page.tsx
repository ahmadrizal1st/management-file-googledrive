import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";

interface FileItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  driveLink: string;
  createdAt: string;
}

export default async function FilesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  let files: FileItem[] = [];
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/files`, {
      headers: {
        Cookie: `next-auth.session-token=${session.user?.email || ""}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Error fetching files: ${response.statusText}`);
    }

    const data = await response.json();
    files = data.files || [];
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Your Files
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <Link
            href="/upload"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
            rel="noopener noreferrer"
          >
            <h2 className={`mb-3 text-2xl font-semibold`}>
              Upload New File{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                
              </span>
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Add a new file to your Google Drive.
            </p>
          </Link>
        </div>
      </div>

      <div className="mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
        {error && <p className="text-red-500">Error: {error}</p>}
        {files.length === 0 && !error && <p>No files uploaded yet.</p>}
        {files.map((file) => (
          <div
            key={file.id}
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          >
            <h2 className={`mb-3 text-2xl font-semibold`}>
              {file.fileName}
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Size: {(file.fileSize / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Type: {file.mimeType}
            </p>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Uploaded: {new Date(file.createdAt).toLocaleDateString()}
            </p>
            <div className="mt-4 flex space-x-4">
              <a
                href={file.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                View on Drive
              </a>
              <DeleteButton fileId={file.id} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// Client Component untuk handle delete
function DeleteButton({ fileId }: { fileId: string }) {
  "use client";
  
  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this file?")) {
      try {
        const response = await fetch(`/api/delete?fileId=${fileId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error(`Error deleting file: ${response.statusText}`);
        }

        window.location.reload();
      } catch (e: any) {
        alert(`Failed to delete file: ${e.message}`);
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-red-500 hover:underline"
    >
      Delete
    </button>
  );
}
