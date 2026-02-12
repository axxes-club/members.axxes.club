import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Mail, Phone, Building2, MapPin, Calendar, Pencil } from "lucide-react"
import { getContact } from "@/lib/actions/contacts"
import { ContactActions } from "./contact-actions"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let contact
  try {
    contact = await getContact(id)
  } catch {
    notFound()
  }

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ")
  const initials = [contact.firstName?.[0], contact.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"

  return (
    <div className="space-y-8">
      <PageHeader
        heading={fullName || "Unnamed Contact"}
        description={contact.company || contact.email || "Contact details"}
        actions={
          <div className="flex gap-2">
            <Link href="/crm">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link href={`/crm/${id}/edit`}>
              <Button>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <SectionHeader number="01" title="Contact Information" />

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold">{fullName}</h2>
                    <Badge
                      variant={
                        contact.type === "vip"
                          ? "default"
                          : contact.type === "customer"
                          ? "success"
                          : "secondary"
                      }
                    >
                      {contact.type}
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${contact.email}`} className="hover:underline">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${contact.phone}`} className="hover:underline">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {contact.company && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{contact.company}</span>
                        {contact.jobTitle && (
                          <span className="text-muted-foreground">({contact.jobTitle})</span>
                        )}
                      </div>
                    )}
                    {contact.city && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {[contact.city, contact.state, contact.country].filter(Boolean).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {contact.notes && (
            <>
              <SectionHeader number="02" title="Notes" />
              <Card>
                <CardContent className="p-6">
                  <p className="whitespace-pre-wrap text-sm">{contact.notes}</p>
                </CardContent>
              </Card>
            </>
          )}

          <SectionHeader number={contact.notes ? "03" : "02"} title="Activity" />
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">No activity recorded yet</p>
              <Button variant="link" className="mt-2">
                Log an interaction
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{contact.leadStatus || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lead Score</span>
                <span className="font-medium">{contact.leadScore ?? "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">{contact.leadSource || "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Social Profiles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contact.instagramHandle ? (
                <a
                  href={`https://instagram.com/${contact.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm hover:underline"
                >
                  @{contact.instagramHandle}
                </a>
              ) : null}
              {contact.tiktokHandle ? (
                <a
                  href={`https://tiktok.com/@${contact.tiktokHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm hover:underline"
                >
                  @{contact.tiktokHandle}
                </a>
              ) : null}
              {contact.twitterHandle ? (
                <a
                  href={`https://twitter.com/${contact.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm hover:underline"
                >
                  @{contact.twitterHandle}
                </a>
              ) : null}
              {!contact.instagramHandle && !contact.tiktokHandle && !contact.twitterHandle && (
                <p className="text-sm text-muted-foreground">No social profiles added</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created</span>
                <span className="ml-auto">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated</span>
                <span className="ml-auto">
                  {new Date(contact.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <ContactActions contactId={id} />
        </div>
      </div>
    </div>
  )
}
