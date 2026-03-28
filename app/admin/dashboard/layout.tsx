import { AdminLayout } from "@/components/admin/shell/AdminLayout";

export const metadata = {
  title: "Admin Dashboard | MedVision AI",
  description: "MedVision AI Admin Dashboard - Platform management and analytics",
};

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
