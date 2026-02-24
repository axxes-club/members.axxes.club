"use client"

import * as React from "react"
import { useMatrix } from "./provider"
import { type MatrixRoomData } from "./client"

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications")
    return "denied"
  }

  if (Notification.permission === "granted") {
    return "granted"
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()
    return permission
  }

  return Notification.permission
}

// Show a notification
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (Notification.permission !== "granted") {
    return null
  }

  const notification = new Notification(title, {
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    ...options,
  })

  return notification
}

// Show a message notification
export function showMessageNotification(
  room: MatrixRoomData,
  senderName: string,
  message: string,
  onClick?: () => void
): Notification | null {
  const notification = showNotification(`${senderName} in ${room.name}`, {
    body: message.length > 100 ? message.slice(0, 100) + "..." : message,
    icon: room.avatarUrl || "/favicon.ico",
    tag: room.id, // Group notifications by room
  })

  if (notification && onClick) {
    notification.onclick = () => {
      onClick()
      notification.close()
    }
  }

  return notification
}

// Hook for managing notifications
export function useNotifications() {
  const { currentRoom, rooms } = useMatrix()
  const [permission, setPermission] = React.useState<NotificationPermission>("default")
  const [enabled, setEnabled] = React.useState(true)
  const [soundEnabled, setSoundEnabled] = React.useState(true)

  // Check initial permission state
  React.useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission)
      setEnabled(Notification.permission === "granted")
    }
  }, [])

  // Request permission
  const requestPermission = React.useCallback(async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    setEnabled(result === "granted")
    return result
  }, [])

  // Toggle notifications
  const toggleNotifications = React.useCallback(async () => {
    if (permission === "granted") {
      setEnabled(!enabled)
    } else {
      await requestPermission()
    }
  }, [permission, enabled, requestPermission])

  // Toggle sound
  const toggleSound = React.useCallback(() => {
    setSoundEnabled(!soundEnabled)
  }, [soundEnabled])

  // Play notification sound
  const playSound = React.useCallback(() => {
    if (!soundEnabled) return
    
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"
      gainNode.gain.value = 0.1

      oscillator.start()
      setTimeout(() => oscillator.stop(), 100)
    } catch {
      // Ignore audio errors
    }
  }, [soundEnabled])

  return {
    permission,
    enabled,
    soundEnabled,
    requestPermission,
    toggleNotifications,
    toggleSound,
    playSound,
    showNotification,
    showMessageNotification,
  }
}

// Hook for auto-showing notifications for background messages
export function useAutoNotifications() {
  const { client, currentRoom, rooms } = useMatrix()
  const { enabled, showMessageNotification, playSound } = useNotifications()
  const lastNotificationTime = React.useRef<number>(0)

  React.useEffect(() => {
    if (!client || !enabled) return

    // Listen for new messages
    const handleEvent = (event: { getType: () => string; getTs: () => number; getContent: () => { body?: string }; getSender: () => string; getRoomId: () => string }) => {
      if (event.getType() !== "m.room.message") return
      
      // Don't notify for own messages
      if (event.getSender() === client.getUserId()) return
      
      // Don't notify if viewing the room
      if (currentRoom?.id === event.getRoomId()) return
      
      // Throttle notifications (max 1 per second)
      const now = Date.now()
      if (now - lastNotificationTime.current < 1000) return
      lastNotificationTime.current = now

      // Get room info
      const room = rooms.find((r) => r.id === event.getRoomId())
      if (!room) return

      // Get sender name
      const member = room.members.find((m) => m.userId === event.getSender())
      const senderName = member?.displayName || "Someone"

      // Get message content
      const content = event.getContent()
      const message = content.body || "New message"

      // Show notification
      showMessageNotification(room, senderName, message)
      
      // Play sound
      playSound()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(client as any).on("Room.timeline", handleEvent)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(client as any).off("Room.timeline", handleEvent)
    }
  }, [client, enabled, currentRoom, rooms, showMessageNotification, playSound])
}