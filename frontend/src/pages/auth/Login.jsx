import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import LoginFormCard from '../../components/auth/login/LoginFormCard';
import AuthPageShell from '../../components/auth/shared/AuthPageShell';
import { normalizeEmail, validateLoginForm } from '../../utils/auth/authValidation';
import { getLoginError, loadUserRoleAfterLogin } from '../../services/auth/authService';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    const validationError = validateLoginForm({ email: normalizedEmail, password });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    const { data, error } = await signIn(normalizedEmail, password);
    setLoading(false);

    if (error) {
      toast.error(getLoginError(error));
      return;
    }

    const userId = data?.user?.id || data?.session?.user?.id;
    if (userId) await loadUserRoleAfterLogin(userId);
    navigate('/dashboard');
  };

  return (
    <AuthPageShell
      showThemeToggle
      eyebrow="Đồ án phân tích cảm xúc"
      title="Thấu hiểu khách hàng từ từng phản hồi"
      description="Hệ thống ứng dụng trí tuệ nhân tạo để phân loại cảm xúc trong đánh giá nhà hàng, trực quan hóa dữ liệu và hỗ trợ ra quyết định."
    >
      <LoginFormCard
        email={email}
        password={password}
        loading={loading}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    </AuthPageShell>
  );
}
