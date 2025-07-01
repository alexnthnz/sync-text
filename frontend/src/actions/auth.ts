"use server"

import { Env } from "@/lib/env"
import { registerSchema, type RegisterFormData } from "@/schemas"

export type RegisterResult = {
  success: boolean
  message: string
  data?: {
    user: {
      id: string
      email: string
      username: string
    }
  }
  errors?: {
    field?: string
    message: string
  }[]
}

export async function registerUser(data: RegisterFormData): Promise<RegisterResult> {
  try {
    // Validate the data
    const validatedData = registerSchema.parse(data)
    
    // Make request to backend
    const response = await fetch(`${Env.BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: validatedData.email,
        password: validatedData.password,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      // Handle different error cases
      if (response.status === 409) {
        return {
          success: false,
          message: result.message || "User with this email already exists",
          errors: [{ field: "email", message: result.message || "Email already exists" }]
        }
      }
      
      if (response.status === 400) {
        return {
          success: false,
          message: result.message || "Invalid registration data",
          errors: result.errors || [{ message: result.message || "Invalid data" }]
        }
      }

      return {
        success: false,
        message: result.message || "Registration failed",
      }
    }

    return {
      success: true,
      message: result.message || "Registration successful",
      data: result.data,
    }
  } catch (error) {
    console.error("Registration error:", error)
    
    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return {
        success: false,
        message: "Please check your input and try again",
        errors: [{ message: "Invalid form data" }]
      }
    }

    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    }
  }
} 