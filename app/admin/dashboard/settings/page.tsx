"use client";

import { useState } from "react";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  Mail,
  Key,
  Globe,
  Clock,
  Save,
  Upload,
  AlertTriangle,
  CheckCircle,
  Lock,
  Users,
  FileText,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  { id: "general", label: "General", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "users", label: "User Management", icon: Users },
  { id: "content", label: "Content", icon: FileText },
  { id: "integrations", label: "Integrations", icon: Zap },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  // General settings state
  const [platformName, setPlatformName] = useState("MedVision AI");
  const [supportEmail, setSupportEmail] = useState("support@medvision.ai");
  const [timezone, setTimezone] = useState("America/New_York");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [alertThreshold, setAlertThreshold] = useState("warning");

  // Security settings
  const [mfaRequired, setMfaRequired] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [passwordExpiry, setPasswordExpiry] = useState("90");
  const [loginAttempts, setLoginAttempts] = useState("5");

  // User management settings
  const [autoApprove, setAutoApprove] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);

  // Content settings
  const [contentModeration, setContentModeration] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [maxUploadSize, setMaxUploadSize] = useState("50");

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Settings saved successfully");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-accent-red/20 to-accent-purple/20 border border-accent-red/30">
              <Settings className="h-6 w-6 text-accent-red" />
            </div>
            <h1 className="text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary">
              Admin Settings
            </h1>
          </div>
          <p className="text-text-secondary">
            Configure platform settings and preferences
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-accent-red hover:bg-accent-red/90 text-white"
        >
          <Save className={cn("h-4 w-4 mr-2", isSaving && "animate-spin")} />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-2">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-transparent h-auto">
            {SETTINGS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "flex items-center gap-2 py-2.5 px-4 rounded-lg transition-all data-[state=active]:bg-accent-red data-[state=active]:text-white",
                  "text-text-secondary hover:text-text-primary hover:bg-surface"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent-cyan" />
              Platform Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="platformName">Platform Name</Label>
                <Input
                  id="platformName"
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="bg-surface border-border-custom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="bg-surface border-border-custom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Default Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-surface border-border-custom">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-surface rounded-lg border border-border-custom flex items-center justify-center">
                    <span className="text-2xl font-bold text-accent-red">M</span>
                  </div>
                  <Button variant="outline" className="border-border-custom">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="mt-6 pt-6 border-t border-border-custom">
              <div className="flex items-center justify-between p-4 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-accent-amber" />
                  <div>
                    <p className="text-text-primary font-medium">Maintenance Mode</p>
                    <p className="text-text-secondary text-sm">Disable access for non-admin users</p>
                  </div>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
              <Bell className="h-5 w-5 text-accent-cyan" />
              Notification Preferences
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-text-secondary" />
                  <div>
                    <p className="text-text-primary font-medium">Email Notifications</p>
                    <p className="text-text-secondary text-sm">Receive important alerts via email</p>
                  </div>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-text-secondary" />
                  <div>
                    <p className="text-text-primary font-medium">Slack Notifications</p>
                    <p className="text-text-secondary text-sm">Send alerts to Slack channel</p>
                  </div>
                </div>
                <Switch checked={slackNotifications} onCheckedChange={setSlackNotifications} />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-text-secondary" />
                  <div>
                    <p className="text-text-primary font-medium">Daily Digest</p>
                    <p className="text-text-secondary text-sm">Receive daily summary email</p>
                  </div>
                </div>
                <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} />
              </div>

              <div className="pt-4 border-t border-border-custom">
                <Label className="mb-2 block">Alert Threshold</Label>
                <Select value={alertThreshold} onValueChange={setAlertThreshold}>
                  <SelectTrigger className="w-full md:w-64 bg-surface border-border-custom">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">All events (Info+)</SelectItem>
                    <SelectItem value="warning">Warnings and above</SelectItem>
                    <SelectItem value="critical">Critical only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
              <Lock className="h-5 w-5 text-accent-red" />
              Security Configuration
            </h3>

            <div className="space-y-6">
              {/* MFA */}
              <div className="flex items-center justify-between p-4 bg-accent-green/5 border border-accent-green/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-accent-green" />
                  <div>
                    <p className="text-text-primary font-medium">Require MFA for Admins</p>
                    <p className="text-text-secondary text-sm">Enforce two-factor authentication</p>
                  </div>
                </div>
                <Switch checked={mfaRequired} onCheckedChange={setMfaRequired} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    className="bg-surface border-border-custom"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                  <Input
                    id="passwordExpiry"
                    type="number"
                    value={passwordExpiry}
                    onChange={(e) => setPasswordExpiry(e.target.value)}
                    className="bg-surface border-border-custom"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginAttempts">Max Login Attempts</Label>
                  <Input
                    id="loginAttempts"
                    type="number"
                    value={loginAttempts}
                    onChange={(e) => setLoginAttempts(e.target.value)}
                    className="bg-surface border-border-custom"
                  />
                </div>
              </div>

              {/* API Keys Section */}
              <div className="pt-6 border-t border-border-custom">
                <h4 className="text-text-primary font-medium mb-4 flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Keys
                </h4>
                <div className="bg-surface/50 rounded-lg border border-border-custom p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-text-secondary text-sm">Production API Key</span>
                    <Badge className="bg-accent-green/10 text-accent-green border border-accent-green/30">Active</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="password"
                      value="sk_live_xxxxxxxxxxxxxxxxxxxx"
                      readOnly
                      className="bg-surface border-border-custom font-mono text-sm"
                    />
                    <Button variant="outline" className="border-border-custom shrink-0">
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* User Management Settings */}
        <TabsContent value="users" className="space-y-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-purple" />
              User Management
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div>
                  <p className="text-text-primary font-medium">Allow Public Registration</p>
                  <p className="text-text-secondary text-sm">Let new users create accounts</p>
                </div>
                <Switch checked={allowRegistration} onCheckedChange={setAllowRegistration} />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div>
                  <p className="text-text-primary font-medium">Auto-Approve New Users</p>
                  <p className="text-text-secondary text-sm">Skip manual approval process</p>
                </div>
                <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div>
                  <p className="text-text-primary font-medium">Require Email Verification</p>
                  <p className="text-text-secondary text-sm">Users must verify email before access</p>
                </div>
                <Switch checked={requireEmailVerification} onCheckedChange={setRequireEmailVerification} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Content Settings */}
        <TabsContent value="content" className="space-y-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent-amber" />
              Content Settings
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div>
                  <p className="text-text-primary font-medium">Content Moderation</p>
                  <p className="text-text-secondary text-sm">Review content before publishing</p>
                </div>
                <Switch checked={contentModeration} onCheckedChange={setContentModeration} />
              </div>

              <div className="flex items-center justify-between p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div>
                  <p className="text-text-primary font-medium">AI Content Suggestions</p>
                  <p className="text-text-secondary text-sm">Enable AI-powered quiz generation</p>
                </div>
                <Switch checked={aiSuggestions} onCheckedChange={setAiSuggestions} />
              </div>

              <div className="pt-4 border-t border-border-custom">
                <Label htmlFor="maxUpload" className="mb-2 block">Max Upload Size (MB)</Label>
                <Input
                  id="maxUpload"
                  type="number"
                  value={maxUploadSize}
                  onChange={(e) => setMaxUploadSize(e.target.value)}
                  className="w-full md:w-32 bg-surface border-border-custom"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="bg-surface-elevated/40 backdrop-blur-sm border border-border-custom rounded-xl p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-6 flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent-cyan" />
              Integrations
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OpenAI */}
              <div className="p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-emerald-500 text-sm font-bold">AI</span>
                    </div>
                    <span className="text-text-primary font-medium">OpenAI</span>
                  </div>
                  <Badge className="bg-accent-green/10 text-accent-green border border-accent-green/30">Connected</Badge>
                </div>
                <p className="text-text-secondary text-sm mb-3">GPT-4 for AI Assistant and content generation</p>
                <Button variant="outline" size="sm" className="border-border-custom w-full">Configure</Button>
              </div>

              {/* Supabase */}
              <div className="p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <Database className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-text-primary font-medium">Supabase</span>
                  </div>
                  <Badge className="bg-accent-green/10 text-accent-green border border-accent-green/30">Connected</Badge>
                </div>
                <p className="text-text-secondary text-sm mb-3">Database and authentication services</p>
                <Button variant="outline" size="sm" className="border-border-custom w-full">Configure</Button>
              </div>

              {/* Stripe */}
              <div className="p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-purple-500 text-sm font-bold">S</span>
                    </div>
                    <span className="text-text-primary font-medium">Stripe</span>
                  </div>
                  <Badge className="bg-text-secondary/10 text-text-secondary border border-border-custom">Not Connected</Badge>
                </div>
                <p className="text-text-secondary text-sm mb-3">Payment processing for subscriptions</p>
                <Button variant="outline" size="sm" className="border-border-custom w-full">Connect</Button>
              </div>

              {/* SendGrid */}
              <div className="p-4 bg-surface/50 rounded-lg border border-border-custom">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Mail className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-text-primary font-medium">SendGrid</span>
                  </div>
                  <Badge className="bg-accent-green/10 text-accent-green border border-accent-green/30">Connected</Badge>
                </div>
                <p className="text-text-secondary text-sm mb-3">Transactional email service</p>
                <Button variant="outline" size="sm" className="border-border-custom w-full">Configure</Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
