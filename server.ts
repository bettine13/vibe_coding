import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));

// Lazy init or safety check for Gemini API key
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Endpoint for terminology analysis
app.post("/api/analyze", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Bitte geben Sie einen Text zur Analyse ein." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `
Du bist ein renommierter Terminologie-Experte und Fachsprachenanalyst mit profundem Schwerpunkt auf deutschsprachigen Fachtexten.
Deine Aufgabe ist es, den bereitgestellten deutschen Text präzise zu analysieren und alle relevanten Fachbegriffe zu identifizieren.

Ein Fachbegriff (Terminus) ist ein Wort oder eine Wortgruppe, die in einem spezifischen Fachgebiet eine präzise, von der Gemeinsprache abweichende oder nicht vorhandene Bedeutung trägt.

Klassifiziere jeden gefundenen Terminus nach den folgenden Terminustypen:
- 'Eigentlicher Terminus': Ausschließlich fachsprachlich (z.B. "Intubation", "Subsumtion").
- 'Halbterminus': Ein Begriff ist NUR DANN ein Halbterminus, wenn dieselbe Wortform in der Fach- und Gemeinsprache unterschiedliche Bedeutungen hat (z.B. "Stärke" in der Chemie vs. physische Eigenschaft, "Mutter" im Maschinenbau vs. Familie/Verwandte, "Kraft" in der Physik vs. allgemeine Anstrengung).
- 'Fachsynonym': Ein alternativer Fachterminus für denselben Begriff (z.B. "Morbus Crohn" für "chronisch-entzündliche Darmerkrankung").
- 'Fachterminus (auch gemeinsprachlich verwendet)': Stammt aus der Fachsprache und besitzt eine klar definierte fachliche Bedeutung. Der Begriff wird zwar auch in der Gemeinsprache verwendet, seine Bedeutung bleibt jedoch grundsätzlich dieselbe (z. B. "Kohlenhydrat", "Ballaststoff", "Kilojoule", "Blutzuckerspiegel").

Erstelle für jeden Fachbegriff eine verständliche Kurzdefinition in genau 1 Satz auf Deutsch sowie eine adäquate gemeinsprachliche Entsprechung oder vereinfachte Erklärung für Laien. Gib ausschließlich Definitionen an, die du mit hoher Sicherheit kennst. Bei jeglicher Unsicherheit setze die Definition exakt auf: 'Definition unklar – bitte extern prüfen'.
Zähle auch, wie oft (Häufigkeit/Frequency) der Begriff im Text vorkommt (berücksichtige dabei verschiedene Flexionsformen wie Deklinationen oder Pluralformen).
Extrahiere einen originalen Mustersatz (Kontextbeispiel) aus dem Text, in dem der Begriff steht.
Bewerte den Grad der Fachlichkeit (specializationScore) von 1 (sehr gemeinsprachnah) bis 10 (extrem hochspezialisiert und rein fachsprachlich).

Befolge strikt das vorgegebene JSON-Schema und antworte vollständig auf Deutsch.
`;

    const prompt = `Analysiere den folgenden deutschen Fachtext und liefere die identifizierten Fachbegriffe als strukturiertes JSON zurück:

---
${text}
---`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.1, // Low temperature for high precision terminology extraction
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            terms: {
              type: Type.ARRAY,
              description: "Liste der gefundenen Fachbegriffe",
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { 
                    type: Type.STRING, 
                    description: "Der identifizierte Fachbegriff in seiner Grundform (Nominativ Singular bzw. Infinitiv)." 
                  },
                  domain: { 
                    type: Type.STRING, 
                    description: "Das wissenschaftliche oder berufliche Fachgebiet des Begriffs (z.B. Medizin, Recht, Informatik, Maschinenbau, Finanzwesen, Linguistik, Biologie)." 
                  },
                  termType: { 
                    type: Type.STRING, 
                    description: "Genauer Terminustyp. Erlaubt sind ausschließlich: 'Eigentlicher Terminus', 'Halbterminus', 'Fachsynonym', 'Fachterminus (auch gemeinsprachlich verwendet)'." 
                  },
                  definition: { 
                    type: Type.STRING, 
                    description: "Eine präzise, fachlich korrekte Kurzdefinition in genau einem deutschen Satz. Gib ausschließlich Definitionen an, die du mit hoher Sicherheit kennst. Bei Unsicherheit MUSS dieser Wert exakt lauten: 'Definition unklar – bitte extern prüfen'." 
                  },
                  commonEquivalent: { 
                    type: Type.STRING, 
                    description: "Die gemeinsprachliche Entsprechung oder eine einfache Erklärung für Laien." 
                  },
                  frequency: { 
                    type: Type.INTEGER, 
                    description: "Die Häufigkeit, mit der dieser Begriff (inklusive Flexionsformen) im Text auftaucht." 
                  },
                  contextExample: { 
                    type: Type.STRING, 
                    description: "Ein originaler Satz aus dem analysierten Text, in dem dieser Fachbegriff verwendet wird." 
                  },
                  specializationScore: { 
                    type: Type.INTEGER, 
                    description: "Grad der Fachlichkeit von 1 bis 10 (10 = extrem hochspezialisiert, 1 = grenzt an Gemeinsprache)." 
                  }
                },
                required: [
                  "term", 
                  "domain", 
                  "termType", 
                  "definition", 
                  "commonEquivalent", 
                  "frequency", 
                  "contextExample", 
                  "specializationScore"
                ]
              }
            }
          },
          required: ["terms"]
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Fehler bei der Kommunikation mit dem Analyse-Modell (Keine Antwort erhalten).");
    }

    const data = JSON.parse(responseText.trim());
    const rawTerms = data.terms || [];

    // Calculate dynamic stats
    const wordCount = text.trim().split(/\s+/).length;
    const totalTerms = rawTerms.length;

    const domainDistribution: { [domain: string]: number } = {};
    const typeDistribution: { [type: string]: number } = {};

    rawTerms.forEach((t: any) => {
      // Normalize domain names for consistent charts
      const dom = t.domain || "Unbekannt";
      domainDistribution[dom] = (domainDistribution[dom] || 0) + 1;

      const type = t.termType || "Eigentlicher Terminus";
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    res.json({
      success: true,
      terms: rawTerms,
      summary: {
        totalWords: wordCount,
        totalTerms,
        domainDistribution,
        typeDistribution
      }
    });

  } catch (error: any) {
    console.error("Fehler bei der Textanalyse:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Ein unerwarteter Fehler ist bei der fachsprachlichen Analyse aufgetreten."
    });
  }
});

// Setup dev server with Vite or production statics
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fachtext-Analysator Server listening on http://0.0.0.0:${PORT}`);
  });
}

initializeServer().catch((err) => {
  console.error("Failed to start server:", err);
});
