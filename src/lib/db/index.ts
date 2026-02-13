import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

// Use a placeholder during build if DATABASE_URL is not available
const databaseUrl = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@placeholder/placeholder"
const sql = neon(databaseUrl)

export const db = drizzle(sql, { schema })

export type Database = typeof db
