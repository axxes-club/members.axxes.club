import * as Matrix from "matrix-js-sdk"
import { type MatrixClient, type Room, type RoomEvent, type MatrixEvent, type EventTimeline } from "matrix-js-sdk"

// Matrix configuration
const HOMESERVER_URL = "https://matrix.org"

// Types
export interface MatrixUserProfile {
  userId: string
  displayName: string | null
  avatarUrl: string | null
  presence: "online" | "offline" | "unavailable"
}

export interface MatrixMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderAvatar: string | null
  content: string
  contentType: "text" | "image" | "file" | "audio" | "video"
  timestamp: number
  isEdited: boolean
  isRedacted: boolean
  reactions: Map<string, string[]> // emoji -> userIds
  threadId?: string
  inReplyTo?: string
}

export interface MatrixRoomData {
  id: string
  name: string
  topic: string | null
  avatarUrl: string | null
  isEncrypted: boolean
  isSpace: boolean
  isDirect: boolean
  unreadCount: number
  highlightCount: number
  notificationCount: number
  members: MatrixUserProfile[]
  lastMessage?: MatrixMessage
}

// Matrix client singleton per user
let matrixClient: MatrixClient | null = null

/**
 * Create a new Matrix client with the given access token
 */
export function createMatrixClient(
  userId: string,
  accessToken: string,
  deviceId?: string
): MatrixClient {
  const client = Matrix.createClient({
    baseUrl: HOMESERVER_URL,
    accessToken,
    userId,
    deviceId: deviceId || "AXXES_WEB",
    timelineSupport: true,
    cryptoStore: new Matrix.MemoryCryptoStore(),
  })

  return client
}

/**
 * Get or create the Matrix client singleton
 */
export function getMatrixClient(): MatrixClient | null {
  return matrixClient
}

/**
 * Set the Matrix client singleton
 */
export function setMatrixClient(client: MatrixClient | null): void {
  matrixClient = client
}

/**
 * Initialize the Matrix client and start syncing
 */
export async function initializeMatrixClient(
  client: MatrixClient,
  onSync?: (state: string) => void,
  onRoom?: (room: Room) => void,
  onEvent?: (event: MatrixEvent) => void
): Promise<void> {
  // Set up event listeners
  client.on(Matrix.ClientEvent.Sync, (state: string) => {
    onSync?.(state)
  })

  client.on(Matrix.RoomEvent.Timeline, (event: MatrixEvent, room: Room | undefined) => {
    if (room) {
      onRoom?.(room)
      onEvent?.(event)
    }
  })

  client.on(Matrix.RoomEvent.Name, (room: Room) => {
    onRoom?.(room)
  })

  // Start the client
  await client.startClient({
    initialSyncLimit: 20,
    includeArchivedRooms: false,
  })

  // Set as global singleton
  setMatrixClient(client)
}

/**
 * Stop and cleanup the Matrix client
 */
export async function stopMatrixClient(client: MatrixClient): Promise<void> {
  client.stopClient()
  if (matrixClient === client) {
    setMatrixClient(null)
  }
}

/**
 * Register a new Matrix user
 */
export async function registerMatrixUser(
  username: string,
  password: string
): Promise<{ userId: string; accessToken: string; deviceId: string }> {
  const client = Matrix.createClient({
    baseUrl: HOMESERVER_URL,
  })

  try {
    const response = await client.register(username, password, null, {
      type: "m.login.dummy",
    })
    
    return {
      userId: response.user_id,
      accessToken: response.access_token || "",
      deviceId: response.device_id || "",
    }
  } catch (error: unknown) {
    // Check if user already exists
    const matrixError = error as { errcode?: string; error?: string }
    if (matrixError.errcode === "M_USER_IN_USE") {
      // User exists, try to login instead
      const loginResponse = await loginMatrixUser(username, password)
      return loginResponse
    }
    throw error
  }
}

/**
 * Login to Matrix with username/password
 */
export async function loginMatrixUser(
  username: string,
  password: string
): Promise<{ userId: string; accessToken: string; deviceId: string }> {
  const client = Matrix.createClient({
    baseUrl: HOMESERVER_URL,
  })

  const response = await client.loginWithPassword(username, password)
  
  return {
    userId: response.user_id,
    accessToken: response.access_token || "",
    deviceId: response.device_id || "",
  }
}

/**
 * Login with existing token (for restoring session)
 */
export async function loginWithToken(
  userId: string,
  accessToken: string,
  deviceId?: string
): Promise<MatrixClient> {
  const client = createMatrixClient(userId, accessToken, deviceId)
  return client
}

/**
 * Get all rooms for the current user
 */
export function getRooms(client: MatrixClient): MatrixRoomData[] {
  const rooms = client.getRooms()
  return rooms.map((room) => transformRoom(client, room))
}

/**
 * Get rooms filtered by type
 */
export function getRoomsByType(
  client: MatrixClient,
  type: "space" | "channel" | "dm"
): MatrixRoomData[] {
  const rooms = client.getRooms()
  return rooms
    .filter((room) => {
      const isSpace = room.isSpaceRoom()
      const directData = client.getAccountData("m.direct" as never)
      const directMap = directData?.getContent<Record<string, string[]>>() || {}
      const isDirect = Object.values(directMap).flat().includes(room.roomId)

      if (type === "space") return isSpace
      if (type === "dm") return isDirect && !isSpace
      return !isSpace && !isDirect
    })
    .map((room) => transformRoom(client, room))
}

/**
 * Get a specific room by ID
 */
export function getRoom(client: MatrixClient, roomId: string): MatrixRoomData | null {
  const room = client.getRoom(roomId)
  return room ? transformRoom(client, room) : null
}

/**
 * Transform a Matrix Room to our simplified type
 */
function transformRoom(client: MatrixClient, room: Room): MatrixRoomData {
  const timeline = room.getLiveTimeline()
  const events = timeline.getEvents()
  const lastMessageEvent = events
    .filter((e) => e.getType() === "m.room.message")
    .pop()

  const directData = client.getAccountData("m.direct" as never)
  const directRoomsMap = directData?.getContent<Record<string, string[]>>()
  const isDirect = directRoomsMap
    ? Object.values(directRoomsMap).flat().includes(room.roomId)
    : false

  return {
    id: room.roomId,
    name: room.name || room.roomId,
    topic: room.currentState.getStateEvents("m.room.topic", "")?.getContent().topic || null,
    avatarUrl: room.getMxcAvatarUrl() || null,
    isEncrypted: room.hasEncryptionStateEvent(),
    isSpace: room.isSpaceRoom(),
    isDirect,
    unreadCount: room.getUnreadNotificationCount() || 0,
    highlightCount: room.getUnreadNotificationCount("highlight" as never) || 0,
    notificationCount: room.getUnreadNotificationCount("notification" as never) || 0,
    members: room.getJoinedMembers().map((member) => ({
      userId: member.userId,
      displayName: member.name || member.userId,
      avatarUrl: member.getMxcAvatarUrl() || null,
      presence: (member.user?.presence || "offline") as "online" | "offline" | "unavailable",
    })),
    lastMessage: lastMessageEvent
      ? transformMessage(lastMessageEvent, room.roomId)
      : undefined,
  }
}

/**
 * Transform a Matrix event to our Message type
 */
export function transformMessage(event: MatrixEvent, roomId: string): MatrixMessage {
  const content = event.getContent()
  const sender = event.sender
  
  // Note: Reactions would require additional API calls to get related events
  // For now, we'll return an empty map - reactions can be added later
  const reactions = new Map<string, string[]>()

  let contentType: MatrixMessage["contentType"] = "text"
  if (content.msgtype === "m.image") contentType = "image"
  else if (content.msgtype === "m.file") contentType = "file"
  else if (content.msgtype === "m.audio") contentType = "audio"
  else if (content.msgtype === "m.video") contentType = "video"

  return {
    id: event.getId() || "",
    roomId,
    senderId: event.getSender() || "",
    senderName: sender?.name || event.getSender() || "",
    senderAvatar: sender?.getMxcAvatarUrl() || null,
    content: content.body || "",
    contentType,
    timestamp: event.getTs() || 0,
    isEdited: !!content["m.new_content"],
    isRedacted: event.isRedacted(),
    reactions,
    threadId: content["m.relates_to"]?.event_id,
    inReplyTo: content["m.relates_to"]?.["m.in_reply_to"]?.event_id,
  }
}

/**
 * Send a text message to a room
 */
export async function sendTextMessage(
  client: MatrixClient,
  roomId: string,
  text: string,
  options?: {
    replyTo?: string
    threadId?: string
  }
): Promise<string> {
  let content: Record<string, unknown> = {
    msgtype: "m.text",
    body: text,
  }

  // Handle reply
  if (options?.replyTo) {
    const replyEvent = client.fetchRoomEvent(roomId, options.replyTo)
    content = {
      ...content,
      "m.relates_to": {
        "m.in_reply_to": {
          event_id: options.replyTo,
        },
      },
    }
  }

  // Handle thread
  if (options?.threadId) {
    content = {
      ...content,
      "m.relates_to": {
        event_id: options.threadId,
        rel_type: "m.thread",
      },
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).sendEvent(roomId, "m.room.message", content)
  return response.event_id
}

/**
 * Send a reaction to a message
 */
export async function sendReaction(
  client: MatrixClient,
  roomId: string,
  eventId: string,
  emoji: string
): Promise<string> {
  const content = {
    "m.relates_to": {
      event_id: eventId,
      key: emoji,
      rel_type: "m.annotation",
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).sendEvent(roomId, "m.reaction", content)
  return response.event_id
}

/**
 * Redact (delete) a message
 */
export async function redactMessage(
  client: MatrixClient,
  roomId: string,
  eventId: string,
  reason?: string
): Promise<string> {
  const response = await client.redactEvent(roomId, eventId, undefined, reason ? { reason } : undefined)
  return response.event_id
}

/**
 * Get messages for a room (with pagination)
 */
export async function getRoomMessages(
  client: MatrixClient,
  roomId: string,
  options?: {
    limit?: number
    from?: string
    dir?: "f" | "b"
  }
): Promise<{
  messages: MatrixMessage[]
  end: string | null
  start: string | null
}> {
  const room = client.getRoom(roomId)
  if (!room) {
    return { messages: [], end: null, start: null }
  }

  const timelineSet = room.getUnfilteredTimelineSet()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = (timelineSet as any).getEvents() || []
  
  let filteredEvents = events.filter((e: any) => e.getType() === "m.room.message")
  
  if (options?.from) {
    // Handle pagination - for now, return from memory
    // In production, you'd use client.createMessagesRequest for proper pagination
  }

  const messages = filteredEvents
    .slice(-(options?.limit || 50))
    .map((e) => transformMessage(e, roomId))

  return {
    messages,
    end: null,
    start: null,
  }
}

/**
 * Create a new room
 */
export async function createRoom(
  client: MatrixClient,
  options: {
    name: string
    topic?: string
    isPublic?: boolean
    isDirect?: boolean
    invite?: string[]
  }
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).createRoom({
    name: options.name,
    topic: options.topic,
    preset: options.isPublic ? "public_chat" : "private_chat",
    visibility: options.isPublic ? "public" : "private",
    invite: options.invite,
    is_direct: options.isDirect,
    initial_state: [],
  })

  return response.room_id
}

/**
 * Create a Space (for tenant workspaces)
 */
export async function createSpace(
  client: MatrixClient,
  name: string,
  options?: {
    topic?: string
    avatarUrl?: string
  }
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).createRoom({
    name,
    topic: options?.topic,
    preset: "private_chat",
    visibility: "private",
    creation_content: {
      type: "m.space",
    },
    initial_state: options?.avatarUrl
      ? [
          {
            type: "m.room.avatar",
            state_key: "",
            content: {
              url: options.avatarUrl,
            },
          },
        ]
      : [],
  })

  return response.room_id
}

/**
 * Add a room to a space
 */
export async function addRoomToSpace(
  client: MatrixClient,
  spaceId: string,
  roomId: string,
  isSuggested = false
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).sendStateEvent(spaceId, "m.space.child", {
    via: [HOMESERVER_URL.replace("https://", "").replace("http://", "")],
    suggested: isSuggested,
  }, roomId)
}

/**
 * Invite a user to a room
 */
export async function inviteUserToRoom(
  client: MatrixClient,
  roomId: string,
  userId: string
): Promise<void> {
  await client.invite(roomId, userId)
}

/**
 * Join a room
 */
export async function joinRoom(
  client: MatrixClient,
  roomId: string
): Promise<void> {
  await client.joinRoom(roomId)
}

/**
 * Leave a room
 */
export async function leaveRoom(
  client: MatrixClient,
  roomId: string
): Promise<void> {
  await client.leave(roomId)
}

/**
 * Set user presence
 */
export async function setPresence(
  client: MatrixClient,
  presence: "online" | "offline" | "unavailable",
  statusMessage?: string
): Promise<void> {
  await client.setPresence({
    presence,
    status_msg: statusMessage,
  })
}

/**
 * Upload a file to Matrix
 */
export async function uploadFile(
  client: MatrixClient,
  file: File
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).upload(file, {
    name: file.name,
    type: file.type,
  })
  return response.content_uri
}

/**
 * Send an image message
 */
export async function sendImageMessage(
  client: MatrixClient,
  roomId: string,
  file: File,
  mxcUrl: string
): Promise<string> {
  const content = {
    msgtype: "m.image",
    body: file.name,
    url: mxcUrl,
    info: {
      size: file.size,
      mimetype: file.type,
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).sendEvent(roomId, "m.room.message", content)
  return response.event_id
}

/**
 * Send a file message
 */
export async function sendFileMessage(
  client: MatrixClient,
  roomId: string,
  file: File,
  mxcUrl: string
): Promise<string> {
  const content = {
    msgtype: "m.file",
    body: file.name,
    url: mxcUrl,
    info: {
      size: file.size,
      mimetype: file.type,
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).sendEvent(roomId, "m.room.message", content)
  return response.event_id
}

/**
 * Get the MXC URL for a thumbnail
 */
export function getThumbnailUrl(
  client: MatrixClient,
  mxcUrl: string,
  width: number,
  height: number
): string | null {
  return client.mxcUrlToHttp(mxcUrl, width, height, "scale")
}

/**
 * Get the HTTP URL for an MXC URL
 */
export function getHttpUrl(
  client: MatrixClient,
  mxcUrl: string
): string | null {
  return client.mxcUrlToHttp(mxcUrl)
}

/**
 * Search messages
 */
export async function searchMessages(
  client: MatrixClient,
  query: string,
  options?: {
    rooms?: string[]
    limit?: number
  }
): Promise<MatrixMessage[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client as any).search({
    body: {
      search_categories: {
        room_events: {
          search_term: query,
          filter: {
            rooms: options?.rooms,
            limit: options?.limit || 50,
          },
        },
      },
    },
  })

  const results = response.search_categories?.room_events?.results || []
  
  return results.map((result: { result: { events: MatrixEvent[] } }) => {
    const event = result.result.events[0]
    return transformMessage(event, (event as any).room_id || "")
  })
}

/**
 * Set room notifications
 */
export async function setRoomNotifications(
  client: MatrixClient,
  roomId: string,
  mode: "all" | "mentions" | "none"
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).setRoomAccountData(roomId, "m.push_rules", {
    global: {
      room: [
        {
          rule_id: roomId,
          actions: mode === "none" ? ["dont_notify"] : ["notify"],
        },
      ],
    },
  })
}

/**
 * Get typing users in a room
 */
export function getTypingUsers(client: MatrixClient, roomId: string): string[] {
  const room = client.getRoom(roomId)
  if (!room) return []
  
  const typing = room.currentState.getStateEvents("m.typing", "")
  if (!typing) return []
  
  const content = typing.getContent<{ user_ids: string[] }>()
  return content.user_ids.filter((userId) => userId !== client.getUserId())
}

/**
 * Send typing notification
 */
export async function sendTypingNotification(
  client: MatrixClient,
  roomId: string,
  isTyping: boolean,
  timeout = 30000
): Promise<void> {
  await client.sendTyping(roomId, isTyping, timeout)
}

/**
 * Set account data (for storing preferences)
 */
export async function setAccountData<T>(
  client: MatrixClient,
  key: string,
  data: T
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).setAccountData(key, data)
}

/**
 * Get account data
 */
export function getAccountData<T>(
  client: MatrixClient,
  key: string
): T | null {
  const event = client.getAccountData(key as never)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (event?.getContent() as any) as T || null
}
