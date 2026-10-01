import { MessageCircle } from "lucide-react";
import { Hostel } from "@/data/hostels";
import { DEFAULT_HOSTEL_IMAGE, handleImageError } from "@/lib/imageUtils";

interface MessagesPageProps {
  hostels: Hostel[];
  favorites: string[];
  onOpenChat: (hostel: Hostel) => void;
}

const MessagesPage = ({ hostels, favorites, onOpenChat }: MessagesPageProps) => {
  // Show chat threads for favorited or visited hostels
  const chatHostels = hostels.filter((h) => favorites.includes(h.id));

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Messages</h1>
        <p className="text-sm text-muted-foreground mb-6">Community chats</p>

        {chatHostels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <MessageCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">No messages</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Save hostels to your wishlists to join their community chats
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {chatHostels.map((h) => (
              <button
                key={h.id}
                onClick={() => onOpenChat(h)}
                className="flex w-full items-center gap-3.5 rounded-2xl bg-card p-4 shadow-card transition-all hover:shadow-card-hover text-left"
              >
                <img
                  src={h.image || DEFAULT_HOSTEL_IMAGE}
                  alt={h.name}
                  onError={handleImageError}
                  className="h-12 w-12 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{h.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">Tap to open community chat</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-4 w-4 text-primary" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
