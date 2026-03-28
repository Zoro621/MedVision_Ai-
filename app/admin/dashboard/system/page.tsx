"use client";

import { useState, useEffect } from "react";
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  MemoryStick,
  Globe,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mock system health data
const MOCK_SERVICES = [
  { name: "API Server", status: "healthy", uptime: "99.98%", responseTime: "45ms", lastCheck: "10s ago" },
  { name: "Database (PostgreSQL)", status: "healthy", uptime: "99.99%", responseTime: "12ms", lastCheck: "10s ago" },
  { name: "Redis Cache", status: "healthy", uptime: "99.95%", responseTime: "2ms", lastCheck: "10s ago" },
  { name: "AI Inference Engine", status: "degraded", uptime: "98.50%", responseTime: "850ms", lastCheck: "10s ago" },
  { name: "Storage Service", status: "healthy", uptime: "99.99%", responseTime: "65ms", lastCheck: "10s ago" },
  { name: "Email Service", status: "healthy", uptime: "99.90%", responseTime: "120ms", lastCheck: "10s ago" },
];

const MOCK_METRICS = {
  cpu: { current: 42, peak: 78, avg: 35 },
  memory: { used: 12.4, total: 32, percent: 38.75 },
  disk: { used: 245, total: 500, percent: 49 },
  network: { inbound: 125, outbound: 89 },
  requests: { perSecond: 156, errors: 2 },
  activeUsers: 234,
  dbConnections: { active: 45, max: 100 },
};

const STATUS_CONFIG = {
  healthy: { icon: CheckCircle, color: "text-accent-green", bg: "bg-accent-green/10", border: "border-accent-green/30", label: "Healthy" },
  degraded: { icon: AlertTriangle, color: "text-accent-amber", bg: "bg-accent-amber/10", border: "border-accent-amber/30", label: "Degraded" },
  down: { icon: XCircle, color: "text-accent-red", bg: "bg-accent-red/10", border: "border-accent-red/30", label: "Down" },
};

export default function SystemHealthPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [metrics, setMetrics] = useState(MOCK_METRICS);

  // Simulate live metrics update
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        cpu: { ...prev.cpu, current: Math.max(20, Math.min(90, prev.cpu.current + (Math.random() - 0.5) * 10)) },
        requests: { ...prev.requests, perSecond: Math.max(100, Math.min(300, prev.requests.perSecond + Math.floor((Math.random() - 0.5) * 20))) },
        activeUsers: Math.max(180, Math.min(300, prev.activeUsers + Math.floor((Math.random() - 0.5) * 10))),
      }));
      setLastUpdated(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 1000);
  };

  const overallHealth = MOCK_SERVICES.every(s => s.status === "healthy") 
    ? "healthy" 
    : MOCK_SERVICES.some(s => s.status === "down") 
      ? "down" 
      : "degraded";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent-red/20 to-accent-purple/20 border border-accent-red/30">
              <Activity className="h-6 w-6 text-accent-red" />
            </div>
            <h1 className="text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
              System Health
            </h1>
          </div>
          <p className="text-text-secondary">
            Monitor infrastructure performance and service status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-text-secondary text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-border-custom hover:border-accent-red/40"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={cn(
        "rounded-xl p-6 border backdrop-blur-sm",
        STATUS_CONFIG[overallHealth].bg,
        STATUS_CONFIG[overallHealth].border
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {(() => {
              const StatusIcon = STATUS_CONFIG[overallHealth].icon;
              return <StatusIcon className={cn("h-10 w-10", STATUS_CONFIG[overallHealth].color)} />;
            })()}
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                System Status: {STATUS_CONFIG[overallHealth].label}
              </h2>
              <p className="text-text-secondary">
                {overallHealth === "healthy" 
                  ? "All systems operational" 
                  : overallHealth === "degraded"
                    ? "Some services experiencing issues"
                    : "Critical services down"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-text-secondary text-sm">Uptime (30 days)</p>
            <p className="text-2xl font-bold text-text-primary">99.95%</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-accent-cyan" />
              <span className="text-text-secondary text-sm">CPU Usage</span>
            </div>
            <span className={cn(
              "text-xl font-bold",
              metrics.cpu.current > 80 ? "text-accent-red" : 
              metrics.cpu.current > 60 ? "text-accent-amber" : "text-accent-green"
            )}>
              {Math.round(metrics.cpu.current)}%
            </span>
          </div>
          <div className="w-full bg-surface rounded-full h-2">
            <div 
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                metrics.cpu.current > 80 ? "bg-accent-red" : 
                metrics.cpu.current > 60 ? "bg-accent-amber" : "bg-accent-green"
              )}
              style={{ width: `${metrics.cpu.current}%` }}
            />
          </div>
          <p className="text-text-secondary text-xs mt-2">Peak: {metrics.cpu.peak}% | Avg: {metrics.cpu.avg}%</p>
        </div>

        {/* Memory */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MemoryStick className="h-5 w-5 text-accent-purple" />
              <span className="text-text-secondary text-sm">Memory</span>
            </div>
            <span className="text-xl font-bold text-text-primary">
              {metrics.memory.used.toFixed(1)}GB
            </span>
          </div>
          <div className="w-full bg-surface rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-accent-purple transition-all"
              style={{ width: `${metrics.memory.percent}%` }}
            />
          </div>
          <p className="text-text-secondary text-xs mt-2">of {metrics.memory.total}GB ({metrics.memory.percent.toFixed(1)}%)</p>
        </div>

        {/* Disk */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-accent-amber" />
              <span className="text-text-secondary text-sm">Disk</span>
            </div>
            <span className="text-xl font-bold text-text-primary">
              {metrics.disk.used}GB
            </span>
          </div>
          <div className="w-full bg-surface rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-accent-amber transition-all"
              style={{ width: `${metrics.disk.percent}%` }}
            />
          </div>
          <p className="text-text-secondary text-xs mt-2">of {metrics.disk.total}GB ({metrics.disk.percent}%)</p>
        </div>

        {/* Network */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-accent-green" />
              <span className="text-text-secondary text-sm">Network</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary font-bold">{metrics.network.inbound} MB/s</p>
              <p className="text-text-secondary text-xs">Inbound</p>
            </div>
            <div className="text-right">
              <p className="text-text-primary font-bold">{metrics.network.outbound} MB/s</p>
              <p className="text-text-secondary text-xs">Outbound</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-cyan/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-accent-cyan" />
            <span className="text-text-secondary text-sm">Requests/sec</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{metrics.requests.perSecond}</p>
          <p className="text-text-secondary text-xs mt-1">{metrics.requests.errors} errors</p>
        </div>

        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-green/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5 text-accent-green" />
            <span className="text-text-secondary text-sm">Active Users</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{metrics.activeUsers}</p>
          <p className="text-text-secondary text-xs mt-1">Currently online</p>
        </div>

        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-accent-purple/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-accent-purple" />
            <span className="text-text-secondary text-sm">DB Connections</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{metrics.dbConnections.active}</p>
          <p className="text-text-secondary text-xs mt-1">of {metrics.dbConnections.max} max</p>
        </div>
      </div>

      {/* Services Status */}
      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border-custom">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Server className="h-5 w-5 text-accent-red" />
            Services Status
          </h3>
        </div>

        <div className="divide-y divide-border-custom">
          {MOCK_SERVICES.map((service) => {
            const config = STATUS_CONFIG[service.status as keyof typeof STATUS_CONFIG];
            const StatusIcon = config.icon;

            return (
              <div key={service.name} className="px-6 py-4 flex items-center justify-between hover:bg-surface/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <StatusIcon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div>
                    <p className="text-text-primary font-medium">{service.name}</p>
                    <p className="text-text-secondary text-sm">Last check: {service.lastCheck}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-text-secondary text-xs uppercase tracking-wider">Uptime</p>
                    <p className="text-text-primary font-medium">{service.uptime}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-secondary text-xs uppercase tracking-wider">Response</p>
                    <p className={cn(
                      "font-medium",
                      parseInt(service.responseTime) > 500 ? "text-accent-amber" : "text-text-primary"
                    )}>
                      {service.responseTime}
                    </p>
                  </div>
                  <Badge className={cn("capitalize", config.bg, config.color, config.border, "border")}>
                    {service.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent-amber" />
          Recent Incidents
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-accent-amber mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-text-primary font-medium">AI Inference Engine - High Latency</p>
                <Badge className="bg-accent-amber/10 text-accent-amber border border-accent-amber/30">Investigating</Badge>
              </div>
              <p className="text-text-secondary text-sm mt-1">
                Elevated response times detected. Engineering team notified.
              </p>
              <p className="text-text-secondary text-xs mt-2">Started: 2 hours ago</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-accent-green/5 border border-accent-green/20 rounded-lg">
            <CheckCircle className="h-5 w-5 text-accent-green mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-text-primary font-medium">Database - Scheduled Maintenance</p>
                <Badge className="bg-accent-green/10 text-accent-green border border-accent-green/30">Resolved</Badge>
              </div>
              <p className="text-text-secondary text-sm mt-1">
                Completed maintenance window with zero downtime migration.
              </p>
              <p className="text-text-secondary text-xs mt-2">Resolved: Yesterday at 3:00 AM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
