import { SchemaField, InterfaceSchema, DataType, CanonicalParameter, FieldComparisonResult, MatchCategory } from '../types';

export function normalizeHex(raw: string): string[] {
  const cleaned = raw.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '');
  const bytes: string[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    if (i + 1 < cleaned.length) {
      bytes.push(cleaned.slice(i, i + 2).toUpperCase());
    } else {
      bytes.push(cleaned.slice(i, i + 1).toUpperCase());
    }
  }
  return bytes;
}

export function inferHexSchema(rawPayload: string): InterfaceSchema {
  const bytes = normalizeHex(rawPayload);
  const fields: SchemaField[] = [];

  // Check for common DWIN T5L DGUS II header 5A A5
  const isDwinHeader = bytes.length >= 2 && bytes[0] === '5A' && bytes[1] === 'A5';

  if (isDwinHeader) {
    fields.push({
      id: `f_hex_0`,
      name: 'frame_header',
      path: 'frame_header',
      dataType: 'bytes',
      required: true,
      byteOffset: 0,
      byteLength: 2,
      exampleValue: '5A A5',
      description: 'DWIN DGUS II Sync Header (0x5AA5)',
    });

    if (bytes.length >= 3) {
      const lenVal = parseInt(bytes[2], 16);
      fields.push({
        id: `f_hex_2`,
        name: 'data_length',
        path: 'data_length',
        dataType: 'uint8',
        required: true,
        byteOffset: 2,
        byteLength: 1,
        exampleValue: lenVal,
        description: 'Remaining packet length in bytes',
      });
    }

    if (bytes.length >= 4) {
      const cmd = bytes[3];
      const cmdName = cmd === '83' ? 'Read VP (0x83)' : cmd === '82' ? 'Write VP (0x82)' : `Command (0x${cmd})`;
      fields.push({
        id: `f_hex_3`,
        name: 'command_code',
        path: 'command_code',
        dataType: 'uint8',
        required: true,
        byteOffset: 3,
        byteLength: 1,
        exampleValue: `0x${cmd}`,
        description: cmdName,
      });
    }

    if (bytes.length >= 6) {
      const vpHex = `0x${bytes[4]}${bytes[5]}`;
      fields.push({
        id: `f_hex_4`,
        name: 'vp_address',
        path: 'vp_address',
        dataType: 'uint16',
        required: true,
        byteOffset: 4,
        byteLength: 2,
        exampleValue: vpHex,
        description: 'Variable Pointer (RAM) Address',
      });
    }

    if (bytes.length >= 7) {
      const words = parseInt(bytes[6], 16);
      fields.push({
        id: `f_hex_6`,
        name: 'word_count',
        path: 'word_count',
        dataType: 'uint8',
        required: true,
        byteOffset: 6,
        byteLength: 1,
        exampleValue: words,
        description: '16-bit word length of payload',
      });
    }

    if (bytes.length >= 9) {
      const rawVal = parseInt(bytes[7] + bytes[8], 16);
      fields.push({
        id: `f_hex_7`,
        name: 'raw_data_word',
        path: 'raw_data_word',
        dataType: 'uint16',
        unit: 'ppm',
        required: true,
        byteOffset: 7,
        byteLength: 2,
        exampleValue: rawVal,
        description: 'Payload Data Register Word (16-bit)',
      });
    }
  } else {
    // Generic binary / hex byte inspector
    for (let i = 0; i < bytes.length; i += 2) {
      const hexPair = bytes.slice(i, i + 2).join('');
      const intVal = parseInt(hexPair, 16);
      fields.push({
        id: `f_byte_${i}`,
        name: `byte_${i}_${i + 1}`,
        path: `payload.offset_${i}`,
        dataType: 'uint16',
        required: false,
        byteOffset: i,
        byteLength: 2,
        exampleValue: isNaN(intVal) ? hexPair : intVal,
        description: `Raw offset 0x${i.toString(16).padStart(2, '0')}`,
      });
    }
  }

  return {
    inferredAt: new Date().toISOString(),
    isManuallyConfirmed: false,
    fields,
  };
}

export function inferJsonSchema(rawPayload: string): InterfaceSchema {
  const fields: SchemaField[] = [];
  try {
    const parsed = JSON.parse(rawPayload);
    extractJsonFields(parsed, '', fields);
  } catch (err) {
    fields.push({
      id: 'f_err',
      name: 'raw_unparsed_json',
      path: '$',
      dataType: 'string',
      required: true,
      exampleValue: rawPayload.slice(0, 40),
      description: 'Invalid JSON syntax; preserved as raw text',
    });
  }

  return {
    inferredAt: new Date().toISOString(),
    isManuallyConfirmed: false,
    fields,
  };
}

function extractJsonFields(obj: unknown, prefix: string, acc: SchemaField[]) {
  if (obj === null || obj === undefined) return;

  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, val] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        extractJsonFields(val, currentPath, acc);
      } else {
        const inferredType = detectType(val);
        const inferredUnit = detectUnit(key, val);
        acc.push({
          id: `f_${currentPath.replace(/[^a-zA-Z0-9_]/g, '_')}`,
          name: key,
          path: currentPath,
          dataType: inferredType,
          unit: inferredUnit,
          required: true,
          exampleValue: val,
          description: `Extracted from JSON path: ${currentPath}`,
        });
      }
    }
  } else if (Array.isArray(obj)) {
    acc.push({
      id: `f_${prefix || 'array'}`,
      name: prefix || 'items',
      path: `${prefix}[]`,
      dataType: 'array',
      required: true,
      exampleValue: `[${obj.length} items]`,
      description: 'Array payload',
    });
  }
}

export function inferCsvSchema(rawPayload: string): InterfaceSchema {
  const lines = rawPayload.trim().split('\n');
  const fields: SchemaField[] = [];

  if (lines.length > 0) {
    const headers = lines[0].split(',').map((h) => h.trim());
    const firstRow = lines.length > 1 ? lines[1].split(',').map((v) => v.trim()) : [];

    headers.forEach((header, index) => {
      const example = firstRow[index] || '';
      const inferredType = detectTypeFromStr(example);
      const inferredUnit = detectUnit(header, example);
      fields.push({
        id: `f_csv_${header}`,
        name: header,
        path: header,
        dataType: inferredType,
        unit: inferredUnit,
        required: true,
        exampleValue: example,
        description: `CSV column ${index + 1}: ${header}`,
      });
    });
  }

  return {
    inferredAt: new Date().toISOString(),
    isManuallyConfirmed: false,
    fields,
  };
}

export function inferSchemaFromSample(format: 'hex' | 'json' | 'csv' | 'text', rawPayload: string): InterfaceSchema {
  if (format === 'hex') {
    return inferHexSchema(rawPayload);
  }
  if (format === 'json') {
    return inferJsonSchema(rawPayload);
  }
  if (format === 'csv') {
    return inferCsvSchema(rawPayload);
  }
  // Generic text key-value parser
  const fields: SchemaField[] = [];
  const lines = rawPayload.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const separatorMatch = trimmed.match(/^([^:=]+)[:=]\s*(.*)$/);
    if (separatorMatch) {
      const key = separatorMatch[1].trim();
      const val = separatorMatch[2].trim();
      fields.push({
        id: `f_txt_${key}`,
        name: key,
        path: key,
        dataType: detectTypeFromStr(val),
        required: false,
        exampleValue: val,
      });
    } else {
      fields.push({
        id: `f_line_${i}`,
        name: `line_${i + 1}`,
        path: `line[${i}]`,
        dataType: 'string',
        required: false,
        exampleValue: trimmed,
      });
    }
  });

  return {
    inferredAt: new Date().toISOString(),
    isManuallyConfirmed: false,
    fields,
  };
}

function detectType(val: unknown): DataType {
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'number') {
    return Number.isInteger(val) ? 'uint16' : 'float';
  }
  if (typeof val === 'string') {
    return detectTypeFromStr(val);
  }
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'object') return 'object';
  return 'string';
}

function detectTypeFromStr(val: string): DataType {
  if (val.toLowerCase() === 'true' || val.toLowerCase() === 'false') return 'boolean';
  if (/^\d+$/.test(val)) {
    const num = parseInt(val, 10);
    return num <= 65535 ? 'uint16' : 'uint32';
  }
  if (/^[-+]?[0-9]*\.[0-9]+$/.test(val)) return 'float';
  if (!isNaN(Date.parse(val)) && (val.includes('-') || val.includes(':'))) return 'timestamp';
  if (/^[0-9a-fA-F]{4,}$/.test(val)) return 'bytes';
  return 'string';
}

function detectUnit(name: string, val: unknown): string | undefined {
  const lower = name.toLowerCase();
  if (lower.includes('co2') || lower.includes('ppm')) return 'ppm';
  if (lower.includes('temp') || lower.includes('celsius')) return '°C';
  if (lower.includes('fahrenheit')) return '°F';
  if (lower.includes('humidity') || lower.includes('percent') || lower.includes('pct')) return '%';
  if (lower.includes('volt') || lower.includes('v_')) return 'V';
  if (lower.includes('amp') || lower.includes('current')) return 'mA';
  if (lower.includes('press') || lower.includes('hpa')) return 'hPa';
  if (lower.includes('lux')) return 'lux';
  if (typeof val === 'string' && val.endsWith('ppm')) return 'ppm';
  if (typeof val === 'string' && val.endsWith('°C')) return '°C';
  return undefined;
}

export function compareFields(
  sourceField: SchemaField,
  targetField: SchemaField,
  canonicalParams: CanonicalParameter[]
): FieldComparisonResult {
  // 1. Check Canonical Binding
  const matchingCanonical = canonicalParams.find(
    (c) =>
      (sourceField.canonicalParamId && c.id === sourceField.canonicalParamId) ||
      (targetField.canonicalParamId && c.id === targetField.canonicalParamId)
  );

  const exactName = sourceField.name.toLowerCase() === targetField.name.toLowerCase();
  const compatibleTypes = sourceField.dataType === targetField.dataType;
  const sameUnits = sourceField.unit && targetField.unit && sourceField.unit === targetField.unit;

  if (matchingCanonical && (sourceField.canonicalParamId === targetField.canonicalParamId || exactName)) {
    if (compatibleTypes && (!sourceField.unit || sameUnits)) {
      return {
        sourceInterfaceId: '',
        sourceField,
        targetInterfaceId: '',
        targetField,
        category: 'exact_match',
        confidence: 0.98,
        reason: `Both fields bind to canonical parameter '${matchingCanonical.name}' with compatible types.`,
      };
    }
    if (!compatibleTypes) {
      return {
        sourceInterfaceId: '',
        sourceField,
        targetInterfaceId: '',
        targetField,
        category: 'type_conversion_match',
        confidence: 0.9,
        reason: `Same canonical parameter, but requires conversion from ${sourceField.dataType} to ${targetField.dataType}.`,
        suggestedTransform: `cast(${targetField.dataType})`,
      };
    }
  }

  // Exact Name & Type
  if (exactName && compatibleTypes) {
    return {
      sourceInterfaceId: '',
      sourceField,
      targetInterfaceId: '',
      targetField,
      category: 'exact_match',
      confidence: 0.95,
      reason: `Field name '${sourceField.name}' and data type '${sourceField.dataType}' match exactly.`,
    };
  }

  // Renamed Match
  const simplifiedSource = sourceField.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const simplifiedTarget = targetField.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (simplifiedSource.includes(simplifiedTarget) || simplifiedTarget.includes(simplifiedSource)) {
    if (compatibleTypes) {
      return {
        sourceInterfaceId: '',
        sourceField,
        targetInterfaceId: '',
        targetField,
        category: 'renamed_match',
        confidence: 0.82,
        reason: `Naming similarity between '${sourceField.name}' and '${targetField.name}'.`,
      };
    }
  }

  // Scaling / Unit Match
  if (sourceField.unit && targetField.unit && sourceField.unit !== targetField.unit) {
    return {
      sourceInterfaceId: '',
      sourceField,
      targetInterfaceId: '',
      targetField,
      category: 'scaling_match',
      confidence: 0.75,
      reason: `Unit mismatch: ${sourceField.unit} vs ${targetField.unit}. Requires scaling or conversion rule.`,
      suggestedTransform: `unit_convert(${sourceField.unit} -> ${targetField.unit})`,
    };
  }

  // Unmatched fallback
  return {
    sourceInterfaceId: '',
    sourceField,
    targetInterfaceId: '',
    targetField,
    category: 'unmatched',
    confidence: 0.2,
    reason: `Different field names and no shared canonical parameter.`,
  };
}
