/* src/components/Logo.jsx */

import React from "react";

export default function Logo({ size = 40 }) {
  return (
    <div className="logo">

      <img
        src="/DOH_Logo.png"
        alt="DOH NIR CHD Logo"
        width={size}
        height={size}
        className="logo__image"
      />

      {/* <img
        src="/Bagong_PilipinasTransparent.png"
        alt="Bagong Pilipinas Logo"
        width={size}
        height={size}
        className="logo__image"
      /> */}

    </div>
  );
}