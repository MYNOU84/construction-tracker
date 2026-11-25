/**
 * Minimal, dependency-free PDF writer for the fictional demonstration documents (WP6).
 *
 * - A4 portrait, standard Helvetica / Helvetica-Bold with WinAnsiEncoding (no embedded fonts).
 * - Deterministic output: fixed CreationDate, no random IDs, zlib-deflated content streams.
 * - Every page carries a "DEMO – FICTIONAL" watermark, the black/gold header band and a
 *   "fictional – not for construction" footer, so no page can be mistaken for a real document.
 */
import { deflateSync } from 'zlib';

const W = 595.28;
const H = 841.89;
const MARGIN = 48;
const TOP = H - 96;      // first content line below the header band
const BOTTOM = 64;       // keep clear of the footer

type RGB = [number, number, number];
export const C = {
  ink: [0.09, 0.09, 0.1] as RGB,
  black: [0.02, 0.02, 0.02] as RGB,
  gold: [0.788, 0.596, 0.173] as RGB,
  goldLight: [0.878, 0.737, 0.388] as RGB,
  warm: [0.961, 0.945, 0.91] as RGB,
  white: [1, 1, 1] as RGB,
  grey: [0.42, 0.42, 0.44] as RGB,
  line: [0.8, 0.78, 0.74] as RGB,
  green: [0.13, 0.55, 0.3] as RGB,
  red: [0.75, 0.2, 0.18] as RGB,
  amber: [0.82, 0.55, 0.1] as RGB,
};

// Helvetica AFM advance widths for 32..126
const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];
const WIN_ANSI: Record<string, number> = {
  '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
};

function charWidth(ch: string): number {
  const code = ch.charCodeAt(0);
  if (code >= 32 && code <= 126) return HELV[code - 32];
  if (ch === '–' || ch === '•') return 556;
  if (ch === '—' || ch === '…') return 1000;
  if (ch === '’' || ch === '‘') return 222;
  if (ch === '“' || ch === '”') return 333;
  if (ch === '€') return 556;
  const base = ch.normalize('NFD')[0];
  if (base && base !== ch) return charWidth(base);
  return 556;
}

export function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of s) w += charWidth(ch);
  return (w / 1000) * size * (bold ? 1.08 : 1);
}

/** Encode a JS string as a PDF literal string in WinAnsi (latin1 + a few typographic marks). */
function pdfString(s: string): string {
  let out = '(';
  for (const ch of s) {
    let code = WIN_ANSI[ch] ?? ch.charCodeAt(0);
    if (code > 255) code = 63; // '?'
    if (code === 40 || code === 41 || code === 92) out += '\\' + String.fromCharCode(code);
    else if (code < 32 || code > 126) out += '\\' + code.toString(8).padStart(3, '0');
    else out += String.fromCharCode(code);
  }
  return out + ')';
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();

export interface DocMeta {
  title: string;
  docNo: string;
  projectName: string;
  projectCode: string;
  revision: string;
  date: string;
  status: string;
}

export function wrap(text: string, size: number, maxW: number, bold = false): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const cand = line ? line + ' ' + w : w;
      if (textWidth(cand, size, bold) <= maxW || !line) line = cand;
      else { lines.push(line); line = w; }
    }
    lines.push(line);
  }
  return lines;
}

export class PdfDoc {
  private pages: string[] = [];
  private ops: string[] = [];
  y = TOP;
  readonly left = MARGIN;
  readonly right = W - MARGIN;
  readonly width = W - 2 * MARGIN;

  constructor(readonly meta: DocMeta) { this.newPage(); }

  // ── primitives ────────────────────────────────────────────────
  fill(c: RGB) { this.ops.push(`${f(c[0])} ${f(c[1])} ${f(c[2])} rg`); }
  stroke(c: RGB) { this.ops.push(`${f(c[0])} ${f(c[1])} ${f(c[2])} RG`); }
  rect(x: number, y: number, w: number, h: number, mode: 'f' | 'S' | 'B' = 'f') {
    this.ops.push(`${f(x)} ${f(y)} ${f(w)} ${f(h)} re ${mode}`);
  }
  line(x1: number, y1: number, x2: number, y2: number, width = 0.5, dash?: number[]) {
    this.ops.push(`${f(width)} w ${dash ? `[${dash.join(' ')}] 0 d` : '[] 0 d'} ${f(x1)} ${f(y1)} m ${f(x2)} ${f(y2)} l S`);
  }
  circle(cx: number, cy: number, r: number, mode: 'f' | 'S' | 'B' = 'S') {
    const k = 0.5523 * r;
    this.ops.push(
      `${f(cx + r)} ${f(cy)} m ${f(cx + r)} ${f(cy + k)} ${f(cx + k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c ` +
      `${f(cx - k)} ${f(cy + r)} ${f(cx - r)} ${f(cy + k)} ${f(cx - r)} ${f(cy)} c ` +
      `${f(cx - r)} ${f(cy - k)} ${f(cx - k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c ` +
      `${f(cx + k)} ${f(cy - r)} ${f(cx + r)} ${f(cy - k)} ${f(cx + r)} ${f(cy)} c ${mode}`);
  }
  text(x: number, y: number, s: string, size = 10, bold = false, color: RGB = C.ink) {
    this.fill(color);
    this.ops.push(`BT /${bold ? 'F2' : 'F1'} ${f(size)} Tf ${f(x)} ${f(y)} Td ${pdfString(s)} Tj ET`);
  }
  textRight(xRight: number, y: number, s: string, size = 10, bold = false, color: RGB = C.ink) {
    this.text(xRight - textWidth(s, size, bold), y, s, size, bold, color);
  }
  textCenter(xc: number, y: number, s: string, size = 10, bold = false, color: RGB = C.ink) {
    this.text(xc - textWidth(s, size, bold) / 2, y, s, size, bold, color);
  }

  // ── page frame ────────────────────────────────────────────────
  newPage() {
    if (this.ops.length) this.pages.push(this.ops.join('\n'));
    this.ops = [];
    // Watermark first, so all content is drawn above it.
    this.ops.push('q');
    this.fill([0.9, 0.9, 0.9]);
    this.ops.push(`BT /F2 64 Tf 0.7071 0.7071 -0.7071 0.7071 120 190 Tm ${pdfString('DEMO – FICTIONAL')} Tj ET`);
    this.ops.push('Q');
    // Header band
    this.fill(C.black); this.rect(0, H - 70, W, 70);
    this.fill(C.gold); this.rect(0, H - 72, W, 2);
    this.text(MARGIN, H - 26, 'BUILDTRACK PRO  ·  FICTIONAL DEMONSTRATION DOCUMENT', 7.5, true, C.gold);
    const title = this.meta.title.length > 70 ? this.meta.title.slice(0, 67) + '…' : this.meta.title;
    this.text(MARGIN, H - 46, title, 15, true, C.goldLight);
    this.text(MARGIN, H - 61, `${this.meta.projectName}  ·  ${this.meta.projectCode}`, 8.5, false, C.warm);
    this.textRight(W - MARGIN, H - 26, this.meta.docNo, 8.5, true, C.warm);
    this.textRight(W - MARGIN, H - 40, `Rev. ${this.meta.revision}  ·  ${this.meta.date}`, 8, false, C.warm);
    this.y = TOP;
  }

  ensure(h: number) { if (this.y - h < BOTTOM) this.newPage(); }
  space(h: number) { this.y -= h; }

  // ── flow content ──────────────────────────────────────────────
  disclaimer() {
    const msg = 'FICTIONAL DOCUMENT – generated for software demonstration only. All names, companies, '
      + 'references, quantities and amounts are invented. Not for construction, contractual, regulatory or tender use.';
    const lines = wrap(msg, 8.5, this.width - 24);
    const h = lines.length * 11 + 14;
    this.ensure(h + 8);
    this.fill([0.99, 0.96, 0.88]); this.stroke(C.gold);
    this.ops.push('0.8 w'); this.rect(this.left, this.y - h, this.width, h, 'B');
    let yy = this.y - 15;
    for (const l of lines) { this.text(this.left + 12, yy, l, 8.5, true, [0.45, 0.33, 0.07]); yy -= 11; }
    this.y -= h + 14;
  }

  h1(s: string) {
    this.ensure(34);
    this.y -= 8;
    this.text(this.left, this.y - 12, s.toUpperCase(), 11, true, C.ink);
    this.fill(C.gold); this.rect(this.left, this.y - 18, 36, 1.6);
    this.y -= 30;
  }
  h2(s: string) {
    this.ensure(22);
    this.text(this.left, this.y - 10, s, 9.5, true, C.ink);
    this.y -= 18;
  }
  p(s: string, size = 9, color: RGB = C.ink, indent = 0) {
    const lines = wrap(s, size, this.width - indent);
    for (const l of lines) {
      this.ensure(size + 4);
      this.text(this.left + indent, this.y - size, l, size, false, color);
      this.y -= size + 3.4;
    }
    this.y -= 4;
  }
  bullets(items: string[], size = 9) {
    for (const it of items) {
      const lines = wrap(it, size, this.width - 14);
      lines.forEach((l, i) => {
        this.ensure(size + 4);
        if (i === 0) { this.fill(C.gold); this.rect(this.left + 2, this.y - size + 2.2, 3, 3); }
        this.text(this.left + 14, this.y - size, l, size, false, C.ink);
        this.y -= size + 3.4;
      });
    }
    this.y -= 4;
  }
  kv(rows: [string, string][], labelW = 140) {
    for (const [k, v] of rows) {
      const lines = wrap(v, 9, this.width - labelW - 16);
      const h = Math.max(1, lines.length) * 12 + 6;
      this.ensure(h);
      this.fill(C.warm); this.rect(this.left, this.y - h, labelW, h);
      this.stroke(C.line); this.ops.push('0.4 w'); this.rect(this.left, this.y - h, this.width, h, 'S');
      this.text(this.left + 6, this.y - 13, k, 8.5, true, C.ink);
      lines.forEach((l, i) => this.text(this.left + labelW + 8, this.y - 13 - i * 12, l, 9, false, C.ink));
      this.y -= h;
    }
    this.y -= 10;
  }
  /** Table with wrapping cells. `align` per column: 'l' | 'r' | 'c'. `bold` rows are drawn as totals. */
  table(headers: string[], rows: string[][], widths: number[], opts: { align?: string[]; size?: number; totalRows?: number } = {}) {
    const size = opts.size ?? 8;
    const total = widths.reduce((a, b) => a + b, 0);
    const ws = widths.map(w => (w / total) * this.width);
    const align = opts.align ?? headers.map(() => 'l');
    const drawHeader = () => {
      const hl = headers.map((h, i) => wrap(h, size, ws[i] - 8, true));
      const hh = Math.max(...hl.map(l => l.length)) * (size + 2) + 8;
      this.ensure(hh + 16);
      this.fill(C.black); this.rect(this.left, this.y - hh, this.width, hh);
      let x = this.left;
      hl.forEach((ls, i) => {
        ls.forEach((l, j) => this.text(x + 4, this.y - 4 - (j + 1) * (size + 2) + 2, l, size, true, C.goldLight));
        x += ws[i];
      });
      this.y -= hh;
    };
    drawHeader();
    rows.forEach((row, ri) => {
      const isTotal = opts.totalRows !== undefined && ri >= rows.length - opts.totalRows;
      const cl = row.map((c, i) => wrap(c ?? '', size, ws[i] - 8, isTotal));
      const rh = Math.max(...cl.map(l => l.length)) * (size + 2) + 6;
      if (this.y - rh < BOTTOM) { this.newPage(); drawHeader(); }
      if (isTotal) { this.fill([0.98, 0.93, 0.8]); this.rect(this.left, this.y - rh, this.width, rh); }
      else if (ri % 2 === 1) { this.fill([0.985, 0.975, 0.955]); this.rect(this.left, this.y - rh, this.width, rh); }
      this.stroke(C.line); this.line(this.left, this.y - rh, this.right, this.y - rh, 0.3);
      let x = this.left;
      cl.forEach((ls, i) => {
        ls.forEach((l, j) => {
          const yy = this.y - 3 - (j + 1) * (size + 2) + 2;
          if (align[i] === 'r') this.textRight(x + ws[i] - 4, yy, l, size, isTotal);
          else if (align[i] === 'c') this.textCenter(x + ws[i] / 2, yy, l, size, isTotal);
          else this.text(x + 4, yy, l, size, isTotal);
        });
        x += ws[i];
      });
      this.y -= rh;
    });
    this.y -= 12;
  }
  /** Signature / approval boxes. */
  signatures(labels: string[]) {
    const h = 62;
    this.ensure(h + 10);
    const w = this.width / labels.length;
    labels.forEach((l, i) => {
      const x = this.left + i * w;
      this.stroke(C.line); this.ops.push('0.5 w'); this.rect(x + 2, this.y - h, w - 4, h, 'S');
      this.text(x + 8, this.y - 12, l, 7.5, true, C.grey);
      this.text(x + 8, this.y - h + 8, 'Specimen – no signature', 7, false, C.grey);
    });
    this.y -= h + 10;
  }
  /** Reserve a block of height h for custom drawing; returns its bottom-left y. */
  block(h: number): number {
    this.ensure(h);
    this.y -= h;
    return this.y;
  }
  raw(op: string) { this.ops.push(op); }

  // ── output ────────────────────────────────────────────────────
  toBuffer(): Buffer {
    if (this.ops.length) this.pages.push(this.ops.join('\n'));
    this.ops = [];
    const n = this.pages.length;
    const footer = (i: number) => {
      const o: string[] = [];
      const t = (x: number, y: number, s: string, size: number, bold: boolean, c: RGB) =>
        o.push(`${f(c[0])} ${f(c[1])} ${f(c[2])} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${f(x)} ${f(y)} Td ${pdfString(s)} Tj ET`);
      o.push(`${f(C.gold[0])} ${f(C.gold[1])} ${f(C.gold[2])} RG 0.6 w [] 0 d ${MARGIN} 46 m ${f(W - MARGIN)} 46 l S`);
      t(MARGIN, 34, 'Demonstration document – fictional – not for construction', 7.5, true, C.grey);
      t(MARGIN, 24, `${this.meta.docNo} · Rev. ${this.meta.revision} · ${this.meta.status}`, 7, false, C.grey);
      const pg = `Page ${i + 1} of ${n}`;
      t(W - MARGIN - textWidth(pg, 7.5), 34, pg, 7.5, false, C.grey);
      return o.join('\n');
    };

    const chunks: Buffer[] = [];
    const offsets: number[] = [];
    let pos = 0;
    const push = (b: Buffer | string) => {
      const buf = typeof b === 'string' ? Buffer.from(b, 'latin1') : b;
      chunks.push(buf); pos += buf.length;
    };
    const obj = (id: number, body: Buffer | string) => {
      offsets[id] = pos;
      push(`${id} 0 obj\n`); push(body); push('\nendobj\n');
    };

    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const pageIds = this.pages.map((_, i) => 6 + i * 2);
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Count ${n} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`);
    obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    obj(5, `<< /Title ${pdfString(`${this.meta.title} – ${this.meta.projectName} (FICTIONAL DEMO)`)} `
      + `/Subject ${pdfString('Fictional demonstration document – not for construction')} `
      + `/Producer ${pdfString('BuildTrack Pro demo generator')} /CreationDate (D:20261124000000Z) >>`);
    this.pages.forEach((content, i) => {
      const pid = pageIds[i];
      const stream = deflateSync(Buffer.from(content + '\n' + footer(i), 'latin1'), { level: 9 });
      obj(pid, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(W)} ${f(H)}] `
        + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pid + 1} 0 R >>`);
      offsets[pid + 1] = pos;
      push(`${pid + 1} 0 obj\n<< /Length ${stream.length} /Filter /FlateDecode >>\nstream\n`);
      push(stream);
      push('\nendstream\nendobj\n');
    });
    const total = 6 + n * 2;
    const xref = pos;
    let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let i = 1; i < total; i++) x += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    push(x);
    push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return Buffer.concat(chunks);
  }
}

export const PAGE = { W, H, MARGIN };
