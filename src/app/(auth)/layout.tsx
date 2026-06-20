"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <div className="relative w-full max-w-4xl bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Section - Image/Branding */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex-1 min-h-[200px] lg:min-h-full flex items-center justify-center p-8 bg-gradient-to-br from-primary to-accent"
        >
            <Image
            src="https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            alt="Tinda Recruitment"
            fill
            style={{ objectFit: "cover" }}
            className="absolute inset-0 opacity-30 mix-blend-overlay"
            priority
          />
          <div className="relative z-10 text-center text-white">
            <h2 className="text-3xl font-extrabold tracking-tight leading-none mb-3">
              Tinda
            </h2>
            <p className="text-lg opacity-90 max-w-xs mx-auto">
              Connecting talent with opportunity, one swipe at a time.
            </p>
          </div>
        </motion.div>

        {/* Right Section - Auth Forms */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex-1 p-8 md:p-12 flex items-center justify-center"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
