import React from "react";

export default function Legal({ onBack }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <button
          onClick={onBack}
          style={{
            marginBottom: 40,
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ← Back to Roller
        </button>

        <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 40 }}>Legal</h1>

        {/* Terms of Service */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20, color: "#f8fafc" }}>
            Terms of Service
          </h2>
          <div style={{ color: "#cbd5e1", lineHeight: 1.8, fontSize: 16 }}>
            <p>
              Use this site at your own risk. No warranties of any kind are provided, expressed or
              implied. We make no guarantee regarding the accuracy, reliability, or availability of
              this service.
            </p>
            <p>
              No refunds will be issued on any future paid features. The service is provided "as
              is" without any liability.
            </p>
            <p>
              D20Masters and its creators (GhostByte) are not responsible for any damages, losses,
              or consequences arising from the use of this site, including critical roll failures
              or lost game sessions.
            </p>
            <p>
              You agree that your use of this site constitutes acceptance of these terms. We
              reserve the right to modify these terms at any time without notice.
            </p>
          </div>
        </section>

        {/* Privacy Policy */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20, color: "#f8fafc" }}>
            Privacy Policy
          </h2>
          <div style={{ color: "#cbd5e1", lineHeight: 1.8, fontSize: 16 }}>
            <p>
              <strong style={{ color: "#f8fafc" }}>Data Collection:</strong> D20Masters does not
              collect, store, or transmit any personal information. No accounts are required. All
              dice rolls are computed locally in your browser.
            </p>
            <p>
              <strong style={{ color: "#f8fafc" }}>Cookies & Tracking:</strong> We do not use
              cookies, analytics, advertising pixels, or any form of user tracking. Your activity
              on this site is entirely private and anonymous.
            </p>
            <p>
              <strong style={{ color: "#f8fafc" }}>Third-Party Content:</strong> Background images
              are loaded from Unsplash. Unsplash may collect standard HTTP request data (such as
              your IP address) in accordance with their own{" "}
              <a
                href="https://unsplash.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#60a5fa", textDecoration: "underline" }}
              >
                privacy policy
              </a>
              . We do not control this data collection.
            </p>
            <p>
              <strong style={{ color: "#f8fafc" }}>Changes:</strong> This privacy policy may be
              updated at any time. Continued use of the site after updates constitutes acceptance
              of the new policy.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: 60 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20, color: "#f8fafc" }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: "grid", gap: 28 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#f8fafc" }}>
                What is D20Masters?
              </h3>
              <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
                D20Masters is a free, browser-based D20 dice roller designed for tabletop RPGs
                like Dungeons & Dragons, Pathfinder, and similar games. Roll and customize your
                dice with different colors and atmospheric backgrounds.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#f8fafc" }}>
                Is this application free to use?
              </h3>
              <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
                Yes, completely free. No sign-up required, no subscriptions, no advertisements, no
                hidden costs.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#f8fafc" }}>
                Are the dice rolls truly random?
              </h3>
              <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
                Rolls use JavaScript's Math.random() function, which is a pseudo-random number
                generator suitable for games. Results are not cryptographically random, but are
                appropriate for tabletop gaming purposes.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#f8fafc" }}>
                Does the app save my roll history?
              </h3>
              <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
                Roll history is displayed during your session but is not saved anywhere. Refreshing
                the page will reset the history. No data is stored on servers or in your browser.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#f8fafc" }}>
                Can I use D20Masters on mobile?
              </h3>
              <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
                Yes. The app runs in any modern web browser on desktop, tablet, or mobile devices.
                The interface is fully responsive.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#f8fafc" }}>
                Who created D20Masters?
              </h3>
              <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
                D20Masters was created by GhostByte. All code and design are original unless
                otherwise attributed.
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#f8fafc" }}>
                Can I use this for D&D or other tabletop games?
              </h3>
              <p style={{ color: "#cbd5e1", lineHeight: 1.8, margin: 0 }}>
                Yes, absolutely. D20Masters is specifically designed for use in D&D campaigns,
                Pathfinder sessions, and any other game that requires a D20 roll.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div
          style={{
            marginTop: 60,
            paddingTop: 40,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 14,
          }}
        >
          <p style={{ margin: 0 }}>© 2026 D20Masters — Owner & Creator: GhostByte</p>
        </div>
      </div>
    </div>
  );
}
