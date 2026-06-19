"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
// import { toast } from "react-hot-toast"; // Assuming react-hot-toast will be added later

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setVerificationStatus("error");
        setMessage("No verification token found.");
        // toast.error("No verification token found."); // Uncomment when toast is integrated
        return;
      }

      try {
        // In a real application, you would send an API request here
        // to verify the email using the token.
        // For now, this is a placeholder.
        console.log("Verifying email with token:", token);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Simulate success or failure based on token (for demonstration)
        if (token === "valid-token") {
          setVerificationStatus("success");
          setMessage("Your email has been successfully verified!");
          // toast.success("Email verified successfully!"); // Uncomment when toast is integrated
        } else {
          setVerificationStatus("error");
          setMessage("Invalid or expired verification link.");
          // toast.error("Invalid or expired verification link."); // Uncomment when toast is integrated
        }
      } catch (error) {
        console.error("Email verification error:", error);
        setVerificationStatus("error");
        setMessage("An error occurred during verification. Please try again.");
        // toast.error("An error occurred during verification."); // Uncomment when toast is integrated
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md space-y-6 text-center"
    >
      <h3 className="text-3xl font-bold text-foreground mb-2">Email Verification</h3>
      {verificationStatus === "loading" && (
        <>
          <p className="text-textSecondary">Verifying your email address...</p>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mt-6"></div>
        </>
      )}
      {verificationStatus === "success" && (
        <>
          <p className="text-primary text-lg font-medium">{message}</p>
          <p className="text-textSecondary">You can now log in to your account.</p>
          <Button asChild className="w-full py-2.5 text-lg mt-6">
            <Link href="/login">Go to Login</Link>
          </Button>
        </>
      )}
      {verificationStatus === "error" && (
        <>
          <p className="text-destructive text-lg font-medium">{message}</p>
          <p className="text-textSecondary">Please try signing up again or contact support.</p>
          <Button asChild variant="outline" className="w-full py-2.5 text-lg mt-6">
            <Link href="/signup">Back to Sign Up</Link>
          </Button>
        </>
      )}
    </motion.div>
  );
}
