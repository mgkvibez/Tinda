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
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string(),
  userType: z.enum(["Candidate", "Employer"], {
    required_error: "Please select an account type.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

type SignupFormInputs = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultUserType = searchParams?.get("type") === "employer" ? "Employer" : "Candidate";
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      userType: defaultUserType as "Candidate" | "Employer",
    },
  });

  const selectedUserType = watch("userType");

  const onSubmit = async (data: SignupFormInputs) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          userType: data.userType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Registration error:", errorData.message);
        alert(errorData.message || "Registration failed.");
        return;
      }

      console.log("Registration successful!");
      router.push("/login");
    } catch (error) {
      console.error("An unexpected error occurred:", error);
      alert("An unexpected error occurred. Please try again.");
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
      alert("Failed to sign in with Google.");
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
        <h3 className="text-3xl font-bold text-foreground mb-2">Join Tinda</h3>
        <p className="text-textSecondary">Create your account to get started.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            {...register("name")}
            className="mt-1"
          />
          {errors.name && (
            <p className="text-destructive text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

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

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            {...register("confirmPassword")}
            className="mt-1"
          />
          {errors.confirmPassword && (
            <p className="text-destructive text-sm mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div>
          <Label className="mb-3 block">Account Type</Label>
          <RadioGroup value={selectedUserType} onValueChange={(value) => setValue("userType", value as "Candidate" | "Employer")}>
            <div className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value="Candidate" id="candidate" />
              <Label htmlFor="candidate" className="cursor-pointer">I'm a Candidate</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Employer" id="employer" />
              <Label htmlFor="employer" className="cursor-pointer">I'm an Employer</Label>
            </div>
          </RadioGroup>
          {errors.userType && (
            <p className="text-destructive text-sm mt-1">{errors.userType.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full py-2.5 text-lg" disabled={isLoading}>
          {isLoading ? "Signing Up..." : "Sign Up"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-card text-textSecondary">Or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        Sign Up with Google
      </Button>

      <p className="text-center text-sm text-textSecondary">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Log In
        </Link>
      </p>
    </motion.div>
  );
}
