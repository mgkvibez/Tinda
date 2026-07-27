"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

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

function getFirebaseErrorMessage(error: any): string {
  const code = error?.code || ""
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead."
    case "auth/invalid-email":
      return "Invalid email address."
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters."
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completing."
    case "auth/popup-blocked":
      return "Popup was blocked by your browser. Allow popups and try again."
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google sign-in. Add it in Firebase Console > Authentication > Settings > Authorized domains."
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Enable it in Firebase Console > Authentication > Sign-in method."
    case "auth/api-key-not-valid":
      return "Firebase API key is invalid. Check your NEXT_PUBLIC_FIREBASE_API_KEY env var."
    case "auth/network-request-failed":
      return "Network error. Check your internet connection."
    default:
      return error?.message || "Sign-up failed. Please try again."
  }
}

function SignupFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultUserType = searchParams.get("type") === "employer" ? "Employer" : "Candidate";
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
  const { signInWithGoogle } = useAuth();

  const selectedUserType = watch("userType");

  const onSubmit = async (data: SignupFormInputs) => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: data.name,
        email: data.email,
        userType: data.userType,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (data.userType === "Candidate") {
        await setDoc(doc(db, "candidateProfiles", user.uid), {
          userId: user.uid,
          fullName: data.name,
          profilePicture: null,
          phone: null,
          location: null,
          bio: null,
          currentRole: null,
          yearsOfExperience: null,
          skills: [],
          education: [],
          certifications: [],
          languages: [],
          resumeUrl: null,
          portfolioUrl: null,
          linkedinUrl: null,
          githubUrl: null,
          desiredSalaryMin: null,
          desiredSalaryMax: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (data.userType === "Employer") {
        const employerRef = doc(db, "employerProfiles", user.uid);
        await setDoc(employerRef, {
          userId: user.uid,
          companyName: null,
          logo: null,
          industry: null,
          companySize: null,
          website: null,
          headquarters: null,
          aboutCompany: null,
          recruiterName: data.name,
          recruiterPosition: null,
          recruiterEmail: data.email,
          recruiterPhone: null,
          subscriptionTier: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await sendEmailVerification(user);

      const token = await user.getIdToken();
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:"
      const secureFlag = isHttps ? "Secure; " : ""
      document.cookie = `__session=${token}; path=/; ${secureFlag}SameSite=Strict; max-age=3600`;

      router.push("/dashboard");
    } catch (error) {
      console.error("Signup error:", error);
      setErrorMessage(getFirebaseErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in error:", error);
      setErrorMessage(getFirebaseErrorMessage(error));
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

      {errorMessage && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input id="name" type="text" placeholder="John Doe" {...register("name")} className="mt-1" />
          {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="your@example.com" {...register("email")} className="mt-1" />
          {errors.email && <p className="text-destructive text-sm mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" {...register("password")} className="mt-1" />
          {errors.password && <p className="text-destructive text-sm mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} className="mt-1" />
          {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword.message}</p>}
        </div>
        <div>
          <Label className="mb-3 block">Account Type</Label>
          <RadioGroup value={selectedUserType} onValueChange={(value) => setValue("userType", value as "Candidate" | "Employer")}>
            <div className="flex items-center space-x-2 mb-2">
              <RadioGroupItem value="Candidate" id="candidate" />
              <Label htmlFor="candidate" className="cursor-pointer">I&apos;m a Candidate</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Employer" id="employer" />
              <Label htmlFor="employer" className="cursor-pointer">I&apos;m an Employer</Label>
            </div>
          </RadioGroup>
          {errors.userType && <p className="text-destructive text-sm mt-1">{errors.userType.message}</p>}
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

      <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
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

export function SignupForm() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading sign-up form...</div>}>
      <SignupFormInner />
    </Suspense>
  );
}
