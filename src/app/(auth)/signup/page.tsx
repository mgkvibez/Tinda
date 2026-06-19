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
import { toast } from "react-hot-toast"; // Assuming react-hot-toast will be added later
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Will add this component via shadcn later

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

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultUserType = searchParams.get("type") === "employer" ? "Employer" : "Candidate";
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
      userType: defaultUserType,
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
        // toast.error(errorData.message || "Registration failed."); // Uncomment when toast is integrated
        console.error("Registration error:", errorData.message);
        alert(errorData.message || "Registration failed."); // Temporary alert
        return;
      }

      // toast.success("Registration successful! Please log in."); // Uncomment when toast is integrated
      console.log("Registration successful!");
      router.push("/login");
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
        <h3 className="text-3xl font-bold text-foreground mb-2">Join MatchHire</h3>
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
          <Label className="mb-2 block">Account Type</Label>
          <RadioGroup
            defaultValue={defaultUserType}
            onValueChange={(value: "Candidate" | "Employer") => setValue("userType", value)}
            className="flex space-x-4 mt-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Candidate" id="candidate-type" />
              <Label htmlFor="candidate-type">Candidate</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Employer" id="employer-type" />
              <Label htmlFor="employer-type">Employer</Label>
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
        Sign up with Google
      </Button>

      <p className="text-center text-sm text-textSecondary mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          Log In
        </Link>
      </p>
    </motion.div>
  );
}
