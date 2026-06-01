import type { ParserService } from "@/domain/contracts/services";
import type { ParsedCode } from "@/domain/entities/types";

/**
 * Real parser for the two ingest paths implemented in this slice. The unit is a
 * CODE; quote/memo are optional supporting context.
 *  - PASTED_TEXT / TXT: one code per non-empty line (no quote/memo/participant).
 *  - CSV: header-driven columns (case-insensitive, with synonyms):
 *      code        -> code | label | category | theme | concept   (required)
 *      quote       -> quote | excerpt | evidence | verbatim        (optional)
 *      memo        -> memo | note | notes | comment | annotation   (optional)
 *      participant -> participant | speaker | source | respondent  (optional)
 *    With no recognizable header, falls back to: col0=code, col1=quote, col2=memo.
 *
 * DOC/DOCX are not implemented yet and are rejected by the route validation path.
 */
export class RealParserService implements ParserService {
  async parse(params: {
    sourceType: "CSV" | "TXT" | "DOC" | "DOCX" | "PASTED_TEXT";
    payload: string;
    filename?: string;
  }): Promise<ParsedCode[]> {
    if (params.sourceType === "CSV") {
      return parseCsv(params.payload, params.filename);
    }
    return parseLines(params.payload, params.filename ?? params.sourceType);
  }
}

export const UNASSIGNED_PARTICIPANT = "Unassigned";
const UNASSIGNED = UNASSIGNED_PARTICIPANT;

/** Tidy a raw code label: drop leading underscores/whitespace so we show the phrase. */
function cleanCode(raw: string): string {
  return raw.replace(/^[\s_]+/, "").trim();
}

function parseLines(payload: string, sourceRef: string): ParsedCode[] {
  return payload
    .split(/\r?\n/)
    .map((line) => cleanCode(line))
    .filter(Boolean)
    .map((code) => ({
      sourceRef,
      participantLabel: UNASSIGNED,
      code
    }));
}

function parseCsv(payload: string, filename?: string): ParsedCode[] {
  // Strip a leading UTF-8 BOM that some spreadsheet exports prepend.
  const cleaned = payload.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(cleaned);
  const rows = parseCsvRows(cleaned, delimiter);
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const codeIdx = findColumn(header, ["code", "label", "category", "theme", "concept"]);
  const quoteIdx = findColumn(header, ["quote", "excerpt", "evidence", "verbatim"]);
  const memoIdx = findColumn(header, ["memo", "note", "notes", "comment", "annotation"]);
  const participantIdx = findColumn(header, ["participant", "speaker", "source", "respondent"]);

  const hasHeader =
    codeIdx !== -1 || quoteIdx !== -1 || memoIdx !== -1 || participantIdx !== -1;
  const dataRows = hasHeader ? rows.slice(1) : rows;

  // Fallbacks when columns aren't explicitly labeled: col0=code, col1=quote, col2=memo.
  const cIdx = codeIdx === -1 ? 0 : codeIdx;
  const qIdx = quoteIdx === -1 ? (hasHeader ? -1 : 1) : quoteIdx;
  const mIdx = memoIdx === -1 ? (hasHeader ? -1 : 2) : memoIdx;

  const codes: ParsedCode[] = [];
  dataRows.forEach((row) => {
    const code = cleanCode(row[cIdx] ?? "");
    if (!code) {
      return;
    }
    const quote = qIdx >= 0 ? (row[qIdx] ?? "").trim() : "";
    const memo = mIdx >= 0 ? (row[mIdx] ?? "").trim() : "";
    const participantLabel =
      participantIdx >= 0 ? (row[participantIdx] ?? "").trim() || UNASSIGNED : UNASSIGNED;

    codes.push({
      sourceRef: filename ?? "upload.csv",
      participantLabel,
      code,
      quote: quote || undefined,
      memo: memo || undefined
    });
  });

  return codes;
}

function findColumn(header: string[], candidates: string[]): number {
  return header.findIndex((cell) => candidates.includes(cell));
}

/** Pick the most likely delimiter from the first line (comma, semicolon, or tab). */
function detectDelimiter(input: string): string {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

/** Minimal RFC-4180-ish CSV parser supporting quoted fields, escaped quotes, and a configurable delimiter. */
export function parseCsvRows(input: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}
