import React from "react";

const SUB_MAP: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
};
const SUP_MAP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻",
};

type Token = { type: "text" | "sub" | "sup"; value: string };

// Tokenisiert eine chemische Formel.
// - Ziffern nach Buchstabe/) /] werden zu Subscripts (z. B. H2O → H₂O)
// - Nach "^" folgen Ladungen als Superscript (z. B. Ca^2+)
// - "*" wird zu "·" (Hydrat-Trennzeichen)
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let buf = "";
  const flush = () => {
    if (buf) {
      tokens.push({ type: "text", value: buf });
      buf = "";
    }
  };
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const prev = input[i - 1];
    if (c === "*") {
      flush();
      tokens.push({ type: "text", value: "·" });
      continue;
    }
    if (c === "^") {
      flush();
      let j = i + 1;
      let sup = "";
      while (j < input.length && /[0-9+\-]/.test(input[j])) {
        sup += input[j];
        j++;
      }
      if (sup) tokens.push({ type: "sup", value: sup });
      i = j - 1;
      continue;
    }
    if (/[0-9]/.test(c) && prev && /[A-Za-z\)\]]/.test(prev)) {
      flush();
      let j = i;
      let sub = "";
      while (j < input.length && /[0-9.]/.test(input[j])) {
        sub += input[j];
        j++;
      }
      tokens.push({ type: "sub", value: sub });
      i = j - 1;
      continue;
    }
    buf += c;
  }
  flush();
  return tokens;
}

export function FormulaText({ value, className }: { value: string; className?: string }) {
  const tokens = tokenize(value);
  return (
    <span className={className}>
      {tokens.map((t, i) => {
        if (t.type === "sub") return <sub key={i}>{t.value}</sub>;
        if (t.type === "sup") return <sup key={i}>{t.value}</sup>;
        return <React.Fragment key={i}>{t.value}</React.Fragment>;
      })}
    </span>
  );
}

export function formulaToUnicode(value: string): string {
  const tokens = tokenize(value);
  let out = "";
  for (const t of tokens) {
    if (t.type === "sub") {
      for (const ch of t.value) out += SUB_MAP[ch] ?? ch;
    } else if (t.type === "sup") {
      for (const ch of t.value) out += SUP_MAP[ch] ?? ch;
    } else {
      out += t.value;
    }
  }
  return out;
}