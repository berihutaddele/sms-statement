export type Txn = {
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  account: string;
  ref: string | null;
  receiptUrl: string | null;
  date: number;
  raw: string;
};

const num = (s: string) => parseFloat(s.replace(/,/g, ''));

export function parseCBE(body: string, date: number): Txn | null {
  const m = body.match(
    /Account\s+([\d*]+)\s+has been\s+(credited|debited)\s+with\s+ETB\s*([\d,]+(?:\.\d+)?)/i
  );
  const b = body.match(/Balance is\s+ETB\s*([\d,]+(?:\.\d+)?)/i);
  if (!m || !b) return null;
  const receiptUrl = body.match(/https?:\/\/\S+/)?.[0] ?? null;
  const ref = receiptUrl?.match(/BranchReceipt\/([^&\s]+)/i)?.[1] ?? null;
  return {
    type: m[2].toLowerCase() === 'credited' ? 'credit' : 'debit',
    amount: num(m[3]),
    balance: num(b[1]),
    account: m[1],
    ref,
    receiptUrl,
    date,
    raw: body,
  };
}
