/* src/components/Header.jsx */

import React from "react";
import Logo from "./Logo.jsx";
import "./Header.css";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">

        <div className="site-header__brand">

          {/* Logos */}
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
              Department of Health
            </span>

            <span className="site-header__name">
              NEGROS ISLAND REGION
            </span>

            <span className="site-header__sub-secondary">
              Republic of the Philippines
            </span>

          </div>

        </div>

      </div>
    </header>
  );
}