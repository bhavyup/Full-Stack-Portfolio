"use client";

import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { far } from "@fortawesome/free-regular-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
library.add(fas, far, fab);

export function SocialFillRail({
  orientation = "col", // "col" | "row"
  className = "",
  size = 45, // px diameter for each icon container
  items = [
    { key: "linkedin", label: "LinkedIn", href: "https://linkedin.com/in/yourname" },
    { key: "github", label: "GitHub", href: "https://github.com/yourname" },
    { key: "instagram", label: "Instagram", href: "https://instagram.com/yourname" },
    { key: "youtube", label: "YouTube", href: "https://youtube.com/@yourchannel" },
    { key: "telegram", label: "Telegram", href: "https://t.me/yourname" },
    { key: "mail", label: "Email", href: "mailto:you@example.com" },
  ],
  props,
}) {
  // Brand backgrounds for the “filled” overlay and tooltip
  const brandBg = {
    linkedin: { bg: "#0A66C2" },
    github: { bg: "#24292e" },
    instagram: {
      bg: "linear-gradient(45deg, #405de6, #5b51db, #b33ab4, #c135b4, #e1306c, #fd1f1f)",
    },
    youtube: { bg: "#FF0000" },
    telegram: { bg: "#229ED9" },
    mail: { bg: "linear-gradient(135deg, #0078D4, #005A9E)" },
  };

  // Icon factory — use FontAwesomeIcon but remove its `size` prop and control via style/class
  const Icon = ({ keyName }) => {
    // compute icon pixel size relative to container (slightly smaller than diameter)
    // tweak factor to taste
    const iconPx = Math.round(size * (keyName === "mail" ? 0.5 : 0.6)); // 50% of container diameter
    const commonProps = {
      // render as block and fix size to avoid baseline shifts
      style: { fontSize: `${iconPx}px`, lineHeight: 1, display: "block" },
      className: "fa-icon",
      "aria-hidden": true,
    };

    switch (keyName) {
      case "linkedin":
        return <FontAwesomeIcon {...commonProps} icon={["fab", "linkedin"]} />;
      case "github":
        return <FontAwesomeIcon {...commonProps} icon={["fab", "fa-github"]} />;
      case "instagram":
        return <FontAwesomeIcon {...commonProps} icon={["fab", "instagram"]} />;
      case "youtube":
        return <FontAwesomeIcon {...commonProps} icon={["fab", "youtube"]} />;
      case "telegram":
        return <FontAwesomeIcon {...commonProps} icon={["fab", "telegram"]} />;
      case "mail":
      default:
        return <FontAwesomeIcon {...commonProps} icon={["fas", "envelope"]} />;
    }
  };

  const railDir = orientation === "row" ? "flex-row" : "flex-col";

  return (
    <ul
      className={[
        "flex",
        railDir,
        "items-center justify-center gap-3",
        className,
      ].join(" ")}
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      {items.map((it) => {
        const brand = brandBg[it.key] ?? { bg: "#111827" };
        return (
          <li key={it.key} className="relative group overflow-visible ">
            <a
              href={it.href}
              aria-label={it.label}
              target={it.href?.startsWith("http") ? "_blank" : undefined}
              rel={it.href?.startsWith("http") ? "noreferrer noopener" : undefined}
              className={[
                "group relative overflow-hidden flex items-center justify-center",
                "rounded-full transition-all duration-500",
                "bg-[#04220a] text-[#00ff41]/90 hover:text-white",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
                "shadow-[0_2px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.12)]", props
              ].join(" ")}
              style={{
                width: size,
                height: size,
                // ensure no extra line-height or baseline for anchor
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                position: "relative",
                padding: 0,
                
              }}
            >
              {/* Fill overlay: grows from bottom to top */}
              <span
                aria-hidden
                className="absolute left-0 bottom-0 w-full h-0 rounded-full transition-all duration-500 ease-in-out group-hover:h-full"
                style={{
                  background: brand.bg,
                  zIndex: 0,
                }}
              />

              {/* Icon (stays above overlay) */}
              <span
                className="relative z-20 flex items-center justify-center"
                style={{
                  // ensure the icon uses currentColor if you want to change color on hover:
                  color: "currentColor",
                }}
              >
                <Icon keyName={it.key} />
              </span>
            </a>

            {/* Tooltip */}
            <div
              className={[
                "pointer-events-none absolute",
                orientation === "row"
                  ? "left-1/2 -translate-x-1/2 top-full mt-5"
                  : "right-[110%] top-1/2 -translate-y-1/2",
                "px-2 py-1 rounded text-white text-[12px] opacity-0 /translate-y-2",
                "group-hover:opacity-100 group-hover:-translate-y-1/2 transition-all duration-500",
                "shadow-[0_6px_24px_rgba(0,0,0,0.18)]",
              ].join(" ")}
              style={{
                background: brand.bg,
                whiteSpace: "nowrap",
                zIndex: 40,
                transformOrigin: "center",
              }}
            >
              {it.label}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
