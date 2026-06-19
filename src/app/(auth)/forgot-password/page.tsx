"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
// import { toast } from "react-hot-toast"; // Assuming react-hot-toast will be added later

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

type ForgotPasswordFormInputs = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormInputs>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormInputs) => {
    setIsLoading(true);
    setMessage("");
    try {
      // In a real application, you would send an API request here
      // to trigger a password reset email.
      // For now, this is a placeholder.
      console.log("Password reset requested for:", data.email);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setMessage("If an account with that email exists, a password reset link has been sent.");
      // toast.success("Password reset link sent!"); // Uncomment when toast is integrated
    } catch (error) {
      console.error("Forgot password error:", error);
      setMessage("An error occurred. Please try again.");
      // toast.error("An error occurred. Please try again."); // Uncomment when toast is integrated
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
        <h3 className="text-3xl font-bold text-foreground mb-2">Forgot Password?</h3>
        <p className="text-textSecondary">
          Enter your email and we'll send you a link to reset your password.
        </p>
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
        {message && (
          <p className="text-primary text-sm text-center">{message}</p>
        )}
        <Button type="submit" className="w-full py-2.5 text-lg" disabled={isLoading}>
          {isLoading ? "Sending Link..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="text-center text-sm text-textSecondary mt-6">
        Remember your password?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Log In
        </Link>
      </p>
    </motion.div>
  );
}
