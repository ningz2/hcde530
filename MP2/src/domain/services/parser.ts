import type { ParserService } from "@/domain/contracts/services";
import type { ParsedQuote } from "@/domain/entities/types";

/**
 * Real parser for the two ingest paths implemented in this slice:
 *  - PASTED_TEXT / TXT: one quote per non-empty line.
 *  - CSV: expects a header row; uses `participant`/`speaker`/`source` for the
 *    participant label column and `quote`/`text`/`comment` for the content column.
 *    Falls back to first column as participant, second as content.
 *
 * DOC/DOCX are not implemented yet and are rejected by the route validation path
 * (the contract still lists them for forward compatibility).
 */
export class RealParserService implements ParserService {
  async parse(params: {
    sourceType: "CSV" | "TXT" | "DOC" | "DOCX" | "PASTED_TEXT";
    payload: string;
    filename?: string;
  }): Promise<ParsedQuote[]> {
    if (params.sourceType === "CSV") {
      return parseCsv(params.payload, params.filename);
    }
    return parseLines(params.payload, params.filename ?? params.sourceType);
  }
}

function parseLines(payload: string, sourceRef: string): ParsedQuote[] {
  return payload
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      sourceRef,
      participantLabel: `Participant ${index + 1}`,
      text
    }));
}

function parseCsv(payload: string, filename?: string): ParsedQuote[] {
  const rows = parseCsvRows(payload);
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const participantIdx = findColumn(header, ["participant", "speaker", "source", "respondent"]);
  const contentIdx = findColumn(header, ["quote", "text", "comment", "response", "feedback"]);

  const hasHeader = participantIdx !== -1 || contentIdx !== -1;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const pIdx = participantIdx === -1 ? 0 : participantIdx;
  const cIdx = contentIdx === -1 ? 1 : contentIdx;

  const quotes: ParsedQuote[] = [];
  dataRows.forEach((row, index) => {
    const text = (row[cIdx] ?? "").trim();
    if (!text) {
      return;
    }
    const participantLabel = (row[pIdx] ?? "").trim() || `Participant ${index + 1}`;
    quotes.push({ sourceRef: filename ?? "upload.csv", participantLabel, text });
  });

  return quotes;
}

function findColumn(header: string[], candidates: string[]): number {
  return header.findIndex((cell) => candidates.includes(cell));
}

/** Minimal RFC-4180-ish CSV parser supporting quoted fields and escaped quotes. */
export function parseCsvRows(input: string): string[][] {
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
    } else if (char === ",") {
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
