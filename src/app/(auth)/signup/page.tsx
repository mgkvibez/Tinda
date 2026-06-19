"use client";

import { Suspense } from "react";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading sign-up form...</div>}>
      <SignupForm />
    </Suspense>
  );
}
