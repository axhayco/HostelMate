import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Hash, Pin, Send, Smile, Flag, Ban, Shield, ChevronDown, ChevronUp, X, MessageCircle } from "lucide-react";
import { Hostel } from "@/data/hostels";
import { useAuth } from "@/context/AuthContext";
import {
  ChatMessage, ChatUser, CHAT_CHANNELS,
  mockChatUsers, mockMessages, mockPinnedMessages, QUICK_EMOJIS,
  formatStayBadge, isArrivingThisWeek,
} from "@/data/chatMocks";
import { chatMessageSchema, validateField, sanitizeText } from "@/lib/validation";
import { chatLimiter } from "@/lib/rateLimiter";

interface CommunityChatProps {
  hostel: Hostel;
  onBack: () => void;
}

/* ─── Arriving This Week Strip ─── */
const ArrivingStrip = ({ gender }: { gender: "male" | "female" }) => {
  const arriving = mockChatUsers.filter((u) => u.gender === gender && isArrivingThisWeek(u.arrivalDate));
  if (arriving.length === 0) return null;
  return (
    <div className="border-b border-border bg-card px-4 py-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Who's arriving this week?</p>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {arriving.map((u) => (
          <div key={u.id} className="flex flex-shrink-0 flex-col items-center gap-1">
            <div className="relative">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-xl">{u.avatar}</span>
              {u.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-success" />}
            </div>
            <span className="text-[10px] font-semibold text-foreground">{u.firstName}</span>
            <span className="text-[9px] text-muted-foreground">
              {new Date(u.arrivalDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Pinned Messages ─── */
const PinnedSection = ({ messages }: { messages: ChatMessage[] }) => {
  const [open, setOpen] = useState(false);
  if (messages.length === 0) return null;
  return (
    <div className="border-b border-border bg-accent/30">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/50">
        <Pin className="h-3.5 w-3.5" />
        <span>{messages.length} pinned message{messages.length > 1 ? "s" : ""}</span>
        {open ? <ChevronUp className="ml-auto h-3.5 w-3.5" /> : <ChevronDown className="ml-auto h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="space-y-2 px-4 pb-3">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg bg-card px-3 py-2 text-sm text-foreground shadow-sm">{m.text}</div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Single Message Bubble ─── */
const MessageBubble = ({
  msg, user, isMine, onReact, onReport, onBlock, isAdmin, currentUserId,
}: {
  msg: ChatMessage; user?: ChatUser; isMine: boolean;
  onReact: (msgId: string, emoji: string) => void;
  onReport: (msgId: string) => void;
  onBlock: (userId: string) => void;
  isAdmin: boolean;
  currentUserId: string;
}) => {
  const [showEmojis, setShowEmojis] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const displayName = msg.userId === "admin" ? "Admin" : user?.firstName || "Unknown";
  const avatar = msg.userId === "admin" ? "🛡️" : user?.avatar || "👤";
  const stay = user ? formatStayBadge(user.arrivalDate, user.departureDate) : "";

  return (
    <div className={`group flex gap-2.5 px-4 py-1.5 transition-colors hover:bg-secondary/40 ${isMine ? "flex-row-reverse" : ""}`}>
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm">{avatar}</span>
      <div className={`max-w-[75%] ${isMine ? "items-end text-right" : ""}`}>
        <div className={`flex items-baseline gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
          <span className="text-xs font-bold text-foreground">{displayName}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(msg.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {stay && !isMine && msg.userId !== "admin" && (
          <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">{stay}</span>
        )}
        <p className={`mt-1 rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${isMine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
          {msg.text}
        </p>

        {/* Reactions */}
        {Object.keys(msg.reactions).length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isMine ? "justify-end" : ""}`}>
            {Object.entries(msg.reactions).map(([emoji, users]) => (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors ${users.includes(currentUserId) ? "border-primary/40 bg-primary/10" : "border-border bg-card hover:bg-secondary"}`}>
                {emoji} <span className="font-medium text-muted-foreground">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className={`mt-0.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isMine ? "justify-end" : ""}`}>
          <button onClick={() => setShowEmojis(!showEmojis)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Smile className="h-3.5 w-3.5" />
          </button>
          {!isMine && msg.userId !== "admin" && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Flag className="h-3.5 w-3.5" />
              </button>
              {showMenu && (
                <div className="absolute left-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-card shadow-card-hover">
                  <button onClick={() => { onReport(msg.id); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary">
                    <Flag className="h-3 w-3 text-warning" /> Report
                  </button>
                  <button onClick={() => { onBlock(msg.userId); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-secondary">
                    <Ban className="h-3 w-3" /> Block user
                  </button>
                  {isAdmin && (
                    <button onClick={() => setShowMenu(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-secondary">
                      <Shield className="h-3 w-3" /> Remove msg
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick emoji picker */}
        {showEmojis && (
          <div className={`mt-1 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-2 shadow-card ${isMine ? "ml-auto" : ""}`}>
            {QUICK_EMOJIS.map((e) => (
              <button key={e} onClick={() => { onReact(msg.id, e); setShowEmojis(false); }}
                className="rounded-md p-1 text-base transition-transform hover:scale-125">{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Main Chat Component ─── */
const CommunityChat = ({ hostel, onBack }: CommunityChatProps) => {
  const { user: authUser } = useAuth();
  const [activeChannel, setActiveChannel] = useState(CHAT_CHANNELS[0].id);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(mockMessages);
  const [input, setInput] = useState("");
  const [showChannels, setShowChannels] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter users by hostel gender
  const hostelUsers = useMemo(() =>
    mockChatUsers.filter(u => u.gender === hostel.gender),
    [hostel.gender]
  );

  const channel = CHAT_CHANNELS.find((c) => c.id === activeChannel)!;

  const usersMap = useMemo(() => {
    const map = new Map<string, ChatUser>();
    hostelUsers.forEach((u) => map.set(u.id, u));
    return map;
  }, [hostelUsers]);

  const channelMessages = useMemo(() => {
    const msgs = messages[activeChannel] || [];
    return msgs.filter((m) => {
      if (blockedUsers.has(m.userId)) return false;
      if (m.userId === "admin") return true;
      // Filter out messages from users of the wrong gender (if they exist in mock data)
      const u = usersMap.get(m.userId);
      return u !== undefined;
    });
  }, [messages, activeChannel, blockedUsers, usersMap]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [channelMessages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;

    // Rate Limiting
    const limit = chatLimiter.tryConsume("chat_send");
    if (!limit.allowed) {
      alert(`Too many messages. Please wait ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    // Validation & Sanitization
    const validation = validateField(chatMessageSchema, { text: sanitizeText(input) });
    if ("success" in validation && "data" in validation && validation.success) {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}`,
        userId: authUser?.id || "me",
        text: validation.data.text,
        timestamp: new Date().toISOString(),
        reactions: {},
      };
      setMessages((prev) => ({ ...prev, [activeChannel]: [...(prev[activeChannel] || []), msg] }));
      setInput("");
      inputRef.current?.focus();
    } else if ("error" in validation) {
      alert(validation.error as string);
    }
  }, [input, activeChannel, authUser?.id]);

  const handleReact = useCallback((msgId: string, emoji: string) => {
    setMessages((prev) => {
      const ch = [...(prev[activeChannel] || [])];
      const idx = ch.findIndex((m) => m.id === msgId);
      if (idx === -1) return prev;
      const msg = { ...ch[idx], reactions: { ...ch[idx].reactions } };
      const users = msg.reactions[emoji] ? [...msg.reactions[emoji]] : [];
      const myId = authUser?.id || "me";
      const ui = users.indexOf(myId);
      if (ui >= 0) users.splice(ui, 1); else users.push(myId);
      if (users.length === 0) delete msg.reactions[emoji]; else msg.reactions[emoji] = users;
      ch[idx] = msg;
      return { ...prev, [activeChannel]: ch };
    });
  }, [activeChannel]);

  const handleReport = useCallback((msgId: string) => {
    alert("Message reported. Our team will review it shortly.");
  }, []);

  const handleBlock = useCallback((userId: string) => {
    if (confirm(`Block this user? You won't see their messages.`)) {
      setBlockedUsers((prev) => new Set(prev).add(userId));
    }
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <h1 className="truncate text-base font-bold text-foreground">{hostel.name}</h1>
            <button onClick={() => setShowChannels(!showChannels)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <Hash className="h-3 w-3" /> {channel.name}
              <ChevronDown className={`h-3 w-3 transition-transform ${showChannels ? "rotate-180" : ""}`} />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="flex h-2 w-2 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">{hostelUsers.filter((u) => u.isOnline).length} online</span>
          </div>
        </div>

        {/* Channel Switcher */}
        {showChannels && (
          <div className="border-t border-border bg-card px-4 py-2 space-y-1">
            {CHAT_CHANNELS.map((ch) => (
              <button key={ch.id} onClick={() => { setActiveChannel(ch.id); setShowChannels(false); }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${activeChannel === ch.id ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-secondary"}`}>
                <span>{ch.icon}</span>
                <div className="text-left">
                  <p className="font-medium">{ch.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ch.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Arriving Strip */}
      <ArrivingStrip gender={hostel.gender} />

      {/* Pinned Messages */}
      <PinnedSection messages={mockPinnedMessages} />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3">
        {channelMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageCircle className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Be the first to say hi! 👋</p>
          </div>
        ) : (
          channelMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              user={usersMap.get(msg.userId)}
              isMine={msg.userId === (authUser?.id || "me")}
              onReact={handleReact}
              onReport={handleReport}
              onBlock={handleBlock}
              isAdmin={false}
              currentUserId={authUser?.id || "me"}
            />
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={`Message #${channel.name}...`}
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityChat;
