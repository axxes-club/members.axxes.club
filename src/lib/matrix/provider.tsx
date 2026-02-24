"use client"

import * as React from "react"
import { type MatrixClient } from "matrix-js-sdk"
import {
  createMatrixClient,
  initializeMatrixClient,
  stopMatrixClient,
  getRooms,
  getRoom,
  type MatrixRoomData,
  type MatrixMessage,
  transformMessage,
} from "./client"

// Types
interface MatrixContextValue {
  client: MatrixClient | null
  isInitialized: boolean
  isSynced: boolean
  rooms: MatrixRoomData[]
  channels: MatrixRoomData[]
  dms: MatrixRoomData[]
  spaces: MatrixRoomData[]
  currentRoom: MatrixRoomData | null
  messages: MatrixMessage[]
  error: Error | null
  login: (userId: string, accessToken: string, deviceId?: string) => Promise<void>
  logout: () => Promise<void>
  setCurrentRoom: (roomId: string | null) => void
  refreshRooms: () => void
}

const MatrixContext = React.createContext<MatrixContextValue | null>(null)

export function useMatrix() {
  const context = React.useContext(MatrixContext)
  if (!context) {
    throw new Error("useMatrix must be used within a MatrixProvider")
  }
  return context
}

interface MatrixProviderProps {
  children: React.ReactNode
  userId?: string
  accessToken?: string
  deviceId?: string
}

export function MatrixProvider({
  children,
  userId,
  accessToken,
  deviceId,
}: MatrixProviderProps) {
  const [client, setClient] = React.useState<MatrixClient | null>(null)
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [isSynced, setIsSynced] = React.useState(false)
  const [rooms, setRooms] = React.useState<MatrixRoomData[]>([])
  const [currentRoom, setCurrentRoomState] = React.useState<MatrixRoomData | null>(null)
  const [messages, setMessages] = React.useState<MatrixMessage[]>([])
  const [error, setError] = React.useState<Error | null>(null)

  // Derived values
  const channels = React.useMemo(() => 
    rooms.filter((r) => !r.isSpace && !r.isDirect),
    [rooms]
  )
  const dms = React.useMemo(() => 
    rooms.filter((r) => r.isDirect),
    [rooms]
  )
  const spaces = React.useMemo(() => 
    rooms.filter((r) => r.isSpace),
    [rooms]
  )

  // Login function
  const login = React.useCallback(async (uid: string, token: string, did?: string) => {
    try {
      setError(null)
      const matrixClient = createMatrixClient(uid, token, did || "AXXES_WEB")
      
      await initializeMatrixClient(
        matrixClient,
        (state) => {
          setIsSynced(state === "PREPARED")
        },
        () => {
          // Room updated - refresh rooms
          if (matrixClient) {
            setRooms(getRooms(matrixClient))
          }
        },
        (event) => {
          // New event - update messages if in current room
          if (event.getType() === "m.room.message" && currentRoom) {
            const msg = transformMessage(event, currentRoom.id)
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        }
      )

      setClient(matrixClient)
      setIsInitialized(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to login to Matrix"))
      throw err
    }
  }, [currentRoom])

  // Logout function
  const logout = React.useCallback(async () => {
    if (client) {
      await stopMatrixClient(client)
      setClient(null)
      setIsInitialized(false)
      setIsSynced(false)
      setRooms([])
      setMessages([])
      setCurrentRoomState(null)
    }
  }, [client])

  // Set current room
  const setCurrentRoom = React.useCallback((roomId: string | null) => {
    if (!client || !roomId) {
      setCurrentRoomState(null)
      setMessages([])
      return
    }

    const room = getRoom(client, roomId)
    setCurrentRoomState(room)

    // Load messages for the room
    const roomObj = client.getRoom(roomId)
    if (roomObj) {
      const timelineSet = roomObj.getUnfilteredTimelineSet()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const events: any[] = (timelineSet as any).getEvents() || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messageEvents = events.filter((e: any) => e.getType() === "m.room.message")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roomMessages = messageEvents.map((e: any) => transformMessage(e, roomId))
      setMessages(roomMessages)
    }
  }, [client])

  // Refresh rooms
  const refreshRooms = React.useCallback(() => {
    if (client) {
      setRooms(getRooms(client))
    }
  }, [client])

  // Auto-login if credentials provided
  React.useEffect(() => {
    if (userId && accessToken && !isInitialized) {
      login(userId, accessToken, deviceId)
    }
  }, [userId, accessToken, deviceId, isInitialized, login])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (client) {
        stopMatrixClient(client)
      }
    }
  }, [client])

  const value: MatrixContextValue = {
    client,
    isInitialized,
    isSynced,
    rooms,
    channels,
    dms,
    spaces,
    currentRoom,
    messages,
    error,
    login,
    logout,
    setCurrentRoom,
    refreshRooms,
  }

  return (
    <MatrixContext.Provider value={value}>
      {children}
    </MatrixContext.Provider>
  )
}

// Hook for getting a specific room's messages with real-time updates
export function useRoomMessages(roomId: string | null) {
  const { client, messages, setCurrentRoom } = useMatrix()
  const [roomMessages, setRoomMessages] = React.useState<MatrixMessage[]>([])

  React.useEffect(() => {
    if (!roomId || !client) {
      setRoomMessages([])
      return
    }

    setCurrentRoom(roomId)

    // The messages will be updated via the context when new events come in
    return () => {
      setCurrentRoom(null)
    }
  }, [roomId, client, setCurrentRoom])

  React.useEffect(() => {
    if (messages.length > 0) {
      setRoomMessages(messages)
    }
  }, [messages])

  return roomMessages
}

// Hook for typing indicators
export function useTypingUsers(roomId: string | null) {
  const { client } = useMatrix()
  const [typingUsers, setTypingUsers] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!roomId || !client) {
      setTypingUsers([])
      return
    }

    const room = client.getRoom(roomId)
    if (!room) return

    const updateTypingUsers = () => {
      const typingState = room.currentState.getStateEvents("m.typing", "")
      if (typingState) {
        const content = typingState.getContent<{ user_ids: string[] }>()
        setTypingUsers(
          content.user_ids.filter((uid) => uid !== client.getUserId())
        )
      }
    }

    // Initial check
    updateTypingUsers()

    // Listen for typing events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(client as any).on("Room.timeline", () => {
      updateTypingUsers()
    })

    return () => {
      setTypingUsers([])
    }
  }, [roomId, client])

  return typingUsers
}

// Hook for user presence
export function useUserPresence() {
  const { client } = useMatrix()
  const [presence, setPresence] = React.useState<
    Map<string, "online" | "offline" | "unavailable">
  >(new Map())

  React.useEffect(() => {
    if (!client) return

    const updatePresence = () => {
      const users = client.getUsers()
      const newPresence = new Map<string, "online" | "offline" | "unavailable">()
      users.forEach((user) => {
        newPresence.set(user.userId, user.presence as "online" | "offline" | "unavailable")
      })
      setPresence(newPresence)
    }

    // Initial update
    updatePresence()

    // Listen for presence changes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(client as any).on("User.presence", updatePresence)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(client as any).off("User.presence", updatePresence)
    }
  }, [client])

  return presence
}