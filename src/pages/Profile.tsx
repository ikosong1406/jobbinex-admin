import React, { useState, useEffect } from "react";
import { FaUser, FaEnvelope, FaTrash, FaSearch, FaSync } from "react-icons/fa";
import axios, { AxiosError } from "axios";
import localforage from "localforage";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import Api from "../components/Api";

const ADMINS_ENDPOINT = `${Api}/admin/getAdmins`;
const DELETE_ADMIN_ENDPOINT = `${Api}/admin/deleteAdmin`;
const PRIMARY_COLOR = "#4eaa3c";

interface Admin {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  success: boolean;
  admins?: Admin[];
  message?: string;
  users?: Admin[]; // Sometimes APIs use different property names
  data?: Admin[] | { admins: Admin[] }; // Flexible response handling
}

const AdminsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const extractAdminsFromResponse = (response: ApiResponse): Admin[] => {
    // Try different possible response structures
    if (Array.isArray(response)) {
      return response; // Direct array response
    }
    if (Array.isArray(response?.admins)) {
      return response.admins;
    }
    if (Array.isArray(response?.users)) {
      return response.users;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    if (response?.data && Array.isArray((response.data as any)?.admins)) {
      return (response.data as any).admins;
    }
    // If nothing matches, return empty array
    console.warn("Unexpected API response structure:", response);
    return [];
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get<ApiResponse>(ADMINS_ENDPOINT);

      const adminList = extractAdminsFromResponse(data);
      setAdmins(adminList);

      if (adminList.length === 0) {
        toast.error("No admins found");
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error("Fetch admins error:", err.response?.data || err.message);
      toast.error("Failed to load admin data.");
      if (err.response?.status === 401) {
        navigate("/login", { replace: true });
      }
      setAdmins([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${adminName}?`)) {
      return;
    }

    try {
      setDeletingId(adminId);
      const token = await localforage.getItem("authToken");

      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const data = {
        id: adminId,
      };

      await axios.post(`${DELETE_ADMIN_ENDPOINT}`, data);

      toast.success("Admin deleted successfully");
      setAdmins(admins.filter((admin) => admin._id !== adminId));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete admin");
      console.error("Delete error:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAdmins = Array.isArray(admins)
    ? admins.filter(
        (admin) =>
          `${admin.firstname} ${admin.lastname}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (admin.phonenumber || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (admin.role || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading admins...</p>
        </div>
      </div>
    );
  }

  // Desktop Table View
  const DesktopView = () => (
    <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Admin
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Contact
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Role
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAdmins.map((admin) => (
            <tr key={admin._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div
                    className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  >
                    <FaUser />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {admin.firstname} {admin.lastname}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-900 flex items-center">
                  <FaEnvelope className="mr-2 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{admin.email}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  {admin.role || "Admin"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() =>
                    handleDeleteAdmin(
                      admin._id,
                      `${admin.firstname} ${admin.lastname}`
                    )
                  }
                  disabled={deletingId === admin._id}
                  className="text-red-600 hover:text-red-900 disabled:opacity-50 flex items-center px-3 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  <FaTrash className="mr-2" />
                  {deletingId === admin._id ? "Deleting..." : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Mobile Card View
  const MobileView = () => (
    <div className="md:hidden space-y-4">
      {filteredAdmins.map((admin) => (
        <div key={admin._id} className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div
                className="flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                <FaUser />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">
                  {admin.firstname} {admin.lastname}
                </h3>
                <div className="text-xs text-gray-500 mt-1 flex items-center">
                  <FaEnvelope className="mr-1 flex-shrink-0" />
                  <span className="truncate">{admin.email}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() =>
                handleDeleteAdmin(
                  admin._id,
                  `${admin.firstname} ${admin.lastname}`
                )
              }
              disabled={deletingId === admin._id}
              className="text-red-600 hover:text-red-900 disabled:opacity-50 p-2 rounded-full hover:bg-red-50"
              title="Delete admin"
            >
              <FaTrash />
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              {admin.role || "Admin"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600 mt-2">
            View and manage all system administrators
          </p>
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <FaSearch />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search admins by name, email, or phone..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchAdmins}
            className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FaSync className="mr-2" />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">Total Admins</div>
            <div className="text-2xl font-bold mt-1">{admins.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">Showing</div>
            <div className="text-2xl font-bold mt-1">
              {filteredAdmins.length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-500">Last Updated</div>
            <div className="text-lg font-semibold mt-1">
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>

        {/* Admins List */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              All Admins{" "}
              {filteredAdmins.length > 0 && `(${filteredAdmins.length})`}
            </h2>
          </div>

          {filteredAdmins.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">
                <FaUser />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? "No matching admins" : "No administrators found"}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Add your first administrator to get started"}
              </p>
              <button
                onClick={fetchAdmins}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                Refresh List
              </button>
            </div>
          ) : (
            <>
              <DesktopView />
              <MobileView />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminsPage;
