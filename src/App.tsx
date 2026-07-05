/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Sparkles, 
  Search, 
  BookOpen, 
  Layers, 
  BarChart, 
  ListOrdered, 
  FileText, 
  Download, 
  Copy, 
  Check, 
  Info, 
  ChevronRight, 
  AlertCircle, 
  RefreshCw,
  HelpCircle,
  Hash,
  Award
} from "lucide-react";
import { SAMPLE_TEXTS, SampleText } from "./sampleTexts";
import { FachbegriffEntry, AnalysisResponse, TerminusType } from "./types";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  
  // Interactive UI states
  const [selectedTerm, setSelectedTerm] = useState<FachbegriffEntry | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "highlighter" | "analysis" | "charts">("table");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  
  // Table search & filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterDomain, setFilterDomain] = useState<string>("All");
  const [filterType, setFilterType] = useState<string>("All");

  // Load a preset sample text
  const handleSelectSample = (sample: SampleText) => {
    setText(sample.text);
    setError(null);
  };

  // Trigger server-side analysis
  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError("Bitte geben Sie zuerst einen Text ein oder wählen Sie eine Vorlage.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setSelectedTerm(null);

    // Dynamic loading messages for premium UX
    const steps = [
      "Analysiere grammatische Strukturen...",
      "Identifiziere potenzielle Fachbegriffe...",
      "Klassifiziere Terminustypen (Eigentlich vs. Halbterminus)...",
      "Erstelle präzise Kurzdefinitionen...",
      "Ermittle gemeinsprachliche Entsprechungen...",
      "Berechne Häufigkeiten und Fachlichkeitsgrade...",
      "Strukturiere Auswertungstabellen..."
    ];

    let stepIdx = 0;
    setLoadingStep(steps[0]);
    const interval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setLoadingStep(steps[stepIdx]);
      }
    }, 1200);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Ein Fehler ist bei der fachsprachlichen Analyse aufgetreten.");
      }

      setResult(data);
      clearInterval(interval);
      setIsLoading(false);
      
      // Auto-select the first term if available
      if (data.terms && data.terms.length > 0) {
        setSelectedTerm(data.terms[0]);
      }
    } catch (err: any) {
      clearInterval(interval);
      setIsLoading(false);
      setError(err.message || "Verbindung zum Server fehlgeschlagen.");
    }
  };

  // Unique domains available in results for filtering
  const availableDomains = useMemo(() => {
    if (!result || !result.terms) return [];
    const domains = new Set<string>();
    result.terms.forEach(t => {
      if (t.domain) domains.add(t.domain);
    });
    return Array.from(domains);
  }, [result]);

  // Filter terms for the main Terminology Table
  const filteredTerms = useMemo(() => {
    if (!result || !result.terms) return [];
    return result.terms.filter(t => {
      const matchesSearch = 
        t.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.commonEquivalent.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDomain = filterDomain === "All" || t.domain === filterDomain;
      const matchesType = filterType === "All" || t.termType === filterType;

      return matchesSearch && matchesDomain && matchesType;
    });
  }, [result, searchTerm, filterDomain, filterType]);

  // Zusatzaufgabe: Sorted maximum 12 entries
  // "Ordne die gefundenen Termini nach Fachgebiet und Häufigkeit. Maximal 12 Einträge, nach Fachlichkeit sortiert."
  // Let's implement the sort logic perfectly:
  // Sort primarily by:
  // 1. Domain (Fachgebiet) alphabetically or frequency
  // 2. Then within domains or globally by "Fachlichkeit" (specializationScore) descending, then frequency descending.
  const additionalTaskTerms = useMemo(() => {
    if (!result || !result.terms) return [];
    
    // Sort globally by specializationScore desc, then frequency desc, then domain alphabetically
    const sorted = [...result.terms].sort((a, b) => {
      if (b.specializationScore !== a.specializationScore) {
        return b.specializationScore - a.specializationScore;
      }
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return a.domain.localeCompare(b.domain);
    });

    // Return maximum 12 items
    return sorted.slice(0, 12);
  }, [result]);

  // Text highlighter engine (returns dynamic visual nodes)
  const renderHighlightedText = useMemo(() => {
    if (!result || !result.terms || !text) return <span>{text}</span>;

    const terms = result.terms;
    // Sort terms by length of 'term' desc so we match longer terms first and prevent inner substring collision
    const sortedTerms = [...terms].sort((a, b) => b.term.length - a.term.length);
    
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create capturing groups for all terms.
    // German text might have inflection endings. To capture them safely, we can append optional alpha endings [a-zA-ZäöüÄÖÜß]*
    const pattern = sortedTerms
      .map(t => `(${escapeRegExp(t.term)}[a-zA-ZäöüÄÖÜß]*)`)
      .join('|');
      
    try {
      const regex = new RegExp(`\\b(${pattern})\\b`, 'gi');
      const parts = text.split(regex);
      
      return parts.map((part, index) => {
        if (!part) return null;
        
        // Find if this part corresponds to any identified term (exact or root start)
        const partLower = part.toLowerCase();
        const matchingTerm = sortedTerms.find(t => {
          const termLower = t.term.toLowerCase();
          // Match if part equals term, or starts with it (inflections like "Stenosen" starts with "Stenose")
          return partLower === termLower || 
                 (partLower.startsWith(termLower) && partLower.length - termLower.length <= 4) ||
                 (termLower.startsWith(partLower) && termLower.length - partLower.length <= 2);
        });
        
        if (matchingTerm) {
          const isSelected = selectedTerm && selectedTerm.term === matchingTerm.term;
          
          // Custom tag colors based on terminustyp
          let badgeColor = "bg-indigo-50/80 border-indigo-200 text-indigo-900 hover:bg-indigo-100/50";
          if (matchingTerm.termType === "Halbterminus") {
            badgeColor = "bg-teal-50/80 border-teal-200 text-teal-900 hover:bg-teal-100/50";
          } else if (matchingTerm.termType === "Fachsynonym") {
            badgeColor = "bg-amber-50/80 border-amber-200 text-amber-900 hover:bg-amber-100/50";
          } else if (matchingTerm.termType === "Fachterminus (auch gemeinsprachlich verwendet)") {
            badgeColor = "bg-purple-50/80 border-purple-200 text-purple-900 hover:bg-purple-100/50";
          }

          if (isSelected) {
            badgeColor = "bg-[#1a1a1a] border-[#1a1a1a] text-[#f8f7f4] hover:bg-[#1a1a1a] shadow-sm";
          }

          return (
            <button
              key={index}
              onClick={() => setSelectedTerm(matchingTerm)}
              className={`inline-block px-2 py-0.5 border font-mono text-xs font-bold transition-all duration-150 cursor-pointer mx-0.5 ${badgeColor}`}
            >
              {part}
            </button>
          );
        }
        
        return <span key={index} className="text-[#1a1a1a] leading-relaxed">{part}</span>;
      });
    } catch (e) {
      return <span className="text-slate-700 leading-relaxed">{text}</span>;
    }
  }, [result, text, selectedTerm]);

  // Clipboard export helper
  const copyToClipboard = (textToCopy: string, id: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Convert results to Markdown Table
  const generateMarkdownTable = () => {
    if (!result || !result.terms) return "";
    let md = "| Fachbegriff | Fachgebiet | Terminustyp | Kurzdefinition | Gemeinsprachliche Entsprechung |\n";
    md += "| :--- | :--- | :--- | :--- | :--- |\n";
    result.terms.forEach(t => {
      md += `| ${t.term} | ${t.domain} | ${t.termType} | ${t.definition} | ${t.commonEquivalent} |\n`;
    });
    return md;
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] font-sans selection:bg-[#4f46e5]/20 selection:text-[#1a1a1a]">
      {/* Upper Brand Header */}
      <header className="sticky top-0 z-20 bg-[#f8f7f4] border-b-2 border-[#1a1a1a] px-6 sm:px-12 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-[#1a1a1a]/60 font-bold">
            [ Module: Linguistic Analysis ]
          </div>
          <h1 className="font-syne font-extrabold text-2xl sm:text-3xl tracking-tight text-[#1a1a1a] mt-1 uppercase">
            Fachtext-Analysator
          </h1>
        </div>
        
        <div className="flex items-center gap-3 bg-[#d1fae5] px-4 py-2 border border-[#065f46] text-[#065f46] font-mono text-[10px] sm:text-xs uppercase tracking-wider font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
          Gemini 3.5-Flash Active
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 sm:px-12 py-10 space-y-12">
        
        {/* Intro Hero Section */}
        <section className="border-b border-[#1a1a1a]/10 pb-10">
          <div className="max-w-4xl">
            <h2 className="font-syne font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tighter leading-none uppercase text-[#1a1a1a] mb-4">
              PRÄZISE FACHSPRACHEN ANALYSE.
            </h2>
            <p className="text-sm sm:text-base text-[#1a1a1a]/70 leading-relaxed max-w-2xl">
              Identifizieren Sie automatisch hochspezialisierte Fachbegriffe, unterscheiden Sie echte Termini von Halbfachausdrücken und erzeugen Sie verständliche Definitionen. Optimal für Übersetzer, Technische Redakteure und Wissenschaftler.
            </p>
            
            <div className="mt-8">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/50 block mb-3 font-bold">Schnell-Vorlagen:</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-3xl">
                {SAMPLE_TEXTS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="font-mono text-[11px] uppercase text-[#1a1a1a] bg-white border border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#f8f7f4] px-3.5 py-3 transition-all text-left font-bold cursor-pointer"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Input & Analyze section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-8 bg-white border-2 border-[#1a1a1a] p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#1a1a1a]/10 pb-2">
                <label htmlFor="text-input" className="font-syne font-extrabold uppercase text-xs sm:text-sm text-[#1a1a1a] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1a1a1a]/50" />
                  Deutscher Text zur Analyse
                </label>
              </div>

              <textarea
                id="text-input"
                rows={8}
                placeholder="Fügen Sie hier Ihren Fachtext ein (z. B. medizinische Berichte, Gesetzestexte, Informatik-Konzepte)..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isLoading}
                className="w-full p-4 bg-white border border-[#1a1a1a]/20 focus:border-[#1a1a1a] text-[#1a1a1a] placeholder-[#1a1a1a]/30 font-sans text-sm sm:text-base leading-relaxed focus:outline-none resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t border-[#1a1a1a]/10">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/60 font-bold">
                LEN: {text.length} CHARS | {text.trim() ? text.trim().split(/\s+/).length : 0} WORDS
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {text.length > 0 && (
                  <button
                    onClick={() => setText("")}
                    className="px-4 py-3 bg-white border border-[#1a1a1a] font-mono text-xs uppercase text-[#1a1a1a] hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer font-bold"
                    disabled={isLoading}
                  >
                    Löschen
                  </button>
                )}
                <button
                  onClick={handleAnalyze}
                  disabled={isLoading || !text.trim()}
                  className={`w-full sm:w-auto px-6 py-3.5 bg-[#1a1a1a] text-white hover:bg-[#1a1a1a]/90 font-syne font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analysiere...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Fachtext analysieren</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            {/* Context/Definition Sidecard */}
            <div className="bg-white border-2 border-[#1a1a1a] p-6 flex flex-col justify-between h-full">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#1a1a1a]/60 font-bold mb-2">[ LEXICON ENTRY ]</div>
                <h3 className="font-syne font-extrabold text-xl uppercase text-[#1a1a1a] pb-2 border-b-2 border-[#1a1a1a] mb-4">Was ist ein Fachbegriff?</h3>
                <p className="text-xs sm:text-sm text-[#1a1a1a]/85 leading-relaxed mb-6">
                  Ein <strong>Fachbegriff (Terminus)</strong> ist ein Wort oder eine Wortgruppe, die in einem spezifischen Fachgebiet eine präzise Bedeutung trägt.
                </p>
                
                <div className="bg-[#f8f7f4] border border-dashed border-[#1a1a1a] p-4 space-y-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#4f46e5] font-bold">Eigentlich</div>
                    <p className="text-[11px] text-[#1a1a1a]/80 mt-0.5">Nur in der Fachwelt bekannt und genutzt.</p>
                  </div>
                  <div className="border-t border-[#1a1a1a]/10 pt-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#0d9488] font-bold">Halbterminus</div>
                    <p className="text-[11px] text-[#1a1a1a]/80 mt-0.5">Existiert auch gemeinsprachlich, hat im Fachgebiet aber eine präzise, abweichende Sonderbedeutung (z.B. &bdquo;Stärke&ldquo; in der Chemie vs. physische Eigenschaft).</p>
                  </div>
                  <div className="border-t border-[#1a1a1a]/10 pt-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#b45309] font-bold">Fachsynonym</div>
                    <p className="text-[11px] text-[#1a1a1a]/80 mt-0.5">Zweitbegriff für dasselbe Phänomen.</p>
                  </div>
                  <div className="border-t border-[#1a1a1a]/10 pt-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#7c3aed] font-bold">Fachterminus (auch gemeinsprachlich verwendet)</div>
                    <p className="text-[11px] text-[#1a1a1a]/80 mt-0.5">Stammt aus der Fachsprache und besitzt eine klar definierte fachliche Bedeutung. Der Begriff wird zwar auch in der Gemeinsprache verwendet, seine Bedeutung bleibt jedoch grundsätzlich dieselbe (z. B. Kohlenhydrat, Ballaststoff, Kilojoule, Blutzuckerspiegel).</p>
                  </div>
                </div>
              </div>
              
              <div className="font-mono text-[10px] uppercase tracking-widest text-[#1a1a1a]/60 font-bold mt-6 flex items-center gap-1.5 pt-4 border-t border-[#1a1a1a]/10">
                <BookOpen className="w-3.5 h-3.5 text-[#4f46e5]" />
                <span>DIN 2330 Regelwerke konform</span>
              </div>
            </div>
          </div>
        </section>

        {/* Error Notification */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-50 border-2 border-rose-600 text-rose-900 flex items-start gap-3 font-mono text-xs uppercase"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Analyse fehlgeschlagen</p>
              <p className="text-rose-800 mt-1 lowercase font-sans font-normal">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Analysis Loader State */}
        {isLoading && (
          <div className="bg-white border-2 border-[#1a1a1a] p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-[#1a1a1a]/10 border-t-[#1a1a1a] animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#1a1a1a] animate-pulse" />
              </div>
            </div>
            <div>
              <h4 className="font-syne font-extrabold uppercase text-lg text-[#1a1a1a]">Modell analysiert Fachtext</h4>
              <p className="font-mono text-[11px] text-[#1a1a1a]/60 uppercase tracking-wider mt-1 animate-pulse">{loadingStep}</p>
            </div>
            <div className="max-w-md w-full bg-[#f8f7f4] border border-[#1a1a1a]/15 h-3 overflow-hidden mt-2 p-0.5">
              <div className="h-full bg-[#1a1a1a] animate-[loading-bar_8s_ease-out_infinite]" style={{ width: "70%" }} />
            </div>
          </div>
        )}

        {/* RESULTS SECTION */}
        {result && result.success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-10 pt-6 border-t-2 border-[#1a1a1a]"
          >
            {/* Bento Stats Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border-2 border-[#1a1a1a] p-5 shadow-sm">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/60 font-bold">Analysierte Wörter</div>
                <p className="font-syne font-extrabold text-3xl sm:text-4xl text-[#1a1a1a] mt-1">{result.summary.totalWords}</p>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#1a1a1a]/50 mt-1.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Gesamter Fachtext</span>
                </div>
              </div>

              <div className="bg-white border-2 border-[#1a1a1a] p-5 shadow-sm">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/60 font-bold font-mono">Fachbegriffe (Gesamt)</div>
                <p className="font-syne font-extrabold text-3xl sm:text-4xl text-[#4f46e5] mt-1">{result.summary.totalTerms}</p>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#1a1a1a]/50 mt-1.5 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-[#4f46e5]" />
                  <span>Dichte: <strong>{((result.summary.totalTerms / result.summary.totalWords) * 100).toFixed(1)}%</strong></span>
                </div>
              </div>

              <div className="bg-white border-2 border-[#1a1a1a] p-5 shadow-sm">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/60 font-bold font-mono">Fachgebiete (Domains)</div>
                <p className="font-syne font-extrabold text-3xl sm:text-4xl text-[#0d9488] mt-1">{availableDomains.length}</p>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#1a1a1a]/50 mt-1.5 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#0d9488]" />
                  <span>Dom: <strong>{Object.keys(result.summary.domainDistribution).sort((a, b) => result.summary.domainDistribution[b] - result.summary.domainDistribution[a])[0] || "Keine"}</strong></span>
                </div>
              </div>

              <div className="bg-white border-2 border-[#1a1a1a] p-5 shadow-sm">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/60 font-bold font-mono">Hochspezialisiert (Score ≥ 8)</div>
                <p className="font-syne font-extrabold text-3xl sm:text-4xl text-[#b45309] mt-1">
                  {result.terms.filter(t => t.specializationScore >= 8).length}
                </p>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#1a1a1a]/50 mt-1.5 flex items-center gap-1">
                  <Award className="w-3 h-3 text-[#b45309]" />
                  <span>Rein akademisch</span>
                </div>
              </div>
            </div>

            {/* Main Interactive Working Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Interactive Tabbed Workspace */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Navigation Tabs */}
                <div className="bg-[#f8f7f4] p-1 border-2 border-[#1a1a1a] flex flex-wrap gap-1">
                  <button
                    onClick={() => setActiveTab("table")}
                    className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === "table" 
                      ? "bg-[#1a1a1a] text-white font-bold" 
                      : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5 font-medium"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Definitionstabelle</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("highlighter")}
                    className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === "highlighter" 
                      ? "bg-[#1a1a1a] text-white font-bold" 
                      : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5 font-medium"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Text-Markierer</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("analysis")}
                    className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === "analysis" 
                      ? "bg-[#1a1a1a] text-white font-bold" 
                      : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5 font-medium"
                    }`}
                  >
                    <ListOrdered className="w-4 h-4" />
                    <span>Systematische Auswertung (Zusatz)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("charts")}
                    className={`flex items-center gap-2 px-4 py-2.5 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === "charts" 
                      ? "bg-[#1a1a1a] text-white font-bold" 
                      : "text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5 font-medium"
                    }`}
                  >
                    <BarChart className="w-4 h-4" />
                    <span>Linguistische Statistik</span>
                  </button>
                </div>

                {/* Tab Content 1: Searchable Table */}
                {activeTab === "table" && (
                  <div className="bg-white border-2 border-[#1a1a1a] shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Filters & Search bar */}
                    <div className="p-4 sm:p-5 border-b-2 border-[#1a1a1a] bg-[#f8f7f4] flex flex-col md:flex-row gap-4 items-center justify-between">
                      <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 text-[#1a1a1a]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Terminus oder Definition filtern..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-[#1a1a1a] text-[#1a1a1a] placeholder-[#1a1a1a]/40 text-xs sm:text-sm focus:outline-none focus:border-[#4f46e5] font-sans"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        <select
                          value={filterDomain}
                          onChange={(e) => setFilterDomain(e.target.value)}
                          className="px-3 py-2 bg-white border border-[#1a1a1a] text-[#1a1a1a] text-xs font-mono uppercase focus:outline-none focus:border-[#4f46e5] cursor-pointer"
                        >
                          <option value="All">Alle Fachgebiete</option>
                          {availableDomains.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>

                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                          className="px-3 py-2 bg-white border border-[#1a1a1a] text-[#1a1a1a] text-xs font-mono uppercase focus:outline-none focus:border-[#4f46e5] cursor-pointer"
                        >
                          <option value="All">Alle Terminustypen</option>
                          <option value="Eigentlicher Terminus">Eigentlicher Terminus</option>
                          <option value="Halbterminus">Halbterminus</option>
                          <option value="Fachsynonym">Fachsynonym</option>
                        </select>
                      </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-[#f8f7f4] text-[#1a1a1a] font-mono font-bold uppercase tracking-wider text-[11px] border-b-2 border-[#1a1a1a]">
                            <th className="py-4 px-5">Fachbegriff</th>
                            <th className="py-4 px-4">Fachgebiet</th>
                            <th className="py-4 px-4">Terminustyp</th>
                            <th className="py-4 px-4 hidden md:table-cell">Kurzdefinition</th>
                            <th className="py-4 px-4 text-center">Fachlichkeit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1a1a]/10 font-sans">
                          {filteredTerms.length > 0 ? (
                            filteredTerms.map((t) => {
                              const isSelected = selectedTerm && selectedTerm.term === t.term;
                              
                              // Type Badge design
                              let typeBadge = "bg-indigo-50 text-indigo-750 border-indigo-200";
                              if (t.termType === "Halbterminus") {
                                typeBadge = "bg-teal-50 text-teal-755 border-teal-200";
                              } else if (t.termType === "Fachsynonym") {
                                typeBadge = "bg-amber-50 text-amber-755 border-amber-200";
                              } else if (t.termType === "Fachterminus (auch gemeinsprachlich verwendet)") {
                                typeBadge = "bg-purple-50 text-purple-755 border-purple-200";
                              }

                              return (
                                <tr
                                  key={t.term}
                                  onClick={() => setSelectedTerm(t)}
                                  className={`hover:bg-[#f8f7f4]/40 cursor-pointer transition-colors ${
                                    isSelected ? "bg-[#1a1a1a]/5 font-medium" : ""
                                  }`}
                                >
                                  <td className="py-4 px-5 font-bold text-[#1a1a1a] font-mono">
                                    <div className="flex items-center gap-1.5">
                                      {t.term}
                                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-[#4f46e5] shrink-0" />}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className="bg-[#f8f7f4] text-[#1a1a1a] px-2 py-0.5 border border-[#1a1a1a]/20 text-xs font-mono uppercase font-semibold">
                                      {t.domain}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className={`px-2 py-0.5 border font-semibold text-[10px] font-mono uppercase ${typeBadge}`}>
                                      {t.termType}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-[#1a1a1a]/70 max-w-xs truncate hidden md:table-cell">
                                    {t.definition}
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <div className="w-12 bg-[#f8f7f4] border border-[#1a1a1a]/10 h-2 overflow-hidden hidden sm:block">
                                        <div 
                                          className="h-full bg-[#1a1a1a]" 
                                          style={{ width: `${t.specializationScore * 10}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-[#1a1a1a] text-xs font-bold">{t.specializationScore}/10</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-12 px-5 text-center text-[#1a1a1a]/40">
                                <Search className="w-8 h-8 text-[#1a1a1a]/20 mx-auto mb-2" />
                                <p className="font-mono text-xs uppercase tracking-wider font-bold text-[#1a1a1a]/60">Keine Fachbegriffe gefunden</p>
                                <p className="text-xs text-[#1a1a1a]/40 mt-1">Passen Sie Ihre Filter- oder Sucheinstellungen an.</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab Content 2: Text Highlighter */}
                {activeTab === "highlighter" && (
                  <div className="bg-white border-2 border-[#1a1a1a] p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-[#1a1a1a]/10 pb-3">
                      <h4 className="font-syne font-extrabold uppercase text-[#1a1a1a] text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#4f46e5]" />
                        Originaltext mit interaktiven Hervorhebungen
                      </h4>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/50 font-semibold">Klicken Sie auf Begriffe für Details</span>
                    </div>

                    <div className="bg-[#f8f7f4] p-6 border border-[#1a1a1a] text-[#1a1a1a] text-sm sm:text-base leading-relaxed min-h-[160px]">
                      {renderHighlightedText}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
                      <div className="flex items-center gap-1.5 text-[#1a1a1a]/70 font-mono uppercase text-[10px]">
                        <div className="w-3 h-3 bg-indigo-50/80 border border-indigo-200" />
                        <span>Eigentlicher Terminus</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#1a1a1a]/70 font-mono uppercase text-[10px]">
                        <div className="w-3 h-3 bg-teal-50/80 border border-teal-200" />
                        <span>Halbterminus</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#1a1a1a]/70 font-mono uppercase text-[10px]">
                        <div className="w-3 h-3 bg-amber-50/80 border border-amber-200" />
                        <span>Fachsynonym</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#1a1a1a]/70 font-mono uppercase text-[10px]">
                        <div className="w-3 h-3 bg-purple-50/80 border border-purple-200" />
                        <span>Fachterminus (auch gemeinsprachlich verwendet)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content 3: Systematische Auswertung (Zusatzaufgabe) */}
                {activeTab === "analysis" && (
                  <div className="space-y-6">
                    <div className="bg-white border-2 border-[#1a1a1a] p-6 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1a1a1a]/10 pb-4 mb-4">
                        <div>
                          <h4 className="font-syne font-extrabold uppercase text-[#1a1a1a] text-sm flex items-center gap-2">
                            <ListOrdered className="w-4 h-4 text-[#4f46e5]" />
                            Systematische Terminologie-Auswertung
                          </h4>
                          <p className="font-mono text-[10px] uppercase tracking-wider text-[#1a1a1a]/60 mt-1">
                            Sortierung nach Fachgebiet, Fachlichkeit (Specialization) und Häufigkeit. Maximal 12 Haupteinträge.
                          </p>
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-wider bg-white border border-[#1a1a1a] text-[#1a1a1a] px-3 py-1 font-bold self-start sm:self-center">
                          Max. 12 Einträge gelistet
                        </span>
                      </div>

                      <div className="space-y-4">
                        {additionalTaskTerms.map((t, index) => {
                          let labelColor = "bg-indigo-50 text-indigo-755 border-indigo-200";
                          if (t.termType === "Halbterminus") {
                            labelColor = "bg-teal-50 text-teal-755 border-teal-200";
                          } else if (t.termType === "Fachsynonym") {
                            labelColor = "bg-amber-50 text-amber-755 border-amber-200";
                          } else if (t.termType === "Fachterminus (auch gemeinsprachlich verwendet)") {
                            labelColor = "bg-purple-50 text-purple-755 border-purple-200";
                          }

                          return (
                            <div 
                              key={t.term}
                              onClick={() => setSelectedTerm(t)}
                              className="group p-4 bg-[#f8f7f4] hover:bg-white border border-[#1a1a1a]/10 hover:border-[#1a1a1a] transition-all cursor-pointer flex flex-col sm:flex-row items-start justify-between gap-4"
                            >
                              <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-[#1a1a1a]/40 font-mono">#{index + 1}</span>
                                  <h5 className="font-bold text-[#1a1a1a] font-mono text-base">{t.term}</h5>
                                  <span className="bg-[#1a1a1a]/5 text-[#1a1a1a] text-[10px] font-mono uppercase px-2 py-0.5 border border-[#1a1a1a]/15">
                                    {t.domain}
                                  </span>
                                  <span className={`px-2 py-0.5 text-[10px] font-mono uppercase font-semibold border ${labelColor}`}>
                                    {t.termType}
                                  </span>
                                </div>
                                <p className="text-xs text-[#1a1a1a]/80 leading-relaxed font-sans">
                                  <strong>Definition:</strong> {t.definition}
                                </p>
                                <p className="text-xs text-[#1a1a1a]/60 italic font-sans">
                                  <strong>Kontext:</strong> &bdquo;{t.contextExample}&ldquo;
                                </p>
                              </div>

                              <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-6 sm:gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#1a1a1a]/10">
                                <div className="text-center">
                                  <span className="text-[9px] font-bold text-[#1a1a1a]/50 uppercase tracking-wider block font-mono">Fachlichkeit</span>
                                  <span className="text-base font-bold text-[#1a1a1a] font-mono">{t.specializationScore}/10</span>
                                </div>
                                <div className="text-center">
                                  <span className="text-[9px] font-bold text-[#1a1a1a]/50 uppercase tracking-wider block font-mono">Häufigkeit</span>
                                  <span className="text-base font-bold text-[#4f46e5] font-mono">{t.frequency}x</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Content 4: Statistical Visuals */}
                {activeTab === "charts" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Domain Frequency Visualizer */}
                    <div className="bg-white border-2 border-[#1a1a1a] p-6 shadow-sm">
                      <h4 className="font-syne font-extrabold uppercase text-[#1a1a1a] text-sm mb-4 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#4f46e5]" />
                        Fachgebiets-Verteilung
                      </h4>
                      <div className="space-y-4">
                        {Object.entries(result.summary.domainDistribution)
                          .sort((a, b) => (b[1] as number) - (a[1] as number))
                          .map(([domain, count]) => {
                            const val = count as number;
                            const total = result.summary.totalTerms;
                            const pct = Math.round((val / total) * 100) || 0;
                            return (
                              <div key={domain} className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-[#1a1a1a] font-mono uppercase">{domain}</span>
                                  <span className="text-[#1a1a1a]/60 font-mono text-[11px] font-bold">{val} von {total} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/15 h-3 p-0.5">
                                  <div 
                                    className="h-full bg-[#1a1a1a] transition-all duration-500" 
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Terminus Type Visualizer */}
                    <div className="bg-white border-2 border-[#1a1a1a] p-6 shadow-sm">
                      <h4 className="font-syne font-extrabold uppercase text-[#1a1a1a] text-sm mb-4 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-[#4f46e5]" />
                        Verteilung der Terminustypen
                      </h4>
                      <div className="space-y-4">
                        {Object.entries(result.summary.typeDistribution)
                          .sort((a, b) => (b[1] as number) - (a[1] as number))
                          .map(([type, count]) => {
                            const val = count as number;
                            const total = result.summary.totalTerms;
                            const pct = Math.round((val / total) * 100) || 0;
                            
                            let barColor = "bg-[#4f46e5]";
                            if (type === "Halbterminus") barColor = "bg-[#0d9488]";
                            if (type === "Fachsynonym") barColor = "bg-[#b45309]";
                            if (type === "Fachterminus (auch gemeinsprachlich verwendet)") barColor = "bg-[#7c3aed]";

                            return (
                              <div key={type} className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-[#1a1a1a] font-mono uppercase">{type}</span>
                                  <span className="text-[#1a1a1a]/60 font-mono text-[11px] font-bold">{val} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/15 h-3 p-0.5">
                                  <div 
                                    className={`h-full transition-all duration-500 ${barColor}`} 
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      <div className="mt-6 p-4 bg-[#f8f7f4] border border-dashed border-[#1a1a1a] text-xs text-[#1a1a1a]/70 leading-relaxed font-sans">
                        <strong>Hinweis zur Klassifizierung:</strong> Eigentliche Termini beherrschen meist hochinformatisierte Fachtexte, während Halbtermini oft Brücken zur Gemeinsprache bilden und dadurch fehleranfällig im Übersetzungsalltag sind.
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Detailed Inspector Card */}
              <div className="lg:col-span-4 sticky top-24">
                {selectedTerm ? (
                  <div className="bg-white border-2 border-[#1a1a1a] shadow-sm flex flex-col">
                    <div className="p-5 border-b-2 border-[#1a1a1a] bg-[#f8f7f4]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#1a1a1a]/50 font-mono">[ TERMINUS-INSPEKTOR ]</span>
                        <span className="text-xs font-mono font-bold text-[#1a1a1a]/70">HÄUFIGKEIT: {selectedTerm.frequency}X</span>
                      </div>
                      <h4 className="text-xl font-bold text-[#1a1a1a] font-mono tracking-tight break-all uppercase">
                        {selectedTerm.term}
                      </h4>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Meta information */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[#f8f7f4] border border-[#1a1a1a]/20">
                          <span className="text-[9px] font-bold text-[#1a1a1a]/50 uppercase tracking-wider block font-mono">Fachgebiet</span>
                          <span className="text-xs font-bold text-[#1a1a1a] block mt-0.5 uppercase font-mono">{selectedTerm.domain}</span>
                        </div>
                        <div className="p-3 bg-[#f8f7f4] border border-[#1a1a1a]/20">
                          <span className="text-[9px] font-bold text-[#1a1a1a]/50 uppercase tracking-wider block font-mono">Terminustyp</span>
                          <span className="text-xs font-bold text-[#4f46e5] block mt-0.5 uppercase font-mono">{selectedTerm.termType}</span>
                        </div>
                      </div>

                      {/* Kurzdefinition */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-[#1a1a1a]/50 uppercase tracking-wider flex items-center gap-1 font-mono">
                          <BookOpen className="w-3.5 h-3.5 text-[#4f46e5]" />
                          Linguistische Kurzdefinition
                        </span>
                        <p className="text-xs sm:text-sm text-[#1a1a1a] leading-relaxed font-sans bg-indigo-50/25 p-3.5 border border-[#4f46e5]/25">
                          {selectedTerm.definition}
                        </p>
                      </div>

                      {/* Gemeinsprachliche Entsprechung */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-[#1a1a1a]/50 uppercase tracking-wider flex items-center gap-1 font-mono">
                          <HelpCircle className="w-3.5 h-3.5 text-[#0d9488]" />
                          Gemeinsprachliche Erklärung
                        </span>
                        <p className="text-xs sm:text-sm text-[#1a1a1a]/80 leading-relaxed bg-teal-50/25 p-3.5 border border-[#0d9488]/25">
                          {selectedTerm.commonEquivalent}
                        </p>
                      </div>

                      {/* Originaler Satz-Kontext */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-[#1a1a1a]/50 uppercase tracking-wider flex items-center gap-1 font-mono">
                          <FileText className="w-3.5 h-3.5 text-[#1a1a1a]/50" />
                          Textkontext
                        </span>
                        <p className="text-xs text-[#1a1a1a]/70 italic bg-[#f8f7f4] p-3 border border-[#1a1a1a]/10 leading-relaxed">
                          &bdquo;{selectedTerm.contextExample}&ldquo;
                        </p>
                      </div>

                      {/* Fachlichkeit Rating progress */}
                      <div className="space-y-2 pt-2 border-t border-[#1a1a1a]/10">
                        <div className="flex justify-between text-[9px] font-bold text-[#1a1a1a]/50 uppercase tracking-wider font-mono">
                          <span>Fachlicher Grad</span>
                          <span className="font-mono text-[#1a1a1a] font-bold">{selectedTerm.specializationScore} / 10</span>
                        </div>
                        <div className="w-full bg-[#f8f7f4] border border-[#1a1a1a]/15 h-3 p-0.5">
                          <div 
                            className="h-full bg-[#1a1a1a] rounded-none"
                            style={{ width: `${selectedTerm.specializationScore * 10}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-[#1a1a1a]/60 leading-normal font-sans">
                          {selectedTerm.specializationScore >= 8 
                            ? "Dieser Begriff setzt hohes akademisches oder fachspezifisches Wissen voraus." 
                            : selectedTerm.specializationScore >= 5 
                            ? "Halbtechnischer Fachbegriff, der auch in gebildeter Umgangssprache vorkommt." 
                            : "Relativ verständlicher Begriff an der Grenze zur Allgemeinsprache."}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-dashed border-[#1a1a1a]/30 p-8 text-center text-[#1a1a1a]/40 flex flex-col items-center justify-center h-48">
                    <Info className="w-8 h-8 text-[#1a1a1a]/20 mb-2" />
                    <p className="text-xs font-mono uppercase tracking-wider font-bold text-[#1a1a1a]/60">Nichts ausgewählt</p>
                    <p className="text-[11px] text-[#1a1a1a]/40 mt-1">Klicken Sie in der Tabelle oder im Text auf einen Fachbegriff.</p>
                  </div>
                )}

                {/* Export Card */}
                <div className="mt-6 bg-white border-2 border-[#1a1a1a] p-5 shadow-sm space-y-4">
                  <h5 className="font-syne font-extrabold uppercase text-[#1a1a1a] text-xs sm:text-sm flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-[#4f46e5]" />
                    Export-Werkzeuge
                  </h5>
                  <p className="text-xs text-[#1a1a1a]/70 leading-normal font-sans">
                    Kopieren Sie die extrahierten Fachbegriffe im gewünschten Format für Ihre Arbeit:
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => copyToClipboard(generateMarkdownTable(), "md")}
                      className="px-3 py-2.5 border border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] text-xs font-mono uppercase font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    >
                      {copiedIndex === "md" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Markdown</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => copyToClipboard(JSON.stringify(result.terms, null, 2), "json")}
                      className="px-3 py-2.5 border border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white text-[#1a1a1a] text-xs font-mono uppercase font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    >
                      {copiedIndex === "json" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>JSON-Daten</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </main>

      <footer className="border-t-2 border-[#1a1a1a] mt-16 bg-white py-8 px-6 text-center text-xs text-[#1a1a1a]/40 font-mono uppercase tracking-wider">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} Terminologie-Experte & Fachsprachenanalysator.</p>
          <p className="text-[10px] font-bold text-[#1a1a1a]/60">Powered by Google Gemini 3.5-Flash & React 19</p>
        </div>
      </footer>
    </div>
  );
}
