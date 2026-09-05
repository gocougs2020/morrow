import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import {
  DocumentFolderError,
  createUserFolder,
  listUserFolders,
  toClientFolder,
} from "@/lib/document-folders";
import { isResourceVisibility } from "@/lib/visibility";

export async function GET(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const folders = await listUserFolders(session.user.id);
  return NextResponse.json({
    folders: folders.map((folder) => toClientFolder(folder, folders, 0, session.user.id)),
  });
}

export async function POST(request: Request) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    parentId?: string | null;
    visibility?: string;
  };

  try {
    const folder = await createUserFolder(session.user.id, {
      name: body.name ?? "",
      description: body.description,
      parentId: body.parentId,
      visibility: isResourceVisibility(body.visibility) ? body.visibility : undefined,
    });
    const folders = await listUserFolders(session.user.id);
    return NextResponse.json({ folder: toClientFolder(folder, folders, 0, session.user.id) });
  } catch (folderError) {
    if (folderError instanceof DocumentFolderError) {
      return NextResponse.json({ error: folderError.message }, { status: folderError.status });
    }
    throw folderError;
  }
}
