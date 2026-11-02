import { NextResponse, type NextRequest } from "next/server";
import { issueToken, jwks, testAuthEnabled } from "@/data/test-auth-server";

/** Test-only sign-in endpoints. They answer 404 in production builds. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ route: string }> }) {
  if (!testAuthEnabled()) return new NextResponse(null, { status: 404 });
  const { route } = await params;
  if (route === "jwks") return NextResponse.json(jwks());
  return new NextResponse(null, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ route: string }> }) {
  if (!testAuthEnabled()) return new NextResponse(null, { status: 404 });
  const { route } = await params;
  if (route !== "token") return new NextResponse(null, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { user?: unknown };
  const user = typeof body.user === "string" && body.user.trim() ? body.user.trim().slice(0, 60) : null;
  if (!user) return NextResponse.json({ error: "Name required" }, { status: 400 });
  return NextResponse.json({ token: issueToken(user) });
}
