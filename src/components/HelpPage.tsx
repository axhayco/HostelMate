import { useState } from "react";
import { ChevronDown, ChevronUp, Search, BookOpen, MessageSquare, Shield, CreditCard, Home } from "lucide-react";

interface HelpPageProps {
  onBack: () => void;
}

const faqs = [
  {
    category: "Booking",
    icon: <Home className="h-4 w-4" />,
    items: [
      { q: "How do I book a hostel?", a: "Browse available hostels, select one you like, and tap 'Contact Owner' to inquire about availability. Once confirmed, you can proceed with the booking." },
      { q: "Can I cancel my booking?", a: "Yes, you can cancel your booking up to 48 hours before check-in for a full refund. Cancellations within 48 hours may incur a fee." },
      { q: "How do I check availability?", a: "Each hostel listing shows the number of vacant beds. You can also filter by vacancies using the sort option on the main page." },
    ],
  },
  {
    category: "Payments",
    icon: <CreditCard className="h-4 w-4" />,
    items: [
      { q: "What payment methods are accepted?", a: "We accept UPI, net banking, credit/debit cards, and cash payments directly to the hostel owner." },
      { q: "Is there a security deposit?", a: "Most hostels require a one-month security deposit, which is refundable when you check out." },
    ],
  },
  {
    category: "Safety",
    icon: <Shield className="h-4 w-4" />,
    items: [
      { q: "Are the hostels verified?", a: "All hostels on HostelMate go through a verification process. Look for the verified badge on listings." },
      { q: "How do I report an issue?", a: "You can report issues through the Community Chat or contact our support team via the Contact page." },
    ],
  },
  {
    category: "Community Chat",
    icon: <MessageSquare className="h-4 w-4" />,
    items: [
      { q: "How does Community Chat work?", a: "Once you book a hostel, you get access to that hostel's private chat room 5 days before check-in. Chat access closes 2 days after checkout." },
      { q: "Can I block someone in chat?", a: "Yes, tap the flag icon next to any message and select 'Block user'. You won't see their messages anymore." },
    ],
  },
];

const HelpPage = ({ onBack }: HelpPageProps) => {
  const [search, setSearch] = useState("");
  const [openIdx, setOpenIdx] = useState<string | null>(null);

  const filtered = faqs.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">Help & FAQ</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for help..."
            className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Quick Links */}
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <BookOpen className="h-4 w-4 text-primary" /> Quick Links
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Getting Started", emoji: "🚀" },
              { label: "Booking Guide", emoji: "📖" },
              { label: "Safety Tips", emoji: "🛡️" },
              { label: "Payment Help", emoji: "💳" },
            ].map((link) => (
              <button
                key={link.label}
                className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                <span>{link.emoji}</span> {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Sections */}
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <p className="text-sm">No results found for "{search}"</p>
          </div>
        ) : (
          filtered.map((cat) => (
            <div key={cat.category} className="rounded-2xl bg-card shadow-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <span className="text-primary">{cat.icon}</span>
                <h3 className="text-sm font-bold text-foreground">{cat.category}</h3>
              </div>
              <div className="divide-y divide-border">
                {cat.items.map((item) => {
                  const key = `${cat.category}-${item.q}`;
                  const isOpen = openIdx === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setOpenIdx(isOpen ? null : key)}
                      className="w-full text-left px-5 py-3 transition-colors hover:bg-secondary/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{item.q}</p>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      {isOpen && (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default HelpPage;
