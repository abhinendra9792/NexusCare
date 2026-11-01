const EMERGENCY_PATTERNS: RegExp[] = [
  /chest pain/i,
  /can'?t breathe|cannot breathe|difficulty breathing|not breathing/i,
  /unconscious|unresponsive|passed out/i,
  /severe bleeding|bleeding heavily/i,
  /heart attack/i,
  /stroke/i,
  /seizure/i,
  /overdose/i,
  /suicid|kill myself|end my life/i,
]

export function mayBeEmergency(text: string): boolean {
  return EMERGENCY_PATTERNS.some((pattern) => pattern.test(text))
}