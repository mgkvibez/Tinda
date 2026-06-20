"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast"; // Assuming react-hot-toast will be added later

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (result?.error) {
        // toast.error(result.error); // Uncomment when toast is integrated
        console.error("Login error:", result.error);
        alert(result.error); // Temporary alert
      } else {
        // toast.success("Logged in successfully!"); // Uncomment when toast is integrated
        console.log("Login successful!");
        router.push("/"); // Redirect to home, which will then redirect to dashboard
      }
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      // toast.error("An unexpected error occurred. Please try again."); // Uncomment when toast is integrated
      alert("An unexpected error occurred. Please try again."); // Temporary alert
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      console.error("Google sign-in error:", error);
      // toast.error("Failed to sign in with Google."); // Uncomment when toast is integrated
      alert("Failed to sign in with Google."); // Temporary alert
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md space-y-6"
    >
      <div className="text-center">
        <h3 className="text-3xl font-bold text-foreground mb-2">Welcome Back!</h3>
        <p className="text-textSecondary">Sign in to your Tinda account.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@example.com"
            {...register("email")}
            className="mt-1"
          />
          {errors.email && (
            <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
            className="mt-1"
          />
          {errors.password && (
            <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        <div className="flex justify-end text-sm">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full py-2.5 text-lg" disabled={isLoading}>
          {isLoading ? "Logging In..." : "Log In"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-textSecondary">Or continue with</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full py-2.5 text-lg flex items-center justify-center gap-2"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.0003 4.75C14.0213 4.75 15.8013 5.466 17.1873 6.807L20.0493 3.945C18.0323 1.918 15.2533 0.75 12.0003 0.75C7.72933 0.75 4.02133 3.142 2.22133 6.621L6.00033 9.591C6.95033 7.001 9.22133 4.75 12.0003 4.75Z"
            fill="#EA4335"
          />
          <path
            d="M23.25 12.2499C23.25 11.4899 23.182 10.7599 23.051 10.0499H12.25V14.2499H18.72C18.453 15.7699 17.583 17.0599 16.322 17.9199L20.11 20.8799C22.32 18.8099 23.25 15.7999 23.25 12.2499Z"
            fill="#4285F4"
          />
          <path
            d="M6.00033 14.8901C5.70033 14.0901 5.53133 13.1901 5.53133 12.2401C5.53133 11.2901 5.70033 10.3901 6.00033 9.5901L2.22133 6.6201C1.10033 8.8401 0.5 10.4901 0.5 12.2401C0.5 13.9901 1.10033 15.6401 2.22133 17.8601L6.00033 14.8901Z"
            fill="#FBBC05"
          />
          <path
            d="M12.25 23.7499C15.253 23.7499 17.801 22.7499 19.66 21.1099L16.322 17.9199C15.442 18.5099 14.093 18.9999 12.25 18.9999C9.221 18.9999 6.95033 17.0099 6.00033 14.8999L2.22133 17.8699C4.02133 21.3499 7.729 23.7499 12.25 23.7499Z"
            fill="#34A853"
          />
        </svg>
        Sign in with Google
      </Button>

      <p className="text-center text-sm text-textSecondary mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-primary hover:underline font-medium">
          Sign Up
        </Link>
      </p>
    </motion.div>
  );
}
