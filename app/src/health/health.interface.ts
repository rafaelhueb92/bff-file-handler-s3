interface HealthCheckResult {
  cpuRatio?: string | undefined;
  memUsage?: string | undefined;
  freeSpaceDisk?: string | undefined;
  uptime?: string | undefined;
  totalMem?: string | undefined;
  freeMem?: string | undefined;
  healthy: any;
  healthyService: any;
  bucketHealth: any;
}
