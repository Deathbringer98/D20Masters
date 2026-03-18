import React, { useState } from "react";

const sectionStyle = {
  maxWidth: 700,
  margin: "0 auto",
  padding: "40px 24px",
  color: "#e2e8f0",
  fontFamily: "sans-serif",
  lineHeight: 1.7,
};

const headingStyle = {
  color: "#f8fafc",
  borderBottom: "1px solid #334155",
  paddingBottom: 8,
  marginTop: 40,
};

const subStyle = { color: "#94a3b8", fontSize: 13, marginBottom: 24 };

const tabs = ["Privacy Policy", "Terms of Service", "FAQ"];

export default function LegalPages() {
  const [active, setActive] = useState(0);

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e293b", paddingTop: 24, paddingLeft: 24, gap: 8 }}>
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setActive(i)}
            style={{
              background: active === i ? "#1e293b" : "transparent",
              color: active === i ? "#f8fafc" : "#94a3b8",
              border: "none",
              borderRadius: "6px 6px 0 0",
              padding: "8px 20px",
              cursor: "pointer",
              fontWeight: active === i ? 700 : 400,
              fontSize: 14,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={sectionStyle}>
        {active === 0 && <PrivacyPolicy />}
        {active === 1 && <TermsOfService />}
        {active === 2 && <FAQ />}
      </div>

      <footer style={{ textAlign: "center", color: "#475569", padding: "24px 0", fontSize: 13 }}>
        © 2026 D20Masters — Owner &amp; Creator: GhostByte
      </footer>
    </div>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <h1 style={headingStyle}>Privacy Policy</h1>
      <p style={subStyle}>Last updated: March 17, 2026</p>

      <h2 style={headingStyle}>What We Collect</h2>
      <p>
        D20Masters does not collect, store, or share any personal information.
        No accounts are required and no data is transmitted to any server.
        All dice rolls happen locally in your browser.
      </p>

      <h2 style={headingStyle}>Cookies &amp; Tracking</h2>
      <p>
        We do not use cookies, analytics, advertising trackers, or any
        third-party tracking scripts. Your activity on this site is entirely
        private.
      </p>

      <h2 style={headingStyle}>Third-Party Content</h2>
      <p>
        Background images are loaded from Unsplash. Unsplash may log standard
        HTTP request data (e.g. IP address) per their own{" "}
        <a href="https://unsplash.com/privacy" style={{ color: "#60a5fa" }} target="_blank" rel="noopener noreferrer">
          privacy policy
        </a>
        .
      </p>

      <h2 style={headingStyle}>Changes</h2>
      <p>
        If this policy ever changes, the updated date above will reflect that.
        Continued use of the site constitutes acceptance of the updated policy.
      </p>
    </>
  );
}

function TermsOfService() {
  return (
    <>
      <h1 style={headingStyle}>Terms of Service</h1>
      <p style={subStyle}>Last updated: March 17, 2026</p>

      <h2 style={headingStyle}>Use of the Site</h2>
      <p>
        D20Masters is a free, browser-based D20 dice roller intended for personal
        and recreational use. You may use it freely for tabletop gaming, D&amp;D
        sessions, or any other lawful purpose.
      </p>

      <h2 style={headingStyle}>No Warranties</h2>
      <p>
        This site is provided <strong>"as is"</strong> without any warranty of
        any kind. We make no guarantees regarding uptime, accuracy of random
        results, or fitness for any particular purpose.
      </p>

      <h2 style={headingStyle}>Limitation of Liability</h2>
      <p>
        D20Masters and its creator (GhostByte) are not liable for any damages
        arising from the use or inability to use this site, including but not
        limited to lost game sessions or critical roll failures.
      </p>

      <h2 style={headingStyle}>Intellectual Property</h2>
      <p>
        All original code and design of D20Masters is owned by GhostByte. You
        may not reproduce or redistribute the source without permission.
        Background images are provided by Unsplash under their respective licenses.
      </p>

      <h2 style={headingStyle}>Changes to Terms</h2>
      <p>
        We reserve the right to update these terms at any time. The updated date
        above will reflect any changes.
      </p>
    </>
  );
}

function FAQ() {
  const items = [
    {
      q: "What is D20Masters?",
      a: "D20Masters is a free browser-based D20 dice roller — perfect for D&D, Pathfinder, or any tabletop RPG that uses a 20-sided die.",
    },
    {
      q: "Is this app free to use?",
      a: "Yes, completely free. No sign-up, no subscription, no ads.",
    },
    {
      q: "Are the rolls truly random?",
      a: "Rolls use JavaScript's Math.random(), which is a pseudo-random number generator suitable for games. Results are not cryptographically random.",
    },
    {
      q: "Does the app save my roll history?",
      a: "No. Roll history is not saved anywhere — not in the browser and not on a server. Refreshing the page resets everything.",
    },
    {
      q: "Can I use D20Masters on mobile?",
      a: "Yes. The app runs in any modern browser on desktop or mobile.",
    },
    {
      q: "Who made this?",
      a: "D20Masters was created by GhostByte.",
    },
  ];

  return (
    <>
      <h1 style={headingStyle}>Frequently Asked Questions</h1>
      <p style={subStyle}>Quick answers to common questions.</p>
      {items.map(({ q, a }) => (
        <div key={q} style={{ marginBottom: 28 }}>
          <h3 style={{ color: "#f1f5f9", marginBottom: 6 }}>{q}</h3>
          <p style={{ margin: 0, color: "#cbd5e1" }}>{a}</p>
        </div>
      ))}
    </>
  );
}
