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
  const [loading, setLoading] = useState(true);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPending, setTwoFactorPending] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phonePending, setPhonePending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (user) loadSecurityData();
  }, [user]);

  const loadSecurityData = async () => {
    setLoading(true);
    const token = await getIdToken(firebaseAuth.currentUser!);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [verifyRes, twoFaRes, trustRes, blockedRes] = await Promise.all([
        fetch("/api/account-verification", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }) }),
        fetch("/api/2fa", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ action: "status" }) }),
        fetch("/api/trust-score", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({}) }),
        fetch("/api/report-block", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ action: "list-blocked" }) }),
      ]);

      setVerification(await verifyRes.json());
      setTwoFactor(await twoFaRes.json());
      setTrustScore(await trustRes.json());
      const blockedData = await blockedRes.json();
      setBlockedUsers(blockedData.blockedUsers || []);
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
    if (data.devCode) setTwoFactorCode(data.devCode); // Dev mode
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
                    <span className="text-primary">→</span> {rec}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Account Verification */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Account Verification</h2>
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-3 rounded-lg ${verification?.emailVerified ? "bg-green-50" : "bg-yellow-50"}`}>
              <div>
                <div className="font-medium">Email Verification</div>
                <div className="text-sm text-textSecondary">{verification?.email}</div>
              </div>
              {verification?.emailVerified ? (
                <span className="text-green-600 text-sm font-semibold">✓ Verified</span>
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
                <span className="text-green-600 text-sm font-semibold">✓ Verified</span>
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
                <span className="text-green-600 text-sm font-semibold">✓ Verified</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => callApi("/api/account-verification", { action: "verify-identity" }).then(d => setMessage(d.message))}>
                  Start
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Two-Factor Authentication */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Two-Factor Authentication (2FA)</h2>
          {twoFactor?.enabled ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-lg">✓</span>
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
            <p className="text-sm text-textSecondary">You haven't blocked anyone.</p>
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
      </div>
    </div>
  );
}
