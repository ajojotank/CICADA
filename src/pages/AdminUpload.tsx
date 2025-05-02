
import React from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import UploadForm from "@/components/admin/UploadForm";

const AdminUpload: React.FC = () => {
  return (
    <AdminLayout title="Upload Document">
      <section className="w-full overflow-hidden">
        <UploadForm />
      </section>
    </AdminLayout>
  );
};

export default AdminUpload;
