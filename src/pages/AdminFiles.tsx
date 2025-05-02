
import React from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import FileTable from "@/components/admin/FileTable";

const AdminFiles: React.FC = () => {
  return (
    <AdminLayout title="Document Library">
      <section className="space-y-4">
        <p className="text-gray-500 dark:text-gray-400">
          Manage your document library. Use the tabs below to switch between private and public document repositories.
        </p>
        
        <section className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
          <FileTable />
        </section>
      </section>
    </AdminLayout>
  );
};

export default AdminFiles;
