"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      // Redirect authenticated users to their dashboard based on userType
      if (session?.user?.userType === "Candidate") {
        router.push("/candidate/dashboard");
      } else if (session?.user?.userType === "Employer") {
        router.push("/employer/dashboard");
      } else if (session?.user?.userType === "Admin") {
        router.push("/admin/dashboard");
      } else {
        // Fallback for users without a specific userType set yet
        router.push("/dashboard");
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-primary">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background text-foreground">
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 animate-gradient-shift"></div>
        <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
      </div>

      {/* Content */}
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="relative z-10 text-center max-w-4xl px-6 py-12"
      >
        <div className="flex items-center justify-center gap-4 mb-6">
          <Image src="/tinda-logo.svg" alt="Tinda" width={96} height={96} priority />
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent drop-shadow-lg">
            Tinda
          </h1>
        </div>
        <p className="text-xl md:text-2xl text-textSecondary mb-10 max-w-2xl mx-auto leading-relaxed">
          Swipe your way to the perfect job or discover top talent.
          Revolutionizing recruitment with intelligent matching.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Button asChild size="lg" className="px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-primary/50 transition-all duration-300 transform hover:-translate-y-1">
              <Link href="/signup">Join as Candidate</Link>
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Button asChild variant="secondary" size="lg" className="px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-secondary/50 transition-all duration-300 transform hover:-translate-y-1">
              <Link href="/signup?type=employer">Hire Talent</Link>
            </Button>
          </motion.div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="mt-8 text-textSecondary text-sm"
        >
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Log In
          </Link>
        </motion.p>
      </motion.header>

      {/* Optional: Add a subtle animation for the gradient shift */}
      <style jsx global>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
      `}</style>
    </div>
  );
}
