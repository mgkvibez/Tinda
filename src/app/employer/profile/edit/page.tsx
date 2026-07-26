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
import { VerifiedBadge } from "@/components/verified-badge";
import { calculateEmployerCompletion } from "@/lib/profile-completion";
import type { EmployerProfile } from "@/lib/firebase";
import { auth, db } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getStorage } from "firebase/storage";
import Link from "next/link";

const schema = z.object({
  companyName: z.string().optional(),
  logo: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().optional(),
  headquarters: z.string().optional(),
  aboutCompany: z.string().optional(),
  mission: z.string().optional(),
  values: z.string().optional(),
  perks: z.string().optional(),
  cultureVideoUrl: z.string().optional(),
  recruiterName: z.string().optional(),
  recruiterPosition: z.string().optional(),
  recruiterEmail: z.string().email().optional(),
  recruiterPhone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EmployerProfileEdit() {
  const { register, handleSubmit, setValue } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [cultureVideoUrl, setCultureVideoUrl] = useState<string | null>(null);
  const [profileDocId, setProfileDocId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, "employerProfiles"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        setProfileDocId(d.id);
        const data = d.data();
        setProfileData({ id: d.id, ...data });
        setIsVerified(data.isVerified || false);
        setCultureVideoUrl(data.cultureVideoUrl || null);
        setValue("companyName", data.companyName ?? "");
        setValue("logo", data.logo ?? "");
        setValue("industry", data.industry ?? "");
        setValue("companySize", data.companySize ?? "");
        setValue("website", data.website ?? "");
        setValue("headquarters", data.headquarters ?? "");
        setValue("aboutCompany", data.aboutCompany ?? "");
        setValue("mission", data.mission ?? "");
        setValue("values", (data.values || []).join(", "));
        setValue("perks", (data.perks || []).join(", "));
        setValue("recruiterName", data.recruiterName ?? "");
        setValue("recruiterPosition", data.recruiterPosition ?? "");
        setValue("recruiterEmail", data.recruiterEmail ?? "");
        setValue("recruiterPhone", data.recruiterPhone ?? "");
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
      const videoRef = ref(storage, `cultureVideos/${auth.currentUser.uid}/culture.${file.name.split('.').pop()}`);
      await uploadBytes(videoRef, file);
      const url = await getDownloadURL(videoRef);
      setCultureVideoUrl(url);
      setValue("cultureVideoUrl", url);
    } catch (err) {
      console.error(err);
      alert("Video upload failed. Make sure Firebase Storage is configured.");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleVerify = async () => {
    if (!auth.currentUser) return;
    setVerifying(true);
    setVerifyMessage("");
    try {
      const token = await getIdToken(auth.currentUser);
      const website = (document.getElementById("website") as HTMLInputElement)?.value;
      const email = (document.getElementById("recruiterEmail") as HTMLInputElement)?.value;
      const res = await fetch("/api/verify-employer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify({ companyWebsite: website, companyEmail: email }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsVerified(data.isVerified);
        setVerifyMessage(data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const onSubmit = async (values: FormData) => {
    if (!auth.currentUser) return;
    setSaving(true);
    const payload = {
      companyName: values.companyName,
      logo: values.logo,
      industry: values.industry,
      companySize: values.companySize,
      website: values.website,
      headquarters: values.headquarters,
      aboutCompany: values.aboutCompany,
      mission: values.mission,
      values: values.values ? values.values.split(",").map((s) => s.trim()).filter(Boolean) : [],
      perks: values.perks ? values.perks.split(",").map((s) => s.trim()).filter(Boolean) : [],
      cultureVideoUrl: cultureVideoUrl,
      recruiterName: values.recruiterName,
      recruiterPosition: values.recruiterPosition,
      recruiterEmail: values.recruiterEmail,
      recruiterPhone: values.recruiterPhone,
      userId: auth.currentUser.uid,
    };

    try {
      if (profileDocId) {
        await setDoc(doc(db, "employerProfiles", profileDocId), {
          ...payload,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        const newRef = doc(collection(db, "employerProfiles"));
        await setDoc(newRef, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setProfileDocId(newRef.id);
      }

      setProfileData((prev: any) => ({ ...prev, ...payload, cultureVideoUrl }));
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

  const completion = calculateEmployerCompletion({ ...profileData, cultureVideoUrl } as EmployerProfile);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Company Profile</h1>
          {isVerified && <VerifiedBadge size="md" />}
        </div>
        <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
      </div>

      <ProfileCompletionMeter completion={completion} />

      {/* Verification */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Employer Verification</h2>
            <p className="text-xs text-textSecondary">Get a verified badge to build trust with candidates</p>
          </div>
          {isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-500">
              <VerifiedBadge /> Verified
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={handleVerify} disabled={verifying}>
              {verifying ? "Verifying..." : "Verify"}
            </Button>
          )}
        </div>
        {verifyMessage && <p className="text-xs text-textSecondary">{verifyMessage}</p>}
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Company Info */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Company Information</h2>
          <div>
            <Label>Company Name</Label>
            <Input {...register("companyName")} className="mt-1" />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input {...register("logo")} className="mt-1" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Industry</Label>
              <Input {...register("industry")} className="mt-1" />
            </div>
            <div>
              <Label>Company Size</Label>
              <Input {...register("companySize")} className="mt-1" placeholder="e.g. 50-200" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Website</Label>
              <Input id="website" {...register("website")} className="mt-1" placeholder="https://..." />
            </div>
            <div>
              <Label>Headquarters</Label>
              <Input {...register("headquarters")} className="mt-1" />
            </div>
          </div>
        </div>

        {/* Culture */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Company Culture</h2>
          <div>
            <Label>About Company</Label>
            <textarea {...register("aboutCompany")} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mt-1 min-h-[80px]" placeholder="Tell candidates what makes your company special..." />
          </div>
          <div>
            <Label>Mission Statement</Label>
            <textarea {...register("mission")} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mt-1 min-h-[60px]" placeholder="Your company's mission..." />
          </div>
          <div>
            <Label>Values (comma separated)</Label>
            <Input {...register("values")} className="mt-1" placeholder="Innovation, Transparency, Growth" />
          </div>
          <div>
            <Label>Perks & Benefits (comma separated)</Label>
            <Input {...register("perks")} className="mt-1" placeholder="Health insurance, Remote work, Gym membership" />
          </div>

          {/* Culture Video */}
          <div className="space-y-2">
            <Label>Culture Video</Label>
            <p className="text-xs text-textSecondary">Upload a short video showing your team and workplace</p>
            {cultureVideoUrl ? (
              <div className="space-y-2">
                <video src={cultureVideoUrl} controls className="w-full rounded-xl" preload="metadata" />
                <Button variant="outline" size="sm" onClick={() => { setCultureVideoUrl(null); setValue("cultureVideoUrl", ""); }}>
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
                  className="block w-full text-sm text-textSecondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground"
                />
                {uploadingVideo && <p className="text-xs text-textSecondary mt-1">Uploading...</p>}
              </div>
            )}
          </div>
        </div>

        {/* Recruiter Info */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Recruiter Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input {...register("recruiterName")} className="mt-1" />
            </div>
            <div>
              <Label>Position</Label>
              <Input {...register("recruiterPosition")} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input id="recruiterEmail" type="email" {...register("recruiterEmail")} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input {...register("recruiterPhone")} className="mt-1" />
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
