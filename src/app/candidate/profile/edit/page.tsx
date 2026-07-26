"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ProfileCompletionMeter } from "@/components/profile-completion-meter";
import { calculateCandidateCompletion } from "@/lib/profile-completion";
import type { CandidateProfile } from "@/lib/firebase";
import { auth, db } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getStorage } from "firebase/storage";
import Link from "next/link";

const schema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  currentRole: z.string().optional(),
  yearsOfExperience: z.number().int().optional().nullable(),
  skills: z.string().optional(),
  education: z.string().optional(),
  certifications: z.string().optional(),
  languages: z.string().optional(),
  resumeUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  desiredSalaryMin: z.number().int().optional().nullable(),
  desiredSalaryMax: z.number().int().optional().nullable(),
  videoIntroUrl: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CandidateProfileEdit() {
  const { register, handleSubmit, setValue, watch } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const profileDoc = await getDoc(doc(db, "candidateProfiles", user.uid));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        setProfileData({ id: profileDoc.id, ...data });
        setVideoUrl(data.videoIntroUrl || null);
        setValue("fullName", data.fullName ?? "");
        setValue("phone", data.phone ?? "");
        setValue("location", data.location ?? "");
        setValue("bio", data.bio ?? "");
        setValue("currentRole", data.currentRole ?? "");
        setValue("yearsOfExperience", data.yearsOfExperience ?? null);
        setValue("skills", (data.skills || []).join(", "));
        setValue("education", (data.education || []).join(", "));
        setValue("certifications", (data.certifications || []).join(", "));
        setValue("languages", (data.languages || []).join(", "));
        setValue("resumeUrl", data.resumeUrl ?? "");
        setValue("portfolioUrl", data.portfolioUrl ?? "");
        setValue("linkedinUrl", data.linkedinUrl ?? "");
        setValue("githubUrl", data.githubUrl ?? "");
        setValue("desiredSalaryMin", data.desiredSalaryMin ?? null);
        setValue("desiredSalaryMax", data.desiredSalaryMax ?? null);
        setValue("videoIntroUrl", data.videoIntroUrl ?? "");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [setValue]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setUploadingVideo(true);
    try {
      const storage = getStorage();
      const videoRef = ref(storage, `videoIntros/${auth.currentUser.uid}/intro.${file.name.split('.').pop()}`);
      await uploadBytes(videoRef, file);
      const url = await getDownloadURL(videoRef);
      setVideoUrl(url);
      setValue("videoIntroUrl", url);
    } catch (err) {
      console.error(err);
      alert("Video upload failed. Make sure Firebase Storage is configured.");
    } finally {
      setUploadingVideo(false);
    }
  };

  const onSubmit = async (values: FormData) => {
    if (!auth.currentUser) return;
    setSaving(true);
    const payload = {
      fullName: values.fullName,
      phone: values.phone,
      location: values.location,
      bio: values.bio,
      currentRole: values.currentRole,
      yearsOfExperience: values.yearsOfExperience || null,
      skills: values.skills ? values.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      education: values.education ? values.education.split(",").map((s) => s.trim()).filter(Boolean) : [],
      certifications: values.certifications ? values.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [],
      languages: values.languages ? values.languages.split(",").map((s) => s.trim()).filter(Boolean) : [],
      resumeUrl: values.resumeUrl,
      portfolioUrl: values.portfolioUrl,
      linkedinUrl: values.linkedinUrl,
      githubUrl: values.githubUrl,
      desiredSalaryMin: values.desiredSalaryMin || null,
      desiredSalaryMax: values.desiredSalaryMax || null,
      videoIntroUrl: videoUrl,
    };

    try {
      await setDoc(doc(db, "candidateProfiles", auth.currentUser.uid), {
        ...payload,
        userId: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setProfileData((prev: any) => ({ ...prev, ...payload }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading...</p>;

  const completion = calculateCandidateCompletion({ ...profileData, videoIntroUrl: videoUrl } as CandidateProfile);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Profile</h1>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      <ProfileCompletionMeter completion={completion} />

      {/* Video Intro */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Video Intro</h2>
        <p className="text-xs text-textSecondary">Record a 30-sec video introducing yourself. Candidates with video intros get 5x more views.</p>
        {videoUrl ? (
          <div className="space-y-2">
            <video src={videoUrl} controls className="w-full rounded-xl" preload="metadata" />
            <Button variant="outline" size="sm" onClick={() => { setVideoUrl(null); setValue("videoIntroUrl", ""); }}>
              Remove video
            </Button>
          </div>
        ) : (
          <div>
            <input
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              disabled={uploadingVideo}
              className="block w-full text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {uploadingVideo && <p className="text-xs text-textSecondary mt-1">Uploading...</p>}
          </div>
        )}
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input {...register("fullName")} className="mt-1" />
          </div>
          <div>
            <Label>Bio</Label>
            <textarea {...register("bio")} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mt-1 min-h-[80px]" placeholder="Tell employers about yourself..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Current Role</Label>
              <Input {...register("currentRole")} className="mt-1" />
            </div>
            <div>
              <Label>Years of Experience</Label>
              <Input type="number" {...register("yearsOfExperience", { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Location</Label>
              <Input {...register("location")} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input {...register("phone")} className="mt-1" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Skills & Experience</h2>
          <div>
            <Label>Skills (comma separated)</Label>
            <Input {...register("skills")} className="mt-1" placeholder="React, TypeScript, Node.js" />
          </div>
          <div>
            <Label>Education (comma separated)</Label>
            <Input {...register("education")} className="mt-1" placeholder="BSc Computer Science, MIT" />
          </div>
          <div>
            <Label>Certifications (comma separated)</Label>
            <Input {...register("certifications")} className="mt-1" />
          </div>
          <div>
            <Label>Languages (comma separated)</Label>
            <Input {...register("languages")} className="mt-1" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Links</h2>
          <div>
            <Label>Resume URL</Label>
            <Input {...register("resumeUrl")} className="mt-1" />
          </div>
          <div>
            <Label>Portfolio URL</Label>
            <Input {...register("portfolioUrl")} className="mt-1" />
          </div>
          <div>
            <Label>LinkedIn URL</Label>
            <Input {...register("linkedinUrl")} className="mt-1" />
          </div>
          <div>
            <Label>GitHub URL</Label>
            <Input {...register("githubUrl")} className="mt-1" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Desired Salary</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Minimum</Label>
              <Input type="number" {...register("desiredSalaryMin", { valueAsNumber: true })} className="mt-1" />
            </div>
            <div className="flex-1">
              <Label>Maximum</Label>
              <Input type="number" {...register("desiredSalaryMax", { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </Button>
          {saved && <span className="text-sm text-green-500">Saved!</span>}
        </div>
      </form>
    </div>
  );
}
