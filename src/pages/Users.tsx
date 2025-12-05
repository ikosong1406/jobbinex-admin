import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaPhone,
  FaCalendar,
  FaBriefcase,
  FaSearch,
  FaSync,
  FaEye,
  FaFileAlt,
  FaUserTag,
} from "react-icons/fa";
import axios, { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import Api from "../components/Api";

const USERS_ENDPOINT = `${Api}/admin/getUsers`;
const PRIMARY_COLOR = "#4eaa3c";

interface User {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  jobEmail?: string | null;
  jobPassword?: string | null;
  cv?: string | null;
  preferredIndustries?: string | null;
  preferredRoles?: string | null;
  preferredLocations?: string | null;
  plan?: {
    name: string;
    expiresAt: string;
  } | null;
  assistant?: string | null;
  jobs: string[];
  notifications: any[];
  messages: any[];
  resetCode?: string | null;
  resetCodeExpires?: string | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface ApiResponse {
  success: boolean;
  data?: User[];
  message?: string;
}

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Helper functions with fallbacks
  const getSafeUserName = (user: User) => {
    return `${user.firstname || "Unknown"} ${user.lastname || "User"}`;
  };

  const getUserInitials = (user: User) => {
    const first = user.firstname?.charAt(0) || "U";
    const last = user.lastname?.charAt(0) || "U";
    return `${first}${last}`.toUpperCase();
  };

  const getSafeEmail = (user: User) => {
    return user.email || "N/A";
  };

  const getSafePhone = (user: User) => {
    return user.phonenumber || "N/A";
  };

  const getSafePlanName = (user: User) => {
    return user.plan?.name || "No Plan";
  };

  const getPlanExpiry = (user: User) => {
    if (!user.plan?.expiresAt) return "No active plan";
    return new Date(user.plan.expiresAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getJobCount = (user: User) => {
    return user.jobs?.length || 0;
  };

  const getSafeCreatedAt = (user: User) => {
    return user.createdAt || new Date().toISOString();
  };

  const getSafeIndustries = (user: User) => {
    return user.preferredIndustries || "Not specified";
  };

  const getSafeRoles = (user: User) => {
    return user.preferredRoles || "Not specified";
  };

  const getSafeLocations = (user: User) => {
    return user.preferredLocations || "Not specified";
  };

  const getHasAssistant = (user: User) => {
    return user.assistant ? "Yes" : "No";
  };

  // Extract users from API response
  const extractUsersFromResponse = (response: ApiResponse): User[] => {
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    console.warn("Unexpected API response structure:", response);
    return [];
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get<ApiResponse>(USERS_ENDPOINT);

      const userList = extractUsersFromResponse(data);
      setUsers(userList.reverse()); // Show newest first
      setFilteredUsers(userList);

      if (userList.length === 0) {
        toast.error("No users found");
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error("Fetch users error:", err.response?.data || err.message);
      toast.error("Failed to load user data.");

      // Optional: Handle specific error codes if needed
      if (err.response?.status === 401) {
        toast.error("Access denied. Please check permissions.");
      } else if (err.response?.status === 403) {
        toast.error("Forbidden access to users data.");
      } else if (err.response?.status === 404) {
        toast.error("Users endpoint not found.");
      } else if (err.response?.status === 500) {
        toast.error("Server error. Please try again later.");
      }

      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...users];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((user) => {
        const userName = getSafeUserName(user).toLowerCase();
        const userEmail = getSafeEmail(user).toLowerCase();
        const userPhone = getSafePhone(user).toLowerCase();
        const industries = getSafeIndustries(user).toLowerCase();
        const roles = getSafeRoles(user).toLowerCase();
        const locations = getSafeLocations(user).toLowerCase();

        return (
          userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          userPhone.includes(searchLower) ||
          industries.includes(searchLower) ||
          roles.includes(searchLower) ||
          locations.includes(searchLower)
        );
      });
    }

    // Apply plan filter
    if (planFilter !== "all") {
      result = result.filter((user) => {
        const planName = getSafePlanName(user).toLowerCase();
        if (planFilter === "active") {
          return user.plan?.name && user.plan?.expiresAt;
        }
        if (planFilter === "none") {
          return !user.plan?.name;
        }
        return planName.includes(planFilter.toLowerCase());
      });
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);
      const last30Days = new Date(today);
      last30Days.setDate(last30Days.getDate() - 30);

      result = result.filter((user) => {
        const userDate = new Date(getSafeCreatedAt(user));

        switch (dateFilter) {
          case "today":
            return userDate >= today;
          case "yesterday":
            return userDate >= yesterday && userDate < today;
          case "last7":
            return userDate >= last7Days;
          case "last30":
            return userDate >= last30Days;
          default:
            return true;
        }
      });
    }

    setFilteredUsers(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchTerm, planFilter, dateFilter]);

  const getPlanBadgeColor = (planName: string) => {
    switch (planName.toLowerCase()) {
      case "elite":
        return "bg-purple-100 text-purple-800";
      case "premium":
        return "bg-blue-100 text-blue-800";
      case "basic":
        return "bg-green-100 text-green-800";
      case "no plan":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const formatSimpleDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const UserDetailModal = () => {
    if (!selectedUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  User Details
                </h3>
                <p className="text-sm text-gray-500">ID: {selectedUser._id}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaEye className="text-xl" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium">
                      {getSafeUserName(selectedUser)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{getSafeEmail(selectedUser)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="font-medium">{getSafePhone(selectedUser)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="font-medium text-xs">{selectedUser._id}</p>
                  </div>
                </div>
              </div>

              {/* Plan Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Plan Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Current Plan</p>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(
                        getSafePlanName(selectedUser)
                      )}`}
                    >
                      {getSafePlanName(selectedUser)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Plan Expires</p>
                    <p className="font-medium">{getPlanExpiry(selectedUser)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Has Assistant</p>
                    <p className="font-medium">
                      {getHasAssistant(selectedUser)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Job Applications</p>
                    <p className="font-medium">
                      {getJobCount(selectedUser)} jobs
                    </p>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Job Preferences
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">
                      Preferred Industries
                    </p>
                    <p className="font-medium">
                      {getSafeIndustries(selectedUser)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Preferred Roles</p>
                    <p className="font-medium">{getSafeRoles(selectedUser)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Preferred Locations</p>
                    <p className="font-medium">
                      {getSafeLocations(selectedUser)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CV Uploaded</p>
                    <p className="font-medium">
                      {selectedUser.cv ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Job Account */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Job Application Account
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Job Email</p>
                    <p className="font-medium">
                      {selectedUser.jobEmail || "Not set"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Job Password</p>
                    <p className="font-medium">
                      {selectedUser.jobPassword ? "Set" : "Not set"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Account Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="font-medium">
                      {formatDate(selectedUser.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-medium">
                      {formatDate(selectedUser.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DesktopView = () => {
    // Calculate pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    return (
      <>
        <div className="hidden md:block overflow-x-auto bg-white rounded-lg shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  User
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
                  Plan
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Jobs
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Joined
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
              {currentUsers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div
                        className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                      >
                        {getUserInitials(user)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {getSafeUserName(user)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {user._id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {getSafeEmail(user)}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <FaPhone className="mr-1" size={10} />
                      {getSafePhone(user)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(
                          getSafePlanName(user)
                        )}`}
                      >
                        {getSafePlanName(user)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getPlanExpiry(user)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {getJobCount(user)} jobs
                    </div>
                    <div className="text-xs text-gray-500">
                      {getHasAssistant(user)} assistant
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatSimpleDate(getSafeCreatedAt(user))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <FaEye />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2 mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </>
    );
  };

  const MobileView = () => (
    <div className="md:hidden space-y-4">
      {filteredUsers.slice(0, itemsPerPage * currentPage).map((user) => (
        <div key={user._id} className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center">
                <div
                  className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  {getUserInitials(user)}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">
                    {getSafeUserName(user)}
                  </h3>
                  <p className="text-xs text-gray-500">{getSafeEmail(user)}</p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <FaPhone className="mr-1" size={10} />
                    {getSafePhone(user)}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Plan:</span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(
                      getSafePlanName(user)
                    )}`}
                  >
                    {getSafePlanName(user)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Jobs:</span>
                  <span className="text-xs">{getJobCount(user)} applied</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium">Joined:</span>
                  <span className="text-xs text-gray-500">
                    {formatSimpleDate(getSafeCreatedAt(user))}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <button
                onClick={() => setSelectedUser(user)}
                className="text-blue-600 hover:text-blue-900 p-2"
                title="View Details"
              >
                <FaEye />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Load More for Mobile */}
      {filteredUsers.length > itemsPerPage * currentPage && (
        <button
          onClick={() => setCurrentPage((prev) => prev + 1)}
          className="w-full py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          Load More
        </button>
      )}
    </div>
  );

  const calculateStats = () => {
    const total = users.length;
    const withPlan = users.filter((u) => u.plan?.name).length;
    const withJobs = users.filter((u) => u.jobs?.length > 0).length;
    const withAssistant = users.filter((u) => u.assistant).length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = users.filter((u) => new Date(u.createdAt) >= today).length;

    return {
      total,
      withPlan,
      withJobs,
      withAssistant,
      newToday,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster />
      <UserDetailModal />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage and view all registered users
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 mr-3">
                <FaUser className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 mr-3">
                <FaBriefcase className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Plans</p>
                <p className="text-2xl font-bold">{stats.withPlan}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-purple-100 mr-3">
                <FaFileAlt className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Job Applications</p>
                <p className="text-2xl font-bold">{stats.withJobs}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100 mr-3">
                <FaCalendar className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">New Today</p>
                <p className="text-2xl font-bold">{stats.newToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <FaSearch />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, phone, or preferences..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <FaUserTag />
                </div>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Plans</option>
                  <option value="active">Active Plans</option>
                  <option value="elite">Elite</option>
                  <option value="premium">Premium</option>
                  <option value="basic">Basic</option>
                  <option value="none">No Plan</option>
                </select>
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <FaCalendar />
                </div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last7">Last 7 Days</option>
                  <option value="last30">Last 30 Days</option>
                </select>
              </div>

              <button
                onClick={fetchUsers}
                className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaSync className="mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              User Directory{" "}
              {filteredUsers.length > 0 && `(${filteredUsers.length})`}
            </h2>
            <div className="text-sm text-gray-500">
              {stats.withAssistant} with assistants • {stats.withPlan} with
              plans
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">
                <FaUser />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || planFilter !== "all" || dateFilter !== "all"
                  ? "No matching users found"
                  : "No users found"}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || planFilter !== "all" || dateFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Users will appear here once they register"}
              </p>
              <button
                onClick={fetchUsers}
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

export default UsersPage;
