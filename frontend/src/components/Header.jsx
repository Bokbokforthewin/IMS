import React, { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import "./Header.css";

export default function Header() {
  const [appConfig, setAppConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppConfig = async () => {
      try {
        const response = await fetch("/api/app-config");

        console.log("API status:", response.status);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        console.log("App config received:", data);

        setAppConfig(data);

        if (data.name) {
          document.title = data.name;
        }
      } catch (error) {
        console.error("Failed to load application configuration:", error);
        setError(error.message);
      }
    };

    fetchAppConfig();
  }, []);

  if (error) {
    return (
      <header className="site-header">
        <div className="container site-header__inner">
          <div className="site-header__brand">
            <div className="site-header__logo">
              <Logo size={38} />
            </div>

            <span
              className="site-header__divider"
              aria-hidden="true"
            />

            <div className="site-header__text">
              <span className="site-header__sub">
                Configuration Error
              </span>

              <span className="site-header__name">
                {error}
              </span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  if (!appConfig) {
    return null;
  }

  return (
    <header className="site-header">
      <div className="container site-header__inner">

        <div className="site-header__brand">

          {/* Logo */}
          <div className="site-header__logo">
            <Logo size={38} />
          </div>

          {/* Divider */}
          <span
            className="site-header__divider"
            aria-hidden="true"
          />

          {/* Organization Name */}
          <div className="site-header__text">

            <span className="site-header__sub">
              {appConfig.organization}
            </span>

            <span className="site-header__name">
              {appConfig.region}
            </span>

            <span className="site-header__sub-secondary">
              {appConfig.country}
            </span>

          </div>

        </div>

      </div>
    </header>
  );
}
