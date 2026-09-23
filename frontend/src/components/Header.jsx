import React, { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import { User, LogOut, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [appConfig, setAppConfig] = useState(null);
  const [error, setError] = useState(null);

  const [currentUser] = useState({
    name: "Juan Dela Cruz",
    role: "System Administrator",
  });

  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        const response = await fetch("/api/app-config");
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        setAppConfig(data);
        if (data.name) document.title = data.name;
      } catch (error) {
        console.error("Failed to load application configuration:", error);
        setError(error.message);
      }
    };
    fetchAppConfig();
  }, []);

  const handleLogout = () => {
    console.log("Logging out user...");
    alert("Logged out successfully");
  };

  if (error) {
    return (
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Configuration Error</span>
            <span className="text-sm font-semibold">{error}</span>
          </div>
        </div>
      </header>
    );
  }

  if (!appConfig) return null;

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      {/* Right Side: User Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-lg border border-border px-2.5 text-left transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
          <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-3.5" />
          </div>

          <div className="hidden flex-col sm:flex">
            <span className="text-xs font-semibold leading-none">
              {currentUser.name}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              {currentUser.role}
            </span>
          </div>

          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{currentUser.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{currentUser.role}</p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-2 size-4" />
            <span>Log Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}