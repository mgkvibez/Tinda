"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  location: z.string().optional(),
  salaryRangeMin: z.number().int().nullable().optional(),
  salaryRangeMax: z.number().int().nullable().optional(),
  workArrangement: z.enum(["Remote", "Hybrid", "Onsite"]).optional(),
  employmentType: z.enum(["FullTime", "PartTime", "Contract", "Internship"]).optional(),
  experienceLevel: z.string().optional(),
  skillsRequired: z.string().optional(),
  benefits: z.string().optional(),
  expiryDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewJobPage() {
  const { register, handleSubmit } = useForm<FormData>({ resolver: zodResolver(schema) });
  const router = useRouter();

  const onSubmit = async (values: FormData) => {
    const payload = {
      ...values,
      salaryRangeMin: values.salaryRangeMin || null,
      salaryRangeMax: values.salaryRangeMax || null,
      responsibilities: values.description.split("\n").filter(Boolean),
      requirements: [],
      skillsRequired: values.skillsRequired ? values.skillsRequired.split(",").map((s) => s.trim()).filter(Boolean) : [],
      benefits: values.benefits ? values.benefits.split(",").map((s) => s.trim()).filter(Boolean) : [],
    };

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      alert(errorData?.message || "Failed to create job");
      return;
    }

    router.push("/employer/jobs");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Create job posting</h1>
        <p className="text-textSecondary">Publish a role to start matching with qualified candidates.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-8">
        <div>
          <Label>Job title</Label>
          <Input {...register("title")} />
        </div>
        <div>
          <Label>Description</Label>
          <textarea rows={6} className="w-full rounded-xl border border-border bg-background p-3 text-foreground" {...register("description")} />
        </div>
        <div>
          <Label>Location</Label>
          <Input {...register("location")} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Salary min</Label>
            <Input type="number" {...register("salaryRangeMin", { valueAsNumber: true })} />
          </div>
          <div>
            <Label>Salary max</Label>
            <Input type="number" {...register("salaryRangeMax", { valueAsNumber: true })} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Work arrangement</Label>
            <select className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" {...register("workArrangement")}> 
              <option value="">Any</option>
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Onsite">Onsite</option>
            </select>
          </div>
          <div>
            <Label>Employment type</Label>
            <select className="w-full rounded-xl border border-border bg-background px-3 py-2 text-foreground" {...register("employmentType")}> 
              <option value="">Any</option>
              <option value="FullTime">Full-time</option>
              <option value="PartTime">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
        </div>
        <div>
          <Label>Experience level</Label>
          <Input {...register("experienceLevel")} />
        </div>
        <div>
          <Label>Skills required (comma separated)</Label>
          <Input {...register("skillsRequired")} />
        </div>
        <div>
          <Label>Benefits (comma separated)</Label>
          <Input {...register("benefits")} />
        </div>
        <div>
          <Label>Expiry date</Label>
          <Input type="date" {...register("expiryDate")} />
        </div>
        <div className="pt-4">
          <Button type="submit">Publish role</Button>
        </div>
      </form>
    </div>
  );
}
