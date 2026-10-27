const express = require("express");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const TTL = Number(process.env.TOKEN_TTL_SECONDS || 3600);

app.get("/", (_req, res) => res.json({
  service: "Hikawi Agora Token Server",
  status: "ok",
  tokenEndpoint: "POST /rtc-token"
}));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/rtc-token", (req, res) => {
  if (!APP_ID || !APP_CERTIFICATE) {
    return res.status(503).json({ error: "Set AGORA_APP_ID and AGORA_APP_CERTIFICATE in host environment variables." });
  }
  const channelName = String(req.body?.channelName || "").trim();
  const uid = Number(req.body?.uid);
  const requestedRole = String(req.body?.role || "publisher").toLowerCase();

  if (!channelName || channelName.length > 64) {
    return res.status(400).json({ error: "channelName is required and must be at most 64 characters." });
  }
  if (!Number.isInteger(uid) || uid < 0 || uid > 4294967295) {
    return res.status(400).json({ error: "uid must be an integer from 0 to 4294967295." });
  }

  const role = ["audience", "subscriber"].includes(requestedRole)
    ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(300, Math.min(TTL, 86400));

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID, APP_CERTIFICATE, channelName, uid, role, expiresAt
    );
    return res.json({ appId: APP_ID, channelName, uid, token, expiresAt });
  } catch (err) {
    console.error("Token generation failed:", err.message);
    return res.status(500).json({ error: "Could not generate Agora token." });
  }
});

app.listen(PORT, "0.0.0.0", () => console.log(`Token server listening on ${PORT}`));
