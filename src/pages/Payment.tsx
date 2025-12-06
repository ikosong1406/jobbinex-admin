import React, { useState, useEffect } from "react";
import {
  FaCreditCard,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaSync,
  FaPhone,
} from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import axios, { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import Api from "../components/Api";

const PAYMENTS_ENDPOINT = `${Api}/admin/getPayments`;
const VERIFY_PAYMENT_ENDPOINT = `${Api}/admin/verifyPayment`;
const PRIMARY_COLOR = "#4eaa3c";

interface Payment {
  _id: string;
  userId?: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userPhone?: string;
  planName?: string;
  planPrice?: number;
  planDuration?: string;
  amount?: number;
  currency?: string;
  status?: "pending" | "processing" | "completed" | "failed" | "canceled";
  paymentMethod?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt?: string;
  completedAt?: string;
  updatedAt?: string;
  // For verification
  verifiedBy?: {
    _id: string;
    firstname?: string;
    lastname?: string;
  };
  notes?: string;
}

interface ApiResponse {
  success: boolean;
  payments?: Payment[];
  message?: string;
  data?: Payment[];
}

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");

  // Helper functions with fallbacks
  const getSafeUserName = (payment: Payment) => {
    return `${payment.userFirstName || "Unknown"} ${
      payment.userLastName || "User"
    }`;
  };

  const getUserInitials = (payment: Payment) => {
    const first = payment.userFirstName?.charAt(0) || "U";
    const last = payment.userLastName?.charAt(0) || "U";
    return `${first}${last}`.toUpperCase();
  };

  const getSafeEmail = (payment: Payment) => {
    return payment.userEmail || "N/A";
  };

  const getSafePhone = (payment: Payment) => {
    return payment.userPhone || "N/A";
  };

  const getSafePlanName = (payment: Payment) => {
    return payment.planName || "Unknown Plan";
  };

  const getSafeAmount = (payment: Payment) => {
    return payment.amount || payment.planPrice || 0;
  };

  const getSafeCurrency = (payment: Payment) => {
    return payment.currency || "GBP";
  };

  const getSafeStatus = (
    payment: Payment
  ): "pending" | "processing" | "completed" | "failed" | "canceled" => {
    return payment.status || "pending";
  };

  const getSafeCreatedAt = (payment: Payment) => {
    return payment.createdAt || new Date().toISOString();
  };

  const getTransactionId = (payment: Payment) => {
    return (
      payment.stripeSessionId || payment.stripePaymentIntentId || payment._id
    );
  };

  // Extract payments from API response
  const extractPaymentsFromResponse = (response: ApiResponse): Payment[] => {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.payments)) {
      return response.payments;
    }
    if (Array.isArray(response?.data)) {
      return response.data;
    }
    console.warn("Unexpected API response structure:", response);
    return [];
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get<ApiResponse>(PAYMENTS_ENDPOINT);

      const paymentList = extractPaymentsFromResponse(data);
      setPayments(paymentList.reverse());
      setFilteredPayments(paymentList);

      if (paymentList.length === 0) {
        toast.error("No payments found");
      }
    } catch (error) {
      const err = error as AxiosError;
      console.error("Fetch payments error:", err.response?.data || err.message);
      toast.error("Failed to load payment data.");
      if (err.response?.status === 401) {
        navigate("/", { replace: true });
      }
      setPayments([]);
      setFilteredPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...payments];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter((payment) => {
        const userName = getSafeUserName(payment).toLowerCase();
        const userEmail = getSafeEmail(payment).toLowerCase();
        const userPhone = getSafePhone(payment).toLowerCase();
        const planName = getSafePlanName(payment).toLowerCase();
        const transactionId = getTransactionId(payment).toLowerCase();

        return (
          userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          userPhone.includes(searchLower) ||
          planName.includes(searchLower) ||
          transactionId.includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(
        (payment) => getSafeStatus(payment) === statusFilter
      );
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

      result = result.filter((payment) => {
        const paymentDate = new Date(getSafeCreatedAt(payment));

        switch (dateFilter) {
          case "today":
            return paymentDate >= today;
          case "yesterday":
            return paymentDate >= yesterday && paymentDate < today;
          case "last7":
            return paymentDate >= last7Days;
          case "last30":
            return paymentDate >= last30Days;
          default:
            return true;
        }
      });
    }

    setFilteredPayments(result);
  }, [payments, searchTerm, statusFilter, dateFilter]);

  const handleVerifyPayment = async (
    paymentId: string,
    status: "completed" | "failed"
  ) => {
    if (!verificationNotes.trim() && status === "failed") {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setVerifyingId(paymentId);

      const verifyData = {
        paymentId,
        status,
      };

      const { data } = await axios.post(VERIFY_PAYMENT_ENDPOINT, verifyData);

      if (data.success) {
        toast.success(
          `Payment ${
            status === "completed" ? "verified" : "rejected"
          } successfully`
        );
        fetchPayments();
        setSelectedPayment(null);
        setVerificationNotes("");
      } else {
        toast.error(data.message || "Verification failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to verify payment");
      console.error("Verify error:", error);
    } finally {
      setVerifyingId(null);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "canceled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString?: string) => {
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

  const formatCurrency = (amount?: number, currency?: string) => {
    const safeAmount = amount || 0;
    const safeCurrency = currency || "GBP";

    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: safeCurrency,
    }).format(safeAmount);
  };

  const PaymentDetailModal = () => {
    if (!selectedPayment) return null;

    const status = getSafeStatus(selectedPayment);
    const canVerify = status === "pending" || status === "processing";

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Payment Details
                </h3>
                <p className="text-sm text-gray-500">
                  ID: {selectedPayment._id}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <IoClose className="text-xl" />
              </button>
            </div>

            <div className="space-y-6">
              {/* User Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  User Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">
                      {getSafeUserName(selectedPayment)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">
                      {getSafeEmail(selectedPayment)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">
                      {getSafePhone(selectedPayment)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User ID</p>
                    <p className="font-medium text-xs">
                      {selectedPayment.userId || "N/A"}
                    </p>
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
                    <p className="text-sm text-gray-500">Plan Name</p>
                    <p className="font-medium">
                      {getSafePlanName(selectedPayment)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Plan Price</p>
                    <p className="font-medium">
                      {formatCurrency(
                        selectedPayment.planPrice,
                        selectedPayment.currency
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Plan Duration</p>
                    <p className="font-medium">
                      {selectedPayment.planDuration || "/Monthly"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount Paid</p>
                    <p className="font-medium text-lg font-bold">
                      {formatCurrency(
                        getSafeAmount(selectedPayment),
                        getSafeCurrency(selectedPayment)
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Payment Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                        status
                      )}`}
                    >
                      {getStatusText(status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Method</p>
                    <p className="font-medium">
                      {selectedPayment.paymentMethod || "Stripe"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stripe Session ID</p>
                    <p className="font-medium text-xs truncate">
                      {selectedPayment.stripeSessionId || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Intent ID</p>
                    <p className="font-medium text-xs truncate">
                      {selectedPayment.stripePaymentIntentId || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Timestamps
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Created At</p>
                    <p className="font-medium">
                      {formatDate(selectedPayment.createdAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Completed At</p>
                    <p className="font-medium">
                      {formatDate(selectedPayment.completedAt) || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-medium">
                      {formatDate(selectedPayment.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Actions */}
              {canVerify && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Verification
                  </h4>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() =>
                          handleVerifyPayment(selectedPayment._id, "completed")
                        }
                        disabled={verifyingId === selectedPayment._id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        <FaCheckCircle />
                        {verifyingId === selectedPayment._id
                          ? "Processing..."
                          : "Approve Payment"}
                      </button>
                      <button
                        onClick={() =>
                          handleVerifyPayment(selectedPayment._id, "failed")
                        }
                        disabled={
                          verifyingId === selectedPayment._id ||
                          !verificationNotes.trim()
                        }
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        <FaTimesCircle />
                        {verifyingId === selectedPayment._id
                          ? "Processing..."
                          : "Reject Payment"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DesktopView = () => (
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
              Plan
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Amount
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
              Date
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
          {filteredPayments.map((payment) => {
            const status = getSafeStatus(payment);
            const canVerify = status === "pending" || status === "processing";

            return (
              <tr key={payment._id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div
                      className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                      {getUserInitials(payment)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {getSafeUserName(payment)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getSafeEmail(payment)}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <FaPhone className="mr-1" size={10} />
                        {getSafePhone(payment)}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {getSafePlanName(payment)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {payment.planDuration || "/Monthly"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(
                      getSafeAmount(payment),
                      getSafeCurrency(payment)
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {payment.paymentMethod || "Stripe"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                      status
                    )}`}
                  >
                    {getStatusText(status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(getSafeCreatedAt(payment))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                      title="View Details"
                    >
                      <FaEye />
                      <span>View</span>
                    </button>
                    {canVerify && (
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setVerificationNotes("");
                        }}
                        className="text-green-600 hover:text-green-900 flex items-center gap-1 px-3 py-1 rounded hover:bg-green-50 transition-colors"
                        title="Verify Payment"
                      >
                        <FaCheckCircle />
                        <span>Verify</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const MobileView = () => (
    <div className="md:hidden space-y-4">
      {filteredPayments.map((payment) => {
        const status = getSafeStatus(payment);
        const canVerify = status === "pending" || status === "processing";

        return (
          <div key={payment._id} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center">
                  <div
                    className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  >
                    {getUserInitials(payment)}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {getSafeUserName(payment)}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {getSafeEmail(payment)}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <FaPhone className="mr-1" size={10} />
                      {getSafePhone(payment)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Plan:</span>
                    <span className="text-sm">{getSafePlanName(payment)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Amount:</span>
                    <span className="text-sm font-bold">
                      {formatCurrency(
                        getSafeAmount(payment),
                        getSafeCurrency(payment)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Date:</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(getSafeCreatedAt(payment))}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(
                    status
                  )}`}
                >
                  {getStatusText(status)}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedPayment(payment)}
                    className="text-blue-600 hover:text-blue-900 p-2"
                    title="View Details"
                  >
                    <FaEye />
                  </button>
                  {canVerify && (
                    <button
                      onClick={() => {
                        setSelectedPayment(payment);
                        setVerificationNotes("");
                      }}
                      className="text-green-600 hover:text-green-900 p-2"
                      title="Verify Payment"
                    >
                      <FaCheckCircle />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const calculateStats = () => {
    const total = payments.length;
    const pending = payments.filter(
      (p) => getSafeStatus(p) === "pending"
    ).length;
    const processing = payments.filter(
      (p) => getSafeStatus(p) === "processing"
    ).length;
    const completed = payments.filter(
      (p) => getSafeStatus(p) === "completed"
    ).length;
    const failed = payments.filter((p) => getSafeStatus(p) === "failed").length;
    const canceled = payments.filter(
      (p) => getSafeStatus(p) === "canceled"
    ).length;

    const totalAmount = payments
      .filter((p) => getSafeStatus(p) === "completed")
      .reduce((sum, p) => sum + getSafeAmount(p), 0);

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      canceled,
      totalAmount,
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster />
      <PaymentDetailModal />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Payment Management
          </h1>
          <p className="text-gray-600 mt-2">
            View and verify payment transactions
          </p>
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
                placeholder="Search by name, email, phone, or plan..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <FaFilter />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <FaCalendarAlt />
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
                onClick={fetchPayments}
                className="flex items-center justify-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaSync className="mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Payment History{" "}
              {filteredPayments.length > 0 && `(${filteredPayments.length})`}
            </h2>
            <div className="text-sm text-gray-500">
              {stats.completed} completed •{" "}
              {formatCurrency(stats.totalAmount, "GBP")} total
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">
                <FaCreditCard />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                  ? "No matching payments found"
                  : "No payments found"}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Payments will appear here once users make transactions"}
              </p>
              <button
                onClick={fetchPayments}
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

export default PaymentsPage;
