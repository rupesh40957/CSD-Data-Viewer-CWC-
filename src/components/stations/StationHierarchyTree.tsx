'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/use-app-store';
import {
  buildStationHierarchy,
  BuildHierarchyOptions,
} from '@/lib/utils/station-hierarchy';
import {
  OrganizationHierarchyNode,
  DivisionHierarchyNode,
  StateHierarchyNode,
  HierarchyStationItem,
} from '@/types/station-hierarchy';
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Folder,
  FolderOpen,
  MapPin,
  Radio,
  Search,
  CheckSquare,
  Square,
  MinusSquare,
  Info,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronsUpDown,
  Filter,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';

interface TriStateCheckboxProps {
  state: 'all' | 'some' | 'none';
  onChange: () => void;
  title?: string;
  size?: number;
}

function TriStateCheckbox({ state, onChange, title, size = 15 }: TriStateCheckboxProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        padding: '1px',
        margin: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color:
          state === 'all'
            ? 'var(--primary-light)'
            : state === 'some'
            ? '#38bdf8'
            : 'var(--text-dim)',
        lineHeight: 1,
      }}
    >
      {state === 'all' ? (
        <CheckSquare size={size} />
      ) : state === 'some' ? (
        <MinusSquare size={size} />
      ) : (
        <Square size={size} />
      )}
    </button>
  );
}

export function StationHierarchyTree({
  compact = false,
  maxHeight,
}: {
  compact?: boolean;
  maxHeight?: string;
}) {
  const {
    file,
    selectedStations,
    toggleStation,
    selectStationBatch,
    selectSingleStation,
    selectAllStations,
    clearStationSelection,
    stationMasterMap,
    setSelectedStationIdForDetails,
    setIsUnmappedModalOpen,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'mapped' | 'unmapped' | 'warning'>('all');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hasUserToggled, setHasUserToggled] = useState(false);

  const stations = file?.stations || [];

  // Build the hierarchical tree data
  const hierarchyData = useMemo(() => {
    return buildStationHierarchy(stations, stationMasterMap, {
      searchQuery: search,
      filterMode,
    });
  }, [stations, stationMasterMap, search, filterMode]);

  // Initial expansion or search auto-expansion
  useEffect(() => {
    if (search.trim()) {
      // Auto expand all when searching
      const allKeys = new Set<string>();
      hierarchyData.organizations.forEach((org) => {
        allKeys.add(`org::${org.id}`);
        org.divisions.forEach((div) => {
          allKeys.add(`div::${div.id}`);
          div.states.forEach((st) => {
            allKeys.add(`state::${st.id}`);
          });
        });
      });
      setExpandedNodes(allKeys);
    } else if (!hasUserToggled && hierarchyData.organizations.length > 0) {
      // Default: expand first 2 organizations and their first division
      const defaultExpanded = new Set<string>();
      hierarchyData.organizations.slice(0, 3).forEach((org) => {
        defaultExpanded.add(`org::${org.id}`);
        if (org.divisions.length > 0) {
          defaultExpanded.add(`div::${org.divisions[0].id}`);
          if (org.divisions[0].states.length > 0) {
            defaultExpanded.add(`state::${org.divisions[0].states[0].id}`);
          }
        }
      });
      setExpandedNodes(defaultExpanded);
    }
  }, [search, hierarchyData, hasUserToggled]);

  const toggleNode = (nodeKey: string) => {
    setHasUserToggled(true);
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    setHasUserToggled(true);
    const allKeys = new Set<string>();
    hierarchyData.organizations.forEach((org) => {
      allKeys.add(`org::${org.id}`);
      org.divisions.forEach((div) => {
        allKeys.add(`div::${div.id}`);
        div.states.forEach((st) => {
          allKeys.add(`state::${st.id}`);
        });
      });
    });
    setExpandedNodes(allKeys);
  };

  const collapseAll = () => {
    setHasUserToggled(true);
    setExpandedNodes(new Set());
  };

  // Helper to determine tri-state checkbox state for a list of station IDs
  const getCheckState = (stationIds: string[]): 'all' | 'some' | 'none' => {
    if (stationIds.length === 0) return 'none';
    if (selectedStations.length === 0) return 'all'; // all active by default in store
    let count = 0;
    for (const id of stationIds) {
      if (selectedStations.includes(id)) count++;
    }
    if (count === stationIds.length) return 'all';
    if (count > 0) return 'some';
    return 'none';
  };

  const handleBatchToggle = (stationIds: string[]) => {
    const currentState = getCheckState(stationIds);
    // If all are selected, uncheck them. Otherwise, check all of them.
    const shouldSelect = currentState !== 'all';
    selectStationBatch(stationIds, shouldSelect);
  };

  const isStationActive = (id: string) => {
    if (selectedStations.length === 0) return true;
    return selectedStations.includes(id);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'transparent',
      }}
    >
      {/* 1. Header Controls & Sorter Bar */}
      <div
        style={{
          padding: compact ? '8px 12px' : '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'var(--bg-subtle)',
        }}
      >
        {/* Hierarchy Chain Badge as shown in Image 2 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.68rem',
            color: 'var(--text-dim)',
            flexWrap: 'wrap',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                color: 'var(--primary-light)',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              Org
            </span>
            <span>➔</span>
            <span
              style={{
                background: 'rgba(168, 85, 247, 0.12)',
                color: '#c084fc',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              Division
            </span>
            <span>➔</span>
            <span
              style={{
                background: 'rgba(34, 197, 94, 0.12)',
                color: '#4ade80',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              State
            </span>
            <span>➔</span>
            <span
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                color: '#fbbf24',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              Station
            </span>
          </div>

          {/* Expand / Collapse All buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={expandAll}
              className="btn-secondary"
              style={{ padding: '2px 6px', fontSize: '0.65rem' }}
              title="Expand all tree branches"
            >
              Expand
            </button>
            <button
              onClick={collapseAll}
              className="btn-secondary"
              style={{ padding: '2px 6px', fontSize: '0.65rem' }}
              title="Collapse all tree branches"
            >
              Collapse
            </button>
          </div>
        </div>

        {/* Search Input with Clear Button */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={13}
            color="var(--text-dim)"
            style={{
              position: 'absolute',
              left: '9px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search Station, Org, Div, State, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-input mono-font"
            style={{
              width: '100%',
              paddingLeft: '28px',
              paddingRight: search ? '26px' : '8px',
              fontSize: '0.74rem',
              paddingTop: '5px',
              paddingBottom: '5px',
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '6px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter Pills (All / Mapped / Unmapped / Warnings) */}
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All (${hierarchyData.totalStations})` },
            { id: 'mapped', label: `Mapped (${hierarchyData.mappedStations})` },
            { id: 'unmapped', label: `Unmapped (${hierarchyData.unmappedStations})` },
            { id: 'warning', label: 'Warnings' },
          ].map((pill) => {
            const isCurrent = filterMode === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setFilterMode(pill.id as typeof filterMode)}
                style={{
                  padding: '2px 6px',
                  fontSize: '0.66rem',
                  borderRadius: '3px',
                  background: isCurrent ? 'var(--primary)' : 'var(--bg-surface)',
                  color: isCurrent ? '#ffffff' : 'var(--text-muted)',
                  border: isCurrent ? '1px solid var(--primary)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  fontWeight: isCurrent ? 600 : 400,
                  transition: 'all 0.1s ease',
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Scrollable Hierarchical Tree Container */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: maxHeight || 'auto',
          padding: '6px 4px 16px 4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {hierarchyData.organizations.length === 0 ? (
          <div
            style={{
              padding: '30px 16px',
              textAlign: 'center',
              color: 'var(--text-dim)',
              fontSize: '0.78rem',
            }}
          >
            No stations or organizations match your filter criteria
          </div>
        ) : (
          hierarchyData.organizations.map((org) => {
            const orgKey = `org::${org.id}`;
            const isOrgExpanded = expandedNodes.has(orgKey);
            const orgCheckState = getCheckState(org.stationIds);
            const isUnmappedOrg = org.name.toLowerCase().includes('unmapped');

            return (
              <div
                key={orgKey}
                style={{
                  marginBottom: '2px',
                  borderRadius: 'var(--radius-sm)',
                  background: isOrgExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                }}
              >
                {/* LEVEL 1: ORGANIZATION HEADER */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: isUnmappedOrg
                      ? 'rgba(234, 179, 8, 0.06)'
                      : 'rgba(2, 132, 199, 0.08)',
                    border: `1px solid ${
                      isUnmappedOrg ? 'rgba(234, 179, 8, 0.2)' : 'rgba(56, 189, 248, 0.15)'
                    }`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'background 0.12s ease',
                  }}
                  onClick={() => toggleNode(orgKey)}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      overflow: 'hidden',
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        color: isOrgExpanded ? 'var(--primary-light)' : 'var(--text-dim)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {isOrgExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>

                    <TriStateCheckbox
                      state={orgCheckState}
                      onChange={() => handleBatchToggle(org.stationIds)}
                      title={`Select/Deselect all stations in ${org.name}`}
                    />

                    <Building2
                      size={14}
                      color={isUnmappedOrg ? 'var(--quality-corrupt)' : 'var(--primary-light)'}
                      style={{ flexShrink: 0 }}
                    />

                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: isUnmappedOrg ? '#fde047' : 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        letterSpacing: '0.01em',
                      }}
                      title={org.name}
                    >
                      {org.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {org.badRecords > 0 && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          color: 'var(--quality-bad)',
                          background: 'rgba(239, 68, 68, 0.15)',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontWeight: 700,
                        }}
                        title={`${org.badRecords} bad telemetry frames in this organization`}
                      >
                        !{org.badRecords}
                      </span>
                    )}

                    <span
                      style={{
                        fontSize: '0.66rem',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        background: 'var(--bg-surface)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {org.stationCount}
                    </span>
                  </div>
                </div>

                {/* LEVEL 1 CHILDREN (DIVISIONS) */}
                {isOrgExpanded && (
                  <div
                    style={{
                      paddingLeft: '14px',
                      marginTop: '3px',
                      borderLeft: '1px dashed rgba(56, 189, 248, 0.25)',
                      marginLeft: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    {org.divisions.map((div) => {
                      const divKey = `div::${div.id}`;
                      const isDivExpanded = expandedNodes.has(divKey);
                      const divCheckState = getCheckState(div.stationIds);

                      return (
                        <div key={divKey} style={{ marginBottom: '1px' }}>
                          {/* LEVEL 2: DIVISION HEADER */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '4px 6px',
                              borderRadius: 'var(--radius-sm)',
                              background: isDivExpanded
                                ? 'rgba(168, 85, 247, 0.08)'
                                : 'transparent',
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'background 0.12s ease',
                            }}
                            onClick={() => toggleNode(divKey)}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                overflow: 'hidden',
                                flex: 1,
                              }}
                            >
                              <span
                                style={{
                                  color: isDivExpanded ? '#c084fc' : 'var(--text-dim)',
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                {isDivExpanded ? (
                                  <ChevronDown size={13} />
                                ) : (
                                  <ChevronRight size={13} />
                                )}
                              </span>

                              <TriStateCheckbox
                                state={divCheckState}
                                onChange={() => handleBatchToggle(div.stationIds)}
                                title={`Select/Deselect all stations in ${div.name}`}
                              />

                              {isDivExpanded ? (
                                <FolderOpen size={13} color="#c084fc" style={{ flexShrink: 0 }} />
                              ) : (
                                <Folder size={13} color="#a855f7" style={{ flexShrink: 0 }} />
                              )}

                              <span
                                style={{
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  color: 'var(--text-main)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={div.name}
                              >
                                {div.name}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.64rem',
                                color: 'var(--text-dim)',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                background: 'rgba(255, 255, 255, 0.03)',
                              }}
                            >
                              {div.stationCount}
                            </span>
                          </div>

                          {/* LEVEL 2 CHILDREN (STATES) */}
                          {isDivExpanded && (
                            <div
                              style={{
                                paddingLeft: '14px',
                                marginTop: '2px',
                                borderLeft: '1px dashed rgba(168, 85, 247, 0.25)',
                                marginLeft: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                              }}
                            >
                              {div.states.map((stNode) => {
                                const stateKey = `state::${stNode.id}`;
                                const isStateExpanded = expandedNodes.has(stateKey);
                                const stateCheckState = getCheckState(stNode.stationIds);

                                return (
                                  <div key={stateKey} style={{ marginBottom: '1px' }}>
                                    {/* LEVEL 3: STATE HEADER */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '3px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: isStateExpanded
                                          ? 'rgba(34, 197, 94, 0.07)'
                                          : 'transparent',
                                        cursor: 'pointer',
                                        userSelect: 'none',
                                        transition: 'background 0.12s ease',
                                      }}
                                      onClick={() => toggleNode(stateKey)}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          overflow: 'hidden',
                                          flex: 1,
                                        }}
                                      >
                                        <span
                                          style={{
                                            color: isStateExpanded
                                              ? '#4ade80'
                                              : 'var(--text-dim)',
                                            display: 'flex',
                                            alignItems: 'center',
                                          }}
                                        >
                                          {isStateExpanded ? (
                                            <ChevronDown size={12} />
                                          ) : (
                                            <ChevronRight size={12} />
                                          )}
                                        </span>

                                        <TriStateCheckbox
                                          state={stateCheckState}
                                          onChange={() => handleBatchToggle(stNode.stationIds)}
                                          title={`Select/Deselect all stations in ${stNode.name}`}
                                          size={14}
                                        />

                                        <MapPin
                                          size={12}
                                          color="#4ade80"
                                          style={{ flexShrink: 0 }}
                                        />

                                        <span
                                          style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            color: 'var(--text-muted)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                          }}
                                          title={stNode.name}
                                        >
                                          {stNode.name}
                                        </span>
                                      </div>

                                      <span
                                        style={{
                                          fontSize: '0.62rem',
                                          color: 'var(--text-dim)',
                                        }}
                                      >
                                        ({stNode.stations.length})
                                      </span>
                                    </div>

                                    {/* LEVEL 4 CHILDREN: STATIONS LIST */}
                                    {isStateExpanded && (
                                      <div
                                        style={{
                                          paddingLeft: '14px',
                                          marginTop: '2px',
                                          borderLeft: '1px dashed rgba(34, 197, 94, 0.25)',
                                          marginLeft: '9px',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '2px',
                                        }}
                                      >
                                        {stNode.stations.map((st) => {
                                          const isSelected = isStationActive(st.stationId);

                                          return (
                                            <div
                                              key={st.stationId}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '4px 6px',
                                                borderRadius: 'var(--radius-sm)',
                                                cursor: 'pointer',
                                                background: isSelected
                                                  ? 'rgba(56, 189, 248, 0.12)'
                                                  : 'transparent',
                                                border: isSelected
                                                  ? '1px solid rgba(56, 189, 248, 0.3)'
                                                  : '1px solid transparent',
                                                transition: 'all 0.1s ease',
                                              }}
                                              onClick={() => toggleStation(st.stationId)}
                                            >
                                              {/* Left: Checkbox + Icon + Station Names */}
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '6px',
                                                  overflow: 'hidden',
                                                  flex: 1,
                                                }}
                                              >
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleStation(st.stationId);
                                                  }}
                                                  style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: isSelected
                                                      ? 'var(--primary-light)'
                                                      : 'var(--text-dim)',
                                                  }}
                                                >
                                                  {isSelected ? (
                                                    <CheckSquare size={13} />
                                                  ) : (
                                                    <Square size={13} />
                                                  )}
                                                </button>

                                                <Radio
                                                  size={11}
                                                  color={
                                                    isSelected
                                                      ? 'var(--primary-light)'
                                                      : 'var(--text-dim)'
                                                  }
                                                  style={{ flexShrink: 0 }}
                                                />

                                                <div
                                                  style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    overflow: 'hidden',
                                                    gap: '1px',
                                                  }}
                                                >
                                                  {/* Station Name (Level 4 primary) */}
                                                  <div
                                                    style={{
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: '4px',
                                                    }}
                                                  >
                                                    <span
                                                      style={{
                                                        fontSize: '0.74rem',
                                                        fontWeight: isSelected ? 600 : 500,
                                                        color: isSelected
                                                          ? 'var(--primary-light)'
                                                          : 'var(--text-main)',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        maxWidth: '145px',
                                                      }}
                                                      title={`${st.stationName} (${st.stationId})`}
                                                    >
                                                      {st.stationName}
                                                    </span>

                                                    {!st.isMapped && (
                                                      <span
                                                        style={{
                                                          fontSize: '0.58rem',
                                                          padding: '0px 3px',
                                                          borderRadius: '2px',
                                                          background: 'rgba(234, 179, 8, 0.15)',
                                                          color: 'var(--quality-corrupt)',
                                                          fontWeight: 600,
                                                        }}
                                                      >
                                                        Unmapped
                                                      </span>
                                                    )}
                                                  </div>

                                                  {/* Station ID (Level 4 secondary) */}
                                                  <span
                                                    className="mono-font"
                                                    style={{
                                                      fontSize: '0.64rem',
                                                      color: 'var(--text-dim)',
                                                      letterSpacing: '0.02em',
                                                    }}
                                                  >
                                                    {st.stationId}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Right: Bad flags, record count, and info button */}
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  flexShrink: 0,
                                                }}
                                              >
                                                {st.badRecords > 0 && (
                                                  <span
                                                    style={{
                                                      fontSize: '0.6rem',
                                                      color: 'var(--quality-bad)',
                                                      background: 'var(--quality-bad-bg)',
                                                      padding: '1px 3px',
                                                      borderRadius: '3px',
                                                      fontWeight: 600,
                                                    }}
                                                    title={`${st.badRecords} bad records`}
                                                  >
                                                    !{st.badRecords}
                                                  </span>
                                                )}

                                                <span
                                                  style={{
                                                    fontSize: '0.68rem',
                                                    color: 'var(--text-muted)',
                                                    fontFamily: 'var(--font-mono)',
                                                  }}
                                                >
                                                  {st.totalRecords}
                                                </span>

                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedStationIdForDetails(st.stationId);
                                                  }}
                                                  style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: '2px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    opacity: 0.6,
                                                  }}
                                                  title={`Inspect telemetry details for ${st.stationName}`}
                                                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                                                >
                                                  <Info size={11} color="var(--primary-light)" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Footer Selection Status */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-subtle)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>
          Selected:{' '}
          <strong style={{ color: 'var(--text-main)' }}>
            {selectedStations.length === 0 ? `All (${stations.length})` : selectedStations.length}
          </strong>
        </span>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={selectAllStations}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-light)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: 0,
            }}
          >
            Select All
          </button>
          <span style={{ color: 'var(--border)' }}>|</span>
          <button
            onClick={clearStationSelection}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              fontSize: '0.7rem',
              padding: 0,
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
