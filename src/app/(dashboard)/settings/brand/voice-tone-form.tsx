"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateBrandVoiceTone } from "@/lib/actions/brand"
import { X, Plus } from "lucide-react"
import type { BrandProfile } from "@/lib/db/schema"

interface VoiceToneFormProps {
  profile: BrandProfile | null | undefined
}

const PERSONALITY_OPTIONS = [
  "Bold", "Energetic", "Playful", "Professional", "Sophisticated",
  "Friendly", "Edgy", "Minimalist", "Luxurious", "Underground",
  "Inclusive", "Rebellious", "Authentic", "Innovative", "Classic",
]

export function VoiceToneForm({ profile }: VoiceToneFormProps) {
  const [loading, setLoading] = useState(false)
  const voiceTone = profile?.voiceTone as any || {}

  const [personality, setPersonality] = useState<string[]>(voiceTone.personality || [])
  const [writingStyle, setWritingStyle] = useState(voiceTone.writingStyle || "casual")
  const [keywords, setKeywords] = useState(voiceTone.keywords?.join(", ") || "")
  const [avoidWords, setAvoidWords] = useState(voiceTone.avoidWords?.join(", ") || "")
  const [samplePhrases, setSamplePhrases] = useState(voiceTone.samplePhrases?.join("\n") || "")

  function togglePersonality(trait: string) {
    setPersonality((prev) =>
      prev.includes(trait)
        ? prev.filter((t) => t !== trait)
        : [...prev, trait]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    await updateBrandVoiceTone({
      voiceTone: {
        personality,
        writingStyle,
        keywords: keywords.split(",").map((k: string) => k.trim()).filter(Boolean),
        avoidWords: avoidWords.split(",").map((w: string) => w.trim()).filter(Boolean),
        samplePhrases: samplePhrases.split("\n").filter(Boolean),
      },
    })

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice & Tone</CardTitle>
        <CardDescription>
          Define how your brand communicates with your audience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personality Traits */}
          <div className="space-y-4">
            <div>
              <Label>Brand Personality</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Select traits that describe your brand's character.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_OPTIONS.map((trait) => (
                <Badge
                  key={trait}
                  variant={personality.includes(trait) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => togglePersonality(trait)}
                >
                  {trait}
                  {personality.includes(trait) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Writing Style */}
          <div className="space-y-2">
            <Label>Writing Style</Label>
            <Select value={writingStyle} onValueChange={setWritingStyle}>
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual & Conversational</SelectItem>
                <SelectItem value="professional">Professional & Polished</SelectItem>
                <SelectItem value="playful">Playful & Fun</SelectItem>
                <SelectItem value="edgy">Edgy & Bold</SelectItem>
                <SelectItem value="minimal">Minimal & Direct</SelectItem>
                <SelectItem value="luxurious">Luxurious & Refined</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The overall tone of your brand communications.
            </p>
          </div>

          {/* Keywords */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="keywords">Brand Keywords</Label>
              <Textarea
                id="keywords"
                value={keywords}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setKeywords(e.target.value)}
                placeholder="Enter keywords separated by commas&#10;e.g., exclusive, underground, authentic"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Words to use in your brand messaging.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="avoidWords">Words to Avoid</Label>
              <Textarea
                id="avoidWords"
                value={avoidWords}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAvoidWords(e.target.value)}
                placeholder="Enter words separated by commas&#10;e.g., cheap, basic, mainstream"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Words that don't align with your brand.
              </p>
            </div>
          </div>

          {/* Sample Phrases */}
          <div className="space-y-2">
            <Label htmlFor="samplePhrases">Sample On-Brand Phrases</Label>
            <Textarea
              id="samplePhrases"
              value={samplePhrases}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSamplePhrases(e.target.value)}
              placeholder="Enter example phrases, one per line&#10;e.g., Join the movement&#10;Experience the underground&#10;Where legends are made"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Example phrases that capture your brand voice.
            </p>
          </div>

          {/* Preview */}
          {(personality.length > 0 || samplePhrases) && (
            <div>
              <h3 className="text-sm font-medium mb-4">Voice Preview</h3>
              <div className="rounded-lg border p-6 space-y-4 bg-muted/30">
                {personality.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Personality:</span>
                    <p className="font-medium">{personality.join(" • ")}</p>
                  </div>
                )}
                {samplePhrases && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Sample copy:</span>
                    <div className="mt-2 space-y-2">
                      {samplePhrases.split("\n").filter(Boolean).map((phrase: string, i: number) => (
                        <p key={i} className="text-lg font-medium">"{phrase}"</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
