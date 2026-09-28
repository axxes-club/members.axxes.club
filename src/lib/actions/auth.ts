"use server"

import { auth } from "@/lib/auth"

export async function requestPasswordReset(email: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (auth.api as any).forgetPassword({
      body: {
        // Stored lowercased, so fold before looking the account up.
        email: email.trim().toLowerCase(),
        redirectTo: "/reset-password",
      },
    })
    return { success: true }
  } catch (error) {
    console.error("Password reset request failed:", error)
    // Don't reveal if email exists or not - always return success
    return { success: true }
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    await auth.api.resetPassword({
      body: {
        token,
        newPassword,
      },
    })
    return { success: true }
  } catch (error) {
    console.error("Password reset failed:", error)
    return { success: false, error: "Failed to reset password. The link may have expired." }
  }
}
