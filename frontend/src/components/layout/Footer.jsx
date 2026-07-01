import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-slate-800/50 bg-slate-900/30 backdrop-blur-sm py-5">
      <div className="mx-auto flex w-full flex-col items-center justify-between gap-4 px-6 md:flex-row md:px-8">
        
        {/* Bản quyền */}
        <div className="text-xs text-slate-500 font-medium">
          © {currentYear} Almotion. All rights reserved.
        </div>

        {/* Các liên kết điều hướng */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-400">
          <a 
            href="/about" 
            className="hover:text-indigo-400 transition-colors duration-200"
          >
            Về hệ thống
          </a>

          <a 
            href="/support" 
            className="hover:text-indigo-400 transition-colors duration-200"
          >
            Hỗ trợ & Báo lỗi
          </a>
          <a 
            href="/privacy" 
            className="hover:text-indigo-400 transition-colors duration-200"
          >
            Chính sách Dữ liệu
          </a>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;