export interface PracticeStatusCount {
  status: string;
  count: number;
  rawStatus: string;
}

export interface TrendData {
  date: string;
  label: string;
  count: number;
}

export interface RecentPractice {
  id: string;
  number: string;
  customerName: string;
  type: string;
  status: string;
  rawStatus: string;
  createdAt: Date;
}

export interface CommissionsInfo {
  available: boolean;
  message: string;
  currentMonth?: number;
}

export interface DashboardStatsDto {
  customers: number;
  practices: number;
  practicesByStatus: PracticeStatusCount[];
  recentPractices: RecentPractice[];
  trends: TrendData[];
  commissions: CommissionsInfo;
}