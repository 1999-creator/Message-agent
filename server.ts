import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, addDoc } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync(new URL("./firebase-applet-config.json", import.meta.url), "utf8"));

const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

let ai: GoogleGenAI | null = null;
function getAi() {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
}

// Default in-memory values as fallback
const DEFAULT_SYSTEM_PROMPT = "You are my personal AI assistant. Reply to text messages on my behalf in a causal, friendly, and concise way. Use lowercase mostly for a casual texting vibe. The user texting you will provide their message and your relationship.";

async function getAgentConfig() {
  try {
    const docRef = doc(db, "config", "global");
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data().systemPrompt;
    }
  } catch (err) {
    console.error("Error reading config", err);
  }
  return DEFAULT_SYSTEM_PROMPT;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API to get current config
  app.get("/api/config", async (req, res) => {
    const systemPrompt = await getAgentConfig();
    res.json({ systemPrompt });
  });

  // API to update config
  app.post("/api/config", async (req, res) => {
    try {
      if (req.body.systemPrompt) {
        await setDoc(doc(db, "config", "global"), { systemPrompt: req.body.systemPrompt });
      }
      res.json({ success: true, config: { systemPrompt: req.body.systemPrompt } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save config" });
    }
  });

  // API to view logs (for the dashboard)
  app.get("/api/logs", async (req, res) => {
    try {
      const q = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(logs);
    } catch (err) {
      console.error("Error reading logs:", err);
      res.status(500).json({ error: "Failed to read logs" });
    }
  });

  // Main webhook endpoint used by iOS Shortcuts
  app.post("/api/webhook/message", async (req, res) => {
    try {
      const { message, sender } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Missing 'message' field in body." });
      }

      const userSender = sender || "Unknown Person";
      const systemPrompt = await getAgentConfig();

      // Call Gemini API
      const response = await getAi().models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          { role: "user", parts: [{ text: `New message from ${userSender}: "${message}"\n\nPlease formulate my reply.` }] }
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "Sorry, I couldn't generate a reply.";

      // Log the interaction to Firestore
      await addDoc(collection(db, "logs"), {
        sender: userSender,
        received: message,
        reply: replyText,
        timestamp: new Date().toISOString()
      });

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
