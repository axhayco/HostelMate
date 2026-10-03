import { useState, useCallback, useEffect, useMemo } from "react";
import logo from "@/assets/logo.png";
import SplashScreen from "@/components/SplashScreen";
import LoginPage from "@/components/LoginPage";
import RoleSelectPage from "@/components/RoleSelectPage";
import StudentPage from "@/components/StudentPage";
import OwnerPage from "@/components/OwnerPage";
import HostelDetail from "@/components/HostelDetail";
import CommunityChat from "@/components/CommunityChat";
import ProfilePage from "@/components/ProfilePage";
import HelpPage from "@/components/HelpPage";
import ContactPage from "@/components/ContactPage";
import BottomNav from "@/components/BottomNav";
import WishlistsPage from "@/components/WishlistsPage";
import TripsPage, { Booking } from "@/components/TripsPage";
import MessagesPage from "@/components/MessagesPage";
import { Hostel, mockHostels } from "@/data/hostels";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { HostelProvider } from "@/context/HostelContext";
import { AgentControlPlane } from "@/components/AgentControlPlane";

// ── Per-owner hostel persistence ──────────────────────────────────────────────
// Owner hostels are stored separately, keyed by ownerId, so no owner ever
// sees or touches another owner's data.
function ownerKey(ownerId: string) {
  return `hozztl-owner-hostels-${ownerId}`;
}
function loadOwnerHostels(ownerId: string): Hostel[] {
  try {
    const raw = localStorage.getItem(ownerKey(ownerId)) || localStorage.getItem(`hostelmate-owner-hostels-${ownerId}`);
    return raw ? (JSON.parse(raw) as Hostel[]) : [];
  } catch {
    return [];
  }
}
function saveOwnerHostels(ownerId: string, hostels: Hostel[]) {
  localStorage.setItem(ownerKey(ownerId), JSON.stringify(hostels));
}

type Page =
  | "splash" | "role-select"
  | "login-student" | "login-owner"
  | "student" | "owner"
  | "detail" | "chat"
  | "profile" | "help" | "contact"
  | "wishlists" | "trips" | "messages";

type Tab = "explore" | "wishlists" | "trips" | "messages" | "profile";

// ── URL & Browser History Helper ──────────────────────────────────────────────
function getUrlState() {
  const params = new URLSearchParams(window.location.search);
  const page = (params.get("page") as Page) || null;
  const hostelId = params.get("id") || null;
  const tab = (params.get("tab") as Tab) || null;
  return { page, hostelId, tab };
}

const Index = () => {
  const { user, role, loading, signOut } = useAuth();

  const [page, setPage] = useState<Page>(() => {
    const urlState = getUrlState();
    if (urlState.page) return urlState.page;

    // 1. If splash seen, avoid initializing to it
    const splashSeen = (sessionStorage.getItem("hozztl-splash-seen") || sessionStorage.getItem("hostelmate-splash-seen")) === "true";
    const savedPage = (sessionStorage.getItem("hozztl-current-page") || sessionStorage.getItem("hostelmate-current-page")) as Page;
    if (splashSeen && savedPage) return savedPage;
    if (splashSeen) return "student"; // safety default
    return "splash";
  });
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);

  // Owner's own hostels — loaded lazily when user is known, keyed by ownerId.
  // This is the SOURCE OF TRUTH for the owner dashboard.
  const [ownerHostels, setOwnerHostelsState] = useState<Hostel[]>([]);

  // Load owner hostels from storage whenever the authenticated user changes
  useEffect(() => {
    if (user?.id) {
      setOwnerHostelsState(loadOwnerHostels(user.id));
    } else {
      setOwnerHostelsState([]);
    }
  }, [user?.id]);

  // Persist owner hostels whenever they change
  useEffect(() => {
    if (user?.id) {
      saveOwnerHostels(user.id, ownerHostels);
    }
  }, [user?.id, ownerHostels]);

  // Callback for OwnerPage — only mutates this owner's slice
  const handleOwnerHostelsChange = useCallback((updated: Hostel[]) => {
    setOwnerHostelsState(updated);
  }, []);

  // Merged view for students: mock hostels + all owner-added listings.
  // We collect all owner-added hostels from localStorage keys so students
  // can browse every owner's listed hostels, but owners cannot see each other's dashboards.
  const hostels = useMemo<Hostel[]>(() => {
    // Gather all owner-added hostels from every key in localStorage
    const allOwnerAdded: Hostel[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("hozztl-owner-hostels-") || k.startsWith("hostelmate-owner-hostels-"))) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || "[]") as Hostel[];
          allOwnerAdded.push(...parsed);
        } catch { /* ignore corrupt entries */ }
      }
    }
    return [...mockHostels, ...allOwnerAdded];
  // Re-derive whenever ownerHostels changes so new listings appear immediately
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerHostels]);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const urlState = getUrlState();
    if (urlState.tab) return urlState.tab;
    return ((sessionStorage.getItem("hozztl-current-tab") || sessionStorage.getItem("hostelmate-current-tab")) as Tab) || "explore";
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("hozztl-favorites") || localStorage.getItem("hostelmate-favorites") || "[]";
      return JSON.parse(raw);
    } catch { return []; }
  });
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const raw = localStorage.getItem("hozztl-bookings") || localStorage.getItem("hostelmate-bookings") || "[]";
      return JSON.parse(raw);
    } catch { return []; }
  });

  // ── Browser History & URL Navigation Helper ──────────────────────────────
  const navigateTo = useCallback(
    (targetPage: Page, hostel?: Hostel | null, targetTab?: Tab, replace = false) => {
      setPage(targetPage);
      if (hostel !== undefined) setSelectedHostel(hostel ?? null);
      if (targetTab) setActiveTab(targetTab);

      const params = new URLSearchParams();
      if (targetPage !== "student" || (targetTab && targetTab !== "explore")) {
        params.set("page", targetPage);
      }
      if (hostel?.id) {
        params.set("id", hostel.id);
      }
      if (targetTab && targetTab !== "explore") {
        params.set("tab", targetTab);
      }

      const query = params.toString();
      const url = query ? `/?${query}` : "/";

      const stateObj = {
        page: targetPage,
        hostelId: hostel?.id ?? null,
        tab: targetTab ?? null,
      };

      if (replace) {
        window.history.replaceState(stateObj, "", url);
      } else {
        window.history.pushState(stateObj, "", url);
      }
    },
    []
  );

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo("student");
    }
  }, [navigateTo]);

  // Handle Browser Back / Forward buttons (popstate event)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      let targetPage: Page | null = e.state?.page ?? null;
      let hostelId: string | null = e.state?.hostelId ?? null;
      let targetTab: Tab | null = e.state?.tab ?? null;

      if (!targetPage || targetPage === "splash") {
        // Stop backward navigation at the student/owner login clarifying page (role-select)
        targetPage = "role-select";
        window.history.pushState({ page: "role-select" }, "", "/?page=role-select");
      }

      setPage(targetPage);

      if (hostelId) {
        const found = hostels.find((h) => h.id === hostelId);
        setSelectedHostel(found || null);
      } else if (targetPage !== "detail" && targetPage !== "chat") {
        setSelectedHostel(null);
      }

      if (targetTab) {
        setActiveTab(targetTab);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hostels]);

  // Initial resolution for selectedHostel if loaded directly from URL with ?id=
  useEffect(() => {
    const urlState = getUrlState();
    if (urlState.hostelId && !selectedHostel) {
      const found = hostels.find((h) => h.id === urlState.hostelId);
      if (found) setSelectedHostel(found);
    }
  }, [hostels, selectedHostel]);

  // ── Sync Page & Tab to sessionStorage ─────────────────────────────────────
  useEffect(() => {
    if (page !== "splash") {
      sessionStorage.setItem("hozztl-current-page", page);
    }
  }, [page]);

  useEffect(() => {
    sessionStorage.setItem("hozztl-current-tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("hozztl-bookings", JSON.stringify(bookings));
  }, [bookings]);

  // ── After Supabase finishes loading, decide which page to show & seed history stack ───────────
  useEffect(() => {
    if (loading) return; // wait for auth state

    const urlState = getUrlState();
    if (!urlState.page) {
      const target: Page = user && role === "owner" ? "owner" : user ? "student" : "role-select";
      // Seed history stack with role-select as root anchor if not already set
      if (!window.history.state || !window.history.state.page) {
        window.history.replaceState({ page: "role-select" }, "", "/?page=role-select");
        if (target !== "role-select") {
          window.history.pushState(
            { page: target, hostelId: null, tab: "explore" },
            "",
            target === "student" ? "/" : `/?page=${target}`
          );
        }
      }
      setPage(target);
    }
  }, [user, role, loading]);

  // ── Handle Google OAuth redirect: set role if pending ────────────────────
  useEffect(() => {
    if (!user) return;

    if (user.user_metadata?.role) return;

    const urlRole = new URLSearchParams(window.location.search).get("role");
    const pendingRole =
      localStorage.getItem("hozztl-pending-role") || localStorage.getItem("hostelmate-pending-role") || urlRole;

    if (!pendingRole) return;

    (async () => {
      await supabase.auth.updateUser({ data: { role: pendingRole } });
      await supabase.auth.refreshSession();
      localStorage.removeItem("hozztl-pending-role");
      localStorage.removeItem("hostelmate-pending-role");
      window.history.replaceState({}, "", "/");
      navigateTo(pendingRole === "owner" ? "owner" : "student", null, undefined, true);
    })();
  }, [user, navigateTo]);

  useEffect(() => {
    // Clear selected hostel when navigating away from detail or chat
    if (page !== "detail" && page !== "chat" && selectedHostel) {
      setSelectedHostel(null);
    }
  }, [page, selectedHostel]);

  const handleSplashFinish = useCallback(() => {
    sessionStorage.setItem("hozztl-splash-seen", "true");
    if (user && role) {
      navigateTo(role === "owner" ? "owner" : "student", null, undefined, true);
    } else {
      navigateTo("student", null, undefined, true);
    }
  }, [user, role, navigateTo]);

  const handleNavigate = useCallback((target: string) => {
    navigateTo(target as Page);
  }, [navigateTo]);

  const handleSelectHostel = useCallback((hostel: Hostel) => {
    navigateTo("detail", hostel);
  }, [navigateTo]);

  const handleLoginSuccess = useCallback((targetPage: Page) => {
    navigateTo(targetPage, null, targetPage === "student" ? "explore" : undefined);
  }, [navigateTo]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigateTo("role-select", null, "explore");
  }, [signOut, navigateTo]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      localStorage.setItem("hozztl-favorites", JSON.stringify(next));
      return next;
    });
  }, []);

  const handleBookHostel = useCallback((hostel: Hostel) => {
    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      hostelName: hostel.name,
      location: hostel.location,
      image: hostel.image,
      checkIn: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      checkOut: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      status: "upcoming",
    };
    setBookings((prev) => [newBooking, ...prev]);
    navigateTo("trips", null, "trips");
  }, [navigateTo]);

  const handleEditBooking = useCallback((id: string, checkIn: string, checkOut: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, checkIn, checkOut } : b))
    );
  }, []);

  const handleCancelBooking = useCallback((id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleTabChange = useCallback((tab: Tab) => {
    if (!user && (tab === "trips" || tab === "messages")) {
      navigateTo("role-select");
      return;
    }
    const pageMap: Record<Tab, Page> = {
      explore: "student",
      wishlists: "wishlists",
      trips: "trips",
      messages: "messages",
      profile: "profile",
    };
    navigateTo(pageMap[tab], null, tab);
  }, [user, navigateTo]);

  const showBottomNav = [
    "student", "wishlists", "trips", "messages",
    "profile", "help", "contact",
  ].includes(page);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="animate-logo-pop">
          <img src={logo} alt="Hostel Mate" className="h-20 w-20 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Page switch ───────────────────────────────────────────────────────────
  const hostelContextValue = { hostels, selectedHostel };

  const wrap = (el: React.ReactNode) => (
    <HostelProvider value={hostelContextValue}>
      {el}
      {page !== "splash" && <AgentControlPlane hasBottomNav={showBottomNav} />}
    </HostelProvider>
  );

  switch (page) {
    case "splash":
      return wrap(<SplashScreen onFinish={handleSplashFinish} />);

    case "role-select":
      return wrap(
        <RoleSelectPage
          onSelect={(role) =>
            navigateTo(role === "student" ? "login-student" : "login-owner")
          }
          onBack={handleBack}
        />
      );

    case "login-student":
      return wrap(
        <LoginPage
          role="student"
          onLogin={() => handleLoginSuccess("student")}
          onBack={handleBack}
        />
      );

    case "login-owner":
      return wrap(
        <LoginPage
          role="owner"
          onLogin={() => handleLoginSuccess("owner")}
          onBack={handleBack}
        />
      );

    case "student":
      return wrap(
        <>
          <StudentPage
            hostels={hostels}
            onSelectHostel={handleSelectHostel}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
          <BottomNav active={activeTab} onTabChange={handleTabChange} />
        </>
      );

    case "owner":
      return wrap(
        <OwnerPage
          // Only the current owner's own hostels — strictly isolated
          hostels={ownerHostels}
          onHostelsChange={handleOwnerHostelsChange}
          onBack={handleSignOut}
          ownerId={user?.id ?? "unknown"}
          onOpenProfile={() => navigateTo("profile")}
        />
      );

    case "detail":
      return wrap(selectedHostel ? (
        <HostelDetail
          hostel={selectedHostel}
          onBack={handleBack}
          onBook={() => handleBookHostel(selectedHostel)}
          onOpenChat={() => {
            if (!user) {
              navigateTo("role-select");
            } else {
              navigateTo("chat", selectedHostel);
            }
          }}
        />
      ) : (
        <>
          <StudentPage hostels={hostels} onSelectHostel={handleSelectHostel} favorites={favorites} onToggleFavorite={toggleFavorite} />
          <BottomNav active={activeTab} onTabChange={handleTabChange} />
        </>
      ));

    case "chat":
      return wrap(selectedHostel ? (
        <CommunityChat hostel={selectedHostel} onBack={handleBack} />
      ) : (
        <>
          <StudentPage hostels={hostels} onSelectHostel={handleSelectHostel} favorites={favorites} onToggleFavorite={toggleFavorite} />
          <BottomNav active={activeTab} onTabChange={handleTabChange} />
        </>
      ));

    case "wishlists":
      return wrap(
        <>
          <WishlistsPage favorites={favorites} hostels={hostels} onSelectHostel={handleSelectHostel} onToggleFavorite={toggleFavorite} />
          <BottomNav active={activeTab} onTabChange={handleTabChange} />
        </>
      );

    case "trips":
      return wrap(
        <>
          <TripsPage
            bookings={bookings}
            onEditBooking={handleEditBooking}
            onCancelBooking={handleCancelBooking}
          />
          <BottomNav active={activeTab} onTabChange={handleTabChange} />
        </>
      );

    case "messages":
      return wrap(
        <>
          <MessagesPage
            hostels={hostels}
            favorites={favorites}
            onOpenChat={(h) => navigateTo("chat", h)}
          />
          <BottomNav active={activeTab} onTabChange={handleTabChange} />
        </>
      );

    case "profile":
      return wrap(
        <>
          <ProfilePage
            isGuest={!user}
            onBack={handleBack}
            onNavigate={handleNavigate}
            onSignOut={handleSignOut}
          />
          <BottomNav active={activeTab} onTabChange={handleTabChange} />
        </>
      );

    case "help":
      return wrap(
        <>
          <HelpPage onBack={handleBack} />
          <BottomNav active={activeTab} onTabChange={handleTabChange} />
        </>
      );

    case "contact":
      return wrap(
        <>
          <ContactPage onBack={handleBack} />
          <BottomNav active={activeTab} onTabChange={handleTabChange} />
        </>
      );

    default:
      return wrap(<SplashScreen onFinish={handleSplashFinish} />);
  }
};

export default Index;