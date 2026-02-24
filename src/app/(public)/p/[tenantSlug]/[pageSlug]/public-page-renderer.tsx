"use client"

import { BlockRenderer } from "@/app/(dashboard)/website/pages/[pageId]/blocks/block-renderer"
import Image from "next/image"
import { generateBrandCSSString } from "@/lib/brand/brand-styles"
import type { Page, PageBlock, Tenant, BrandProfile } from "@/lib/db/schema"

interface PublicPageRendererProps {
  page: Page & { blocks: PageBlock[] }
  tenant: Tenant
  brandProfile: BrandProfile | null
}

export function PublicPageRenderer({
  page,
  tenant,
  brandProfile,
}: PublicPageRendererProps) {
  const brandCSS = generateBrandCSSString(brandProfile)

  return (
    <>
      {/* Inject brand CSS variables */}
      {brandCSS && <style dangerouslySetInnerHTML={{ __html: brandCSS }} />}

      {/* Page wrapper */}
      <div className="min-h-screen bg-background">
        {/* Navigation (if enabled) */}
        {page.showNavigation && (
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
              <div className="flex items-center gap-4">
                {brandProfile?.logoUrl ? (
                  <Image
                    src={brandProfile.logoUrl}
                    alt={tenant.name}
                    height={32}
                    width={100} // or a sufficiently large width
                    className="h-8 w-auto"
                  />
                ) : (
                  <span
                    className="font-bold text-xl"
                    style={{ color: brandProfile?.primaryColor || undefined }}
                  >
                    {tenant.name}
                  </span>
                )}
              </div>
              {/* Add navigation links here if needed */}
            </div>
          </header>
        )}

        {/* Page content */}
        <main>
          {page.blocks.length === 0 ? (
            <div className="container py-16 text-center">
              <h1 className="text-3xl font-bold">{page.title}</h1>
              {page.description && (
                <p className="mt-4 text-muted-foreground">{page.description}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              {page.blocks.map((block) => (
                <BlockRenderer key={block.id} block={block} isEditing={false} />
              ))}
            </div>
          )}
        </main>

        {/* Footer (if enabled) */}
        {page.showFooter && (
          <footer className="border-t bg-muted/30">
            <div className="container py-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {brandProfile?.logoIconUrl ? (
                    <Image
                      src={brandProfile.logoIconUrl}
                      alt={tenant.name}
                      height={24}
                      width={24}
                      className="h-6 w-6"
                    />
                  ) : null}
                  <span className="text-sm text-muted-foreground">
                    {brandProfile?.copyrightText ||
                      `\u00A9 ${new Date().getFullYear()} ${tenant.name}. All rights reserved.`}
                  </span>
                </div>
                {/* Social links */}
                {brandProfile?.socialLinks && (
                  <div className="flex items-center gap-4">
                    {Object.entries(brandProfile.socialLinks).map(
                      ([platform, url]) =>
                        url && (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <span className="capitalize">{platform}</span>
                          </a>
                        )
                    )}
                  </div>
                )}
              </div>
            </div>
          </footer>
        )}
      </div>
    </>
  )
}
