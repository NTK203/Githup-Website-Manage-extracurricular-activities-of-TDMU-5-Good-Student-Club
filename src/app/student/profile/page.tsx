"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import StudentNav from "@/components/student/StudentNav";
import Footer from "@/components/common/Footer";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import Image from "next/image";
import { Lock, Eye, EyeOff, Key, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { validatePassword, getPasswordRequirements } from "@/lib/passwordValidation";

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  faculty: string;
  class: string;
}

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<ProfileForm>({
    name: "",
    email: "",
    phone: "",
    avatarUrl: "",
    faculty: "",
    class: "",
  });

  const [membershipData, setMembershipData] = useState<
    | {
        status: string;
        createdAt: string;
        joinedAt?: string;
        approvedAt?: string;
        approvedBy?: {
          _id: string;
          name: string;
          studentId: string;
        };
        removedAt?: string;
        removedBy?: {
          _id: string;
          name: string;
          studentId: string;
        };
        restoredAt?: string;
        restoredBy?: {
          _id: string;
          name: string;
          studentId: string;
        };
        restorationReason?: string;
        removalReason?: string;
        removalReasonTrue?: string;
        removalHistory?: Array<{
          removedAt: string;
          removedBy: {
            _id: string;
            name: string;
            studentId: string;
          };
          removalReason: string;
          restoredAt?: string;
          restoredBy?: string;
          restorationReason?: string;
        }>;
      }
    | null
  >(null);

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") setIsDarkMode(true);

    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem("theme");
      setIsDarkMode(currentTheme === "dark");
    };

    window.addEventListener("themeChange", handleThemeChange);
    return () => window.removeEventListener("themeChange", handleThemeChange);
  }, []);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
        faculty: user.faculty || "",
        class: user.class || "",
      });
    }
  }, [user]);

  // Refresh user + membership on mount
  useEffect(() => {
    refreshUserData();
    loadMembershipData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        updateUser(formData);
        const updatedUser = { ...user, ...formData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
        setIsEditing(false);
      } else {
        setMessage({ type: "error", text: data.error || "Cập nhật thất bại" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Lỗi kết nối. Vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  };

  // Check if user has password
  useEffect(() => {
    const checkPassword = async () => {
      try {
        // Try to call change-password API with empty currentPassword to check if user has password
        // This is a workaround since we don't have a direct API to check passwordHash
        const response = await fetch("/api/users/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ currentPassword: "", newPassword: "test" }),
        });
        const data = await response.json();
        // If error says "Vui lòng nhập mật khẩu hiện tại", user has password
        // If error says something else or success, user might not have password
        setHasPassword(data.error?.includes("mật khẩu hiện tại") || false);
      } catch (error) {
        // Default to false if check fails
        setHasPassword(false);
      }
    };
    checkPassword();
  }, [user]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (passwordMessage) setPasswordMessage(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    // Validate
    const passwordValidation = validatePassword(passwordForm.newPassword);
    if (!passwordValidation.valid) {
      setPasswordMessage({ type: "error", text: passwordValidation.error || "Mật khẩu không hợp lệ" });
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Mật khẩu xác nhận không khớp" });
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword || undefined,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPasswordMessage({ type: "success", text: hasPassword ? "Đổi mật khẩu thành công!" : "Thêm mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng email/mật khẩu." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setHasPassword(true);
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordMessage(null);
        }, 2000);
      } else {
        setPasswordMessage({ type: "error", text: data.error || "Thất bại" });
      }
    } catch (error) {
      setPasswordMessage({ type: "error", text: "Lỗi kết nối. Vui lòng thử lại." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setMessage(null);

    try {
      const fd = new FormData();
      fd.append("avatar", file);

      const response = await fetch("/api/upload/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: fd,
      });

      const data = await response.json();
      if (data.success) {
        setFormData((prev) => ({ ...prev, avatarUrl: data.url }));
        updateUser({ ...formData, avatarUrl: data.url });
        window.dispatchEvent(new CustomEvent("avatarUploaded", { detail: { avatarUrl: data.url } }));
        setMessage({ type: "success", text: "Tải ảnh đại diện thành công!" });

        setTimeout(async () => {
          try {
            const checkResponse = await fetch("/api/users/check", {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              if (checkData.user?.avatarUrl !== data.url) {
                console.warn("Avatar URL not persisted yet");
              }
            }
          } catch (err) {
            console.error("Error checking database:", err);
          }
        }, 1000);
      } else {
        setMessage({ type: "error", text: data.error || "Tải ảnh thất bại" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Lỗi tải ảnh. Vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  };

  // Danh sách khoa/viện
  const facultyOptions = [
    "Trường Kinh Tế Tài Chính",
    "Trường Luật Và Quản Lí Phát Triển",
    "Viện Kỹ Thuật Công Nghệ",
    "Viện Đào Tạo Ngoại Ngữ",
    "Viện Đào Tạo CNTT Chuyển Đổi Số",
    "Viện Đào Tạo Kiến Trúc Xây Dựng Và Giao Thông",
    "Khoa Sư Phạm",
    "Khoa Kiến Thức Chung",
    "Khoa Công Nghiệp Văn Hóa Thể Thao Và Du Lịch",
    "Ban Quản Lý Đào Tạo Sau Đại Học",
    "Khác",
  ];

  const refreshUserData = async () => {
    try {
      const response = await fetch("/api/users/check", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("user", JSON.stringify(data.user));
        updateUser(data.user);
        setFormData({
          name: data.user.name || "",
          email: data.user.email || "",
          phone: data.user.phone || "",
          avatarUrl: data.user.avatarUrl || "",
          faculty: data.user.faculty || "",
          class: data.user.class || "",
        });
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  const loadMembershipData = async () => {
    try {
      const response = await fetch("/api/memberships/my-status", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.membership) setMembershipData(data.data.membership);
      }
    } catch (error) {
      console.error("Error loading membership data:", error);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getTime() === 0) return "Không có thông tin";
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Không có thông tin";
    }
  };

  const formatDateShort = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime()) || date.getTime() === 0) return "Không có thông tin";
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day}/${month}/${year}\n${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Không có thông tin";
    }
  };

  const getMembershipDays = () => {
    if (!membershipData?.createdAt) return { days: 0, status: "Chưa tham gia" };
    
    let startDate: Date;
    let endDate: Date;
    let status: string;
    
    // Xác định ngày bắt đầu
    if (membershipData.approvedAt) {
      // Nếu đã được duyệt, tính từ ngày duyệt
      startDate = new Date(membershipData.approvedAt);
      status = "Ngày tham gia";
    } else if (membershipData.status === "PENDING") {
      // Nếu đang chờ duyệt, tính từ ngày đăng ký
      startDate = new Date(membershipData.createdAt);
      status = "Ngày chờ duyệt";
    } else {
      // Trường hợp khác, tính từ ngày đăng ký
      startDate = new Date(membershipData.createdAt);
      status = "Ngày tham gia";
    }
    
    // Xác định ngày kết thúc
    if (membershipData.status === "REMOVED") {
      // Nếu đã bị xóa, tìm thời điểm bị xóa mới nhất
      let latestRemovalDate: Date | null = null;
      
      // Kiểm tra removedAt hiện tại
      if (membershipData.removedAt) {
        latestRemovalDate = new Date(membershipData.removedAt);
      }
      
      // Kiểm tra trong removalHistory để tìm thời điểm xóa mới nhất
      if (membershipData.removalHistory && membershipData.removalHistory.length > 0) {
        const removalDates = membershipData.removalHistory
          .map(history => new Date(history.removedAt))
          .filter(date => !isNaN(date.getTime()));
        
        if (removalDates.length > 0) {
          const maxRemovalDate = new Date(Math.max(...removalDates.map(d => d.getTime())));
          if (!latestRemovalDate || maxRemovalDate > latestRemovalDate) {
            latestRemovalDate = maxRemovalDate;
          }
        }
      }
      
      if (latestRemovalDate) {
        endDate = latestRemovalDate;
        status = "Ngày đã tham gia";
      } else {
        endDate = new Date(); // Fallback về hiện tại
        status = "Ngày đã tham gia";
      }
    } else {
      // Nếu chưa bị xóa, tính đến hiện tại
      endDate = new Date();
    }
    
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    return { days, status, startDate, endDate };
  };

  const getTimelineEvents = () => {
    if (!membershipData) return [] as Array<{
      type: string;
      date: string;
      title: string;
      description: string;
      badge: string;
      badgeColor: string;
      additionalInfo?: string;
    }>;

    const timelineEvents: Array<{
      type: string;
      date: string;
      title: string;
      description: string;
      badge: string;
      badgeColor: string;
      additionalInfo?: string;
    }> = [];

    const isPending = membershipData.status === "PENDING";
    timelineEvents.push({
      type: "registered",
      date: membershipData.createdAt,
      title: isPending ? "Thời gian gửi đơn đăng ký chờ xét duyệt" : "Ngày đăng ký CLB",
      description: formatDate(membershipData.createdAt),
      badge: isPending ? "Chờ duyệt" : "Đăng ký",
      badgeColor: isPending ? "yellow" : "gray",
      additionalInfo: isPending ? "Đơn đăng ký đang chờ ban quản lý CLB xét duyệt" : "Bắt đầu quá trình tham gia CLB Sinh viên 5 Tốt TDMU",
    });

    if (membershipData.approvedAt) {
      timelineEvents.push({
        type: "approved",
        date: membershipData.approvedAt,
        title: "Ngày được duyệt đăng ký đầu tiên",
        description: formatDate(membershipData.approvedAt),
        badge: "Được duyệt lần đầu",
        badgeColor: "blue",
        additionalInfo: membershipData.approvedBy ? `Duyệt bởi: ${membershipData.approvedBy.name} (${membershipData.approvedBy.studentId})` : "Được ban quản lý CLB phê duyệt",
      });
    }

    const hasRemovalHistory = membershipData.removalHistory && membershipData.removalHistory.length > 0;
    if (hasRemovalHistory) {
      // Loại bỏ các entries trùng lặp dựa trên removedAt (trong vòng 1 giây)
      // Ưu tiên giữ lại entry có thông tin duyệt lại
      const uniqueHistory = membershipData.removalHistory!.reduce<Array<{
        removedAt: string;
        removedBy: {
          _id: string;
          name: string;
          studentId: string;
        };
        removalReason: string;
        restoredAt?: string;
        restoredBy?: string;
        restorationReason?: string;
      }>>((acc, history) => {
        const existingIndex = acc.findIndex(h => 
          Math.abs(new Date(h.removedAt).getTime() - new Date(history.removedAt).getTime()) < 1000
        );
        
        if (existingIndex === -1) {
          // Không tìm thấy entry trùng lặp, thêm vào
          acc.push(history);
        } else {
          // Tìm thấy entry trùng lặp, kiểm tra xem có thông tin duyệt lại không
          const existing = acc[existingIndex];
          const hasRestorationInfo = history.restoredAt && history.restorationReason;
          const existingHasRestorationInfo = existing.restoredAt && existing.restorationReason;
          
          // Nếu entry mới có thông tin duyệt lại mà entry cũ không có, thay thế
          if (hasRestorationInfo && !existingHasRestorationInfo) {
            acc[existingIndex] = history;
          }
          // Nếu cả hai đều có hoặc đều không có thông tin duyệt lại, giữ lại entry đầu tiên
        }
        return acc;
      }, []);

      uniqueHistory.forEach((history, index) => {
        const removalNumber = index + 1;
        timelineEvents.push({
          type: "removed",
          date: history.removedAt,
          title: `Thời gian xóa lần thứ ${removalNumber}`,
          description: formatDate(history.removedAt),
          badge: `Bị xóa lần ${removalNumber}`,
          badgeColor: "red",
          additionalInfo: `Lý do: ${history.removalReason} | Xóa bởi: ${history.removedBy.name}`,
        });
        if (history.restoredAt && history.restorationReason) {
          timelineEvents.push({
            type: "restored",
            date: history.restoredAt,
            title: `Thời gian duyệt lại sau lần xóa thứ ${removalNumber}`,
            description: formatDate(history.restoredAt),
            badge: `Được duyệt lại lần ${removalNumber}`,
            badgeColor: "purple",
            additionalInfo: `Lý do: ${history.restorationReason} | Duyệt lại bởi: Admin Hệ thống`,
          });
        }
      });
    } else {
      const hasRemovalInfo = membershipData.removedAt && membershipData.removalReason;
      const hasRestorationInfo = membershipData.restoredAt && membershipData.restorationReason;

      if (hasRemovalInfo && membershipData.removedAt && membershipData.removalReason) {
        const removedDate = new Date(membershipData.removedAt);
        const isValidRemovedDate = !isNaN(removedDate.getTime()) && removedDate.getTime() > 0;
        if (isValidRemovedDate) {
          timelineEvents.push({
            type: "removed",
            date: membershipData.removedAt,
            title: "Thời gian xóa lần đầu",
            description: formatDate(membershipData.removedAt),
            badge: "Bị xóa lần đầu",
            badgeColor: "red",
            additionalInfo: `Lý do: ${membershipData.removalReasonTrue || membershipData.removalReason}${
              membershipData.removedBy ? ` | Xóa bởi: ${membershipData.removedBy.name}` : ""
            }`,
          });
        }
      }

      if (hasRestorationInfo && membershipData.restoredAt && membershipData.restorationReason) {
        const restorationDate = new Date(membershipData.restoredAt);
        const isValidRestorationDate = !isNaN(restorationDate.getTime()) && restorationDate.getTime() > 0;
        if (isValidRestorationDate) {
          timelineEvents.push({
            type: "restored",
            date: membershipData.restoredAt,
            title: "Thời gian duyệt lại sau lần xóa đầu tiên",
            description: formatDate(membershipData.restoredAt),
            badge: "Được duyệt lại lần đầu",
            badgeColor: "purple",
            additionalInfo: `Lý do: ${membershipData.restorationReason}${
              membershipData.restoredBy ? ` | Duyệt lại bởi: ${membershipData.restoredBy.name}` : ""
            }`,
          });
        }
      }
    }

    timelineEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return timelineEvents;
  };

  return (
    <ProtectedRoute requiredRole="STUDENT">
      <div className={`min-h-screen flex flex-col ${isDarkMode ? "bg-[#0b1220]" : "bg-slate-50"}`}>
        <StudentNav key="student-nav" />

        {/* Gradient Page Header */}
        <div className="relative isolate">
          <div
            className={`pointer-events-none absolute inset-0 -z-10 opacity-60 blur-3xl ${
              isDarkMode
                ? "bg-gradient-to-tr from-green-500/20 via-blue-500/20 to-fuchsia-500/20"
                : "bg-gradient-to-tr from-green-300/30 via-blue-300/30 to-fuchsia-300/30"
            }`}
          />
          <header className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" >
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDarkMode ? "text-white" : "text-black"}`}>
                  👤 Hồ sơ cá nhân
                </h1>
                <p className={`${isDarkMode ? "text-slate-300" : "text-black"}`}>
                  Quản lý thông tin cá nhân và cài đặt tài khoản
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshUserData}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all ${
                    isDarkMode
                      ? "bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700"
                      : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Làm mới dữ liệu
                </button>
                <button
                  onClick={() => setIsEditing((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 shadow-md"
                >
                  {isEditing ? "Hủy" : "Chỉnh sửa"}
                </button>
              </div>
            </div>
          </header>
        </div>

        {/* Global Message */}
        {message && (
          <div className="max-w-4xl mx-auto w-full px-4 lg:px-0">
            <div
              className={`mb-4 rounded-xl border p-3 sm:p-4 text-sm ${
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === "success" ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{message.text}</span>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* LEFT: Profile Card + Stats */}
              <section className="lg:col-span-1 space-y-6">
                <div className={`${
                    isDarkMode
                      ? "bg-slate-900/60 border border-slate-800"
                      : "bg-white/80 border border-slate-200"
                  } backdrop-blur rounded-2xl shadow-xl overflow-hidden`}
                >
                  {/* Cover */}
                  <div className="relative h-28 bg-gradient-to-r from-emerald-500 via-sky-500 to-fuchsia-500" />

                  {/* Avatar */}
                  <div className="px-6 -mt-12">
                    <div className="relative w-24 h-24 mx-auto">
                      {formData.avatarUrl ? (
                        <Image
                          src={formData.avatarUrl}
                          alt="Avatar"
                          width={96}
                          height={96}
                          className="rounded-full border-4 border-white shadow-xl object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-600 to-sky-600 flex items-center justify-center border-4 border-white shadow-xl">
                          <span className="text-white text-2xl font-bold">{getInitials(formData.name)}</span>
                        </div>
                      )}

                      <label className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-2 rounded-full cursor-pointer hover:bg-emerald-700 shadow-lg">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={loading} />
                      </label>
                    </div>

                    <div className="text-center mt-4">
                      <h2 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>{formData.name}</h2>
                      <p className={`${isDarkMode ? "text-slate-300" : "text-black"} break-all text-sm`}>{formData.email}</p>
                      <p className={`${isDarkMode ? "text-slate-300" : "text-black"} text-sm`}>{formData.phone || "Chưa cập nhật số điện thoại"}</p>

                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                        <span>👨‍🎓</span>
                        THÀNH VIÊN CLB
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className={`${isDarkMode ? "bg-slate-800" : "bg-slate-50"} rounded-xl p-4 text-center border ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                        <div className={`${isDarkMode ? "text-emerald-400" : "text-emerald-600"} text-2xl font-bold`}>5</div>
                        <div className={`${isDarkMode ? "text-slate-400" : "text-black"} text-xs`}>Hoạt động tham gia</div>
                      </div>
                      <div className={`${isDarkMode ? "bg-slate-800" : "bg-slate-50"} rounded-xl p-4 text-center border ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                        <div className={`${isDarkMode ? "text-sky-400" : "text-sky-600"} text-2xl font-bold`}>
                          {getMembershipDays().days}
                        </div>
                        <div className={`${isDarkMode ? "text-slate-400" : "text-black"} text-xs`}>
                          {getMembershipDays().status}
                        </div>
                      </div>
                    </div>

                    {/* Membership Timeline Info */}
                    {membershipData?.createdAt && (
                      <div className={`mt-4 rounded-xl p-4 border ${isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
                        <div className="text-center mb-3">
                          <div className={`text-xs uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-black"}`}>
                            📅 Thời gian tham gia
                          </div>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center">
                            <span className={`${isDarkMode ? "text-slate-400" : "text-black"}`}>Ngày bắt đầu:</span>
                            <span className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                              {(() => {
                                const membershipDays = getMembershipDays();
                                return membershipDays.startDate ? formatDate(membershipDays.startDate.toISOString()) : "Không có thông tin";
                              })()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`${isDarkMode ? "text-slate-400" : "text-black"}`}>
                              {membershipData.status === "REMOVED" ? "Đến khi bị xóa:" : "Đến hiện tại:"}
                            </span>
                            <span className={`font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                              {(() => {
                                const membershipDays = getMembershipDays();
                                return membershipDays.endDate ? formatDate(membershipDays.endDate.toISOString()) : "Không có thông tin";
                              })()}
                            </span>
                          </div>
                          <div className="border-t border-slate-300 dark:border-slate-600 pt-2 mt-2">
                            <div className="flex justify-between items-center">
                              <span className={`${isDarkMode ? "text-slate-400" : "text-black"}`}>Tổng thời gian:</span>
                              <span className={`font-semibold ${isDarkMode ? "text-sky-400" : "text-sky-600"}`}>
                                {getMembershipDays().days} ngày
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Student ID */}
                    <div className={`mt-4 rounded-xl p-4 border ${isDarkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"} text-center`}>
                      <div className={`text-xs uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-black"}`}>Mã số sinh viên</div>
                      <div className={`mt-1 font-mono text-sm ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>{user?.studentId || "—"}</div>
                    </div>

                    <div className="h-4" />
                  </div>
                </div>

                {/* Register Prompt */}
                {!membershipData && (
                  <div className={`${isDarkMode ? "bg-gradient-to-r from-sky-900/30 to-fuchsia-900/30 border-sky-800" : "bg-gradient-to-r from-sky-50 to-fuchsia-50 border-sky-200"} border rounded-2xl shadow-lg p-6 text-center`}>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-sky-500 to-fuchsia-600 flex items-center justify-center text-white text-2xl">＋</div>
                    <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>Chưa tham gia CLB</h3>
                    <p className={`${isDarkMode ? "text-slate-300" : "text-black"} text-sm mt-1`}>
                      Bạn chưa đăng ký tham gia CLB Sinh viên 5 Tốt TDMU. Hãy đăng ký ngay để trở thành thành viên!
                    </p>
                    <a
                      href="/student/register"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-fuchsia-600 hover:from-sky-700 hover:to-fuchsia-700 shadow-md"
                    >
                      🚀 Đăng ký tham gia CLB
                    </a>
                  </div>
                )}
              </section>

              {/* RIGHT: Form + Timeline */}
              <section className="lg:col-span-2 space-y-6">
                {/* Profile Form */}
                <div className={`${
                    isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white/80 border-slate-200"
                  } backdrop-blur rounded-2xl border shadow-xl overflow-hidden`}
                >
                  <div className={`${isDarkMode ? "bg-slate-900/70 border-b border-slate-800" : "bg-slate-50 border-b border-slate-200"} px-6 py-4 flex items-center justify-between`}>
                    <div>
                      <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>✏️ Thông tin cá nhân</h3>
                      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-black"}`}>Cập nhật thông tin để ban quản trị liên hệ khi cần</p>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${isEditing ? (isDarkMode ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-amber-100 text-amber-700 border border-amber-200") : (isDarkMode ? "bg-slate-800 text-slate-300 border border-slate-700" : "bg-white text-slate-600 border border-slate-200")}`}>
                      {isEditing ? "Đang chỉnh sửa" : "Chế độ xem"}
                    </span>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className={`text-sm ${isDarkMode ? "text-slate-300" : "text-black"}`}>Họ và tên</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          disabled={!isEditing || loading}
                          className={`w-full rounded-xl px-4 py-3 outline-none transition border ${
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-white disabled:bg-slate-900 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                              : "bg-white border-slate-300 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                          }`}
                          required
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className={`text-sm ${isDarkMode ? "text-slate-300" : "text-black"}`}>Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={!isEditing || loading}
                          className={`w-full rounded-xl px-4 py-3 outline-none transition border ${
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-white disabled:bg-slate-900 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                              : "bg-white border-slate-300 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                          }`}
                          required
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className={`text-sm ${isDarkMode ? "text-slate-300" : "text-black"}`}>Số điện thoại</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          disabled={!isEditing || loading}
                          placeholder="0934567890"
                          className={`w-full rounded-xl px-4 py-3 outline-none transition border ${
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-white disabled:bg-slate-900 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                              : "bg-white border-slate-300 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                          }`}
                        />
                      </div>

                      {/* Class */}
                      <div className="space-y-1.5">
                        <label className={`text-sm ${isDarkMode ? "text-slate-300" : "text-black"}`}>Lớp</label>
                        <input
                          type="text"
                          name="class"
                          value={formData.class}
                          onChange={handleInputChange}
                          disabled={!isEditing || loading}
                          placeholder="VD: CNTT-K45"
                          className={`w-full rounded-xl px-4 py-3 outline-none transition border ${
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-white disabled:bg-slate-900 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                              : "bg-white border-slate-300 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                          }`}
                        />
                      </div>

                      {/* Faculty */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className={`text-sm ${isDarkMode ? "text-slate-300" : "text-black"}`}>Khoa/Viện</label>
                        <select
                          name="faculty"
                          value={formData.faculty}
                          onChange={handleInputChange}
                          disabled={!isEditing || loading}
                          className={`w-full rounded-xl px-4 py-3 outline-none transition border ${
                            isDarkMode
                              ? "bg-slate-800 border-slate-700 text-white disabled:bg-slate-900 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                              : "bg-white border-slate-300 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500 focus:ring-2 focus:ring-emerald-500/40"
                          }`}
                        >
                          <option value="">Chọn khoa/viện</option>
                          {facultyOptions.map((faculty) => (
                            <option key={faculty} value={faculty}>
                              {faculty}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Actions */}
                    {isEditing && (
                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          disabled={loading}
                          className={`${
                            isDarkMode
                              ? "border border-slate-700 text-slate-200 hover:bg-slate-800"
                              : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                          } rounded-lg px-4 py-2 text-sm font-medium`}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-700 hover:to-sky-700 shadow disabled:opacity-60"
                        >
                          {loading ? (
                            <span className="inline-flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Đang cập nhật...
                            </span>
                          ) : (
                            "Lưu thay đổi"
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* Password Change Form */}
                <div className={`${
                    isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white/80 border-slate-200"
                  } backdrop-blur rounded-2xl border shadow-xl overflow-hidden`}
                >
                  <div className={`${isDarkMode ? "bg-slate-900/70 border-b border-slate-800" : "bg-slate-50 border-b border-slate-200"} px-6 py-4 flex items-center justify-between`}>
                    <div>
                      <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>🔐 Mật khẩu</h3>
                      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-black"}`}>
                        {hasPassword === false ? "Thêm mật khẩu để có thể đăng nhập bằng email/mật khẩu" : "Cập nhật mật khẩu để bảo mật tài khoản"}
                      </p>
                    </div>
                    {!showChangePassword && (
                      <button
                        onClick={() => setShowChangePassword(true)}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        <Key className="h-4 w-4" />
                        {hasPassword === false ? "Thêm mật khẩu" : "Thay đổi"}
                      </button>
                    )}
                  </div>
                  <div className="p-6">
                    {!showChangePassword ? (
                      <div className="text-center py-4">
                        <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {hasPassword === false 
                            ? "Tài khoản của bạn chưa có mật khẩu. Nhấn 'Thêm mật khẩu' để thiết lập."
                            : "Nhấn 'Thay đổi' để cập nhật mật khẩu của bạn"}
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        {passwordMessage && (
                          <div className={`p-3 rounded-lg flex items-center gap-2 ${
                            passwordMessage.type === "success" 
                              ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
                              : "bg-rose-50 border border-rose-200 text-rose-700"
                          }`}>
                            {passwordMessage.type === "success" ? (
                              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            )}
                            <span className="text-sm">{passwordMessage.text}</span>
                          </div>
                        )}

                        {hasPassword !== false && (
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-black"}`}>
                              Mật khẩu hiện tại
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                              <input
                                type={showPasswords.current ? "text" : "password"}
                                name="currentPassword"
                                value={passwordForm.currentPassword}
                                onChange={handlePasswordChange}
                                className={`w-full pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                                  isDarkMode 
                                    ? "bg-slate-800 border-slate-700 text-white" 
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                                required={hasPassword === true}
                                placeholder="Nhập mật khẩu hiện tại"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-black"}`}>
                            {hasPassword === false ? "Mật khẩu mới" : "Mật khẩu mới"}
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <input
                              type={showPasswords.new ? "text" : "password"}
                              name="newPassword"
                              value={passwordForm.newPassword}
                              onChange={handlePasswordChange}
                              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                                isDarkMode 
                                  ? "bg-slate-800 border-slate-700 text-white" 
                                  : "bg-white border-slate-300 text-slate-900"
                              }`}
                              required
                              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự, 1 chữ hoa, 1 ký tự đặc biệt)"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-black"}`}>
                            Xác nhận mật khẩu mới
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <input
                              type={showPasswords.confirm ? "text" : "password"}
                              name="confirmPassword"
                              value={passwordForm.confirmPassword}
                              onChange={handlePasswordChange}
                              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                                isDarkMode 
                                  ? "bg-slate-800 border-slate-700 text-white" 
                                  : "bg-white border-slate-300 text-slate-900"
                              }`}
                              required
                              placeholder="Nhập lại mật khẩu mới"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowChangePassword(false);
                              setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                              setPasswordMessage(null);
                            }}
                            className={`px-5 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                              isDarkMode 
                                ? "border-slate-700 text-slate-300 hover:bg-slate-800" 
                                : "border-slate-300 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={passwordLoading}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-sky-600 rounded-xl hover:from-emerald-700 hover:to-sky-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {passwordLoading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Đang xử lý...
                              </>
                            ) : (
                              <>
                                <Key className="h-4 w-4" />
                                {hasPassword === false ? "Thêm mật khẩu" : "Đổi mật khẩu"}
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                {membershipData && (
                  <div className={`${
                      isDarkMode ? "bg-slate-900/60 border-slate-800" : "bg-white/80 border-slate-200"
                    } backdrop-blur rounded-2xl border shadow-xl overflow-hidden`}
                  >
                    <div className={`${isDarkMode ? "bg-slate-900/70 border-b border-slate-800" : "bg-slate-50 border-b border-slate-200"} px-6 py-4`}>
                      <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>📅 Lịch sử thành viên CLB</h3>
                      <p className={`${isDarkMode ? "text-slate-400" : "text-black"} text-sm`}>Bảng lịch sử các sự kiện quan trọng trong quá trình tham gia CLB</p>
                    </div>

                    <div className="p-6">
                      {getTimelineEvents().length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className={`w-full ${isDarkMode ? "text-slate-200" : "text-slate-900"}`}>
                            <thead>
                              <tr className={`border-b ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                                <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                  Sự kiện
                                </th>
                                <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                  Thời gian
                                </th>
                                <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                  Trạng thái
                                </th>
                                <th className={`text-left py-3 px-4 font-semibold text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                                  Chi tiết
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {getTimelineEvents().map((event, idx) => (
                                <tr 
                                  key={idx} 
                                  className={`border-b ${isDarkMode ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-slate-50"} transition-colors`}
                                >
                                                                     <td className="py-4 px-4">
                                     <div className="flex items-center space-x-3">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                         event.badgeColor === "green" ? "bg-emerald-100 text-emerald-600" :
                                         event.badgeColor === "blue" ? "bg-sky-100 text-sky-600" :
                                         event.badgeColor === "purple" ? "bg-fuchsia-100 text-fuchsia-600" :
                                         event.badgeColor === "yellow" ? "bg-amber-100 text-amber-600" :
                                         event.badgeColor === "gray" ? "bg-slate-100 text-slate-600" :
                                         "bg-rose-100 text-rose-600"
                                       }`}>
                                         {event.type === "registered" && (
                                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                           </svg>
                                         )}
                                         {event.type === "approved" && (
                                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                           </svg>
                                         )}
                                         {event.type === "removed" && (
                                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                           </svg>
                                         )}
                                         {event.type === "restored" && (
                                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                           </svg>
                                         )}
                                         {event.type === "joined" && (
                                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                           </svg>
                                         )}
                                       </div>
                                       <div>
                                         <h4 className={`font-semibold text-sm ${isDarkMode ? "text-white" : "text-black"}`}>
                                           {event.title}
                                         </h4>
                                       </div>
                                     </div>
                                   </td>
                                  <td className="py-4 px-4 text-center">
                                    <span className={`text-sm whitespace-pre-line ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                      {formatDateShort(event.date)}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      event.badgeColor === "green"
                                        ? isDarkMode
                                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                        : event.badgeColor === "blue"
                                        ? isDarkMode
                                          ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                          : "bg-sky-100 text-sky-700 border border-sky-200"
                                        : event.badgeColor === "purple"
                                        ? isDarkMode
                                          ? "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30"
                                          : "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200"
                                        : event.badgeColor === "yellow"
                                        ? isDarkMode
                                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                          : "bg-amber-100 text-amber-700 border border-amber-200"
                                        : event.badgeColor === "gray"
                                        ? isDarkMode
                                          ? "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                                          : "bg-slate-100 text-slate-700 border border-slate-200"
                                        : isDarkMode
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                        : "bg-rose-100 text-rose-700 border border-rose-200"
                                    }`}>
                                      {event.badge}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    {event.additionalInfo ? (
                                      <div className={`inline-block rounded-lg border px-3 py-2 text-xs max-w-xs ${
                                        isDarkMode 
                                          ? "bg-slate-800 text-slate-300 border-slate-700" 
                                          : "bg-slate-100 text-slate-700 border-slate-200"
                                      }`}>
                                        {event.additionalInfo}
                                      </div>
                                    ) : (
                                      <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className={`${isDarkMode ? "bg-slate-800" : "bg-slate-100"} w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4`}>
                            <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-black"}`}>Chưa có lịch sử</p>
                          <p className={`${isDarkMode ? "text-slate-400" : "text-black"} text-sm`}>Bạn chưa có thông tin lịch sử tham gia CLB</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>

        <Footer isDarkMode={isDarkMode} />
      </div>
    </ProtectedRoute>
  );
}
