import { StationMaster } from './station-master';
import { StationSummary } from './csd';

/**
 * Level identifiers for hierarchical grouping
 */
export type HierarchyLevelKey = 'organization' | 'division' | 'state';

export interface HierarchyStationItem {
  stationId: string;
  stationName: string;
  rawStationId?: string;
  totalRecords: number;
  goodRecords: number;
  badRecords: number;
  isMapped: boolean;
  activeSensors: string[];
  firstSeen: Date;
  lastSeen: Date;
  organizationName: string;
  divisionOffice: string;
  stateName: string;
  district?: string;
  riverName?: string;
  metadata?: StationMaster;
  summary: StationSummary;
}

export interface StateHierarchyNode {
  id: string;
  name: string;
  stations: HierarchyStationItem[];
  totalRecords: number;
  goodRecords: number;
  badRecords: number;
  stationIds: string[];
}

export interface DivisionHierarchyNode {
  id: string;
  name: string;
  states: StateHierarchyNode[];
  totalRecords: number;
  goodRecords: number;
  badRecords: number;
  stationCount: number;
  stationIds: string[];
}

export interface OrganizationHierarchyNode {
  id: string;
  name: string;
  divisions: DivisionHierarchyNode[];
  totalRecords: number;
  goodRecords: number;
  badRecords: number;
  stationCount: number;
  stationIds: string[];
}

export interface StationHierarchyTreeData {
  organizations: OrganizationHierarchyNode[];
  totalOrganizations: number;
  totalDivisions: number;
  totalStates: number;
  totalStations: number;
  totalRecords: number;
  mappedStations: number;
  unmappedStations: number;
}
