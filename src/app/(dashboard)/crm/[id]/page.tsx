import Link from "next/link"
export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Mail, Phone, Building2, MapPin, Calendar, Pencil, Activity, FileText, MessageSquare } from "lucide-react"
import { getContact, getContactInteractions } from "@/lib/actions/contacts"
import { ContactActions } from "./contact-actions"
import { InteractionsList } from "./interactions-list"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let contact
  let interactions = []
  try {
    contact = await getContact(id)
    interactions = await getContactInteractions(id)
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
          {/* Contact Card */}
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

          {/* Tabs for Activity and Notes */}
          <Tabs defaultValue="activity" className="space-y-6">
            <TabsList>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="activity">
              <InteractionsList contactId={id} initialInteractions={interactions} />
            </TabsContent>

            <TabsContent value="notes">
              <Card>
                <CardContent className="p-6">
                  {contact.notes ? (
                    <p className="whitespace-pre-wrap text-sm">{contact.notes}</p>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">No notes yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add notes to keep track of important information
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lead Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={
                  contact.leadStatus === "converted" ? "success" :
                  contact.leadStatus === "lost" ? "destructive" :
                  contact.leadStatus === "qualified" ? "default" : "secondary"
                }>
                  {contact.leadStatus || "New"}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Lead Score</span>
                <div className="flex items-center gap-2">
                  {contact.leadScore !== null && (
                    <>
                      <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            contact.leadScore >= 80 ? "bg-green-500" :
                            contact.leadScore >= 60 ? "bg-yellow-500" :
                            contact.leadScore >= 40 ? "bg-orange-500" : "bg-red-500"
                          }`}
                          style={{ width: `${contact.leadScore}%` }}
                        />
                      </div>
                      <span className="font-medium">{contact.leadScore}</span>
                    </>
                  )}
                  {contact.leadScore === null && <span className="text-muted-foreground">—</span>}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">{contact.leadSource || "—"}</span>
              </div>
              {contact.convertedAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Converted</span>
                  <span className="font-medium">
                    {new Date(contact.convertedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Profiles */}
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
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <span className="text-pink-500">IG</span>
                  @{contact.instagramHandle}
                </a>
              ) : null}
              {contact.tiktokHandle ? (
                <a
                  href={`https://tiktok.com/@${contact.tiktokHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <span className="text-black dark:text-white">TT</span>
                  @{contact.tiktokHandle}
                </a>
              ) : null}
              {contact.twitterHandle ? (
                <a
                  href={`https://twitter.com/${contact.twitterHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <span className="text-blue-400">X</span>
                  @{contact.twitterHandle}
                </a>
              ) : null}
              {contact.linkedinUrl ? (
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <span className="text-blue-600">LI</span>
                  LinkedIn Profile
                </a>
              ) : null}
              {!contact.instagramHandle && !contact.tiktokHandle && !contact.twitterHandle && !contact.linkedinUrl && (
                <p className="text-sm text-muted-foreground">No social profiles added</p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
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