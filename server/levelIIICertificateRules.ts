export function normaliseLevelIIITechnicianCertificateNumber(
  certificateNumber: string | null | undefined
) {
  return String(certificateNumber ?? "").trim().toUpperCase();
}

export function isLevelIIITechnicianCertificateNumberFormat(
  certificateNumber: string | null | undefined
) {
  return /^L3C-\d{4}-\d+$/.test(normaliseLevelIIITechnicianCertificateNumber(certificateNumber));
}

export function formatLevelIIITechnicianCertificateNumber(year: number, sequence: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error("Certificate year must be a four-digit year.");
  }
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error("Certificate sequence must be a positive integer.");
  }

  return `L3C-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseLevelIIITechnicianCertificateSequence(
  certificateNumber: string | null | undefined,
  year: number
) {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) {
    throw new Error("Certificate year must be a four-digit year.");
  }

  const match = String(certificateNumber ?? "")
    .trim()
    .toUpperCase()
    .match(/^L3C-(\d{4})-(\d+)$/i);
  if (!match) {
    return null;
  }

  if (Number(match[1]) !== year) {
    return null;
  }

  const sequence = Number(match[2]);
  return Number.isInteger(sequence) && sequence > 0 ? sequence : null;
}

export function getNextLevelIIITechnicianCertificateSequence(
  existingCertificateNumbers: Array<string | null | undefined>,
  now = new Date()
) {
  const year = now.getFullYear();
  const maxSequence = existingCertificateNumbers.reduce((highest, certificateNumber) => {
    const sequence = parseLevelIIITechnicianCertificateSequence(certificateNumber, year);
    return sequence && sequence > highest ? sequence : highest;
  }, 0);

  return maxSequence + 1;
}

export function buildNextLevelIIITechnicianCertificateNumber(
  existingCertificateNumbers: Array<string | null | undefined>,
  now = new Date()
) {
  const nextSequence = getNextLevelIIITechnicianCertificateSequence(
    existingCertificateNumbers,
    now
  );
  return formatLevelIIITechnicianCertificateNumber(now.getFullYear(), nextSequence);
}
