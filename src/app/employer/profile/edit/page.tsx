"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const schema = z.object({
  companyName: z.string().optional(),
  logo: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().optional(),
  headquarters: z.string().optional(),
  aboutCompany: z.string().optional(),
  recruiterName: z.string().optional(),
  recruiterPosition: z.string().optional(),
  recruiterEmail: z.string().email().optional(),
  recruiterPhone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EmployerProfileEdit() {
  const { register, handleSubmit, setValue } = useForm<FormData>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/profiles/employer")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data) {
          setValue("companyName", data.companyName ?? "");
          setValue("logo", data.logo ?? "");
          setValue("industry", data.industry ?? "");
          setValue("companySize", data.companySize ?? "");
          setValue("website", data.website ?? "");
          setValue("headquarters", data.headquarters ?? "");
          setValue("aboutCompany", data.aboutCompany ?? "");
          setValue("recruiterName", data.recruiterName ?? "");
          setValue("recruiterPosition", data.recruiterPosition ?? "");
          setValue("recruiterEmail", data.recruiterEmail ?? "");
          setValue("recruiterPhone", data.recruiterPhone ?? "");
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [setValue]);

  const onSubmit = async (values: FormData) => {
    try {
      const res = await fetch("/api/profiles/employer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        alert(err?.message || "Failed to save employer profile");
        return;
      }
      alert("Employer profile saved");
    } catch (err) {
      console.error(err);
      alert("Failed to save employer profile");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl mx-auto">
      <div>
        <Label>Company name</Label>
        <Input {...register("companyName")} />
      </div>
      <div>
        <Label>Logo URL</Label>
        <Input {...register("logo")} />
      </div>
      <div>
        <Label>Industry</Label>
        <Input {...register("industry")} />
      </div>
      <div>
        <Label>Company size</Label>
        <Input {...register("companySize")} />
      </div>
      <div>
        <Label>Website</Label>
        <Input {...register("website")} />
      </div>
      <div>
        <Label>Headquarters</Label>
        <Input {...register("headquarters")} />
      </div>
      <div>
        <Label>About company</Label>
        <Input {...register("aboutCompany")} />
      </div>
      <div>
        <Label>Recruiter name</Label>
        <Input {...register("recruiterName")} />
      </div>
      <div>
        <Label>Recruiter position</Label>
        <Input {...register("recruiterPosition")} />
      </div>
      <div>
        <Label>Recruiter email</Label>
        <Input {...register("recruiterEmail")} />
      </div>
      <div>
        <Label>Recruiter phone</Label>
        <Input {...register("recruiterPhone")} />
      </div>
      <div className="pt-4">
        <Button type="submit">Save employer profile</Button>
      </div>
    </form>
  );
}
