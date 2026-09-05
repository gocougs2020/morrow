import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api";
import {
  DocumentFolderError,
  deleteUserFolder,
  getUserFolder,
  listUserFolders,
  toClientFolder,
  updateUserFolder,
} from "@/lib/document-folders";
import { isResourceVisibility } from "@/lib/visibility";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = await params;
  const [folder, folders] = await Promise.all([
    getUserFolder(session.user.id, id),
    listUserFolders(session.user.id),
  ]);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }
  return NextResponse.json({ folder: toClientFolder(folder, folders, 0, session.user.id) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    parentId?: string | null;
    visibility?: string;
  };

  try {
    const folder = await updateUserFolder(session.user.id, id, {
      name: body.name,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireApiSession(request);
  if (error || !session) return error;
  const { id } = await params;
  try {
    await deleteUserFolder(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (folderError) {
    if (folderError instanceof DocumentFolderError) {
      return NextResponse.json({ error: folderError.message }, { status: folderError.status });
    }
    throw folderError;
  }
}
