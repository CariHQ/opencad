/**
 * Versioning Operations
 * Document version history and restoration
 */

import { DocumentSchema } from './types';

export interface Version {
  id: string;
  version: number;
  timestamp: number;
  message?: string;
  document: DocumentSchema;
}

export interface VersionList {
  versions: Version[];
  currentVersion: number;
}

export function createVersion(document: DocumentSchema, message?: string): Version {
  return {
    id: crypto.randomUUID(),
    version: Date.now(),
    timestamp: Date.now(),
    message,
    document: JSON.parse(JSON.stringify(document)),
  };
}

export function createVersionFromState(
  state: DocumentSchema,
  versionNumber: number,
  message?: string
): Version {
  return {
    id: crypto.randomUUID(),
    version: versionNumber,
    timestamp: Date.now(),
    message,
    document: JSON.parse(JSON.stringify(state)),
  };
}

export function listVersions(versionList: VersionList): Version[] {
  return [...versionList.versions].sort((a, b) => a.version - b.version);
}

export function getVersion(versionList: VersionList, versionNumber: number): Version | undefined {
  return versionList.versions.find((v) => v.version === versionNumber);
}

export function deleteVersion(versionList: VersionList, versionNumber: number): VersionList {
  return {
    ...versionList,
    versions: versionList.versions.filter((v) => v.version !== versionNumber),
  };
}

export function pruneOldVersions(versionList: VersionList, keepCount: number): VersionList {
  const sorted = listVersions(versionList);
  const toRemove = sorted.slice(0, -keepCount);

  return {
    ...versionList,
    versions: versionList.versions.filter((v) => !toRemove.some((r) => r.version === v.version)),
  };
}

export function compareVersions(a: Version, b: Version): VersionDiff {
  const aDoc = a.document;
  const bDoc = b.document;

  const addedElements = Object.keys(bDoc.elements).filter((k) => !aDoc.elements[k]);
  const removedElements = Object.keys(aDoc.elements).filter((k) => !bDoc.elements[k]);
  const modifiedElements = Object.keys(bDoc.elements).filter((k) => {
    if (!aDoc.elements[k]) return false;
    return JSON.stringify(aDoc.elements[k]) !== JSON.stringify(bDoc.elements[k]);
  });

  const addedLayers = Object.keys(bDoc.layers).filter((k) => !aDoc.layers[k]);
  const removedLayers = Object.keys(aDoc.layers).filter((k) => !bDoc.layers[k]);

  return {
    versionA: a.version,
    versionB: b.version,
    addedElements,
    removedElements,
    modifiedElements,
    addedLayers,
    removedLayers,
    hasChanges:
      addedElements.length > 0 ||
      removedElements.length > 0 ||
      modifiedElements.length > 0 ||
      addedLayers.length > 0 ||
      removedLayers.length > 0,
  };
}

export interface VersionDiff {
  versionA: number;
  versionB: number;
  addedElements: string[];
  removedElements: string[];
  modifiedElements: string[];
  addedLayers: string[];
  removedLayers: string[];
  hasChanges: boolean;
}
