/**
 * Email Sending Infrastructure for Newsletter Module
 * Supports multiple providers: Resend, SendGrid, Mailgun, SMTP
 */

import { nanoid } from "nanoid"
import { db } from "@/lib/db"
import { eq, and, inArray } from "drizzle-orm"
import {
  newsletterCampaigns,
  newsletterSends,
  newsletterEvents,
  newsletterSettings,
  subscriberLists,
  listMemberships,
  contacts,
  trackedLinks,
} from "@/lib/db/schema"

// ============================================
// Types
// ============================================

export interface EmailMessage {
  to: string
  subject: string
  html?: string
  text?: string
  from: string
  replyTo?: string
  headers?: Record<string, string>
}

export interface SendResult {
  success: boolean
  externalId?: string
  error?: string
}

export interface BulkSendResult {
  total: number
  sent: number
  failed: number
  errors: Array<{ email: string; error: string }>
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<SendResult>
  sendBulk(messages: EmailMessage[]): Promise<BulkSendResult>
}

// ============================================
// Resend Provider
// ============================================

class ResendProvider implements EmailProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
          headers: message.headers,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.message || "Failed to send email",
        }
      }

      return {
        success: true,
        externalId: data.id,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async sendBulk(messages: EmailMessage[]): Promise<BulkSendResult> {
    // Resend doesn't have a bulk API, so we send individually
    const results = await Promise.allSettled(
      messages.map((msg) => this.send(msg))
    )

    let sent = 0
    let failed = 0
    const errors: Array<{ email: string; error: string }> = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        sent++
      } else {
        failed++
        errors.push({
          email: messages[index].to,
          error:
            result.status === "fulfilled"
              ? result.value.error || "Unknown error"
              : result.reason?.message || "Unknown error",
        })
      }
    })

    return { total: messages.length, sent, failed, errors }
  }
}

// ============================================
// SendGrid Provider
// ============================================

class SendGridProvider implements EmailProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: message.to }] }],
          from: { email: message.from },
          subject: message.subject,
          content: [
            ...(message.text ? [{ type: "text/plain", value: message.text }] : []),
            ...(message.html ? [{ type: "text/html", value: message.html }] : []),
          ],
          reply_to: message.replyTo ? { email: message.replyTo } : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        return {
          success: false,
          error: data.errors?.[0]?.message || "Failed to send email",
        }
      }

      return {
        success: true,
        externalId: response.headers.get("x-message-id") || undefined,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async sendBulk(messages: EmailMessage[]): Promise<BulkSendResult> {
    const results = await Promise.allSettled(
      messages.map((msg) => this.send(msg))
    )

    let sent = 0
    let failed = 0
    const errors: Array<{ email: string; error: string }> = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        sent++
      } else {
        failed++
        errors.push({
          email: messages[index].to,
          error:
            result.status === "fulfilled"
              ? result.value.error || "Unknown error"
              : result.reason?.message || "Unknown error",
        })
      }
    })

    return { total: messages.length, sent, failed, errors }
  }
}

// ============================================
// SMTP Provider (using nodemailer)
// ============================================

class SMTPProvider implements EmailProvider {
  private config: {
    host: string
    port: number
    user: string
    password: string
    secure: boolean
  }

  constructor(config: { host: string; port: number; user: string; password: string; secure: boolean }) {
    this.config = config
  }

  async send(message: EmailMessage): Promise<SendResult> {
    try {
      // Dynamic import for nodemailer (server-side only)
      const nodemailer = await import("nodemailer")

      const transporter = nodemailer.default.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
      })

      const result = await transporter.sendMail({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        headers: message.headers,
      })

      return {
        success: true,
        externalId: result.messageId,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async sendBulk(messages: EmailMessage[]): Promise<BulkSendResult> {
    const results = await Promise.allSettled(
      messages.map((msg) => this.send(msg))
    )

    let sent = 0
    let failed = 0
    const errors: Array<{ email: string; error: string }> = []

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        sent++
      } else {
        failed++
        errors.push({
          email: messages[index].to,
          error:
            result.status === "fulfilled"
              ? result.value.error || "Unknown error"
              : result.reason?.message || "Unknown error",
        })
      }
    })

    return { total: messages.length, sent, failed, errors }
  }
}

// ============================================
// Email Provider Factory
// ============================================

export async function getEmailProvider(tenantId: string): Promise<EmailProvider | null> {
  const settings = await db.query.newsletterSettings.findFirst({
    where: eq(newsletterSettings.tenantId, tenantId),
  })

  if (!settings) {
    return null
  }

  switch (settings.emailProvider) {
    case "resend":
      if (settings.resendApiKey) {
        return new ResendProvider(settings.resendApiKey)
      }
      break
    case "sendgrid":
      if (settings.sendgridApiKey) {
        return new SendGridProvider(settings.sendgridApiKey)
      }
      break
    case "smtp":
      if (settings.smtpHost && settings.smtpUser) {
        return new SMTPProvider({
          host: settings.smtpHost,
          port: settings.smtpPort ?? 587,
          user: settings.smtpUser,
          password: settings.smtpPassword ?? "",
          secure: settings.smtpSecure ?? true,
        })
      }
      break
  }

  return null
}

// ============================================
// Campaign Sending
// ============================================

export async function sendCampaign(campaignId: string): Promise<BulkSendResult> {
  // Get campaign
  const campaign = await db.query.newsletterCampaigns.findFirst({
    where: eq(newsletterCampaigns.id, campaignId),
  })

  if (!campaign) {
    throw new Error("Campaign not found")
  }

  // Get email provider
  const provider = await getEmailProvider(campaign.tenantId)
  if (!provider) {
    throw new Error("Email provider not configured")
  }

  // Get settings for from address
  const settings = await db.query.newsletterSettings.findFirst({
    where: eq(newsletterSettings.tenantId, campaign.tenantId),
  })

  const fromEmail = campaign.fromEmail || settings?.defaultFromEmail || process.env.FROM_EMAIL || "noreply@example.com"
  const fromName = campaign.fromName || settings?.defaultFromName || ""
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail

  // Get recipients
  const recipients = await getCampaignRecipients(campaignId, campaign.listIds ?? [])

  if (recipients.length === 0) {
    return { total: 0, sent: 0, failed: 0, errors: [] }
  }

  // Create send records
  const sendRecords = await db.insert(newsletterSends).values(
    recipients.map((r) => ({
      tenantId: campaign.tenantId,
      campaignId: campaign.id,
      contactId: r.contactId,
      listId: r.listId,
      toEmail: r.email,
      trackingToken: nanoid(32),
      status: "pending" as const,
    }))
  ).returning()

  // Process tracking links if enabled
  let htmlContent = campaign.htmlContent || ""
  if (campaign.clickTrackingEnabled && htmlContent) {
    htmlContent = await processClickTracking(
      campaign.tenantId,
      campaignId,
      htmlContent
    )
  }

  // Add open tracking pixel
  if (campaign.openTrackingEnabled && htmlContent) {
    htmlContent = addOpenTrackingPixel(htmlContent)
  }

  // Update campaign status
  await db.update(newsletterCampaigns).set({
    status: "sending",
    totalRecipients: recipients.length,
    updatedAt: new Date(),
  }).where(eq(newsletterCampaigns.id, campaignId))

  // Prepare messages
  const messages: EmailMessage[] = sendRecords.map((send) => {
    const personalizedHtml = personalizeContent(htmlContent, {
      email: send.toEmail,
      trackingToken: send.trackingToken,
    })
    const personalizedText = campaign.textContent
      ? personalizeContent(campaign.textContent, {
          email: send.toEmail,
          trackingToken: send.trackingToken,
        })
      : undefined

    return {
      to: send.toEmail,
      subject: campaign.subject,
      html: personalizedHtml,
      text: personalizedText,
      from,
      replyTo: campaign.replyTo || settings?.defaultReplyTo || undefined,
      headers: {
        "X-Campaign-Id": campaignId,
        "X-Send-Id": send.id,
        "List-Unsubscribe": `<${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/${send.trackingToken}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }
  })

  // Send emails
  const result = await provider.sendBulk(messages)

  // Update send records and create events
  for (const send of sendRecords) {
    const message = messages.find((m) => m.to === send.toEmail)
    const error = result.errors.find((e) => e.email === send.toEmail)

    await db.update(newsletterSends).set({
      status: error ? "failed" : "sent",
      sentAt: error ? null : new Date(),
      errorMessage: error?.error,
      updatedAt: new Date(),
    }).where(eq(newsletterSends.id, send.id))

    if (!error) {
      await db.insert(newsletterEvents).values({
        tenantId: campaign.tenantId,
        campaignId: campaign.id,
        sendId: send.id,
        contactId: send.contactId,
        event: "sent",
        occurredAt: new Date(),
      })
    }
  }

  // Update campaign stats
  await db.update(newsletterCampaigns).set({
    status: "sent",
    sentAt: new Date(),
    sentCount: result.sent,
    updatedAt: new Date(),
  }).where(eq(newsletterCampaigns.id, campaignId))

  return result
}

async function getCampaignRecipients(
  campaignId: string,
  listIds: string[]
): Promise<Array<{ contactId: string; email: string; listId: string | null }>> {
  if (listIds.length === 0) {
    return []
  }

  // Get all subscribed memberships from the selected lists
  const memberships = await db
    .select({
      contactId: listMemberships.contactId,
      listId: listMemberships.listId,
      email: contacts.email,
    })
    .from(listMemberships)
    .innerJoin(contacts, eq(listMemberships.contactId, contacts.id))
    .where(
      and(
        inArray(listMemberships.listId, listIds),
        eq(listMemberships.status, "subscribed")
      )
    )

  // Deduplicate by email
  const seen = new Set<string>()
  const uniqueRecipients: Array<{ contactId: string; email: string; listId: string | null }> = []

  for (const m of memberships) {
    if (m.email && !seen.has(m.email)) {
      seen.add(m.email)
      uniqueRecipients.push({
        contactId: m.contactId,
        email: m.email,
        listId: m.listId,
      })
    }
  }

  return uniqueRecipients
}

function personalizeContent(
  content: string,
  variables: { email: string; trackingToken: string }
): string {
  return content
    .replace(/{{\s*email\s*}}/gi, variables.email)
    .replace(/{{\s*tracking_token\s*}}/gi, variables.trackingToken)
    .replace(/\[EMAIL\]/gi, variables.email)
    .replace(/\[TRACKING_TOKEN\]/gi, variables.trackingToken)
}

async function processClickTracking(
  tenantId: string,
  campaignId: string,
  html: string
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ""
  const linkRegex = /href="(https?:\/\/[^"]+)"/gi
  const links = new Map<string, string>()

  let match
  while ((match = linkRegex.exec(html)) !== null) {
    const originalUrl = match[1]
    if (originalUrl.startsWith(appUrl)) continue // Skip internal links

    if (!links.has(originalUrl)) {
      const linkToken = nanoid(16)
      links.set(originalUrl, linkToken)

      // Create tracked link record
      await db.insert(trackedLinks).values({
        tenantId,
        campaignId,
        originalUrl,
        linkToken,
      })
    }
  }

  // Replace links with tracking URLs
  let processedHtml = html
  for (const [originalUrl, linkToken] of links) {
    const trackingUrl = `${appUrl}/api/newsletter/track/click/${linkToken}`
    processedHtml = processedHtml.replace(
      new RegExp(`href="${escapeRegex(originalUrl)}"`, "g"),
      `href="${trackingUrl}"`
    )
  }

  return processedHtml
}

function addOpenTrackingPixel(html: string): string {
  const pixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/newsletter/track/open/{{ tracking_token }}" width="1" height="1" alt="" style="display:block;height:1px;width:1px;border:0;">`
  
  // Insert before </body> or at the end
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`)
  }
  return html + pixel
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}