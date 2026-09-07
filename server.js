const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const frontendDist = path.join(__dirname, "artifacts", "reflex-control-room", "dist");

app.disable("x-powered-by");
app.use(express.json());
app.use(express.static(frontendDist, { index: false }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Reflex Control Room running on port ${PORT}`);
});
