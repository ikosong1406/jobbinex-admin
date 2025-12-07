import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaCalendar,
  FaSearch,
  FaSync,
  FaEye,
  FaUserFriends,
  FaBriefcase,
  FaComments,
  FaCircle,
  FaUserCheck,
} from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import axios, { AxiosError } from "axios";
import { toast, Toaster } from "react-hot-toast";
import Api from "../components/Api";

const ASSISTANTS_ENDPOINT = `${Api}/admin/getAssistant`;
const PRIMARY_COLOR = "#4eaa3c";

interface Assistant {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  status: "online" | "offline" | "busy" | "away";
  clients: string[];
  jobs: string[];
  notifications: any[];
  messages: string[];
  resetCode?: string | null;
  resetCodeExpires?: string | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface ApiResponse {
  success: boolean;
  data?: Assistant[];
  message?: string;
}

const AssistantsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [filteredAssistants, setFilteredAssistants] = useState<Assistant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Helper functions with fallbacks
  const getSafeAssistantName = (assistant: Assistant) => {
    return `${assistant.firstname || "Unknown"} ${
      assistant.lastname || "Assistant"
    }`;
  };

  const getAssistantInitials = (assistant: Assistant) => {
    const first = assistant.firstname?.charAt(0) || "A";
    const last = assistant.lastname?.charAt(0) || "A";
    return `${first}${last}`.toUpperCase();
  };

  const getSafeEmail = (assistant: Assistant) => {
    return assistant.email || "N/A";
  };

  const getSafeStatus = (assistant: Assistant) => {
    return assistant.status || "offline";
  };

  const getClientCount = (assistant: Assistant) => {
    return assistant.clients?.length || 0;
  };

  const getJobCount = (assistant: Assistant) => {
    return assistant.jobs?.length || 0;
  };

  const getMessageCount = (assistant: Assistant) => {
    return assistant.messages?.length || 0;
  };

  const getSafeCreatedAt = (assistant: Assistant) => {
    return assistant.createdAt || new Date().toISOString();
  };

  // Extract assistants from API response
  const extractAssistantsFromResponse = (
    response: ApiResponse
  ): Assistant[] => {
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    console.warn("Unexpected API response structure:", response);
    return [];
  };

  const fetchAssistants = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get<ApiResponse>(ASSISTANTS_ENDPOINT);

      const assistantList = extractAssistantsFromResponse(data);
      setAssistants(assistantList.reverse()); // Show newest first
      setFilteredAssistants(assistantList);

      if (assistantList.length === 0) {
        toast.error("No assistants found");
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error(
        "Fetch assistants error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        toast.error("Access denied. Please check permissions.");
      } else if (err.response?.status === 403) {
        toast.error("Forbidden access to assistants data.");
      } else if (err.response?.status === 404) {
        toast.error("Assistants endpoint not found.");
      } else if (err.response?.status === 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error("Failed to load assistants data.");
      }

      setAssistants([]);
      setFilteredAssistants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssistants();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...assistants];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((assistant) => {
        const assistantName = getSafeAssistantName(assistant).toLowerCase();
        const assistantEmail = getSafeEmail(assistant).toLowerCase();

        return (
          assistantName.includes(searchLower) ||
          assistantEmail.includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter((assistant) => {
        const status = getSafeStatus(assistant).toLowerCase();
        return status === statusFilter.toLowerCase();
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

      result = result.filter((assistant) => {
        const assistantDate = new Date(getSafeCreatedAt(assistant));

        switch (dateFilter) {
          case "today":
            return assistantDate >= today;
          case "yesterday":
            return assistantDate >= yesterday && assistantDate < today;
          case "last7":
            return assistantDate >= last7Days;
          case "last30":
            return assistantDate >= last30Days;
          default:
            return true;
        }
      });
    }

    setFilteredAssistants(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [assistants, searchTerm, statusFilter, dateFilter]);

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
        return "bg-green-100 text-green-800";
      case "offline":
        return "bg-gray-100 text-gray-800";
      case "busy":
        return "bg-red-100 text-red-800";
      case "away":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "online":
        return <FaCircle className="text-green-500 mr-1" size={10} />;
      case "offline":
        return <FaCircle className="text-gray-400 mr-1" size={10} />;
      case "busy":
        return <FaCircle className="text-red-500 mr-1" size={10} />;
      case "away":
        return <FaCircle className="text-yellow-500 mr-1" size={10} />;
      default:
        return <FaCircle className="text-gray-400 mr-1" size={10} />;
    }
  };

  const getStatusText = (status: string) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
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

  const AssistantDetailModal = () => {
    if (!selectedAssistant) return null;

    const status = getSafeStatus(selectedAssistant);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Assistant Details
                </h3>
                <p className="text-sm text-gray-500">
                  ID: {selectedAssistant._id}
                </p>
              </div>
              <button
                onClick={() => setSelectedAssistant(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <IoClose className="text-xl" />
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
                      {getSafeAssistantName(selectedAssistant)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">
                      {getSafeEmail(selectedAssistant)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="flex items-center">
                      {getStatusIcon(status)}
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                          status
                        )}`}
                      >
                        {getStatusText(status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Assistant ID</p>
                    <p className="font-medium text-xs">
                      {selectedAssistant._id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Activity Statistics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="text-center p-3 bg-white rounded shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <FaUserFriends className="text-blue-500 text-xl" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {getClientCount(selectedAssistant)}
                    </p>
                    <p className="text-sm text-gray-500">Clients</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <FaBriefcase className="text-green-500 text-xl" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {getJobCount(selectedAssistant)}
                    </p>
                    <p className="text-sm text-gray-500">Jobs</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded shadow-sm">
                    <div className="flex items-center justify-center mb-2">
                      <FaComments className="text-purple-500 text-xl" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {getMessageCount(selectedAssistant)}
                    </p>
                    <p className="text-sm text-gray-500">Messages</p>
                  </div>
                </div>
              </div>

              {/* Clients List */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Assigned Clients
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {getClientCount(selectedAssistant) > 0 ? (
                    <div className="space-y-2">
                      {selectedAssistant.clients.map((clientId, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded"
                        >
                          <div className="flex items-center">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-2"
                              style={{ backgroundColor: PRIMARY_COLOR }}
                            >
                              <FaUser size={12} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Client #{index + 1}
                              </p>
                              <p className="text-xs text-gray-500 truncate max-w-xs">
                                {clientId}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            ID: {clientId.substring(0, 8)}...
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No clients assigned
                    </p>
                  )}
                </div>
              </div>

              {/* Jobs List */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Assigned Jobs
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {getJobCount(selectedAssistant) > 0 ? (
                    <div className="space-y-2">
                      {selectedAssistant.jobs.map((jobId, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white rounded"
                        >
                          <div className="flex items-center">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-2"
                              style={{ backgroundColor: PRIMARY_COLOR }}
                            >
                              <FaBriefcase size={12} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Job #{index + 1}
                              </p>
                              <p className="text-xs text-gray-500 truncate max-w-xs">
                                {jobId}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                            ID: {jobId.substring(0, 8)}...
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No jobs assigned
                    </p>
                  )}
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
                      {formatDate(selectedAssistant.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-medium">
                      {formatDate(selectedAssistant.updatedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Notifications</p>
                    <p className="font-medium">
                      {selectedAssistant.notifications?.length || 0} pending
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
    const currentAssistants = filteredAssistants.slice(
      indexOfFirstItem,
      indexOfLastItem
    );
    const totalPages = Math.ceil(filteredAssistants.length / itemsPerPage);

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
                  Assistant
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
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Stats
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
              {currentAssistants.map((assistant) => {
                const status = getSafeStatus(assistant);
                return (
                  <tr key={assistant._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div
                          className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: PRIMARY_COLOR }}
                        >
                          {getAssistantInitials(assistant)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getSafeAssistantName(assistant)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {assistant._id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {getSafeEmail(assistant)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {getStatusIcon(status)}
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                            status
                          )}`}
                        >
                          {getStatusText(status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-3">
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900">
                            {getClientCount(assistant)}
                          </div>
                          <div className="text-xs text-gray-500">Clients</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900">
                            {getJobCount(assistant)}
                          </div>
                          <div className="text-xs text-gray-500">Jobs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-gray-900">
                            {getMessageCount(assistant)}
                          </div>
                          <div className="text-xs text-gray-500">Msgs</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatSimpleDate(getSafeCreatedAt(assistant))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedAssistant(assistant)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <FaEye />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
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
      {filteredAssistants
        .slice(0, itemsPerPage * currentPage)
        .map((assistant) => {
          const status = getSafeStatus(assistant);
          return (
            <div
              key={assistant._id}
              className="bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center">
                    <div
                      className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                      {getAssistantInitials(assistant)}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900">
                        {getSafeAssistantName(assistant)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {getSafeEmail(assistant)}
                      </p>
                      <div className="flex items-center mt-1">
                        {getStatusIcon(status)}
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                            status
                          )}`}
                        >
                          {getStatusText(status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Clients:</span>
                      <span className="text-xs">
                        {getClientCount(assistant)} assigned
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Jobs:</span>
                      <span className="text-xs">
                        {getJobCount(assistant)} assigned
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">Joined:</span>
                      <span className="text-xs text-gray-500">
                        {formatSimpleDate(getSafeCreatedAt(assistant))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <button
                    onClick={() => setSelectedAssistant(assistant)}
                    className="text-blue-600 hover:text-blue-900 p-2"
                    title="View Details"
                  >
                    <FaEye />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

      {/* Load More for Mobile */}
      {filteredAssistants.length > itemsPerPage * currentPage && (
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
    const total = assistants.length;
    const online = assistants.filter(
      (a) => getSafeStatus(a) === "online"
    ).length;
    const offline = assistants.filter(
      (a) => getSafeStatus(a) === "offline"
    ).length;
    const busy = assistants.filter((a) => getSafeStatus(a) === "busy").length;
    const away = assistants.filter((a) => getSafeStatus(a) === "away").length;
    const totalClients = assistants.reduce(
      (sum, a) => sum + getClientCount(a),
      0
    );
    const totalJobs = assistants.reduce((sum, a) => sum + getJobCount(a), 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = assistants.filter(
      (a) => new Date(a.createdAt) >= today
    ).length;

    return {
      total,
      online,
      offline,
      busy,
      away,
      totalClients,
      totalJobs,
      newToday,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading assistants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster />
      <AssistantDetailModal />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Assistants Management
          </h1>
          <p className="text-gray-600 mt-2">Manage and view all assistants</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100 mr-3">
                <FaUser className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Assistants</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100 mr-3">
                <FaUserCheck className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Online Now</p>
                <p className="text-2xl font-bold">{stats.online}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-purple-100 mr-3">
                <FaUserFriends className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Clients</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
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
                placeholder="Search by name or email..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <FaUser />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="busy">Busy</option>
                  <option value="away">Away</option>
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
                onClick={fetchAssistants}
                className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaSync className="mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Assistants List */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Assistants Directory{" "}
              {filteredAssistants.length > 0 &&
                `(${filteredAssistants.length})`}
            </h2>
            <div className="text-sm text-gray-500">
              {stats.totalClients} total clients • {stats.totalJobs} total jobs
            </div>
          </div>

          {filteredAssistants.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">
                <FaUserFriends />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                  ? "No matching assistants found"
                  : "No assistants found"}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Assistants will appear here once they register"}
              </p>
              <button
                onClick={fetchAssistants}
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

export default AssistantsPage;
