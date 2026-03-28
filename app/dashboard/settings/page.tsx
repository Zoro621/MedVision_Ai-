"use client";

import { useState } from "react";
import { Settings, User, Bell, Shield, CreditCard, Palette, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MOCK_USER } from "@/lib/mockData/dashboard";

export default function SettingsPage() {
  const user = MOCK_USER;
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    streakAlert: true,
    weeklyDigest: false,
    achievementUnlocks: true,
  });

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-[family-name:var(--font-syne)] font-bold text-text-primary flex items-center gap-2">
          <Settings className="h-7 w-7 text-accent-cyan" />
          Settings
        </h1>
        <p className="text-text-secondary mt-1">
          Manage your account and preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-surface-elevated">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-6">
            <h2 className="font-medium text-text-primary mb-4">Profile Information</h2>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center text-2xl font-bold text-background">
                {user.fullName.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="text-lg font-medium text-text-primary">{user.fullName}</p>
                <p className="text-sm text-text-secondary">{user.email}</p>
                <p className="text-xs text-accent-cyan mt-1">Level {user.level} · {user.xp} XP</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary block mb-1">Full Name</label>
                <input
                  type="text"
                  defaultValue={user.fullName}
                  className="w-full px-4 py-2 bg-surface border border-border-custom rounded-lg text-text-primary focus:outline-none focus:border-accent-cyan transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary block mb-1">Email</label>
                <input
                  type="email"
                  defaultValue={user.email}
                  className="w-full px-4 py-2 bg-surface border border-border-custom rounded-lg text-text-primary focus:outline-none focus:border-accent-cyan transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary block mb-1">Specialty</label>
                <select className="w-full px-4 py-2 bg-surface border border-border-custom rounded-lg text-text-primary focus:outline-none focus:border-accent-cyan transition-colors">
                  <option>Radiology Resident</option>
                  <option>Medical Student</option>
                  <option>Attending Radiologist</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border-custom">
              <Button className="bg-accent-cyan text-background hover:bg-accent-cyan/90">
                Save Changes
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-surface-elevated border border-accent-red/30 rounded-xl p-6">
            <h2 className="font-medium text-accent-red mb-2 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Danger Zone
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Irreversible actions that affect your account.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="border-accent-red/50 text-accent-red hover:bg-accent-red/10">
                Delete All Data
              </Button>
              <Button variant="outline" className="border-accent-red/50 text-accent-red hover:bg-accent-red/10">
                Delete Account
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-6">
            <h2 className="font-medium text-text-primary mb-4">Notification Preferences</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm text-text-primary">Daily Study Reminder</p>
                  <p className="text-xs text-text-secondary">Get reminded to study every day</p>
                </div>
                <Switch
                  checked={notifications.dailyReminder}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, dailyReminder: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border-custom">
                <div>
                  <p className="text-sm text-text-primary">Streak Alert</p>
                  <p className="text-xs text-text-secondary">Warn when streak is about to break</p>
                </div>
                <Switch
                  checked={notifications.streakAlert}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, streakAlert: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border-custom">
                <div>
                  <p className="text-sm text-text-primary">Weekly Digest</p>
                  <p className="text-xs text-text-secondary">Summary of your weekly progress</p>
                </div>
                <Switch
                  checked={notifications.weeklyDigest}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, weeklyDigest: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t border-border-custom">
                <div>
                  <p className="text-sm text-text-primary">Achievement Unlocks</p>
                  <p className="text-xs text-text-secondary">Celebrate when you earn badges</p>
                </div>
                <Switch
                  checked={notifications.achievementUnlocks}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, achievementUnlocks: checked }))
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <div className="bg-surface-elevated border border-border-custom rounded-xl p-6">
            <h2 className="font-medium text-text-primary mb-4">Theme</h2>
            
            <div className="grid grid-cols-3 gap-3">
              {["dark", "light", "system"].map((theme) => (
                <button
                  key={theme}
                  className={cn(
                    "p-4 rounded-xl border-2 text-center transition-all capitalize",
                    theme === "dark"
                      ? "border-accent-cyan bg-accent-cyan/10"
                      : "border-border-custom hover:border-accent-cyan/50"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full mx-auto mb-2",
                      theme === "dark"
                        ? "bg-gray-900"
                        : theme === "light"
                          ? "bg-white border border-gray-300"
                          : "bg-gradient-to-br from-gray-900 to-white"
                    )}
                  />
                  <span className="text-sm text-text-primary">{theme}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface-elevated border border-border-custom rounded-xl p-6">
            <h2 className="font-medium text-text-primary mb-4">Accent Color</h2>
            
            <div className="flex gap-3">
              {[
                { name: "Cyan", color: "bg-accent-cyan" },
                { name: "Green", color: "bg-accent-green" },
                { name: "Purple", color: "bg-accent-purple" },
                { name: "Amber", color: "bg-accent-amber" },
              ].map((accent) => (
                <button
                  key={accent.name}
                  className={cn(
                    "w-10 h-10 rounded-full transition-all ring-2 ring-offset-2 ring-offset-surface",
                    accent.color,
                    accent.name === "Cyan" ? "ring-accent-cyan" : "ring-transparent hover:ring-text-secondary"
                  )}
                  title={accent.name}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
