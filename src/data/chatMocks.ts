export interface ChatUser {
  id: string;
  firstName: string;
  avatar: string;
  bio?: string;
  arrivalDate: string;
  departureDate: string;
  isOnline: boolean;
  gender: "male" | "female";
}

export interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  timestamp: string;
  reactions: Record<string, string[]>; // emoji -> userId[]
  isPinned?: boolean;
  isReported?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  icon: string;
  description: string;
  isPrivate?: boolean;
}

export const CHAT_CHANNELS: ChatChannel[] = [
  { id: "public-lounge", name: "Public Area Lounge", icon: "🌐", description: "Open to all students in the area", isPrivate: false },
  { id: "roommates", name: "Roommate Finder", icon: "🤝", description: "Connect with prospective flatmates", isPrivate: false },
  { id: "resident-chat", name: "Resident-Only Chat", icon: "🔒", description: "Exclusive to checked-in residents", isPrivate: true },
  { id: "warden-notices", name: "Warden Announcements", icon: "📢", description: "Official hostel notices & Wi-Fi", isPrivate: true },
];

export const mockChatUsers: ChatUser[] = [
  // Boys
  { id: "u1", firstName: "Arjun", avatar: "🧑‍💻", gender: "male", bio: "CS student, love coding & coffee", arrivalDate: "2026-03-18", departureDate: "2026-03-25", isOnline: true },
  { id: "u3", firstName: "Rahul", avatar: "🏋️", gender: "male", bio: "Gym bro & foodie", arrivalDate: "2026-03-19", departureDate: "2026-03-26", isOnline: false },
  { id: "u5", firstName: "Karthik", avatar: "🎸", gender: "male", bio: "Music > everything", arrivalDate: "2026-03-21", departureDate: "2026-03-28", isOnline: false },
  // Girls
  { id: "u2", firstName: "Priya", avatar: "👩‍🎨", gender: "female", bio: "Design nerd. Always sketching.", arrivalDate: "2026-03-20", departureDate: "2026-03-23", isOnline: true },
  { id: "u4", firstName: "Sneha", avatar: "📚", gender: "female", bio: "Bookworm. Looking for study buddies!", arrivalDate: "2026-03-17", departureDate: "2026-03-22", isOnline: true },
  { id: "u6", firstName: "Ananya", avatar: "🌿", gender: "female", bio: "", arrivalDate: "2026-03-16", departureDate: "2026-03-20", isOnline: true },
];

export const mockPinnedMessages: ChatMessage[] = [
  { id: "pin1", userId: "admin", text: "📶 WiFi: Hozztl_5G | Password: welcome2026", timestamp: "2026-03-15T10:00:00", reactions: {}, isPinned: true },
  { id: "pin2", userId: "admin", text: "🏠 House Rules: Quiet hours 11PM–7AM. No smoking indoors. Keep common areas clean!", timestamp: "2026-03-15T10:05:00", reactions: {}, isPinned: true },
];

export const mockMessages: Record<string, ChatMessage[]> = {
  "public-lounge": [
    { id: "m1", userId: "u1", text: "Hey Kukatpally students! Anyone studying for JNTU mid-terms?", timestamp: "2026-03-17T14:30:00", reactions: { "🔥": ["u2", "u4"], "👋": ["u3"] } },
    { id: "m2", userId: "u4", text: "Yes! Looking for good quiet study cafes near the campus", timestamp: "2026-03-17T14:32:00", reactions: { "💯": ["u1"] } },
    { id: "m3", userId: "u2", text: "Anyone up for grabbing dinner around the corner?", timestamp: "2026-03-17T15:10:00", reactions: { "🙋": ["u1", "u3", "u4"], "😋": ["u6"] } },
  ],
  "roommates": [
    { id: "e1", userId: "u2", text: "Hi! Looking for 2-sharing room partner starting next month 🏠", timestamp: "2026-03-17T11:00:00", reactions: { "🏔️": ["u1", "u5"], "❤️": ["u4"] } },
    { id: "e2", userId: "u5", text: "Interested! What's your budget range?", timestamp: "2026-03-17T11:20:00", reactions: { "🎵": ["u2"] } },
  ],
  "resident-chat": [
    { id: "r1", userId: "u1", text: "Hey residents! Is the 3rd floor washing machine free right now?", timestamp: "2026-03-17T16:00:00", reactions: { "👍": ["u3"] } },
    { id: "r2", userId: "u3", text: "Yeah, just finished my load! It's open now.", timestamp: "2026-03-17T16:05:00", reactions: { "🙌": ["u1"] } },
  ],
  "warden-notices": [
    { id: "w1", userId: "admin", text: "📢 Notice: High-speed Wi-Fi upgraded to 300 Mbps across all floors. Password refreshed.", timestamp: "2026-03-15T10:00:00", reactions: { "🎉": ["u1", "u2", "u3"] } },
    { id: "w2", userId: "admin", text: "🏠 Reminder: Gate closes at 10:30 PM. Please inform warden for late entry permissions.", timestamp: "2026-03-15T10:05:00", reactions: { "👍": ["u4", "u5"] } },
  ],
};

export const CURRENT_USER: ChatUser = mockChatUsers[0];

export const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "👋", "🙋", "💯", "😋", "🎉", "👏"];

export function formatStayBadge(arrival: string, departure: string): string {
  const a = new Date(arrival);
  const d = new Date(departure);
  const fmt = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Staying ${fmt(a)}–${fmt(d)}`;
}

export function isArrivingThisWeek(arrivalDate: string): boolean {
  const now = new Date();
  const arrival = new Date(arrivalDate);
  const diffTime = arrival.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= -1 && diffDays <= 7;
}
