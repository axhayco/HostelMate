import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useHostelContext } from "@/context/HostelContext";
import { Hostel } from "@/data/hostels";
import { Bot, X, Send, Sparkles, Loader2, AlertTriangle, Check } from "lucide-react";
import { sanitizeText } from "@/lib/validation";
import { agentLimiter } from "@/lib/rateLimiter";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  pendingConfirm?: ConfirmAction;
}

interface ConfirmAction {
  label: string;
  detail: string;
  onConfirm: () => void;
}

// ─── Local Agent Engine (hostel-aware) ────────────────────────────────────────

const ELECTRICITY_DATA: Record<string, { balance: string; daysLeft: string }> = {
  "304": { balance: "₹145", daysLeft: "~2 days" },
  "102": { balance: "₹520", daysLeft: "~8 days" },
  "201": { balance: "₹310", daysLeft: "~5 days" },
  "110": { balance: "₹80", daysLeft: "~1 day" },
};

const MESS_MENU: Record<string, Record<string, string>> = {
  today: {
    breakfast: "Poha, Bread Butter, Tea/Coffee",
    lunch: "Rajma Chawal, Roti, Mix Veg, Salad",
    dinner: "Paneer Butter Masala, Naan, Dal Fry, Rice",
  },
  tomorrow: {
    breakfast: "Idli Sambar, Coconut Chutney, Coffee",
    lunch: "Chicken Curry, Steamed Rice, Dal Tadka, Raita",
    dinner: "Chole Bhature, Jeera Rice, Green Salad",
  },
};

const PENDING_LEAVES = [
  { name: "John Doe", room: "102", dates: "Oct 12-15", id: "LV-2841" },
  { name: "Priya Sharma", room: "204", dates: "Oct 14-16", id: "LV-2843" },
  { name: "Arjun Reddy", room: "310", dates: "Oct 13-14", id: "LV-2845" },
];

let leaveCounter = 2847;

interface ConversationState {
  awaitingRoomNumber?: boolean;
  awaitingLeaveStart?: boolean;
  awaitingLeaveEnd?: boolean;
  awaitingLeaveReason?: boolean;
  leaveStart?: string;
  leaveEnd?: string;
  awaitingBroadcastMessage?: boolean;
  awaitingBroadcastUrgency?: boolean;
  broadcastMessage?: string;
  awaitingMealRating?: boolean;
  awaitingMealFeedback?: boolean;
  mealType?: string;
  mealRating?: number;
  awaitingLeaveDecision?: boolean;
  leaveTarget?: string;
}

let convState: ConversationState = {};

function handleAgentQuery(
  input: string,
  role: "student" | "owner",
  hostel: Hostel | null,
  allHostels: Hostel[]
): { reply: string; needsConfirm: boolean } {
  const q = input.toLowerCase().trim();
  const hostelName = hostel?.name || "your hostel";
  const hasMeals = hostel?.amenities?.includes("Meals Included") ?? false;

  // ── Handle ongoing conversation states ──────────────────────────────────
  if (convState.awaitingRoomNumber) {
    convState.awaitingRoomNumber = false;
    const room = q.replace(/[^0-9]/g, "");
    const data = ELECTRICITY_DATA[room];
    if (data) {
      return { reply: `Room ${room} at ${hostelName} — electricity balance: ${data.balance} remaining (${data.daysLeft} left). Remember to top up before it runs out!`, needsConfirm: false };
    }
    return { reply: `I couldn't find records for Room ${room} at ${hostelName}. Please check your room number and try again.`, needsConfirm: false };
  }

  if (convState.awaitingLeaveStart) {
    convState.awaitingLeaveStart = false;
    convState.leaveStart = input.trim();
    convState.awaitingLeaveEnd = true;
    return { reply: `Got it, starting ${convState.leaveStart}. What's your return date?`, needsConfirm: false };
  }

  if (convState.awaitingLeaveEnd) {
    convState.awaitingLeaveEnd = false;
    convState.leaveEnd = input.trim();
    convState.awaitingLeaveReason = true;
    return { reply: "And what's the reason for your leave?", needsConfirm: false };
  }

  if (convState.awaitingLeaveReason) {
    convState.awaitingLeaveReason = false;
    const ticketId = `LV-${++leaveCounter}`;
    const reply = `I'll submit your leave request from ${hostelName}:\n• From: ${convState.leaveStart}\n• To: ${convState.leaveEnd}\n• Reason: ${input.trim()}\n• Ticket: ${ticketId}\n\nShall I proceed?`;
    return { reply, needsConfirm: true };
  }

  if (convState.awaitingBroadcastMessage) {
    convState.awaitingBroadcastMessage = false;
    convState.broadcastMessage = input.trim();
    convState.awaitingBroadcastUrgency = true;
    return { reply: "What urgency level? (Low / Normal / High / Critical)", needsConfirm: false };
  }

  if (convState.awaitingBroadcastUrgency) {
    convState.awaitingBroadcastUrgency = false;
    const urgency = input.trim();
    const reply = `Ready to broadcast to all residents:\n• Message: "${convState.broadcastMessage}"\n• Urgency: ${urgency}\n\nShall I proceed?`;
    convState.broadcastMessage = undefined;
    return { reply, needsConfirm: true };
  }

  if (convState.awaitingMealRating) {
    convState.awaitingMealRating = false;
    const rating = parseInt(q.replace(/[^0-9]/g, ""));
    if (rating >= 1 && rating <= 5) {
      convState.mealRating = rating;
      convState.awaitingMealFeedback = true;
      return { reply: `${rating}/5 — noted! Any additional feedback? (or say "skip")`, needsConfirm: false };
    }
    return { reply: "Please give a rating between 1 and 5.", needsConfirm: false };
  }

  if (convState.awaitingMealFeedback) {
    convState.awaitingMealFeedback = false;
    const feedback = q === "skip" || q === "no" ? "" : input.trim();
    const result = `Thanks! Your ${convState.mealType || "meal"} rating of ${convState.mealRating}/5 at ${hostelName} has been recorded.${feedback ? ` Feedback: "${feedback}"` : ""} This week's average mess rating is 3.8/5.`;
    convState.mealType = undefined;
    convState.mealRating = undefined;
    return { reply: result, needsConfirm: false };
  }

  if (convState.awaitingLeaveDecision) {
    convState.awaitingLeaveDecision = false;
    const isApprove = q.includes("approve") || q.includes("yes");
    const isReject = q.includes("reject") || q.includes("no") || q.includes("deny");
    if (isReject) {
      return { reply: `I'll reject the leave for ${convState.leaveTarget}. Shall I proceed?`, needsConfirm: true };
    }
    if (isApprove) {
      return { reply: `Done! Leave for ${convState.leaveTarget} has been approved. They'll be notified shortly.`, needsConfirm: false };
    }
    return { reply: "Please say 'approve' or 'reject' for this leave request.", needsConfirm: false };
  }

  // ── Student Skills ──────────────────────────────────────────────────────
  if (role === "student") {
    // Electricity balance
    if (q.includes("electric") || q.includes("balance") || q.includes("power") || q.includes("unit")) {
      if (!hostel) {
        return { reply: "To check your electricity balance, please open your hostel's page first. I'll look up your room's balance from there! ⚡", needsConfirm: false };
      }
      const roomMatch = q.match(/(\d{3})/);
      if (roomMatch) {
        const data = ELECTRICITY_DATA[roomMatch[1]];
        if (data) {
          return { reply: `Room ${roomMatch[1]} at ${hostel.name} — electricity balance: ${data.balance} remaining (${data.daysLeft} left). Top up soon if it's running low!`, needsConfirm: false };
        }
        return { reply: `I couldn't find records for Room ${roomMatch[1]} at ${hostel.name}. Double-check your room number.`, needsConfirm: false };
      }
      convState.awaitingRoomNumber = true;
      return { reply: `Sure, I can check your electricity balance at ${hostel.name}. What's your room number?`, needsConfirm: false };
    }

    // Mess menu
    if (q.includes("mess") || q.includes("menu") || q.includes("food") || q.includes("lunch") || q.includes("dinner") || q.includes("breakfast")) {
      if (!hostel) {
        return { reply: "To check the mess menu, please tap on a specific hostel first. I'll then show you today's meals — but only if that hostel provides them! 🍛", needsConfirm: false };
      }
      if (!hasMeals) {
        return { reply: `${hostel.name} doesn't include meals (rent: ₹${hostel.rent.toLocaleString()}/mo — self-catering plan). You may want to check nearby restaurants or tiffin services.`, needsConfirm: false };
      }
      const isTomorrow = q.includes("tomorrow");
      const day = isTomorrow ? "tomorrow" : "today";
      const menu = MESS_MENU[day];
      let mealType: string | null = null;
      if (q.includes("breakfast")) mealType = "breakfast";
      else if (q.includes("lunch")) mealType = "lunch";
      else if (q.includes("dinner")) mealType = "dinner";

      if (mealType) {
        return { reply: `${day.charAt(0).toUpperCase() + day.slice(1)}'s ${mealType} at ${hostel.name}: ${menu[mealType]}`, needsConfirm: false };
      }
      return {
        reply: `Here's ${day}'s mess menu at ${hostel.name}:\n🌅 Breakfast: ${menu.breakfast}\n🍛 Lunch: ${menu.lunch}\n🌙 Dinner: ${menu.dinner}`,
        needsConfirm: false,
      };
    }

    // Leave request
    if (q.includes("leave") || q.includes("absence") || q.includes("going home")) {
      if (!hostel) {
        return { reply: "To submit a leave request, please open your hostel's page first so I can record it in the right place. 🏠", needsConfirm: false };
      }
      convState.awaitingLeaveStart = true;
      return { reply: `I can help you submit a leave request from ${hostel.name}. When does your leave start?`, needsConfirm: false };
    }

    // Rate meal
    if (q.includes("rate") || q.includes("rating")) {
      if (!hasMeals) {
        return { reply: `${hostelName} doesn't have an in-house mess. Meal ratings are only available for hostels with included meals.`, needsConfirm: false };
      }
      let mealTypeStr = "today's meal";
      if (q.includes("breakfast")) mealTypeStr = "breakfast";
      else if (q.includes("lunch")) mealTypeStr = "lunch";
      else if (q.includes("dinner")) mealTypeStr = "dinner";
      convState.mealType = mealTypeStr;
      convState.awaitingMealRating = true;
      return { reply: `Sure! Rate ${mealTypeStr} at ${hostelName} from 1 to 5:`, needsConfirm: false };
    }

    // Hostel info
    if (q.includes("amenit") || q.includes("facilit") || q.includes("what does") || q.includes("details") || q.includes("about this")) {
      if (hostel) {
        return {
          reply: `${hostel.name} (${hostel.location}):\n• Rent: ₹${hostel.rent.toLocaleString()}/mo\n• Type: ${hostel.gender === "male" ? "Boys" : "Girls"}\n• Vacancies: ${hostel.vacancies}/${hostel.totalCapacity} beds\n• Rating: ${hostel.rating}/5\n• Amenities: ${hostel.amenities.join(", ")}\n• Contact: ${hostel.contactPhone}`,
          needsConfirm: false,
        };
      }
      return { reply: "Select a hostel first to see its details.", needsConfirm: false };
    }

    // Vacancy
    if (q.includes("vacanc") || q.includes("available") || q.includes("room")) {
      if (hostel) {
        const status = hostel.vacancies === 0
          ? `${hostel.name} is currently full. Join the waitlist or check other hostels nearby.`
          : `${hostel.name} has ${hostel.vacancies} beds available out of ${hostel.totalCapacity}. Rent is ₹${hostel.rent.toLocaleString()}/mo.`;
        return { reply: status, needsConfirm: false };
      }
      return { reply: "Select a hostel first to check vacancies.", needsConfirm: false };
    }
  }

  // ── Owner Skills ────────────────────────────────────────────────────────
  if (role === "owner") {
    // Occupancy stats — use real hostel data
    if (q.includes("occupancy") || q.includes("stats") || q.includes("vacant") || q.includes("beds") || q.includes("revenue")) {
      const ownerHostels = allHostels.filter(h => h.ownerId);
      const totalBedsNum = ownerHostels.length > 0 ? ownerHostels.reduce((s, h) => s + h.totalCapacity, 0) : 120;
      const vacantNum = ownerHostels.length > 0 ? ownerHostels.reduce((s, h) => s + h.vacancies, 0) : 12;
      const occupiedNum = totalBedsNum - vacantNum;
      const rateNum = totalBedsNum ? Math.round((occupiedNum / totalBedsNum) * 100) : 85;
      const avgRentNum = ownerHostels.length > 0
        ? Math.round(ownerHostels.reduce((s, h) => s + h.rent, 0) / ownerHostels.length)
        : 6000;
      const revenueNum = occupiedNum * avgRentNum;
      const countNum = ownerHostels.length || 3;

      let extras = "";
      if (ownerHostels.length > 1) {
        const sorted = [...ownerHostels].sort((a, b) => {
          const rA = a.totalCapacity ? (a.totalCapacity - a.vacancies) / a.totalCapacity : 0;
          const rB = b.totalCapacity ? (b.totalCapacity - b.vacancies) / b.totalCapacity : 0;
          return rB - rA;
        });
        const topPct = Math.round(((sorted[0].totalCapacity - sorted[0].vacancies) / sorted[0].totalCapacity) * 100);
        const lowPct = Math.round(((sorted[sorted.length - 1].totalCapacity - sorted[sorted.length - 1].vacancies) / sorted[sorted.length - 1].totalCapacity) * 100);
        extras = `\n🏆 Highest: ${sorted[0].name} (${topPct}%)\n📉 Lowest: ${sorted[sorted.length - 1].name} (${lowPct}%)`;
      }

      return {
        reply: `Here are your current stats:\n📊 Overall occupancy: ${rateNum}% across ${countNum} properties\n🛏️ Vacant beds: ${vacantNum}\n💰 Monthly revenue: ~₹${revenueNum.toLocaleString()}${extras}`,
        needsConfirm: false,
      };
    }

    // Pending leaves
    if (q.includes("pending") || q.includes("leave")) {
      const target = PENDING_LEAVES.find(
        (l) => q.includes(l.name.toLowerCase()) || q.includes(l.id.toLowerCase())
      );
      if (target && (q.includes("approve") || q.includes("reject"))) {
        convState.awaitingLeaveDecision = true;
        convState.leaveTarget = `${target.name} (${target.id})`;
        return { reply: `${target.name}, Room ${target.room}, ${target.dates} (${target.id}). Do you want to approve or reject?`, needsConfirm: false };
      }
      const list = PENDING_LEAVES.map(
        (l) => `• ${l.name} — Room ${l.room}, ${l.dates} (${l.id})`
      ).join("\n");
      return {
        reply: `You have ${PENDING_LEAVES.length} pending leave requests:\n${list}\n\nTo act on one, say "approve" or "reject" followed by the student name or ID.`,
        needsConfirm: false,
      };
    }

    // Broadcast
    if (q.includes("broadcast") || q.includes("notice") || q.includes("announce")) {
      convState.awaitingBroadcastMessage = true;
      return { reply: "What message would you like to broadcast to residents?", needsConfirm: false };
    }
  }

  // ── Confirmed actions ───────────────────────────────────────────────────
  if (q === "confirmed, please proceed." || q === "yes" || q === "confirm" || q === "proceed") {
    const finalTicketId = `LV-${leaveCounter}`;
    return { reply: `Done! Your request has been processed successfully. Reference: ${finalTicketId}. You'll receive a notification shortly.`, needsConfirm: false };
  }

  // ── Student: explore/search skills (no hostel selected) ─────────────────
  if (role === "student" && !hostel) {
    if (q.includes("find") || q.includes("search") || q.includes("look") || q.includes("hostel") || q.includes("explore")) {
      const count = allHostels.length;
      const withMeals = allHostels.filter(h => h.amenities?.includes("Meals Included")).length;
      const minRent = allHostels.length ? Math.min(...allHostels.map(h => h.rent)) : 0;
      return {
        reply: `We currently have ${count} hostels listed on Hozztl! 🏠\n• ${withMeals} include meals\n• Starting from ₹${minRent.toLocaleString()}/mo\n\nScroll through the listings and tap any card to explore details, amenities, and vacancies.`,
        needsConfirm: false,
      };
    }
  }

  // ── General / fallback ──────────────────────────────────────────────────
  if (q.includes("hi") || q.includes("hello") || q.includes("hey")) {
    const isExploring = role === "student" && !hostel;
    const skillList = isExploring
      ? "find the right hostel, check vacancies, or compare amenities"
      : role === "student"
        ? `electricity balance${hasMeals ? ", mess menu" : ""}, leave requests, or hostel details`
        : "occupancy stats, pending leaves, or broadcasting notices";
    return { reply: `Hey there! I can help you with ${skillList}. What do you need?`, needsConfirm: false };
  }

  if (q.includes("thank")) {
    return { reply: "You're welcome! Let me know if you need anything else. 😊", needsConfirm: false };
  }

  if (q.includes("help") || q.includes("what can you do")) {
    if (role === "student") {
      const items = [
        "1️⃣ Check electricity balance",
        hasMeals ? "2️⃣ Show mess menu (today/tomorrow)" : null,
        `${hasMeals ? "3️⃣" : "2️⃣"} Submit a leave request`,
        `${hasMeals ? "4️⃣" : "3️⃣"} Check hostel details & vacancies`,
        hasMeals ? "5️⃣ Rate a meal" : null,
      ].filter(Boolean).join("\n");
      return { reply: `Here's what I can do at ${hostelName}:\n${items}\n\nJust ask naturally!`, needsConfirm: false };
    }
    return {
      reply: "Here's what I can do:\n1️⃣ Show occupancy stats (from your hostels)\n2️⃣ View & act on pending leaves\n3️⃣ Broadcast notices to residents\n\nJust ask naturally!",
      needsConfirm: false,
    };
  }

  // Fallback
  const fallbackSkillsStr = role === "student"
    ? `electricity balance${hasMeals ? ", mess menu" : ""}, leave requests, or hostel info`
    : "occupancy stats, pending leaves, or broadcast notices";
  return {
    reply: `I'm not sure I understood that. I can help with ${fallbackSkillsStr}. Could you try rephrasing?`,
    needsConfirm: false,
  };
}

// ─── Confirm Card ─────────────────────────────────────────────────────────────

function ConfirmCard({ action, onConfirm, onCancel }: {
  action: ConfirmAction;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2 w-full">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Confirm Action</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Check className="h-3 w-3" /> Proceed
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border bg-card py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const AgentControlPlane = ({ hasBottomNav }: { hasBottomNav?: boolean }) => {
  const { user, role } = useAuth();
  const { hostels: allHostels, selectedHostel } = useHostelContext();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activePendingId, setActivePendingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveRole = (role || "student") as "student" | "owner";

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Greeting on open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      convState = {};
      let greeting: string;
      if (effectiveRole === "owner") {
        greeting = "Welcome back. Ask me about occupancy stats, pending leaves, or to broadcast a notice.";
      } else if (selectedHostel) {
        const hasMeals = selectedHostel.amenities?.includes("Meals Included");
        greeting = `Hey! You're viewing ${selectedHostel.name} (${selectedHostel.location}). I can help with your electricity balance${hasMeals ? ", today's mess menu" : ""}, or submit a leave request.`;
      } else {
        greeting = `Hey! I'm your Hozztl assistant. 👋\nBrowse the listings and tap a hostel to unlock resident features like electricity balance, mess menus, and leave requests. Or ask me to help you find the right place!`;
      }
      setMessages([{ id: "init", role: "assistant", content: greeting }]);
    }
  }, [isOpen, effectiveRole, messages.length, selectedHostel]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Rate Limiting
    const limit = agentLimiter.tryConsume("agent_msg");
    if (!limit.allowed) {
      alert(`Too many requests. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    // Sanitization & Length check (Validation bypass, done inline)
    const sanitizedText = sanitizeText(text);
    if (sanitizedText.length > 500) {
      alert("Message is too long (max 500 characters).");
      return;
    }

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: sanitizedText };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInputText("");
    setIsLoading(true);
    setActivePendingId(null);

    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

    const { reply, needsConfirm } = handleAgentQuery(sanitizedText, effectiveRole, selectedHostel, allHostels);
    const assistantId = `a-${Date.now()}`;

    if (needsConfirm) {
      const confirmAction: ConfirmAction = {
        label: "High-impact action",
        detail: reply,
        onConfirm: async () => {
          setActivePendingId(null);
          const confirmUserMsg: Message = { id: `u-${Date.now()}`, role: "user", content: "Confirmed, please proceed." };
          setMessages((p) => [...p, confirmUserMsg]);
          setIsLoading(true);

          await new Promise((r) => setTimeout(r, 500));

          const { reply: finalReply } = handleAgentQuery("Confirmed, please proceed.", effectiveRole, selectedHostel, allHostels);
          setMessages((p) => [...p, { id: `a-${Date.now()}`, role: "assistant", content: finalReply }]);
          setIsLoading(false);
        },
      };
      setMessages((p) => [...p, { id: assistantId, role: "assistant", content: reply, pendingConfirm: confirmAction }]);
      setActivePendingId(assistantId);
    } else {
      setMessages((p) => [...p, { id: assistantId, role: "assistant", content: reply }]);
    }

    setIsLoading(false);
  };

  const handleCancel = () => {
    setActivePendingId(null);
    convState = {};
    setMessages((p) => [...p, { id: `a-${Date.now()}`, role: "assistant", content: "Got it, cancelled. Anything else I can help with?" }]);
  };

  const quickActions =
    effectiveRole === "student"
      ? selectedHostel
        ? [
          "Electricity balance",
          ...(selectedHostel.amenities?.includes("Meals Included") ? ["Today's mess menu"] : []),
          "Request leave",
          "Hostel details",
        ]
        : ["Find a hostel", "How many hostels?", "Help"]
      : ["Occupancy stats", "Pending leaves", "Broadcast a notice"];

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
          } ${hasBottomNav ? "bottom-24" : "bottom-6"}`}
        aria-label="Open Hozztl Assistant"
      >
        <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse" />
        <Bot className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[85vh] w-full flex-col overflow-hidden border border-border bg-card shadow-2xl sm:bottom-5 sm:right-5 sm:h-[600px] sm:w-[380px] sm:rounded-2xl animate-in slide-in-from-bottom-8 duration-300">

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">Hozztl Assistant</p>
                <p className="flex items-center gap-1 text-[10px] opacity-80">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
                  </span>
                  {selectedHostel ? selectedHostel.name : "Always Active"}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setIsOpen(false); setMessages([]); setActivePendingId(null); convState = {}; }}
              className="rounded-full p-2 transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background/50 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex max-w-[88%] flex-col ${msg.role === "user" ? "ml-auto items-end" : "items-start"
                  }`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-line ${msg.role === "user"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm border border-border bg-card text-foreground"
                    }`}
                >
                  {msg.content}
                </div>

                {msg.pendingConfirm && activePendingId === msg.id && (
                  <div className="w-full">
                    <ConfirmCard
                      action={msg.pendingConfirm}
                      onConfirm={msg.pendingConfirm.onConfirm}
                      onCancel={handleCancel}
                    />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex max-w-[88%] items-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            )}

            {/* Quick actions — only show at start */}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendMessage(action)}
                    className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border bg-card p-3">
            <div className="flex items-center gap-2 rounded-full border border-input bg-background px-4 py-2 shadow-sm transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask anything..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) sendMessage(inputText); }}
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isLoading}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {isLoading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Send className="h-3.5 w-3.5 -ml-px" />
                }
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-muted-foreground">
              {selectedHostel ? `Assisting for ${selectedHostel.name}` : "Hozztl Digital Assistant"}
            </p>
          </div>
        </div>
      )}
    </>
  );
};