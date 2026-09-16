export interface ValidationRule {
  field: string;
  label: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function validateItemData(
  data: Record<string, unknown>,
  rules: ValidationRule[],
): ValidationResult {
  const errors: string[] = [];
  for (const rule of rules) {
    const value = getNestedValue(data, rule.field);
    if (value === undefined || value === null || value === '') {
      errors.push(`Feld "${rule.label}" fehlt oder ist ungültig.`);
    }
  }
  return { valid: errors.length === 0, errors };
}
