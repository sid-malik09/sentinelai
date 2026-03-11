import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { topics } from "@/lib/db/schema";
import { createTopicSchema } from "@/lib/validators";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const allTopics = await db.query.topics.findMany({
    where: eq(topics.projectId, projectId),
    orderBy: [desc(topics.createdAt)],
  });
  return NextResponse.json(allTopics);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const body = await request.json();
  const parsed = createTopicSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [topic] = await db
    .insert(topics)
    .values({ ...parsed.data, projectId })
    .returning();

  return NextResponse.json(topic, { status: 201 });
}
