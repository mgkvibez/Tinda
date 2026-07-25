"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { auth } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type Experience = { id: string; company: string; role: string; startDate: string; endDate: string | null; current: boolean; description: string }
type Education = { id: string; institution: string; degree: string; field: string; graduationYear: string; description: string }
type Project = { id: string; name: string; description: string; link: string | null }

type Resume = {
  id?: string
  template: "modern" | "classic" | "minimal"
  title: string
  summary: string
  experience: Experience[]
  education: Education[]
  skills: string[]
  certifications: string[]
  projects: Project[]
  contact: {
    email: string | null
    phone: string | null
    location: string | null
    linkedinUrl: string | null
    githubUrl: string | null
    portfolioUrl: string | null
  }
}

const emptyResume: Resume = {
  template: "modern",
  title: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  contact: { email: null, phone: null, location: null, linkedinUrl: null, githubUrl: null, portfolioUrl: null },
}

const genId = () => Math.random().toString(36).slice(2, 9)

export default function ResumeBuilderPage() {
  const [resume, setResume] = useState<Resume>(emptyResume)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [skillInput, setSkillInput] = useState("")
  const [certInput, setCertInput] = useState("")
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchResume()
  }, [])

  const fetchResume = async () => {
    try {
      const user = auth.currentUser
      if (!user) return
      const token = await getIdToken(user)
      const res = await fetch("/api/resume", { headers: { Cookie: `__session=${token}` } })
      if (res.ok) {
        const data = await res.json()
        if (data.resume) {
          setResume({ ...emptyResume, ...data.resume })
        } else {
          // Auto-populate contact from auth
          setResume((prev) => ({ ...prev, contact: { ...prev.contact, email: user.email } }))
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const user = auth.currentUser
      if (!user) return
      const token = await getIdToken(user)
      const res = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: `__session=${token}` },
        body: JSON.stringify(resume),
      })
      if (res.ok) {
        const data = await res.json()
        setResume({ ...emptyResume, ...data.resume })
        setSavedAt(new Date().toLocaleTimeString())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Experience handlers
  const addExperience = () => setResume((p) => ({ ...p, experience: [...p.experience, { id: genId(), company: "", role: "", startDate: "", endDate: null, current: false, description: "" }] }))
  const updateExperience = (id: string, field: keyof Experience, value: any) => setResume((p) => ({ ...p, experience: p.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)) }))
  const removeExperience = (id: string) => setResume((p) => ({ ...p, experience: p.experience.filter((e) => e.id !== id) }))

  // Education handlers
  const addEducation = () => setResume((p) => ({ ...p, education: [...p.education, { id: genId(), institution: "", degree: "", field: "", graduationYear: "", description: "" }] }))
  const updateEducation = (id: string, field: keyof Education, value: any) => setResume((p) => ({ ...p, education: p.education.map((e) => (e.id === id ? { ...e, [field]: value } : e)) }))
  const removeEducation = (id: string) => setResume((p) => ({ ...p, education: p.education.filter((e) => e.id !== id) }))

  // Project handlers
  const addProject = () => setResume((p) => ({ ...p, projects: [...p.projects, { id: genId(), name: "", description: "", link: null }] }))
  const updateProject = (id: string, field: keyof Project, value: any) => setResume((p) => ({ ...p, projects: p.projects.map((pr) => (pr.id === id ? { ...pr, [field]: value } : pr)) }))
  const removeProject = (id: string) => setResume((p) => ({ ...p, projects: p.projects.filter((pr) => pr.id !== id) }))

  // Skills & certs
  const addSkill = () => { if (skillInput.trim()) { setResume((p) => ({ ...p, skills: [...p.skills, skillInput.trim()] })); setSkillInput("") } }
  const addCert = () => { if (certInput.trim()) { setResume((p) => ({ ...p, certifications: [...p.certifications, certInput.trim()] })); setCertInput("") } }

  if (loading) return <p className="text-center py-8 text-textSecondary">Loading resume builder...</p>

  return (
    <div className="min-h-screen">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-textSecondary hover:underline">← Dashboard</Link>
          <h1 className="text-lg font-bold">Resume Builder</h1>
          {savedAt && <span className="text-xs text-textSecondary">Saved at {savedAt}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>🖨 Download PDF</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto">
        {/* Edit Panel */}
        <div className="flex-1 space-y-6 print:hidden">
          {/* Template Selector */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <Label className="mb-2 block">Template</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["modern", "classic", "minimal"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setResume((p) => ({ ...p, template: t }))}
                  className={`rounded-xl border p-3 text-center capitalize transition-colors ${resume.template === t ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                >
                  <div className="text-2xl mb-1">{t === "modern" ? "🎨" : t === "classic" ? "📄" : "✨"}</div>
                  <span className="text-xs">{t}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={resume.contact.email || ""} onChange={(e) => setResume((p) => ({ ...p, contact: { ...p.contact, email: e.target.value } }))} className="mt-1" /></div>
              <div><Label>Phone</Label><Input value={resume.contact.phone || ""} onChange={(e) => setResume((p) => ({ ...p, contact: { ...p.contact, phone: e.target.value } }))} className="mt-1" /></div>
              <div><Label>Location</Label><Input value={resume.contact.location || ""} onChange={(e) => setResume((p) => ({ ...p, contact: { ...p.contact, location: e.target.value } }))} className="mt-1" /></div>
              <div><Label>LinkedIn</Label><Input value={resume.contact.linkedinUrl || ""} onChange={(e) => setResume((p) => ({ ...p, contact: { ...p.contact, linkedinUrl: e.target.value } }))} className="mt-1" /></div>
              <div><Label>GitHub</Label><Input value={resume.contact.githubUrl || ""} onChange={(e) => setResume((p) => ({ ...p, contact: { ...p.contact, githubUrl: e.target.value } }))} className="mt-1" /></div>
              <div><Label>Portfolio</Label><Input value={resume.contact.portfolioUrl || ""} onChange={(e) => setResume((p) => ({ ...p, contact: { ...p.contact, portfolioUrl: e.target.value } }))} className="mt-1" /></div>
            </div>
          </div>

          {/* Title & Summary */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Professional Title & Summary</h3>
            <div><Label>Title</Label><Input value={resume.title} onChange={(e) => setResume((p) => ({ ...p, title: e.target.value }))} placeholder="Senior Software Engineer" className="mt-1" /></div>
            <div><Label>Summary</Label><textarea value={resume.summary} onChange={(e) => setResume((p) => ({ ...p, summary: e.target.value }))} placeholder="Write a compelling 2-3 sentence summary..." className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm min-h-[80px] resize-y" /></div>
          </div>

          {/* Experience */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Work Experience</h3>
              <Button variant="ghost" size="sm" onClick={addExperience}>+ Add</Button>
            </div>
            {resume.experience.map((exp) => (
              <div key={exp.id} className="rounded-xl bg-muted p-3 space-y-2">
                <div className="flex justify-between">
                  <Input value={exp.role} onChange={(e) => updateExperience(exp.id, "role", e.target.value)} placeholder="Role" className="flex-1 mr-2" />
                  <button onClick={() => removeExperience(exp.id)} className="text-textSecondary hover:text-destructive">✕</button>
                </div>
                <Input value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} placeholder="Company" />
                <div className="flex gap-2">
                  <Input value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} placeholder="Start (Jan 2023)" className="flex-1" />
                  {!exp.current && <Input value={exp.endDate || ""} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} placeholder="End" className="flex-1" />}
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={exp.current} onChange={(e) => updateExperience(exp.id, "current", e.target.checked)} />
                  Currently working here
                </label>
                <textarea value={exp.description} onChange={(e) => updateExperience(exp.id, "description", e.target.value)} placeholder="Describe your achievements..." className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm min-h-[60px] resize-y" />
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Education</h3>
              <Button variant="ghost" size="sm" onClick={addEducation}>+ Add</Button>
            </div>
            {resume.education.map((edu) => (
              <div key={edu.id} className="rounded-xl bg-muted p-3 space-y-2">
                <div className="flex justify-between">
                  <Input value={edu.institution} onChange={(e) => updateEducation(edu.id, "institution", e.target.value)} placeholder="Institution" className="flex-1 mr-2" />
                  <button onClick={() => removeEducation(edu.id)} className="text-textSecondary hover:text-destructive">✕</button>
                </div>
                <div className="flex gap-2">
                  <Input value={edu.degree} onChange={(e) => updateEducation(edu.id, "degree", e.target.value)} placeholder="Degree" className="flex-1" />
                  <Input value={edu.field} onChange={(e) => updateEducation(edu.id, "field", e.target.value)} placeholder="Field" className="flex-1" />
                  <Input value={edu.graduationYear} onChange={(e) => updateEducation(edu.id, "graduationYear", e.target.value)} placeholder="Year" className="w-24" />
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Skills</h3>
            <div className="flex gap-2">
              <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} placeholder="Add a skill..." />
              <Button variant="outline" size="sm" onClick={addSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {resume.skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                  {s}
                  <button onClick={() => setResume((p) => ({ ...p, skills: p.skills.filter((x) => x !== s) }))} className="hover:text-destructive">✕</button>
                </span>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm">Certifications</h3>
            <div className="flex gap-2">
              <Input value={certInput} onChange={(e) => setCertInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCert())} placeholder="Add a certification..." />
              <Button variant="outline" size="sm" onClick={addCert}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {resume.certifications.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-textSecondary">
                  {c}
                  <button onClick={() => setResume((p) => ({ ...p, certifications: p.certifications.filter((x) => x !== c) }))} className="hover:text-destructive">✕</button>
                </span>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Projects</h3>
              <Button variant="ghost" size="sm" onClick={addProject}>+ Add</Button>
            </div>
            {resume.projects.map((pr) => (
              <div key={pr.id} className="rounded-xl bg-muted p-3 space-y-2">
                <div className="flex justify-between">
                  <Input value={pr.name} onChange={(e) => updateProject(pr.id, "name", e.target.value)} placeholder="Project name" className="flex-1 mr-2" />
                  <button onClick={() => removeProject(pr.id)} className="text-textSecondary hover:text-destructive">✕</button>
                </div>
                <textarea value={pr.description} onChange={(e) => updateProject(pr.id, "description", e.target.value)} placeholder="Describe the project..." className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm min-h-[60px] resize-y" />
                <Input value={pr.link || ""} onChange={(e) => updateProject(pr.id, "link", e.target.value)} placeholder="Link (optional)" />
              </div>
            ))}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 lg:sticky lg:top-20 lg:self-start">
          <div ref={previewRef} className="bg-white text-black rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none" style={{ minHeight: "800px" }}>
            {resume.template === "modern" && <ModernTemplate resume={resume} />}
            {resume.template === "classic" && <ClassicTemplate resume={resume} />}
            {resume.template === "minimal" && <MinimalTemplate resume={resume} />}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Templates ────────────────────────────────────────────

function ModernTemplate({ resume }: { resume: Resume }) {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="border-b-2 border-purple-600 pb-4 mb-4">
        <h1 className="text-3xl font-bold text-gray-900">{resume.title || "Your Name"}</h1>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
          {resume.contact.email && <span>{resume.contact.email}</span>}
          {resume.contact.phone && <span>{resume.contact.phone}</span>}
          {resume.contact.location && <span>{resume.contact.location}</span>}
          {resume.contact.linkedinUrl && <span>LinkedIn</span>}
          {resume.contact.githubUrl && <span>GitHub</span>}
          {resume.contact.portfolioUrl && <span>Portfolio</span>}
        </div>
      </div>

      {resume.summary && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-purple-600 mb-1">Summary</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{resume.summary}</p>
        </div>
      )}

      {resume.experience.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-purple-600 mb-2">Experience</h2>
          {resume.experience.map((exp) => (
            <div key={exp.id} className="mb-3">
              <div className="flex justify-between items-baseline">
                <h3 className="text-sm font-semibold text-gray-900">{exp.role} · {exp.company}</h3>
                <span className="text-xs text-gray-500">{exp.startDate} — {exp.current ? "Present" : exp.endDate}</span>
              </div>
              {exp.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {resume.education.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-purple-600 mb-2">Education</h2>
            {resume.education.map((edu) => (
              <div key={edu.id} className="mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{edu.institution}</h3>
                <p className="text-xs text-gray-600">{edu.degree}{edu.field ? ` in ${edu.field}` : ""}{edu.graduationYear ? `, ${edu.graduationYear}` : ""}</p>
              </div>
            ))}
          </div>
        )}

        {resume.skills.length > 0 && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-purple-600 mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1">
              {resume.skills.map((s) => <span key={s} className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">{s}</span>)}
            </div>
          </div>
        )}
      </div>

      {resume.projects.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-purple-600 mb-2">Projects</h2>
          {resume.projects.map((pr) => (
            <div key={pr.id} className="mb-2">
              <h3 className="text-sm font-semibold text-gray-900">{pr.name}</h3>
              {pr.description && <p className="text-xs text-gray-600 mt-0.5">{pr.description}</p>}
            </div>
          ))}
        </div>
      )}

      {resume.certifications.length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-purple-600 mb-2">Certifications</h2>
          {resume.certifications.map((c) => <p key={c} className="text-xs text-gray-700">• {c}</p>)}
        </div>
      )}
    </div>
  )
}

function ClassicTemplate({ resume }: { resume: Resume }) {
  return (
    <div className="p-8">
      <div className="text-center border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{resume.title || "Your Name"}</h1>
        <div className="text-xs text-gray-500 mt-1">
          {[resume.contact.email, resume.contact.phone, resume.contact.location].filter(Boolean).join(" | ")}
        </div>
      </div>

      {resume.summary && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-1 pb-0.5">Summary</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{resume.summary}</p>
        </div>
      )}

      {resume.experience.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-0.5">Experience</h2>
          {resume.experience.map((exp) => (
            <div key={exp.id} className="mb-2">
              <div className="flex justify-between">
                <h3 className="text-sm font-bold text-gray-900">{exp.company}</h3>
                <span className="text-xs text-gray-500">{exp.startDate} — {exp.current ? "Present" : exp.endDate}</span>
              </div>
              <p className="text-xs italic text-gray-600">{exp.role}</p>
              {exp.description && <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      {resume.education.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-0.5">Education</h2>
          {resume.education.map((edu) => (
            <div key={edu.id} className="mb-1">
              <h3 className="text-sm font-bold text-gray-900">{edu.institution}</h3>
              <p className="text-xs text-gray-600">{edu.degree}{edu.field ? `, ${edu.field}` : ""}{edu.graduationYear ? ` (${edu.graduationYear})` : ""}</p>
            </div>
          ))}
        </div>
      )}

      {resume.skills.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-1 pb-0.5">Skills</h2>
          <p className="text-sm text-gray-700">{resume.skills.join(", ")}</p>
        </div>
      )}

      {resume.certifications.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-1 pb-0.5">Certifications</h2>
          {resume.certifications.map((c) => <p key={c} className="text-sm text-gray-700">• {c}</p>)}
        </div>
      )}

      {resume.projects.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase border-b border-gray-300 mb-2 pb-0.5">Projects</h2>
          {resume.projects.map((pr) => (
            <div key={pr.id} className="mb-1">
              <h3 className="text-sm font-bold text-gray-900">{pr.name}</h3>
              {pr.description && <p className="text-xs text-gray-600">{pr.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MinimalTemplate({ resume }: { resume: Resume }) {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-light text-gray-900 mb-1">{resume.title || "Your Name"}</h1>
      <div className="text-xs text-gray-400 mb-6">
        {[resume.contact.email, resume.contact.phone, resume.contact.location, resume.contact.linkedinUrl, resume.contact.githubUrl].filter(Boolean).join("  ·  ")}
      </div>

      {resume.summary && <p className="text-sm text-gray-600 leading-relaxed mb-6">{resume.summary}</p>}

      {resume.experience.length > 0 && (
        <div className="mb-6">
          {resume.experience.map((exp) => (
            <div key={exp.id} className="mb-4 pl-3 border-l-2 border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">{exp.role}</h3>
              <p className="text-xs text-gray-400">{exp.company} · {exp.startDate} — {exp.current ? "Present" : exp.endDate}</p>
              {exp.description && <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      {resume.education.length > 0 && (
        <div className="mb-6">
          {resume.education.map((edu) => (
            <div key={edu.id} className="mb-2">
              <h3 className="text-sm font-medium text-gray-900">{edu.institution}</h3>
              <p className="text-xs text-gray-400">{edu.degree}{edu.field ? ` · ${edu.field}` : ""}{edu.graduationYear ? ` · ${edu.graduationYear}` : ""}</p>
            </div>
          ))}
        </div>
      )}

      {resume.skills.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-1">Skills</p>
          <p className="text-sm text-gray-600">{resume.skills.join(" · ")}</p>
        </div>
      )}

      {resume.certifications.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-400 mb-1">Certifications</p>
          <p className="text-sm text-gray-600">{resume.certifications.join(" · ")}</p>
        </div>
      )}

      {resume.projects.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1">Projects</p>
          {resume.projects.map((pr) => (
            <div key={pr.id} className="mb-1.5">
              <span className="text-sm font-medium text-gray-900">{pr.name}</span>
              {pr.description && <span className="text-xs text-gray-500"> — {pr.description}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
