import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AdminProtectedRoute = () => {
  // Giả lập đọc role từ localStorage.
  // Trong thực tế, bạn có thể lấy từ Context Auth hoặc Redux.
  // Ở đây mặc định để 'admin' để bạn có thể test giao diện.
  // Thử đổi thành 'user' để xem chức năng Redirect về trang chủ.
  const userRole = localStorage.getItem('user_role') || 'admin';

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
