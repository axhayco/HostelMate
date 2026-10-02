import { useState } from "react";
import { Mail, Phone, MapPin, Send, Check, MessageSquare, Clock } from "lucide-react";
import { contactFormSchema, validateField, sanitizeText } from "@/lib/validation";
import { formSubmitLimiter } from "@/lib/rateLimiter";

interface ContactPageProps {
  onBack: () => void;
}

const ContactPage = ({ onBack }: ContactPageProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    // Rate Limiting
    const limit = formSubmitLimiter.tryConsume("contact_submit");
    if (!limit.allowed) {
      alert(`Too many requests. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    // Validation & Sanitization
    const validation = validateField(contactFormSchema, {
      name: sanitizeText(name),
      email: sanitizeText(email).toLowerCase(),
      message: sanitizeText(message),
    });

    if ("success" in validation && "data" in validation && validation.success) {
      setSubmitted(true);
    } else if ("error" in validation) {
      alert(validation.error as string);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">Contact Us</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: <Phone className="h-5 w-5" />, label: "Call Us", value: "+91 80 1234 5678", href: "tel:+918012345678" },
            { icon: <Mail className="h-5 w-5" />, label: "Email", value: "support@hostelmate.in", href: "mailto:support@hostelmate.in" },
            { icon: <MapPin className="h-5 w-5" />, label: "Office", value: "Koramangala, Bangalore 560034", href: "#" },
            { icon: <Clock className="h-5 w-5" />, label: "Hours", value: "Mon–Sat, 9 AM – 7 PM IST", href: "#" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-card transition-colors hover:bg-secondary/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {item.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium text-foreground">{item.value}</p>
              </div>
            </a>
          ))}
        </div>

        {/* Contact Form */}
        <div className="rounded-2xl bg-card p-5 shadow-card">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <MessageSquare className="h-4 w-4 text-primary" /> Send a Message
          </h3>

          {submitted ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-7 w-7" />
              </div>
              <p className="text-base font-bold text-foreground">Message Sent!</p>
              <p className="mt-1 text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setEmail("");
                  setMessage("");
                }}
                className="mt-4 rounded-xl bg-secondary px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Send Another
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Message</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help you?"
                  className={`${inputClass} resize-none`}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!name.trim() || !email.trim() || !message.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              >
                <Send className="h-4 w-4" /> Send Message
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ContactPage;
