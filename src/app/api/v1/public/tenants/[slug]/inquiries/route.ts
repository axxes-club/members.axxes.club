import {wrapAdmission} from '@/lib/security/admission-server';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tenants, contacts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type InquiryBody = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  artworkTitle?: string;
  artworkSlug?: string;
  artworkImage?: string;
  source?: string;
};

async function POSTHandler(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = (await request.json()) as InquiryBody;

    if (!body.email || !body.email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const nameParts = (body.name || "").trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(" ") || null;

    const inquiryNote = [
      body.artworkTitle ? `Artwork: ${body.artworkTitle}` : null,
      body.artworkSlug ? `Slug: ${body.artworkSlug}` : null,
      body.message ? `Message: ${body.message}` : null,
      `Source: ${body.source || "coleccion-website"}`,
      `Received: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Upsert by email: append inquiry to an existing contact or create a new lead
    const existing = await db.query.contacts.findFirst({
      where: and(eq(contacts.tenantId, tenant.id), eq(contacts.email, email)),
    });

    let contactId: string;

    if (existing) {
      await db
        .update(contacts)
        .set({
          leadStatus: "new",
          notes: existing.notes ? `${existing.notes}\n\n---\n${inquiryNote}` : inquiryNote,
          phone: body.phone || existing.phone,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, existing.id));
      contactId = existing.id;
    } else {
      const [created] = await db
        .insert(contacts)
        .values({
          tenantId: tenant.id,
          email,
          firstName,
          lastName,
          phone: body.phone || null,
          type: "lead",
          leadStatus: "new",
          leadSource: body.source || "coleccion-website",
          notes: inquiryNote,
          customFields: {
            artworkTitle: body.artworkTitle || null,
            artworkSlug: body.artworkSlug || null,
            artworkImage: body.artworkImage || null,
          },
        })
        .returning({ id: contacts.id });
      contactId = created.id;
    }

    return NextResponse.json({ ok: true, contactId }, { status: 201 });
  } catch (error) {
    console.error("Public API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
export const POST=wrapAdmission(POSTHandler,'src/app/api/v1/public/tenants/[slug]/inquiries/route.ts'+':POST',3000);
