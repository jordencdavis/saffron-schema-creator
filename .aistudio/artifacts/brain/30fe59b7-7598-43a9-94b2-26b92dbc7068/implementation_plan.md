# Multi-Interface Visual Data Flow Designer & Analyzer

A desktop-grade visual workspace for designing, inspecting, mapping, and analyzing data lineages across multiple IoT and embedded interfaces (e.g., DWIN UART display, ESP32 firmware, Firebase RTDB, Web/Flutter GUI, PC Logger) with deterministic offline simulation and cross-interface schema diffing.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product decisions were confirmed during initial review and govern the architecture:

- **Initial Project Preset**: Preloaded by default with the complete 5-interface IoT system (DWIN UART $\to$ ESP32 Firmware $\to$ Firebase RTDB $\to$ Flutter/Web GUI $\to$ PC Data Logger) measuring a realistic $\text{CO}_2$ concentration parameter, while allowing users to load additional templates or start from scratch.
- **Canvas Interaction Paradigm**: Hybrid visual flow canvas featuring automatic stage alignment columns ($1 \to 2 \to 3 \to 4 \to 5$) with full freeform dragging, port-to-port wire snapping, zoom, pan, and mini-map.
- **Execution & Diffing Granularity**: Comprehensive stage-by-stage data lineage execution trace highlighting fields added, modified, renamed, omitted/dropped, and type-converted at each node.
- **Safe Offline Execution**: Strictly deterministic client-side simulation. No unverified live hardware connections or production cloud writes will occur without explicit offline verification.

---

## 1. Overview & Core Concept

### What It Does
The Multi-Interface Visual Data Flow Designer & Analyzer enables embedded software engineers, IoT architects, and systems integrators to model, map, and trace how a single domain parameter (e.g., `climate.co2`) travels across distinct hardware, protocol, database, and client layers. Each interface maintains its own wire representation (hexadecimal UART byte packets, unpacked C structs, JSON documents, Firebase key paths, or localized GUI view models). The application reveals type mismatches, missing required fields, unit discrepancies, and unintended data drops before firmware or backend code is written.

### Target Audience & Persona
- **IoT Firmware Engineers (ESP32 / STM32 / FreeRTOS)** validating UART parsing, endianness, scaling factors, and struct packing.
- **HMI & Display Designers (DWIN / Nextion)** verifying Variable Pointer (VP) addressing and raw register byte layouts.
- **Cloud & Mobile Developers** verifying Firebase RTDB tree paths, payload structures, and client-side view-models.
- **System Integration & QA Engineers** auditing end-to-end data lineage, field omissions, and unit consistency.

### Key Value Delivered
- **Eliminate Semantic Drift**: Prevents errors where DWIN VP `0x5000` is decoded as raw integer `850`, sent as `co2_raw` by ESP32, mapped into Firebase as `sensors/co2/value`, and rendered in GUI as `co2Ppm` without clear unit or scaling contracts.
- **Side-by-Side Interface Inspection**: View all 5+ interface configurations simultaneously in a unified workbench without flipping between multiple tools.
- **Accidental Loss Detection**: Distinguishes intentional field dropping from accidental truncation or unmapped payload fields.

---

## 2. User Experience & Visual Design

### 2.1 Design System & Aesthetic Direction
- **Domain Aesthetic**: Professional developer console and telemetry instrument workbench adhering to high-density SaaS guidelines (`references/3_saas_dashboard.md`).
- **Color Palette**: Dark slate instrument palette (`slate-950` root, `slate-900` card surfaces, `slate-800` hairline dividers) with WCAG AA compliance and crisp semantic accents:
  - Cyan (`#06B6D4`): Source / Input interfaces & raw byte streams.
  - Emerald (`#10B981`): Parsed parameters, verified mappings, nominal validation states.
  - Violet (`#8B5CF6`): Transformations, scalings, and unit conversions.
  - Amber (`#F59E0B`): Potential type loss, unmapped optional fields, warnings.
  - Rose (`#F43F5E`): Missing required fields, parse errors, incompatible connection contracts.
- **Typography & Tabular Discipline**:
  - Display & Headlines: `Plus Jakarta Sans` for clean, professional headers.
  - Data, Telemetry & Hex: `JetBrains Mono` / `tabular-nums` for packet offsets, byte addresses, timestamps, and JSON paths.
- **Anti-Slop Discipline**: No decorative floating pill chips, no fake AI latency meters, no arbitrary novelty scores, and no decorative animations. Clean hairline borders (`border border-slate-800`) and unboxed typographic separators (`·` / `/`).

### 2.2 Workspace Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [App Title: FlowWeaver IoT] ── [Project: Smart HVAC v1.2] ── [Run Sim] [Validate]  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ MULTI-INTERFACE OVERVIEW (Horizontal 5-Card Ribbon, scrollable / collapsible)               │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │ 1. DWIN UART │ │ 2. ESP32 FW  │ │ 3. Firebase  │ │ 4. Web GUI   │ │ 5. PC Logger │ [...] │
│ │ HEX: 5A A5...│ │ Struct / JSON│ │ RTDB Path    │ │ Component VM │ │ CSV / SQLite │       │
│ │ 3 fields (✓) │ │ 5 fields (✓) │ │ 4 fields (✓) │ │ 3 fields (✓) │ │ 6 fields (✓) │       │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
├──────────────────────────────────────────────────────────────┬──────────────────────────────┤
│ CENTRAL VISUAL FLOW CANVAS (Interactive Node Graph)          │ CONTEXT & MAPPING INSPECTOR  │
│                                                              │                              │
│   [Source Node] ──> [Hex Parser] ──> [Enricher] ──> [Cloud]  │ - Selected Node / Wire Info  │
│         │                                                    │ - Input / Output Schemas     │
│         └──> [Logger Output Node]                            │ - Explicit Field Mapping     │
│                                                              │ - Unit & Scaling Conversions │
│   [Zoom / Pan Toolbar]               [Mini-Map Navigator]    │ - Validation Diagnostics     │
├──────────────────────────────────────────────────────────────┴──────────────────────────────┤
│ BOTTOM EXECUTION & LINEAGE ANALYZER (Tabbed, resizable dock)                                │
│ [Simulation Trace]  [Field Difference Matrix]  [Canonical Dictionary]  [Validation Report]   │
│ • Raw In (HEX) ─> Decoded (VP:0x5000) ─> Enriched (+devId) ─> Stored (RTDB) ─> GUI Value   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Technical Decisions & Trade-Offs

### Decision 1: Pure Client-Side Deterministic Execution Engine
- **Chosen Approach**: A TypeScript-based directed acyclic graph (DAG) topological execution engine executing completely in-browser without server or live hardware dependencies.
- **Why**: Eliminates flaky cloud timeouts, security token leaks, or hardware disconnection issues during design time. Guarantees 100% reproducible offline simulation runs.
- **Alternative Considered**: Server-side Python executor via Express. Rejected because local browser execution gives sub-millisecond simulation feedback on every keystroke and works offline without network reliance.

### Decision 2: Hybrid Layout Canvas (Auto-Stage Pipeline + Freeform Nodes)
- **Chosen Approach**: Built-in topological auto-layout option (arranging Interface 1 $\to$ Interface 5 linearly) combined with an SVG-based interactive drag-and-drop canvas supporting arbitrary branching, fan-out, and custom transformation nodes.
- **Why**: Users immediately see the standard end-to-end pipeline on first load without node clutter, while retaining full freedom to drag nodes, branch to parallel loggers, or insert intermediate format converters.

### Decision 3: Canonical Data Dictionary as the Single Source of Semantic Truth
- **Chosen Approach**: Decouple the underlying parameter definition (e.g. `climate.co2`, unit: `ppm`, expected range: `[400, 5000]`, float32) from the interface-specific representation (e.g. DWIN register `0x5000` vs ESP32 `co2_raw` vs Firebase `sensors/co2/value`).
- **Why**: Allows arbitrary N-to-M interface comparisons without having to hardcode $O(N^2)$ direct pairwise translations.

### Decision 4: Lossless Raw Sample Preservation
- **Chosen Approach**: Store raw user input (e.g., exact hex byte strings `5A A5 06 83 50 00 01 03 52`) in a dedicated immutable sample model. Parsers operate on views of the sample and record offset maps without mutating or truncating original bytes.

---

## 4. Technical Architecture & Data Strategy

### 4.1 System Component Hierarchy

```
┌───────────────────────────────────────────────────────────────────────────┐
│                             FlowWeaver Core                               │
│                                                                           │
│   ┌──────────────────┐    ┌────────────────────┐    ┌─────────────────┐   │
│   │ Project Storage  │    │ Canonical Registry │    │ Validation Core │   │
│   │ (Local / Export) │    │ (Semantic Schema)  │    │ (4-Tier Rules)  │   │
│   └────────┬─────────┘    └─────────┬──────────┘    └────────┬────────┘   │
│            │                        │                        │            │
│            ▼                        ▼                        ▼            │
│   ┌───────────────────────────────────────────────────────────────────┐   │
│   │                     Execution Engine (DAG)                        │   │
│   │  • Topological sort    • Node transforms    • Lineage tracer      │   │
│   └──────────────────────────────────┬────────────────────────────────┘   │
│                                      │                                    │
│   ┌──────────────────────────────────┴────────────────────────────────┐   │
│   │                          UI View Layer                            │   │
│   │  ┌───────────────────┐ ┌───────────────────┐ ┌──────────────────┐ │   │
│   │  │ Interface Ribbon  │ │ Visual Node Graph │ │ Properties Panel │ │   │
│   │  │ (5+ live panels)  │ │ (SVG canvas)      │ │ (Mapping editor) │ │   │
│   │  └───────────────────┘ └───────────────────┘ └──────────────────┘ │   │
│   │  ┌──────────────────────────────────────────────────────────────┐ │   │
│   │  │ Execution Trace & Cross-Interface Diffing Dock               │ │   │
│   │  └──────────────────────────────────────────────────────────────┘ │   │
│   └───────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Core Data Models

```typescript
// Interface Definition
export interface InterfaceModel {
  id: string;
  name: string;
  category: 'hex_binary' | 'uart_protocol' | 'json_stream' | 'firebase_rtdb' | 'csv_tabular' | 'app_object' | 'custom_text';
  role: 'input' | 'output' | 'bidirectional';
  description: string;
  deviceId?: string;
  samples: DataSample[];
  activeSampleId: string;
  inferredSchema: InterfaceSchema;
  confirmedSchema: InterfaceSchema;
}

// Data Sample
export interface DataSample {
  id: string;
  label: string;
  format: 'hex' | 'json' | 'csv' | 'text';
  rawPayload: string;
  capturedAt: string;
  isMalformed?: boolean;
}

// Schema Field
export interface SchemaField {
  id: string;
  name: string;
  path: string; // e.g. "sensors.co2.value"
  dataType: 'uint8' | 'uint16' | 'uint32' | 'int16' | 'int32' | 'float' | 'string' | 'boolean' | 'bytes' | 'timestamp';
  unit?: string;
  required: boolean;
  byteOffset?: number;
  byteLength?: number;
  bitOffset?: number;
  scaleFactor?: number;
  offsetAdd?: number;
  canonicalParamId?: string; // Links to Canonical Dictionary
}

// Canonical Parameter Definition
export interface CanonicalParameter {
  id: string; // e.g. "climate.co2"
  name: string;
  description: string;
  dataType: 'integer' | 'float' | 'string' | 'boolean';
  standardUnit: string; // e.g. "ppm"
  validRange?: [number, number];
  knownIdentifiers: {
    interfaceId: string;
    fieldPath: string;
  }[];
}

// Graph Node & Edge Models
export interface FlowNode {
  id: string;
  interfaceId?: string; // If bound to an interface
  type: 'source' | 'hex_decoder' | 'json_parser' | 'csv_parser' | 'rename' | 'transform' | 'scaling' | 'unit_converter' | 'enricher' | 'filter' | 'destination';
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  inputs: { id: string; name: string; type: string }[];
  outputs: { id: string; name: string; type: string }[];
}

export interface FlowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  mappings: {
    sourceField: string;
    targetField: string;
    transformRule?: 'direct' | 'scale' | 'rename' | 'type_cast' | 'custom_expr';
    scaleMultiplier?: number;
    scaleOffset?: number;
  }[];
}
```

### 4.3 Deterministic Simulation & Trace Pipeline

When a simulation execution is triggered:
1. **Sample Ingestion**: The active sample of each source node is loaded in raw form without mutation.
2. **Topological Order Execution**: The engine calculates dependency order via Kahn's algorithm, detecting cycles if present.
3. **Stage Processing**:
   - `hex_decoder`: Parses frame header (e.g. `5A A5`), length byte, command (`83` read / `82` write), 16-bit VP address (`0x5000`), and payload words into typed fields.
   - `enricher`: Adds simulated metadata (`deviceId: "ESP32-CORE-01"`, `received_at: ISO8601`, `seq: 1042`).
   - `transform`: Applies numeric scaling (e.g., raw ADC $\to$ engineering units), type conversions, and canonical parameter bindings.
   - `firebase_formatter`: Generates structured tree payload (`{ "devices": { "ESP32-CORE-01": { "co2": 850 } } }`).
   - `gui_adapter`: Translates to frontend state view-model (`{ co2Ppm: 850, alertLevel: "normal" }`).
4. **Lineage & Diff Recording**: At every stage, the engine computes:
   - Preserved fields (passed unchanged).
   - Added fields (enrichment / metadata).
   - Modified fields (scaled, converted).
   - Renamed fields (path / alias changes).
   - Dropped / Omitted fields (with warning if field was marked `required`).
5. **Execution Diagnostic Generation**: Evaluates 4 validation tiers (Node, Connection, Sample, End-to-End).

---

## 5. Implementation Phases Mapped to PRD

### Phase 1: Interface Workbench & Multi-Interface Overview
- Build the 5-interface simultaneous overview ribbon with DWIN UART, ESP32, Firebase RTDB, Web GUI, and PC Logger preconfigured.
- Implement sample managers supporting multiple fixtures per interface (normal frame, abnormal frame, edge-case values).
- Implement raw data editors with syntax preview and byte count verification for HEX, JSON, CSV, and plain text.
- Implement persistent project state (Save, Load, Export JSON, Import JSON, Reset).

### Phase 2: Schema Inference, Canonical Dictionary & Field Matching
- Implement schema inference for JSON, CSV, and structured hexadecimal packets (frame framing detection).
- Build the shared **Canonical Data Dictionary** managing `climate.co2`, `climate.temperature`, `climate.humidity`, and device telemetry.
- Build cross-interface field comparison matrix categorizing relationships (Exact match, Renamed match, Type conversion needed, Scaling needed, Unmatched, Missing required).
- Allow manual confirmation, override, and field-to-canonical bindings.

### Phase 3: Visual Flow Designer & Node Canvas
- Implement interactive SVG canvas with zoom, pan, grid snapping, and node dragging.
- Add node types: Sources, Hex Decoders, JSON Parsers, Renamers, Scalers, Unit Converters, Metadata Enrichers, and Interface Destination Sinks.
- Port-to-port wire drawing with connection mapping modal.
- Connection contract validation (type compatibility check, required field check).

### Phase 4: Deterministic Simulation & End-to-End Diffing
- Implement client-side DAG executor with single-step and end-to-end simulation.
- Build the **Cross-Interface Diffing Dock**:
  - Side-by-side comparison between any two interfaces in the flow.
  - Granular breakdown of Added, Renamed, Preserved, Scaled, and Dropped fields.
  - Complete execution trace displaying timestamp semantics (receive time vs. processing time).
- Implement the 4-tier validation engine (Node, Connection, Sample, End-to-End) with actionable diagnostic recommendations.

### Phase 5: Export, Verification & Production Hardening
- Implement export formats:
  - Complete project configuration JSON.
  - ESP32 C-header / struct definition generator based on verified mappings.
  - Firebase RTDB rules snippet or schema JSON.
  - Detailed Markdown verification audit report.
- Verify end-to-end flow with sample test scenarios and edge cases.

---

## 6. Technical Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Hex Packet Offset Inconsistencies** | Parsing bytes with wrong endianness or byte offsets corrupts decoded integers. | Provide visual hex byte-inspector with color-coded slice highlights (Header, Command, VP, Length, Data) and big/little-endian toggles. |
| **Schema Divergence across Interfaces** | One interface calls it `co2_ppm` while another calls it `sensors.co2.value`. | All interface fields bind to the centralized Canonical Parameter definition (`climate.co2`) which acts as the neutral semantic anchor. |
| **Silent Data Truncation** | Dropping fields during serialization without user awareness. | Diff analyzer flags omitted fields with explicit badges: Intentional Omission vs. Unmapped Field Loss. |
| **Graph Dependency Cycles** | Infinite loops during topological execution. | Kahn's algorithm validates acyclicity before running; UI prevents cyclic wire connections with visual error badges. |
