


export interface BusData {
    id: string;
    latitude?: number;
    longitude?: number;
    bearing?: number;
    speed?: number;
    timestamp: number;
    lU?: number; // Last updated timestamp from the API
    lastSeenTimestamp?: number | null;
    route_id?: string;
    trip_id?: string;
    vehicle_id: string;
    agency_name?: string;
    route_short_name?: string;
    trip_headsign?: string;
    [key: string]: any;
}

export interface FleetStatusBreakdown {
    total: number;
    running: number;
    ranTodayWithoutTracking: number;
    notRunLessThan7Days: number;
    notRun7to30Days: number;
    notRunMoreThan30Days: number;
    scrapped: number;
}

export interface DashboardStats {
    total: number;
    totalMTC: number;
    totalSwitch: number;
    running: number;
    ranTodayWithoutTracking: number;
    trackedTodayMTC: number;
    trackedTodaySwitch: number;
    notRunLessThan7Days: number;
    notRun7to30Days: number;
    notRunMoreThan30Days: number;
    idleMTC: number;
    idleSwitch: number;
    scrapped: number;
    scrappedMTC: number;
    scrappedSwitch: number;
    elfac: FleetStatusBreakdown;
    elf: FleetStatusBreakdown;
    lf: FleetStatusBreakdown;
    other: FleetStatusBreakdown;
}

export enum View {
    Home,
    Dashboard,
    Fleet,
    Routes,
    About,
    IthuUngalSoththu
}

export interface SortConfig {
    key: keyof BusData;
    direction: 'ascending' | 'descending';
}

export interface FleetBreakdown {
  elfac: number;
  elf: number;
  lf: number;
  other: number;
}

export interface RouteInfo {
  id: string; // route_short_name
  destinations: string[];
  totalBuses: number;
  runningBuses: FleetBreakdown;
  ranTodayWithoutTracking: FleetBreakdown;
  notRunLessThan7Days: number;
  notRun7to30Days: number;
  notRunMoreThan30Days: number;
  scrappedBuses: FleetBreakdown;
  fleet: FleetBreakdown;
}

export interface TableColumn {
    key: keyof BusData;
    header: string;
    render?: (value: any, row: BusData) => string | any;
}

export type StatusFilter = string[];
export type FleetFilter = string[];
export type SeriesFilter = string[];
export type AgencyFilter = string[];

// Agency Configuration Types
export interface FilterLogic {
    type: 'startsWith' | 'endsWith' | 'not' | 'or';
    match?: string;
    conditions?: FilterLogic[];
}

export interface FilterOption {
    value: string;
    labelKey: string;
    logic?: FilterLogic;
}

export interface FilterConfig {
    id: 'fleet' | 'agency' | 'series';
    labelKey: string;
    colorClass: string;
    filterKey: keyof BusData;
    options: FilterOption[];
}

export interface RenderConfig {
    type: 'datetime' | 'derived';
    sourceKey?: keyof BusData;
    logic?: FilterLogic;
    valueIfTrueKey?: string;
    valueIfFalseKey?: string;
}

export interface TableColumnConfig {
    key: keyof BusData;
    headerKey: string;
    render?: RenderConfig;
}

export interface AgencyConfig {
    agencyId: string;
    agencyName: string;
    appName: string;
    appHashtag: string;
    deemedScrappedDays?: number;
    filters: FilterConfig[];
    tableColumns: TableColumnConfig[];
}
