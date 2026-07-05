/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TerminusType = 'Eigentlicher Terminus' | 'Halbterminus' | 'Fachsynonym';

export interface FachbegriffEntry {
  term: string;               // Fachbegriff
  domain: string;             // Fachgebiet
  termType: TerminusType;     // Terminustyp
  definition: string;         // Kurzdefinition (1 Satz)
  commonEquivalent: string;   // Gemeinsprachliche Entsprechung
  frequency: number;          // Häufigkeit im Text
  contextExample: string;     // Kontextbeispiel aus dem Text
  specializationScore: number; // Grad der Fachlichkeit (1-10)
}

export interface AnalysisResponse {
  success: boolean;
  terms: FachbegriffEntry[];
  summary: {
    totalWords: number;
    totalTerms: number;
    domainDistribution: { [domain: string]: number };
    typeDistribution: { [type: string]: number };
  };
  error?: string;
}
