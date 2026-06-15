import React, { createContext, useContext, useState, useCallback } from 'react';

// Khởi tạo Context với giá trị mặc định ban đầu
const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }) => {
  // Khởi tạo state user từ localStorage nếu có
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Hàm xử lý đăng nhập giả lập
  const login = useCallback(async (email, password) => {
    // Giả lập gọi API qua setTimeout
    await new Promise((res) => setTimeout(res, 900));

    if (password.length < 6) {
      throw new Error('Mật khẩu không đúng. Vui lòng thử lại.');
    }

    // Tạo thông tin user giả lập từ Email
    const mockUser = {
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
    };

    setUser(mockUser);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));
  }, []);

  // Hàm xử lý đăng xuất
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('auth_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook để sử dụng AuthContext nhanh hơn ở các component con
export const useAuth = () => useContext(AuthContext);