export type InterfaceCategory = 
  | 'hex_binary'
  | 'uart_protocol'
  | 'json_stream'
  | 'firebase_rtdb'
  | 'csv_tabular'
  | 'app_object'
  | 'custom_text';

export type InterfaceRole = 'input' | 'output' | 'bidirectional';

export type DataType = 
  | 'uint8'
  | 'uint16'
  | 'uint32'
  | 'int16'
  | 'int32'
  | 'float'
  | 'string'
  | 'boolean'
  | 'bytes'
  | 'timestamp'
  | 'object'
  | 'array';

export interface DataSample {
  id: string;
  name: string;
  format: 'hex' | 'json' | 'csv' | 'text';
  rawPayload: string;
  capturedAt: string;
  description?: string;
  isMalformed?: boolean;
}

export interface SchemaField {
  id: string;
  name: string;
  path: string; // e.g. "sensors.co2.value" or "payload.word[0]"
  dataType: DataType;
  unit?: string;
  required: boolean;
  byteOffset?: number;
  byteLength?: number;
  bitOffset?: number;
  scaleFactor?: number;
  offsetAdd?: number;
  exampleValue?: unknown;
  canonicalParamId?: string; // Links to CanonicalParameter
  description?: string;
  isDerived?: boolean;
}

export interface InterfaceSchema {
  fields: SchemaField[];
  inferredAt: string;
  isManuallyConfirmed: boolean;
}

export interface InterfaceModel {
  id: string;
  name: string;
  category: InterfaceCategory;
  role: InterfaceRole;
  protocol: string;
  description: string;
  deviceId?: string;
  samples: DataSample[];
  activeSampleId: string;
  inferredSchema: InterfaceSchema;
  confirmedSchema: InterfaceSchema;
  isEnabled: boolean;
  colorTheme: string;
}

export interface CanonicalParameter {
  id: string; // e.g. "climate.co2"
  name: string;
  description: string;
  dataType: DataType;
  standardUnit: string;
  validRange?: [number, number];
  freshnessPolicySeconds?: number;
  knownBindings: {
    interfaceId: string;
    fieldPath: string;
  }[];
}

export type NodeType = 
  | 'source'
  | 'hex_decoder'
  | 'json_parser'
  | 'csv_parser'
  | 'rename'
  | 'transform'
  | 'scaling'
  | 'unit_converter'
  | 'enricher'
  | 'filter'
  | 'destination';

export interface PortDefinition {
  id: string;
  name: string;
  type: DataType | 'any' | 'packet';
  description?: string;
}

export interface CustomParameter {
  id: string;
  name: string;
  type: DataType;
  value: unknown;
  unit?: string;
  description?: string;
}

export interface FlowNode {
  id: string;
  interfaceId?: string; // Bound interface if this is a source or destination
  type: NodeType;
  title: string;
  subtitle?: string;
  stage: number; // 1 to 5 for stage-based pipeline
  position: { x: number; y: number };
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  config: {
    // For hex decoder:
    frameHeader?: string;
    endianness?: 'big' | 'little';
    vpAddress?: string;
    payloadWordOffset?: number;
    // For rename:
    renameMap?: Record<string, string>;
    // For scaling / unit converter:
    targetField?: string;
    multiplier?: number;
    offsetAdd?: number;
    targetUnit?: string;
    // For enricher:
    addedDeviceId?: string;
    addTimestamp?: boolean;
    timestampFormat?: 'iso8601' | 'unix_seconds' | 'unix_millis';
    addSequenceId?: boolean;
    // For filter:
    filterCondition?: string;
    // Generic expression:
    customTransform?: string;
    // Custom user-added/edited parameters on this node:
    customParameters?: CustomParameter[];
    // Last sent payload from this node:
    lastSentPayload?: string;
  };
}

export type TransformRule = 'direct' | 'rename' | 'scale' | 'type_cast' | 'custom_expr';

export interface ConnectionMapping {
  id: string;
  sourceField: string;
  targetField: string;
  transformRule: TransformRule;
  scaleMultiplier?: number;
  scaleOffset?: number;
  targetType?: DataType;
  notes?: string;
}

export interface FlowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  mappings: ConnectionMapping[];
  isValid?: boolean;
  validationMessage?: string;
}

export type MatchCategory = 
  | 'exact_match'
  | 'renamed_match'
  | 'type_conversion_match'
  | 'scaling_match'
  | 'decoded_match'
  | 'partial_match'
  | 'ambiguous_match'
  | 'unmatched'
  | 'incompatible'
  | 'missing_required';

export interface FieldComparisonResult {
  sourceInterfaceId: string;
  sourceField: SchemaField;
  targetInterfaceId: string;
  targetField?: SchemaField;
  category: MatchCategory;
  confidence: number;
  reason: string;
  suggestedTransform?: string;
  isConfirmedByUser?: boolean;
}

export interface NodeExecutionTrace {
  nodeId: string;
  nodeTitle: string;
  nodeType: NodeType;
  status: 'success' | 'warning' | 'error' | 'skipped';
  inputPayload: Record<string, unknown> | string | null;
  outputPayload: Record<string, unknown> | string | null;
  fieldsPreserved: string[];
  fieldsAdded: string[];
  fieldsModified: string[];
  fieldsOmitted: string[];
  durationMs: number;
  errorMessage?: string;
}

export interface SimulationResult {
  id: string;
  executedAt: string;
  status: 'passed' | 'warnings' | 'failed';
  totalDurationMs: number;
  traces: Record<string, NodeExecutionTrace>;
  finalPayloadByDestination: Record<string, unknown>;
  fieldLineageTrace: {
    canonicalParamId: string;
    path: {
      nodeId: string;
      fieldName: string;
      value: unknown;
      unit?: string;
      representation: string;
    }[];
  }[];
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationDiagnostic {
  id: string;
  tier: 'node' | 'connection' | 'sample' | 'end_to_end';
  severity: ValidationSeverity;
  targetId: string;
  targetName: string;
  title: string;
  description: string;
  expected?: string;
  actual?: string;
  suggestedCorrection?: string;
  canContinue: boolean;
}

export interface ProjectConfig {
  id: string;
  version: string;
  name: string;
  description: string;
  updatedAt: string;
  interfaces: InterfaceModel[];
  canonicalParameters: CanonicalParameter[];
  nodes: FlowNode[];
  connections: FlowConnection[];
  selectedInterfaceId: string | null;
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
}
