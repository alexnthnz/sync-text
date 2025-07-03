"use client"

import { useState, useTransition, Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, type RegisterFormData } from "@/schemas"
import { registerUser } from "@/actions"
import { PageLoading, Button, Input } from "@/components/ui"
import { Eye, EyeOff } from "lucide-react"

function RegisterForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    upperLower: false,
    number: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFieldError,
    watch
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })

  const password = watch("password", "")

  useEffect(() => {
    const checkRequirements = (pwd: string) => {
      setPasswordRequirements({
        length: pwd.length >= 6,
        upperLower: /(?=.*[a-z])(?=.*[A-Z])/.test(pwd),
        number: /(?=.*\d)/.test(pwd)
      })
    }

    checkRequirements(password)
  }, [password])

  const onSubmit = async (data: RegisterFormData) => {
    setError("")
    setSuccess("")

    startTransition(async () => {
      try {
        const result = await registerUser(data)

        if (result.success) {
          setSuccess(result.message)
          setTimeout(() => {
            router.push("/auth/signin?message=Registration successful! Please sign in.")
          }, 2000)
        } else {
          if (result.errors) {
            result.errors.forEach((error) => {
              if (error.field === "email") {
                setFieldError("email", { message: error.message })
              } else {
                setError(error.message)
              }
            })
          } else {
            setError(result.message)
          }
        }
      } catch {
        setError("An unexpected error occurred. Please try again.")
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                placeholder="Email address"
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("password")}
                  placeholder="Password"
                  aria-invalid={errors.password ? "true" : "false"}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  placeholder="Confirm password"
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div className="text-sm">
            <p className="text-gray-600 mb-2">Password requirements:</p>
            <ul className="space-y-2">
              <li className={`flex items-center transition-all duration-300 ease-in-out ${
                passwordRequirements.length 
                  ? 'text-green-600 transform scale-105' 
                  : 'text-gray-500'
              }`}>
                <span className={`mr-2 transition-all duration-300 ${
                  passwordRequirements.length ? 'text-green-500' : 'text-gray-400'
                }`}>
                  {passwordRequirements.length ? '✓' : '○'}
                </span>
                At least 6 characters long
              </li>
              <li className={`flex items-center transition-all duration-300 ease-in-out ${
                passwordRequirements.upperLower 
                  ? 'text-green-600 transform scale-105' 
                  : 'text-gray-500'
              }`}>
                <span className={`mr-2 transition-all duration-300 ${
                  passwordRequirements.upperLower ? 'text-green-500' : 'text-gray-400'
                }`}>
                  {passwordRequirements.upperLower ? '✓' : '○'}
                </span>
                Contains uppercase and lowercase letters
              </li>
              <li className={`flex items-center transition-all duration-300 ease-in-out ${
                passwordRequirements.number 
                  ? 'text-green-600 transform scale-105' 
                  : 'text-gray-500'
              }`}>
                <span className={`mr-2 transition-all duration-300 ${
                  passwordRequirements.number ? 'text-green-500' : 'text-gray-400'
                }`}>
                  {passwordRequirements.number ? '✓' : '○'}
                </span>
                Contains at least one number
              </li>
            </ul>
          </div>

          <div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full"
              size="lg"
            >
              {isPending ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Register() {
  return (
    <Suspense fallback={<PageLoading text="Loading registration..." />}>
      <RegisterForm />
    </Suspense>
  )
} 