/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SampleText {
  id: string;
  title: string;
  category: string;
  text: string;
  description: string;
}

export const SAMPLE_TEXTS: SampleText[] = [
  {
    id: "medizin",
    title: "Kardiologie / Medizin",
    category: "Medizin",
    description: "Ein klinischer Fachtext über den Myokardinfarkt und kardiologische Eingriffe.",
    text: "Der Myokardinfarkt – umgangssprachlich Herzinfarkt – resultiert meist aus einer akuten Ischämie des Herzmuskelgewebes. Ursächlich hierfür ist meistens eine Ruptur einer atherosklerotischen Plaque in einer Koronararterie, was zu einer lokalen Thrombenbildung führt. Diese kritische Stenose blockiert den koronaren Blutfluss vollständig. Zur Reperfusion kommen interventionelle Verfahren wie die perkutane transluminale koronare Angioplastie (PTCA) mit Stentimplantation oder in schwereren Fällen eine operative Myokardreaktivierung mittels aortokoronarem Venen-Bypass infrage."
  },
  {
    id: "recht",
    title: "Zivilrecht / BGB",
    category: "Recht",
    description: "Ein juristischer Fachtext zum Zustandekommen und zur Nichtigkeit von Rechtsgeschäften.",
    text: "Ein Rechtsgeschäft kommt durch die Abgabe mindestens einer Willenserklärung zustande. Bei der Anfechtbarkeit wegen eines Irrtums nach § 119 BGB ist das Rechtsgeschäft von Anfang an als nichtig anzusehen, sofern die Anfechtung unverzüglich erklärt wird. Sittenwidrigkeit gemäß § 138 BGB führt hingegen zur sofortigen Nichtigkeit des Vertrages ohne Anfechtungserfordernis. Beim Verzug des Schuldners haftet dieser zudem für jede Fahrlässigkeit, während die Beweislastumkehr dem Gläubiger die Rechtsdurchsetzung erleichtert."
  },
  {
    id: "informatik",
    title: "Software-Architektur",
    category: "Informatik",
    description: "Ein informationstechnischer Text über Kopplung, Entwurfsmuster und Clean Code.",
    text: "Um eine hohe Kohäsion und lose Kopplung zu erreichen, setzen moderne Software-Architekturen auf das Entwurfsmuster der Dependency Injection (Abhängigkeitsinjektion). Dadurch wird die konkrete Instanziierung von Dienstklassen aus der konsumierenden Klasse in einen IoC-Container verlagert. Dies erleichtert das Refactoring des Quellcodes und ermöglicht das Schreiben von isolierten Unit-Tests mithilfe von Mock-Objekten. Durch das Definieren klarer Schnittstellen (Interfaces) wird zudem die Polymorphie gefördert."
  },
  {
    id: "maschinenbau",
    title: "Fertigungstechnik",
    category: "Maschinenbau",
    description: "Ein ingenieurwissenschaftlicher Text über Zerspanung, Drehmomente und Passungen.",
    text: "Das Spanen ist ein trennendes Fertigungsverfahren, bei dem die Zerspankraft maßgeblich die Standzeit des Werkzeugs beeinflusst. Über die Vorschubgeschwindigkeit und die Schnitttiefe wird das Zeitspanvolumen gesteuert. Bei der Montage einer Gewindeverbindung muss die Mutter mit einem exakt definierten Drehmoment angezogen werden, um die erforderliche Vorspannkraft zu gewährleisten. Abweichungen in den Maßen müssen innerhalb der vereinbarten Toleranzklasse liegen, um die Austauschbarkeit der Bauteile zu sichern."
  }
];
