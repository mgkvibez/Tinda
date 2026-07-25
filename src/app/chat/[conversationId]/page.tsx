"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase/client";
import { getIdToken } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import Link from "next/link";

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  read: boolean;
  createdAt?: string;
};

export default function ChatPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const conversationId = params.conversationId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [otherUserName, setOtherUserName] = useState("Chat");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      // Load initial messages via API
      const token = await getIdToken(user);
      const res = await fetch(`/api/chat/${conversationId}`, {
        headers: { Cookie: `__session=${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        if (data.conversation) {
          const conv = data.conversation;
          const otherId = conv.participant1Id === user.uid ? conv.participant2Id : conv.participant1Id;
          // Try to get the other user's name
          try {
            const userRes = await fetch(`/api/chat/${conversationId}`, {
              headers: { Cookie: `__session=${token}` },
            });
            // We'll just use a generic name for now
            setOtherUserName("Chat");
          } catch {
            setOtherUserName("Chat");
          }
        }
      }

      // Real-time listener for new messages
      const q = query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("createdAt", "asc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];
        setMessages(newMessages);
        setLoading(false);

        // Mark received messages as read
        snapshot.docs.forEach((d) => {
          const msg = d.data() as Message;
          if (msg.senderId !== user.uid && !msg.read) {
            updateDoc(doc(db, "messages", d.id), { read: true });
          }
        });
      });

      return () => unsubscribe();
    };

    init();
  }, [conversationId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    const messageText = text.trim();
    setText("");

    // Optimistic: add message locally
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      conversationId,
      senderId: user.uid,
      text: messageText,
      read: false,
    }]);

    // Send via Firestore directly for real-time
    try {
      await addDoc(collection(db, "messages"), {
        conversationId,
        senderId: user.uid,
        text: messageText,
        read: false,
        createdAt: serverTimestamp(),
      });

      // Update conversation last message
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Send error:", error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(messageText);
    }
  };

  const currentUser = auth.currentUser;

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Chat header */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/dashboard" className="text-textSecondary hover:text-foreground">
          ←
        </Link>
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
          <span className="text-sm font-medium">{otherUserName[0]}</span>
        </div>
        <h2 className="font-semibold">{otherUserName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {loading ? (
          <p className="text-center text-textSecondary">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-textSecondary py-8">
            No messages yet. Say hello! 👋
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.uid;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-card border border-border"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={!text.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
