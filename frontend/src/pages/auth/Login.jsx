import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';

import LoginFormCard from '../../components/auth/login/LoginFormCard';
import AuthHeroPanel from '../../components/auth/shared/AuthHeroPanel';

import {
  normalizeEmail,
  validateLoginForm,
} from '../../utils/auth/authValidation';

import {
  getLoginError,
  loadUserRoleAfterLogin,
} from '../../services/auth/authService';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    const validationError = validateLoginForm({
      email: normalizedEmail,
      password,
    });

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

    if (userId) {
      await loadUserRoleAfterLogin(userId);
    }

    navigate('/dashboard');
  };

  return (
    <>
      <AuthAnimationStyle />

      <div className="min-h-screen w-full flex font-sans text-slate-200 bg-[#0f172a] overflow-hidden">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
          <LoginFormCard
            email={email}
            password={password}
            loading={loading}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleLogin}
          />
        </div>

        <AuthHeroPanel
          title="Hiểu khách hàng từ từng phản hồi"
          description="Theo dõi khen chê, phát hiện vấn đề nổi bật và ra quyết định nhanh hơn từ dữ liệu thực tế."
          variant="chart"
        />
      </div>
    </>
  );
}

function AuthAnimationStyle() {
  return (
    <style>
      {`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(12px); }
        }
      `}
    </style>
  );
}
