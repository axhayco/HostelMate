import logo from "@/assets/logo.png";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const timer = setTimeout(onFinish, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className={show ? "animate-logo-pop" : "opacity-0"}>
        <img src={logo} alt="Hozztl" className="h-28 w-28" />
      </div>
      <h1
        className={`mt-4 text-2xl font-bold text-foreground ${show ? "animate-fade-up" : "opacity-0"}`}
        style={{ animationDelay: "0.4s", animationFillMode: "both" }}
      >
        Hozztl
      </h1>
      <p
        className={`mt-1 text-sm text-muted-foreground ${show ? "animate-fade-up" : "opacity-0"}`}
        style={{ animationDelay: "0.6s", animationFillMode: "both" }}
      >
        Find your perfect stay
      </p>
    </div>
  );
};

export default SplashScreen;
