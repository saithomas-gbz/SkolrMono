/**
 * Merges a service OpenAPI into the gateway document with a path prefix
 * and namespaced component schema keys to avoid collisions with gateway defs.
 */

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function rewriteSchemaRefs(spec: JsonRecord, schemaRefPrefix: string): JsonRecord {
  const schemas = spec.components;
  if (!isRecord(schemas)) {
    return spec;
  }
  const schemaMap = schemas.schemas;
  if (!isRecord(schemaMap) || Object.keys(schemaMap).length === 0) {
    return spec;
  }

  const renamed: JsonRecord = {};
  for (const [key, val] of Object.entries(schemaMap)) {
    renamed[`${schemaRefPrefix}${key}`] = val;
  }

  const withRenamedKeys = {
    ...spec,
    components: {
      ...schemas,
      schemas: renamed,
    },
  } as JsonRecord;

  let raw = JSON.stringify(withRenamedKeys);
  for (const key of Object.keys(schemaMap)) {
    const from = `#/components/schemas/${key}`;
    const to = `#/components/schemas/${schemaRefPrefix}${key}`;
    raw = raw.split(from).join(to);
  }

  return JSON.parse(raw) as JsonRecord;
}

function prefixPaths(paths: JsonRecord, pathPrefix: string): JsonRecord {
  const normalized = pathPrefix.endsWith('/') ? pathPrefix.slice(0, -1) : pathPrefix;
  const out: JsonRecord = {};
  for (const [path, item] of Object.entries(paths)) {
    const nextPath = path.startsWith('/') ? `${normalized}${path}` : `${normalized}/${path}`;
    out[nextPath] = item;
  }
  return out;
}

function mergeTags(
  gatewayTags: unknown,
  serviceTags: unknown,
): Array<JsonRecord> | undefined {
  const a = Array.isArray(gatewayTags) ? gatewayTags : [];
  const b = Array.isArray(serviceTags) ? serviceTags : [];
  const byName = new Map<string, JsonRecord>();
  for (const t of [...a, ...b]) {
    if (isRecord(t) && typeof t.name === 'string') {
      byName.set(t.name, t);
    }
  }
  return byName.size > 0 ? [...byName.values()] : undefined;
}

function mergeComponents(gateway: JsonRecord | undefined, service: JsonRecord | undefined): JsonRecord {
  const g = gateway ?? {};
  const s = service ?? {};
  const out: JsonRecord = { ...g };

  const gSch = isRecord(g.schemas) ? g.schemas : {};
  const sSch = isRecord(s.schemas) ? s.schemas : {};
  out.schemas = { ...gSch, ...sSch };

  const gSec = isRecord(g.securitySchemes) ? g.securitySchemes : {};
  const sSec = isRecord(s.securitySchemes) ? s.securitySchemes : {};
  if (Object.keys(gSec).length || Object.keys(sSec).length) {
    out.securitySchemes = { ...gSec, ...sSec };
  }

  return out;
}

export function mergeGatewayWithAuthService(
  gatewayObject: JsonRecord,
  authServiceSpec: JsonRecord | null,
  pathPrefix: string,
): JsonRecord {
  return mergeGatewayWithService(gatewayObject, authServiceSpec, pathPrefix, 'authService_');
}

export function mergeGatewayWithClassService(
  gatewayObject: JsonRecord,
  classServiceSpec: JsonRecord | null,
  pathPrefix: string,
): JsonRecord {
  return mergeGatewayWithService(gatewayObject, classServiceSpec, pathPrefix, 'classService_');
}

export function mergeGatewayWithGradeService(
  gatewayObject: JsonRecord,
  gradeServiceSpec: JsonRecord | null,
  pathPrefix: string,
): JsonRecord {
  return mergeGatewayWithService(gatewayObject, gradeServiceSpec, pathPrefix, 'gradeService_');
}

export function mergeGatewayWithPlanningService(
  gatewayObject: JsonRecord,
  planningServiceSpec: JsonRecord | null,
  pathPrefix: string,
): JsonRecord {
  return mergeGatewayWithService(gatewayObject, planningServiceSpec, pathPrefix, 'planningService_');
}

export function mergeGatewayWithService(
  gatewayObject: JsonRecord,
  serviceSpec: JsonRecord | null,
  pathPrefix: string,
  schemaRefPrefix: string,
): JsonRecord {
  if (!serviceSpec) {
    return gatewayObject;
  }

  const rewritten = rewriteSchemaRefs(serviceSpec, schemaRefPrefix);
  const paths = isRecord(rewritten.paths) ? rewritten.paths : {};
  const mergedPaths = {
    ...(isRecord(gatewayObject.paths) ? gatewayObject.paths : {}),
    ...prefixPaths(paths, pathPrefix),
  };

  const merged: JsonRecord = {
    ...gatewayObject,
    paths: mergedPaths,
    components: mergeComponents(
      isRecord(gatewayObject.components) ? gatewayObject.components : undefined,
      isRecord(rewritten.components) ? rewritten.components : undefined,
    ),
  };

  const tags = mergeTags(gatewayObject.tags, serviceSpec.tags);
  if (tags) {
    merged.tags = tags;
  }

  return merged;
}
