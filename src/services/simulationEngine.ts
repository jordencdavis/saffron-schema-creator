import { ProjectConfig, SimulationResult, NodeExecutionTrace, FlowNode, FlowConnection } from '../types';
import { normalizeHex } from './schemaInference';

export function runSimulation(project: ProjectConfig, startNodeId?: string): SimulationResult {
  const startTime = performance.now();
  const traces: Record<string, NodeExecutionTrace> = {};
  const nodeOutputs: Record<string, Record<string, unknown>> = {};
  const destinationPayloads: Record<string, unknown> = {};

  // 1. Topological Sorting
  const sortedNodes = topologicalSort(project.nodes, project.connections);
  let hasWarnings = false;
  let hasFailed = false;

  for (const node of sortedNodes) {
    if (startNodeId && node.id !== startNodeId && !isDownstream(node.id, startNodeId, project.connections)) {
      continue;
    }

    const nodeStartTime = performance.now();
    let inputPayload: Record<string, unknown> = {};

    // Gather inputs from incoming connections
    const incomingConns = project.connections.filter((c) => c.targetNodeId === node.id);
    for (const conn of incomingConns) {
      const sourceOutput = nodeOutputs[conn.sourceNodeId] || {};
      // Apply connection mappings
      if (conn.mappings && conn.mappings.length > 0) {
        for (const mapping of conn.mappings) {
          const rawVal = getNestedValue(sourceOutput, mapping.sourceField);
          if (rawVal !== undefined) {
            let transformedVal = rawVal;
            if (mapping.transformRule === 'scale' && typeof rawVal === 'number') {
              transformedVal = rawVal * (mapping.scaleMultiplier ?? 1.0) + (mapping.scaleOffset ?? 0);
            } else if (mapping.transformRule === 'type_cast') {
              if (mapping.targetType === 'string') transformedVal = String(rawVal);
              if (mapping.targetType === 'uint16' || mapping.targetType === 'int32') transformedVal = parseInt(String(rawVal), 10);
              if (mapping.targetType === 'float') transformedVal = parseFloat(String(rawVal));
            } else if (mapping.transformRule === 'custom_expr') {
              if (mapping.targetField.includes('Display')) {
                transformedVal = `${rawVal} ppm`;
              }
            }
            setNestedValue(inputPayload, mapping.targetField, transformedVal);
          }
        }
      } else {
        // Direct merge
        inputPayload = { ...inputPayload, ...sourceOutput };
      }
    }

    // Execute Node
    let outputPayload: Record<string, unknown> = {};
    let status: 'success' | 'warning' | 'error' | 'skipped' = 'success';
    let errorMessage: string | undefined;

    try {
      const result = executeSingleNode(node, inputPayload, project);
      outputPayload = { ...result.output };

      // Incorporate user-added/edited custom parameters on this node
      if (node.config.customParameters && node.config.customParameters.length > 0) {
        for (const cp of node.config.customParameters) {
          let val: unknown = cp.value;
          if (cp.type === 'uint8' || cp.type === 'uint16' || cp.type === 'uint32' || cp.type === 'int16' || cp.type === 'int32') {
            const num = parseInt(String(cp.value), 10);
            if (!isNaN(num)) val = num;
          } else if (cp.type === 'float') {
            const num = parseFloat(String(cp.value));
            if (!isNaN(num)) val = num;
          } else if (cp.type === 'boolean') {
            val = String(cp.value) === 'true';
          }
          outputPayload[cp.name] = val;
        }
      }

      if (result.warning) {
        status = 'warning';
        hasWarnings = true;
      }
    } catch (err: unknown) {
      status = 'error';
      hasFailed = true;
      errorMessage = err instanceof Error ? err.message : String(err);
      outputPayload = {};
    }

    nodeOutputs[node.id] = outputPayload;

    if (node.type === 'destination') {
      destinationPayloads[node.id] = outputPayload;
    }

    // Compute diff: Preserved, Added, Modified, Omitted
    const inKeys = Object.keys(inputPayload);
    const outKeys = Object.keys(outputPayload);

    const fieldsPreserved = inKeys.filter(
      (k) => outKeys.includes(k) && JSON.stringify(inputPayload[k]) === JSON.stringify(outputPayload[k])
    );
    const fieldsModified = inKeys.filter(
      (k) => outKeys.includes(k) && JSON.stringify(inputPayload[k]) !== JSON.stringify(outputPayload[k])
    );
    const fieldsAdded = outKeys.filter((k) => !inKeys.includes(k));
    const fieldsOmitted = inKeys.filter((k) => !outKeys.includes(k));

    traces[node.id] = {
      nodeId: node.id,
      nodeTitle: node.title,
      nodeType: node.type,
      status,
      inputPayload: Object.keys(inputPayload).length > 0 ? inputPayload : null,
      outputPayload: Object.keys(outputPayload).length > 0 ? outputPayload : null,
      fieldsPreserved,
      fieldsAdded,
      fieldsModified,
      fieldsOmitted,
      durationMs: parseFloat((performance.now() - nodeStartTime).toFixed(2)),
      errorMessage,
    };
  }

  // 2. Build Field Lineage Trace for Canonical Parameters
  const fieldLineageTrace = buildLineageTrace(project, sortedNodes, nodeOutputs);

  const totalDurationMs = parseFloat((performance.now() - startTime).toFixed(2));

  return {
    id: `sim-${Date.now()}`,
    executedAt: new Date().toISOString(),
    status: hasFailed ? 'failed' : hasWarnings ? 'warnings' : 'passed',
    totalDurationMs,
    traces,
    finalPayloadByDestination: destinationPayloads,
    fieldLineageTrace,
  };
}

function executeSingleNode(
  node: FlowNode,
  input: Record<string, unknown>,
  project: ProjectConfig
): { output: Record<string, unknown>; warning?: string } {
  if (node.type === 'source') {
    const boundInterface = project.interfaces.find((i) => i.id === node.interfaceId);
    if (!boundInterface) throw new Error(`Source node not bound to any interface`);
    const activeSample = boundInterface.samples.find((s) => s.id === boundInterface.activeSampleId);
    if (!activeSample) throw new Error(`No active data sample found for ${boundInterface.name}`);

    if (activeSample.isMalformed) {
      throw new Error(`Data sample is flagged as malformed: unexpected packet length`);
    }

    const payloadToSend = node.config.lastSentPayload || activeSample.rawPayload;

    const baseOutput: Record<string, unknown> = {
      rawPayload: payloadToSend,
      format: activeSample.format,
      sampleName: activeSample.name,
      capturedAt: activeSample.capturedAt,
    };

    if (node.config.customParameters && node.config.customParameters.length > 0) {
      for (const cp of node.config.customParameters) {
        let val = cp.value;
        if (cp.type === 'uint8' || cp.type === 'uint16' || cp.type === 'uint32' || cp.type === 'int16' || cp.type === 'int32') {
          val = parseInt(String(cp.value), 10);
        } else if (cp.type === 'float') {
          val = parseFloat(String(cp.value));
        } else if (cp.type === 'boolean') {
          val = String(cp.value) === 'true';
        }
        baseOutput[cp.name] = val;
      }
    }

    return {
      output: baseOutput,
    };
  }

  if (node.type === 'hex_decoder') {
    const rawPayload = String(input.rawPayload || input.frameBytes || '');
    const bytes = normalizeHex(rawPayload);

    if (bytes.length < 9) {
      throw new Error(`Hex packet too short (${bytes.length} bytes, expected >= 9 bytes for DWIN frame)`);
    }

    const header = bytes.slice(0, 2).join('');
    if (header !== '5AA5') {
      throw new Error(`Invalid sync header: 0x${header} (expected 0x5AA5)`);
    }

    const len = parseInt(bytes[2], 16);
    const cmd = bytes[3];
    const vp = `0x${bytes[4]}${bytes[5]}`;
    const wordCount = parseInt(bytes[6], 16);
    const rawVal = parseInt(bytes[7] + bytes[8], 16);

    return {
      output: {
        frame_header: '5AA5',
        data_length: len,
        command_code: `0x${cmd}`,
        vp_address: vp,
        word_count: wordCount,
        raw_data_word: rawVal,
        raw_hex_frame: rawPayload,
      },
    };
  }

  if (node.type === 'enricher') {
    const deviceId = node.config.addedDeviceId || 'ESP32-S3-LAB-01';
    const timestamp = Math.floor(Date.now() / 1000);
    const ambientTemp = 24.5;

    return {
      output: {
        device_id: deviceId,
        vp_addr: input.vp_address || input.vp_addr || '0x5000',
        co2_raw: input.raw_data_word ?? input.co2_raw ?? 850,
        ambient_temp: ambientTemp,
        recv_timestamp: timestamp,
        status_flags: (input.raw_data_word as number) > 1500 ? 3 : 1,
      },
    };
  }

  if (node.type === 'destination') {
    const boundInterface = project.interfaces.find((i) => i.id === node.interfaceId);

    if (boundInterface?.category === 'firebase_rtdb') {
      const co2Val = input.co2_raw ?? input['sensors.co2.value'] ?? 850;
      const devId = (input.device_id as string) || 'ESP32-S3-LAB-01';
      return {
        output: {
          telemetry: {
            devices: {
              [devId]: {
                sensors: {
                  co2: {
                    value: co2Val,
                    unit: 'ppm',
                    calibrated: true,
                  },
                  temperature: {
                    celsius: input.ambient_temp ?? 24.5,
                  },
                },
                online: true,
                updated_at: new Date().toISOString(),
              },
            },
          },
        },
      };
    }

    if (boundInterface?.category === 'app_object') {
      const co2Val = Number(input.co2Ppm ?? input.co2_raw ?? 850);
      return {
        output: {
          co2Ppm: co2Val,
          co2DisplayStr: `${co2Val} ppm`,
          co2AirQualityRating: co2Val > 1500 ? 'Unhealthy' : co2Val > 1000 ? 'Moderate' : 'Good',
          temperatureDisplay: `${input.ambient_temp ?? 24.5} °C`,
          isDeviceOnline: true,
          lastReportedTime: new Date().toLocaleTimeString(),
        },
      };
    }

    if (boundInterface?.category === 'csv_tabular') {
      const co2Val = Number(input.raw_value ?? input.co2_raw ?? 850);
      return {
        output: {
          timestamp: new Date().toISOString(),
          device_id: input.device_id || 'ESP32-S3-LAB-01',
          parameter_id: 'climate.co2',
          raw_value: co2Val,
          scaled_value: Number(input.scaled_value ?? co2Val),
          unit: 'ppm',
          quality_flag: co2Val > 2500 ? 'EXCEEDED' : 'GOOD',
          raw_frame_hex: input.raw_hex_frame || '5AA506835000010352',
        },
      };
    }

    return { output: { ...input } };
  }

  // Default passthrough
  return { output: { ...input } };
}

function topologicalSort(nodes: FlowNode[], connections: FlowConnection[]): FlowNode[] {
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    adjList[n.id] = [];
  });

  connections.forEach((c) => {
    if (adjList[c.sourceNodeId]) {
      adjList[c.sourceNodeId].push(c.targetNodeId);
      inDegree[c.targetNodeId] = (inDegree[c.targetNodeId] || 0) + 1;
    }
  });

  const queue: string[] = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
  const sorted: FlowNode[] = [];

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const node = nodes.find((n) => n.id === currId);
    if (node) sorted.push(node);

    (adjList[currId] || []).forEach((neighborId) => {
      inDegree[neighborId]--;
      if (inDegree[neighborId] === 0) {
        queue.push(neighborId);
      }
    });
  }

  // If cycle detected, return original list to allow error reporting
  if (sorted.length < nodes.length) {
    return nodes;
  }

  return sorted;
}

function isDownstream(nodeId: string, startNodeId: string, connections: FlowConnection[]): boolean {
  if (nodeId === startNodeId) return true;
  const queue = [startNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === nodeId) return true;
    visited.add(current);

    const outgoing = connections.filter((c) => c.sourceNodeId === current).map((c) => c.targetNodeId);
    for (const next of outgoing) {
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return false;
}

function buildLineageTrace(
  project: ProjectConfig,
  sortedNodes: FlowNode[],
  nodeOutputs: Record<string, Record<string, unknown>>
) {
  return project.canonicalParameters.map((param) => {
    const path: {
      nodeId: string;
      fieldName: string;
      value: unknown;
      unit?: string;
      representation: string;
    }[] = [];

    sortedNodes.forEach((node) => {
      const output = nodeOutputs[node.id];
      if (!output) return;

      if (param.id === 'climate.co2') {
        if (output.rawPayload) {
          path.push({
            nodeId: node.id,
            fieldName: 'rawPayload',
            value: output.rawPayload,
            representation: 'Hexadecimal UART Byte Frame',
          });
        } else if (output.raw_data_word !== undefined) {
          path.push({
            nodeId: node.id,
            fieldName: 'raw_data_word',
            value: output.raw_data_word,
            unit: 'ppm',
            representation: 'Decoded 16-bit DWIN Register Word',
          });
        } else if (output.co2_raw !== undefined) {
          path.push({
            nodeId: node.id,
            fieldName: 'co2_raw',
            value: output.co2_raw,
            unit: 'ppm',
            representation: 'ESP32 Firmware Internal Telemetry Struct',
          });
        } else if (output.co2Ppm !== undefined) {
          path.push({
            nodeId: node.id,
            fieldName: 'co2Ppm',
            value: output.co2Ppm,
            unit: 'ppm',
            representation: 'Web/Flutter Reactive State View Model',
          });
        } else if (output.scaled_value !== undefined) {
          path.push({
            nodeId: node.id,
            fieldName: 'scaled_value',
            value: output.scaled_value,
            unit: 'ppm',
            representation: 'CSV Engineering Time-Series Column',
          });
        }
      }
    });

    return {
      canonicalParamId: param.id,
      path,
    };
  });
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  if (!obj) return undefined;
  if (!path.includes('.')) return obj[path];
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  if (!path.includes('.')) {
    obj[path] = value;
    return;
  }
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}
