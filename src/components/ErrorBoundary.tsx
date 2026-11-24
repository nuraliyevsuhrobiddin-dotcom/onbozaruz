import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-['Inter',sans-serif]">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center border border-slate-100">
            <div className="w-16 h-16 bg-red-50 text-[#E53935] rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-black">
              !
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Nimadir noto'g'ri ketdi</h2>
            <p className="text-sm text-slate-500 mb-6">
              Ilovada kutilmagan xatolik yuz berdi. Iltimos, sahifani qayta yangilang.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('agro_posts_cache_v1');
                window.location.reload();
              }}
              className="w-full py-3 px-4 bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold rounded-xl shadow-md transition-all active:scale-95"
            >
              Sahifani yangilash
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
