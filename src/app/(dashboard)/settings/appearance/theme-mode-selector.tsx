"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Sun, Moon, Monitor } from "lucide-react"
import { updateThemeMode } from "@/lib/actions/theme"

interface ThemeModeSelectorProps {
  currentMode: string
}

const themes = [
  {
    id: "light",
    name: "Light",
    icon: Sun,
    description: "Light background with dark text",
  },
  {
    id: "dark",
    name: "Dark",
    icon: Moon,
    description: "Dark background with light text",
  },
  {
    id: "system",
    name: "System",
    icon: Monitor,
    description: "Follows your system preference",
  },
]

export function ThemeModeSelector({ currentMode }: ThemeModeSelectorProps) {
  const { setTheme } = useTheme()
  const [selected, setSelected] = useState(currentMode)
  const [loading, setLoading] = useState(false)

  async function handleSelect(themeId: string) {
    setSelected(themeId)
    setTheme(themeId)
    setLoading(true)
    await updateThemeMode(themeId)
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Mode</CardTitle>
        <CardDescription>
          Choose between light, dark, or system theme.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {themes.map((theme) => {
            const Icon = theme.icon
            const isSelected = selected === theme.id

            return (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                disabled={loading}
                className={cn(
                  "relative flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-all hover:bg-accent",
                  isSelected
                    ? "border-primary bg-accent"
                    : "border-transparent bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <Label className="text-sm font-medium">{theme.name}</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {theme.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
