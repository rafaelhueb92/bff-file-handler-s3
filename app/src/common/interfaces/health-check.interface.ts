interface HealthCheckResult {
  healthy: boolean;
  cpuRatio?: string;
  memUsage?: string;
  freeSpaceDisk?: string;
  uptime?: number;
  totalMem?: string;
  freeMem?: string;
}
