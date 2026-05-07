import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory store for our agent's configuration (resets on server restart)
let agentConfig = {
  systemPrompt: "You are my personal AI assistant. Reply to text messages on my behalf in a causal, friendly, and concise way. Use lowercase mostly for a casual texting vibe. The user texting you will provide their message and your relationship.",
};

// In-memory log of recent messages to show on the dashboard
let messageLogs: Array<{ id: string, timestamp: Date, sender: string, received: string, reply: string }> = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API to get current config
  app.get("/api/config", (req, res) => {
    res.json(agentConfig);
  });

  // API to update config
  app.post("/api/config", (req, res) => {
    if (req.body.systemPrompt) {
      agentConfig.systemPrompt = req.body.systemPrompt;
    }
    res.json({ success: true, config: agentConfig });
  });

  // API to view logs (for the dashboard)
  app.get("/api/logs", (req, res) => {
    res.json(messageLogs.slice(0, 50)); // Return last 50
  });

  // Main webhook endpoint used by iOS Shortcuts
  app.post("/api/webhook/message", async (req, res) => {
    try {
      const { message, sender } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Missing 'message' field in body." });
      }

      const userSender = sender || "Unknown Person";

      // Call Gemini API
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          { role: "user", parts: [{ text: `New message from ${userSender}: "${message}"\n\nPlease formulate my reply.` }] }
        ],
        config: {
          systemInstruction: agentConfig.systemPrompt,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "Sorry, I couldn't generate a reply.";

      // Log the interaction
      messageLogs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        sender: userSender,
        received: message,
        reply: replyText
      });

      // Keep logs bounded
      if (messageLogs.length > 200) messageLogs.length = 200;

      res.json({ reply: replyText });
    } catch (error) {
      console.error("Error generating reply:", error);
      res.status(500).json({ error: "Failed to generate reply" });
    }
  });

  // Vite middleware for development or Static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
