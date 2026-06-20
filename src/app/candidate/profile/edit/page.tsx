"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
});

type FormData = z.infer<typeof schema>;

export default function CandidateProfileEdit() {
  const { register, handleSubmit, setValue } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/profiles/candidate")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data) {
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
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [setValue]);

  const onSubmit = async (values: FormData) => {
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
    };

    try {
      const res = await fetch("/api/profiles/candidate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Failed to save profile");
        return;
      }
      alert("Profile saved");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl mx-auto">
      <div>
        <Label>Full name</Label>
        <Input {...register("fullName")} />
      </div>
      <div>
        <Label>Phone</Label>
        <Input {...register("phone")} />
      </div>
      <div>
        <Label>Location</Label>
        <Input {...register("location")} />
      </div>
      <div>
        <Label>Bio</Label>
        <Input {...register("bio")} />
      </div>
      <div>
        <Label>Current role</Label>
        <Input {...register("currentRole")} />
      </div>
      <div>
        <Label>Years of experience</Label>
        <Input type="number" {...register("yearsOfExperience", { valueAsNumber: true })} />
      </div>
      <div>
        <Label>Skills (comma separated)</Label>
        <Input {...register("skills")} />
      </div>
      <div>
        <Label>Education (comma separated)</Label>
        <Input {...register("education")} />
      </div>
      <div>
        <Label>Certifications (comma separated)</Label>
        <Input {...register("certifications")} />
      </div>
      <div>
        <Label>Languages (comma separated)</Label>
        <Input {...register("languages")} />
      </div>
      <div>
        <Label>Resume URL</Label>
        <Input {...register("resumeUrl")} />
      </div>
      <div>
        <Label>Portfolio URL</Label>
        <Input {...register("portfolioUrl")} />
      </div>
      <div>
        <Label>LinkedIn URL</Label>
        <Input {...register("linkedinUrl")} />
      </div>
      <div>
        <Label>Github URL</Label>
        <Input {...register("githubUrl")} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label>Desired salary min</Label>
          <Input type="number" {...register("desiredSalaryMin", { valueAsNumber: true })} />
        </div>
        <div className="flex-1">
          <Label>Desired salary max</Label>
          <Input type="number" {...register("desiredSalaryMax", { valueAsNumber: true })} />
        </div>
      </div>
      <div className="pt-4">
        <Button type="submit">Save profile</Button>
      </div>
    </form>
  );
}
