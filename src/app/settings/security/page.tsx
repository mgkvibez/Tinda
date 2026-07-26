"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { getIdToken } from "firebase/auth";
import { auth as firebaseAuth } from "@/lib/firebase/client";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [verification, setVerification] = useState<any>(null);
  const [twoFactor, setTwoFactor] = useState<any>(null);
  const [trustScore, setTrustScore] = useState<any>(null);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phonePending, setPhonePending] = useState(false);
  const [message, setMessage] = useState("");
  const [disputeForm, setDisputeForm] = useState({ againstUserId: "", againstUserName: "", type: "other", description: "" });
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  useEffect(() => {
    if (user) loadSecurityData();
  }, [user]);

  const loadSecurityData = async () => {
    setLoading(true);
    const token = await getIdToken(firebaseAuth.currentUser!);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [verifyRes, twoFaRes, trustRes, blockedRes, sessRes, auditRes, dispRes] = await Promise.all([
        fetch("/api/account-verification", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }) }),
        fetch("/api/2fa", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }) }),
        fetch("/api/trust-score", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({}) }),
        fetch("/api/report-block", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ action: "list-blocked" }) }),
        fetch("/api/sessions", { headers }),
        fetch("/api/audit-log", { headers }),
        fetch("/api/disputes", { headers }),
      ]);

      setVerification(await verifyRes.json());
      setTwoFactor(await twoFaRes.json());
      setTrustScore(await trustRes.json());
      const blockedData = await blockedRes.json();
      setBlockedUsers(blockedData.blockedUsers || []);
      const sessData = await sessRes.json();
      setSessions(sessData.sessions || []);
      const auditData = await auditRes.json();
      setAuditLog(auditData.logs || []);
      const dispData = await dispRes.json();
      setDisputes(dispData.disputes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const callApi = async (endpoint: string, body: any) => {
    const token = await getIdToken(firebaseAuth.currentUser!);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const enable2FA = async () => {
    const data = await callApi("/api/2fa", { action: "enable" });
    if (data.devCode) setTwoFactorCode(data.devCode);
    setTwoFactorPending(true);
    setMessage("2FA code generated. Enter it below to confirm.");
  };

  const confirm2FA = async () => {
    const data = await callApi("/api/2fa", { action: "verify", code: twoFactorCode });
    if (data.message?.includes("success")) {
      setTwoFactorPending(false);
      setTwoFactorCode("");
      loadSecurityData();
    }
    setMessage(data.message);
  };

  const disable2FA = async () => {
    const data = await callApi("/api/2fa", { action: "disable", code: twoFactorCode });
    if (data.message?.includes("disabled")) {
      setTwoFactorCode("");
      loadSecurityData();
    }
    setMessage(data.message);
  };

  const verifyPhone = async () => {
    if (!phoneInput.trim()) return;
    const data = await callApi("/api/account-verification", { action: "verify-phone", phone: phoneInput });
    if (data.devCode) setPhoneCode(data.devCode);
    setPhonePending(true);
    setMessage(data.message);
  };

  const confirmPhone = async () => {
    const data = await callApi("/api/account-verification", { action: "confirm-phone", code: phoneCode });
    if (data.message?.includes("success")) {
      setPhonePending(false);
      setPhoneInput("");
      setPhoneCode("");
      loadSecurityData();
    }
    setMessage(data.message);
  };

  const unblockUser = async (blockedId: string) => {
    await callApi("/api/report-block", { action: "unblock", targetId: blockedId });
    loadSecurityData();
  };

  const revokeSession = async (sessionId: string) => {
    const token = await getIdToken(firebaseAuth.currentUser!);
    await fetch(`/api/sessions?sessionId=${sessionId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    loadSecurityData();
  };

  const revokeAllSessions = async () => {
    const token = await getIdToken(firebaseAuth.currentUser!);
    await fetch(`/api/sessions?all=true`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setMessage("All other sessions revoked.");
    loadSecurityData();
  };

  const fileDispute = async () => {
    const token = await getIdToken(firebaseAuth.currentUser!);
    const res = await fetch("/api/disputes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(disputeForm),
    });
    const data = await res.json();
    if (data.dispute) {
      setShowDisputeForm(false);
      setDisputeForm({ againstUserId: "", againstUserName: "", type: "other", description: "" });
      setMessage("Dispute filed successfully. Our team will review it.");
      loadSecurityData();
    } else {
      setMessage(data.message || "Failed to file dispute");
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "verification", label: "Verification" },
    { id: "sessions", label: "Active Sessions" },
    { id: "disputes", label: "Disputes" },
    { id: "audit", label: "Activity Log" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground">Security Settings</h1>
          <p className="text-textSecondary mt-1">Manage your account security, verification, and privacy.</p>
        </motion.div>

        {message && (
          <div className="bg-primary/10 text-primary text-sm px-4 py-2 rounded-lg">{message}</div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-textSecondary hover:bg-muted/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* Trust Score */}
            {trustScore && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Trust Score</h2>
                <div className="flex items-center gap-4">
                  <div className={`text-4xl font-bold ${trustScore.score >= 70 ? "text-green-600" : trustScore.score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                    {trustScore.score}
                  </div>
                  <div>
                    <div className="font-semibold capitalize">{trustScore.trustLevel} Trust</div>
                    <div className="text-sm text-textSecondary">Account age: {trustScore.metrics?.accountAgeDays || 0} days</div>
                  </div>
                </div>
                {trustScore.recommendations?.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {trustScore.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="text-sm text-textSecondary flex gap-2">
                        <span className="text-primary">&#8594;</span> {rec}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Two-Factor Authentication */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Two-Factor Authentication (2FA)</h2>
              {twoFactor?.enabled ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-lg">&#10003;</span>
                    <span className="font-medium">2FA is enabled</span>
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Enter 2FA code" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} className="w-32" />
                    <Button size="sm" variant="outline" onClick={disable2FA}>Disable</Button>
                  </div>
                </div>
              ) : twoFactorPending ? (
                <div>
                  <p className="text-sm text-textSecondary mb-3">Enter the 6-digit code sent to your email/phone:</p>
                  <div className="flex gap-2">
                    <Input placeholder="000000" value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)} maxLength={6} className="w-32" />
                    <Button onClick={confirm2FA}>Confirm</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-textSecondary">Add an extra layer of security to your account.</p>
                  <Button onClick={enable2FA}>Enable 2FA</Button>
                </div>
              )}
            </Card>

            {/* Blocked Users */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Blocked Users</h2>
              {blockedUsers.length === 0 ? (
                <p className="text-sm text-textSecondary">You haven&apos;t blocked anyone.</p>
              ) : (
                <div className="space-y-2">
                  {blockedUsers.map((blocked: any) => (
                    <div key={blocked.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">{blocked.name || "Unknown user"}</span>
                      <Button size="sm" variant="outline" onClick={() => unblockUser(blocked.blockedId)}>
                        Unblock
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* VERIFICATION TAB */}
        {activeTab === "verification" && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Account Verification</h2>
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-3 rounded-lg ${verification?.emailVerified ? "bg-green-50" : "bg-yellow-50"}`}>
                <div>
                  <div className="font-medium">Email Verification</div>
                  <div className="text-sm text-textSecondary">{verification?.email}</div>
                </div>
                {verification?.emailVerified ? (
                  <span className="text-green-600 text-sm font-semibold">&#10003; Verified</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => callApi("/api/account-verification", { action: "verify-email" }).then(d => setMessage(d.message))}>
                    Verify
                  </Button>
                )}
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg ${verification?.phoneVerified ? "bg-green-50" : "bg-yellow-50"}`}>
                <div>
                  <div className="font-medium">Phone Verification</div>
                  <div className="text-sm text-textSecondary">{verification?.phone || "Not verified"}</div>
                </div>
                {verification?.phoneVerified ? (
                  <span className="text-green-600 text-sm font-semibold">&#10003; Verified</span>
                ) : phonePending ? (
                  <div className="flex gap-2">
                    <Input placeholder="SMS code" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} className="w-24" />
                    <Button size="sm" onClick={confirmPhone}>Confirm</Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input placeholder="+1234567890" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} className="w-36" />
                    <Button size="sm" variant="outline" onClick={verifyPhone}>Verify</Button>
                  </div>
                )}
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg ${verification?.identityVerified ? "bg-green-50" : "bg-muted"}`}>
                <div>
                  <div className="font-medium">Identity Verification</div>
                  <div className="text-sm text-textSecondary">Government ID verification (coming soon)</div>
                </div>
                {verification?.identityVerified ? (
                  <span className="text-green-600 text-sm font-semibold">&#10003; Verified</span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => callApi("/api/account-verification", { action: "verify-identity" }).then(d => setMessage(d.message))}>
                    Start
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* SESSIONS TAB */}
        {activeTab === "sessions" && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Active Sessions</h2>
              {sessions.length > 1 && (
                <Button size="sm" variant="destructive" onClick={revokeAllSessions}>
                  Revoke All Others
                </Button>
              )}
            </div>
            <p className="text-sm text-textSecondary mb-4">
              These are the devices currently logged into your account. If you see anything suspicious, revoke that session immediately.
            </p>
            {sessions.length === 0 ? (
              <p className="text-sm text-textSecondary">No active sessions found.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div key={sess.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{sess.deviceInfo || "Unknown device"}</div>
                      <div className="text-xs text-textSecondary">
                        {sess.ipAddress} &#183; Last active {formatDate(sess.lastActiveAt)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => revokeSession(sess.id)}>
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* DISPUTES TAB */}
        {activeTab === "disputes" && (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Disputes</h2>
                {!showDisputeForm && (
                  <Button size="sm" onClick={() => setShowDisputeForm(true)}>
                    File New Dispute
                  </Button>
                )}
              </div>

              {showDisputeForm && (
                <div className="space-y-3 mb-4 p-4 bg-muted rounded-lg">
                  <Input
                    placeholder="User ID you're disputing"
                    value={disputeForm.againstUserId}
                    onChange={(e) => setDisputeForm({ ...disputeForm, againstUserId: e.target.value })}
                  />
                  <Input
                    placeholder="Their name"
                    value={disputeForm.againstUserName}
                    onChange={(e) => setDisputeForm({ ...disputeForm, againstUserName: e.target.value })}
                  />
                  <select
                    className="w-full p-2 rounded-lg bg-background border border-border text-sm"
                    value={disputeForm.type}
                    onChange={(e) => setDisputeForm({ ...disputeForm, type: e.target.value })}
                  >
                    <option value="payment">Payment Issue</option>
                    <option value="harassment">Harassment</option>
                    <option value="fake_job">Fake Job Posting</option>
                    <option value="misrepresentation">Misrepresentation</option>
                    <option value="off_platform">Off-Platform Solicitation</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea
                    placeholder="Describe the issue in detail (min 10 characters)..."
                    value={disputeForm.description}
                    onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                    className="w-full p-2 rounded-lg bg-background border border-border text-sm min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={fileDispute}>Submit Dispute</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowDisputeForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {disputes.length === 0 ? (
                <p className="text-sm text-textSecondary">No disputes filed.</p>
              ) : (
                <div className="space-y-3">
                  {disputes.map((d) => (
                    <div key={d.id} className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">{d.type.replace(/_/g, " ")}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          d.status === "resolved" ? "bg-green-100 text-green-700" :
                          d.status === "dismissed" ? "bg-red-100 text-red-700" :
                          d.status === "under_review" ? "bg-blue-100 text-blue-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {d.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-sm text-textSecondary mb-1">Against: {d.againstUserName}</p>
                      <p className="text-sm">{d.description}</p>
                      {d.resolution && (
                        <div className="mt-2 p-2 bg-background rounded text-sm">
                          <span className="font-medium">Resolution: </span>{d.resolution}
                        </div>
                      )}
                      <div className="text-xs text-textSecondary mt-1">{formatDate(d.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* AUDIT LOG TAB */}
        {activeTab === "audit" && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Security Activity Log</h2>
            <p className="text-sm text-textSecondary mb-4">
              A record of all security-related actions on your account. If you see something you don&apos;t recognize, change your password immediately.
            </p>
            {auditLog.length === 0 ? (
              <p className="text-sm text-textSecondary">No security events recorded.</p>
            ) : (
              <div className="space-y-2">
                {auditLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      log.severity === "critical" ? "bg-red-500" :
                      log.severity === "warning" ? "bg-yellow-500" :
                      "bg-green-500"
                    }`} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{log.action.replace(/_/g, " ")}</div>
                      <div className="text-xs text-textSecondary">{log.description}</div>
                      <div className="text-xs text-textSecondary mt-0.5">{formatDate(log.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
