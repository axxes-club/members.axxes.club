import type { BrandProfile } from "@/lib/db/schema"

// Generate CSS variables from brand profile
export function generateBrandCSSVariables(brand: BrandProfile | null): Record<string, string> {
  if (!brand) return {}

  const vars: Record<string, string> = {}

  // Colors
  if (brand.primaryColor) vars["--brand-primary"] = brand.primaryColor
  if (brand.secondaryColor) vars["--brand-secondary"] = brand.secondaryColor
  if (brand.accentColor) vars["--brand-accent"] = brand.accentColor
  if (brand.backgroundColor) vars["--brand-background"] = brand.backgroundColor
  if (brand.backgroundColorDark) vars["--brand-background-dark"] = brand.backgroundColorDark
  if (brand.textColor) vars["--brand-text"] = brand.textColor
  if (brand.textColorDark) vars["--brand-text-dark"] = brand.textColorDark

  // Typography
  if (brand.headingFont) vars["--brand-heading-font"] = brand.headingFont
  if (brand.bodyFont) vars["--brand-body-font"] = brand.bodyFont
  if (brand.accentFont) vars["--brand-accent-font"] = brand.accentFont

  // Design rules
  const rules = brand.designRules
  if (rules) {
    if (rules.cornerRadius) vars["--brand-radius"] = rules.cornerRadius
    if (rules.shadowStyle) {
      const shadows: Record<string, string> = {
        none: "none",
        subtle: "0 1px 3px rgba(0,0,0,0.12)",
        medium: "0 4px 6px rgba(0,0,0,0.1)",
        dramatic: "0 10px 25px rgba(0,0,0,0.2)",
      }
      vars["--brand-shadow"] = shadows[rules.shadowStyle] || "none"
    }
  }

  return vars
}

// Generate CSS string from brand profile
export function generateBrandCSSString(brand: BrandProfile | null): string {
  const vars = generateBrandCSSVariables(brand)
  if (Object.keys(vars).length === 0) return ""

  const varStrings = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n")

  return `:root {\n${varStrings}\n}`
}

// Get brand color by mapping name
export function getBrandColor(
  brand: BrandProfile | null,
  mapping: "primary" | "secondary" | "accent" | "background" | "text" | "custom",
  customValue?: string
): string | undefined {
  if (!brand) return customValue
  if (mapping === "custom") return customValue

  const colorMap: Record<string, string | null | undefined> = {
    primary: brand.primaryColor,
    secondary: brand.secondaryColor,
    accent: brand.accentColor,
    background: brand.backgroundColor,
    text: brand.textColor,
  }

  return colorMap[mapping] || customValue
}

// Get brand font
export function getBrandFont(
  brand: BrandProfile | null,
  type: "heading" | "body" | "accent"
): string | undefined {
  if (!brand) return undefined

  const fontMap: Record<string, string | null | undefined> = {
    heading: brand.headingFont,
    body: brand.bodyFont,
    accent: brand.accentFont,
  }

  return fontMap[type] || undefined
}

// Get design rule value
export function getBrandDesignRule(
  brand: BrandProfile | null,
  rule: "cornerRadius" | "buttonStyle" | "imageStyle" | "shadowStyle"
): string | undefined {
  if (!brand?.designRules) return undefined
  return brand.designRules[rule] as string | undefined
}

// Apply brand profile to block settings overrides
export type BrandStyleOptions = {
  useBrandColors?: boolean
  useBrandFonts?: boolean
  useBrandRadius?: boolean
  useBrandShadows?: boolean
  colorMappings?: {
    text?: "primary" | "secondary" | "accent" | "background" | "custom"
    background?: "primary" | "secondary" | "accent" | "background" | "custom"
    accent?: "primary" | "secondary" | "accent" | "custom"
  }
}

export function applyBrandToStyles(
  brand: BrandProfile | null,
  options: BrandStyleOptions,
  existingStyles: React.CSSProperties = {}
): React.CSSProperties {
  if (!brand) return existingStyles

  const styles: React.CSSProperties = { ...existingStyles }

  // Apply brand colors
  if (options.useBrandColors) {
    if (options.colorMappings?.background) {
      const bgColor = getBrandColor(brand, options.colorMappings.background)
      if (bgColor) styles.backgroundColor = bgColor
    }
    if (options.colorMappings?.text) {
      const textColor = getBrandColor(brand, options.colorMappings.text)
      if (textColor) styles.color = textColor
    }
  }

  // Apply brand fonts
  if (options.useBrandFonts) {
    const bodyFont = getBrandFont(brand, "body")
    if (bodyFont) styles.fontFamily = bodyFont
  }

  // Apply brand radius
  if (options.useBrandRadius) {
    const radius = getBrandDesignRule(brand, "cornerRadius")
    if (radius) styles.borderRadius = radius
  }

  // Apply brand shadows
  if (options.useBrandShadows) {
    const shadowStyle = getBrandDesignRule(brand, "shadowStyle")
    if (shadowStyle) {
      const shadows: Record<string, string> = {
        none: "none",
        subtle: "0 1px 3px rgba(0,0,0,0.12)",
        medium: "0 4px 6px rgba(0,0,0,0.1)",
        dramatic: "0 10px 25px rgba(0,0,0,0.2)",
      }
      styles.boxShadow = shadows[shadowStyle] || "none"
    }
  }

  return styles
}

// Get brand color palette for the editor
export function getBrandColorPalette(brand: BrandProfile | null): Array<{ name: string; color: string }> {
  const palette: Array<{ name: string; color: string }> = []

  if (!brand) return palette

  if (brand.primaryColor) palette.push({ name: "Primary", color: brand.primaryColor })
  if (brand.secondaryColor) palette.push({ name: "Secondary", color: brand.secondaryColor })
  if (brand.accentColor) palette.push({ name: "Accent", color: brand.accentColor })
  if (brand.backgroundColor) palette.push({ name: "Background", color: brand.backgroundColor })
  if (brand.textColor) palette.push({ name: "Text", color: brand.textColor })

  // Add additional colors from color palette
  if (brand.colorPalette?.colors) {
    brand.colorPalette.colors.forEach((c) => {
      palette.push({ name: c.name, color: c.hex })
    })
  }

  return palette
}

// Export brand profile subset for the page editor
export type BrandProfileForEditor = {
  primaryColor?: string | null
  secondaryColor?: string | null
  accentColor?: string | null
  backgroundColor?: string | null
  textColor?: string | null
  headingFont?: string | null
  bodyFont?: string | null
  designRules?: {
    cornerRadius?: string
    buttonStyle?: string
    shadowStyle?: string
  } | null
}

export function extractBrandProfileForEditor(brand: BrandProfile | null): BrandProfileForEditor | null {
  if (!brand) return null

  return {
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor,
    accentColor: brand.accentColor,
    backgroundColor: brand.backgroundColor,
    textColor: brand.textColor,
    headingFont: brand.headingFont,
    bodyFont: brand.bodyFont,
    designRules: brand.designRules as BrandProfileForEditor["designRules"],
  }
}
