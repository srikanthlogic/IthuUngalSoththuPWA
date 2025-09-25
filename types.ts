import React from 'react';

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
    running: number;
    ranTodayWithoutTracking: number;
    notRunLessThan7Days: number;
    notRun7to30Days: number;
    notRunMoreThan30Days: number;
    scrapped: number;
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
    About
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
    // Fix: Changed JSX.Element to React.ReactElement to resolve namespace error on line 80.
    render?: (value: any, row: BusData) => string | React.ReactElement;
}

export type StatusFilter = 'all' | 'running' | 'ranToday' | 'idleOver7d' | 'idleOver30d' | 'scrapped';
export type FleetFilter = 'all' | 'lf' | 'elf' | 'elfac' | 'other';
export type SeriesFilter = 'all' | 'h' | 'i' | 'j' | 'k' | 'c';