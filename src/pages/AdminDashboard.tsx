
import React from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import Dashboard from "@/components/admin/Dashboard";

const AdminDashboard: React.FC = () => {
  return (
    <AdminLayout title="Dashboard">
      <Dashboard />
    </AdminLayout>
  );
};

export default AdminDashboard;
