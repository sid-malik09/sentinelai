import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { createProjectSchema } from "@/lib/validators";
import { desc } from "drizzle-orm";

export async function GET() {
  const allProjects = await db.query.projects.findMany({
    with: { topics: true },
    orderBy: [desc(projects.createdAt)],
  });
  return NextResponse.json(allProjects);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [project] = await db.insert(projects).values(parsed.data).returning();
  return NextResponse.json(project, { status: 201 });
}
