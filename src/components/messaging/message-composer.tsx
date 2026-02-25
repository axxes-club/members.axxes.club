"use client"

import * as React from "react"
import { 
  Send, 
  Paperclip, 
  Smile, 
  Image, 
  File, 
  X,
  Loader2,
  AtSign
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useMatrix } from "@/lib/matrix"
import { sendTextMessage, sendTypingNotification, uploadFile, sendImageMessage, sendFileMessage } from "@/lib/matrix/client"

interface MessageComposerProps {
  roomId: string | null
  onMessageSent?: () => void
}

// Common emoji for quick reactions
const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "🔥", "🙏", "💯"]

export function MessageComposer({ roomId, onMessageSent }: MessageComposerProps) {
  const { client, currentRoom, isInitialized } = useMatrix()
  const [message, setMessage] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([])
  
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Focus textarea when room changes
  React.useEffect(() => {
    textareaRef.current?.focus()
  }, [roomId])

  // Handle typing indicator
  const handleTyping = React.useCallback(async () => {
    if (!client || !roomId) return
    
    // Send typing notification
    await sendTypingNotification(client, roomId, true)
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      if (client && roomId) {
        await sendTypingNotification(client, roomId, false)
      }
    }, 3000)
  }, [client, roomId])

  // Handle message change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    handleTyping()
  }

  // Handle send message
  const handleSend = async () => {
    if (!message.trim() || !client || !roomId || isSending) return
    
    setIsSending(true)
    
    try {
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      await sendTypingNotification(client, roomId, false)
      
      // Send the message
      await sendTextMessage(client, roomId, message.trim())
      
      // Clear input
      setMessage("")
      onMessageSent?.()
      
      // Re-focus textarea
      textareaRef.current?.focus()
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsSending(false)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPendingFiles((prev) => [...prev, ...files])
    e.target.value = "" // Reset input
  }

  // Remove pending file
  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Upload and send files
  const uploadFiles = async () => {
    if (!client || !roomId || pendingFiles.length === 0) return
    
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i]
        setUploadProgress(((i + 1) / pendingFiles.length) * 100)
        
        // Upload to Matrix
        const mxcUrl = await uploadFile(client, file)
        
        // Determine file type and send appropriate message
        if (file.type.startsWith("image/")) {
          await sendImageMessage(client, roomId, file, mxcUrl)
        } else {
          await sendFileMessage(client, roomId, file, mxcUrl)
        }
      }
      
      setPendingFiles([])
      onMessageSent?.()
    } catch (error) {
      console.error("Failed to upload files:", error)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Insert emoji
  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji)
    textareaRef.current?.focus()
  }

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [message])

  if (!isInitialized || !roomId) {
    return null
  }

  return (
    <div className="border-t bg-background p-4">
      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="mb-3 space-y-2">
          {pendingFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
            >
              {file.type.startsWith("image/") ? (
                <Image className="h-4 w-4 text-muted-foreground" />
              ) : (
                <File className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removePendingFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={uploadFiles}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading... {Math.round(uploadProgress)}%
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendingFiles([])}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* File attachment */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isSending}>
              <Paperclip className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <File className="h-4 w-4 mr-2" />
              Upload file
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*"
                fileInputRef.current.click()
              }
            }}>
              <Image className="h-4 w-4 mr-2" />
              Upload image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Emoji picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isSending}>
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2">
            <div className="grid grid-cols-8 gap-1">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Text input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${currentRoom?.name || "..."}`}
            disabled={isSending || isUploading}
            className="min-h-[40px] max-h-[200px] resize-none pr-10"
            rows={1}
          />
          <div className="absolute right-2 bottom-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              disabled={!message.trim()}
            >
              <AtSign className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending || isUploading}
          size="icon"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Typing hint */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </span>
        {message.length > 0 && (
          <span className={cn(
            "text-[10px]",
            message.length > 1000 ? "text-warning" : "text-muted-foreground"
          )}>
            {message.length}
          </span>
        )}
      </div>
    </div>
  )
}