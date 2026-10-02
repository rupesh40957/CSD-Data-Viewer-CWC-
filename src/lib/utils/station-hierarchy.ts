import { StationSummary } from '@/types/csd';
import { StationMaster } from '@/types/station-master';
import {
  HierarchyLevelKey,
  HierarchyStationItem,
  OrganizationHierarchyNode,
  DivisionHierarchyNode,
  StateHierarchyNode,
  StationHierarchyTreeData,
} from '@/types/station-hierarchy';

export interface BuildHierarchyOptions {
  searchQuery?: string;
  filterMode?: 'all' | 'mapped' | 'unmapped' | 'warning';
  levelOrder?: [HierarchyLevelKey, HierarchyLevelKey, HierarchyLevelKey];
}

/**
 * Builds a 4-tier hierarchy matching CSD telemetry specifications:
 * Level 1: Organization Name
 * Level 2: Division Office
 * Level 3: State Name
 * Level 4: Station_Name & Station ID
 */
export function buildStationHierarchy(
  stations: StationSummary[],
  stationMasterMap: Map<string, StationMaster>,
  options: BuildHierarchyOptions = {}
): StationHierarchyTreeData {
  const {
    searchQuery = '',
    filterMode = 'all',
  } = options;

  const query = searchQuery.trim().toLowerCase();

  // 1. Convert all StationSummary to HierarchyStationItem with metadata
  const items: HierarchyStationItem[] = [];

  for (const st of stations) {
    const norm = st.stationId.trim().toUpperCase();
    const meta = stationMasterMap.get(norm) || st.stationMetadata;

    const isMapped = !!meta;
    const orgName = (meta?.organizationName?.trim()) || (isMapped ? 'Other Organization' : 'Unmapped Stations');
    const divName = (meta?.divisionOffice?.trim()) || (isMapped ? 'General Division' : 'Unassigned Division');
    const stateName = (meta?.stateName?.trim()) || (isMapped ? 'General State' : 'Unassigned State');
    const stationName = st.stationName || meta?.stationName || st.stationId;

    const item: HierarchyStationItem = {
      stationId: st.stationId,
      stationName,
      rawStationId: meta?.rawStationId || st.stationId,
      totalRecords: st.totalRecords,
      goodRecords: st.goodRecords,
      badRecords: st.badRecords,
      isMapped,
      activeSensors: st.activeSensors || [],
      firstSeen: st.firstSeen,
      lastSeen: st.lastSeen,
      organizationName: orgName,
      divisionOffice: divName,
      stateName,
      district: meta?.district,
      riverName: meta?.riverName,
      metadata: meta,
      summary: st,
    };

    // Filter by mode
    if (filterMode === 'mapped' && !isMapped) continue;
    if (filterMode === 'unmapped' && isMapped) continue;
    if (filterMode === 'warning' && st.badRecords === 0 && st.corruptCount === 0) continue;

    // Filter by search query
    if (query) {
      const match =
        item.stationId.toLowerCase().includes(query) ||
        item.stationName.toLowerCase().includes(query) ||
        item.organizationName.toLowerCase().includes(query) ||
        item.divisionOffice.toLowerCase().includes(query) ||
        item.stateName.toLowerCase().includes(query) ||
        (item.riverName && item.riverName.toLowerCase().includes(query)) ||
        (item.district && item.district.toLowerCase().includes(query));

      if (!match) continue;
    }

    items.push(item);
  }

  // 2. Group into Map hierarchy: Org -> Division -> State -> Stations
  const orgMap = new Map<string, Map<string, Map<string, HierarchyStationItem[]>>>();

  for (const item of items) {
    let divMap = orgMap.get(item.organizationName);
    if (!divMap) {
      divMap = new Map();
      orgMap.set(item.organizationName, divMap);
    }

    let stateMap = divMap.get(item.divisionOffice);
    if (!stateMap) {
      stateMap = new Map();
      divMap.set(item.divisionOffice, stateMap);
    }

    let stationList = stateMap.get(item.stateName);
    if (!stationList) {
      stationList = [];
      stateMap.set(item.stateName, stationList);
    }

    stationList.push(item);
  }

  // 3. Assemble structured nodes with precomputed aggregates
  const orgNodes: OrganizationHierarchyNode[] = [];
  let totalDivisions = 0;
  let totalStates = 0;
  let totalMapped = 0;
  let totalUnmapped = 0;
  let grandTotalRecords = 0;

  // Sort organization names, putting 'Unmapped Stations' last
  const sortedOrgNames = Array.from(orgMap.keys()).sort((a, b) => {
    if (a.toLowerCase().includes('unmapped')) return 1;
    if (b.toLowerCase().includes('unmapped')) return -1;
    return a.localeCompare(b);
  });

  for (const orgName of sortedOrgNames) {
    const divMap = orgMap.get(orgName)!;
    const divNodes: DivisionHierarchyNode[] = [];
    const orgStationIds: string[] = [];
    let orgRecords = 0;
    let orgGood = 0;
    let orgBad = 0;

    const sortedDivNames = Array.from(divMap.keys()).sort((a, b) => {
      if (a.toLowerCase().includes('unassigned')) return 1;
      if (b.toLowerCase().includes('unassigned')) return -1;
      return a.localeCompare(b);
    });

    for (const divName of sortedDivNames) {
      const stateMap = divMap.get(divName)!;
      const stateNodes: StateHierarchyNode[] = [];
      const divStationIds: string[] = [];
      let divRecords = 0;
      let divGood = 0;
      let divBad = 0;

      const sortedStateNames = Array.from(stateMap.keys()).sort((a, b) => {
        if (a.toLowerCase().includes('unassigned')) return 1;
        if (b.toLowerCase().includes('unassigned')) return -1;
        return a.localeCompare(b);
      });

      for (const stateName of sortedStateNames) {
        const stationList = stateMap.get(stateName)!;
        stationList.sort((a, b) => a.stationName.localeCompare(b.stationName));

        const stateStationIds = stationList.map((s) => s.stationId);
        let stateRecords = 0;
        let stateGood = 0;
        let stateBad = 0;

        for (const st of stationList) {
          stateRecords += st.totalRecords;
          stateGood += st.goodRecords;
          stateBad += st.badRecords;
          if (st.isMapped) totalMapped++;
          else totalUnmapped++;
        }

        divStationIds.push(...stateStationIds);
        divRecords += stateRecords;
        divGood += stateGood;
        divBad += stateBad;

        stateNodes.push({
          id: `${orgName}::${divName}::${stateName}`,
          name: stateName,
          stations: stationList,
          totalRecords: stateRecords,
          goodRecords: stateGood,
          badRecords: stateBad,
          stationIds: stateStationIds,
        });

        totalStates++;
      }

      orgStationIds.push(...divStationIds);
      orgRecords += divRecords;
      orgGood += divGood;
      orgBad += divBad;

      divNodes.push({
        id: `${orgName}::${divName}`,
        name: divName,
        states: stateNodes,
        totalRecords: divRecords,
        goodRecords: divGood,
        badRecords: divBad,
        stationCount: divStationIds.length,
        stationIds: divStationIds,
      });

      totalDivisions++;
    }

    grandTotalRecords += orgRecords;

    orgNodes.push({
      id: orgName,
      name: orgName,
      divisions: divNodes,
      totalRecords: orgRecords,
      goodRecords: orgGood,
      badRecords: orgBad,
      stationCount: orgStationIds.length,
      stationIds: orgStationIds,
    });
  }

  return {
    organizations: orgNodes,
    totalOrganizations: orgNodes.length,
    totalDivisions,
    totalStates,
    totalStations: items.length,
    totalRecords: grandTotalRecords,
    mappedStations: totalMapped,
    unmappedStations: totalUnmapped,
  };
}
