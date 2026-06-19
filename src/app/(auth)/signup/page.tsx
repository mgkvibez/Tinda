"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const SignupForm = dynamic(
  () => import("./signup-form").then((mod) => mod.SignupForm),
  {
    suspense: true,
  }
);

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading sign-up form...</div>}>
      <SignupForm />
    </Suspense>
  );
}
