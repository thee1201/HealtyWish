const serverUrl = import.meta.env.VITE_SERVER_URL

import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);
const AUTH_CHANNEL = 'auth-channel';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  // BroadcastChannel 초기화
  useEffect(() => {
    const authChannel = new BroadcastChannel(AUTH_CHANNEL);

    // 다른 탭에서 온 메시지 처리
    const handleAuthMessage = (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'LOGIN':
          // 다른 탭에서 로그인한 경우, 현재 탭의 상태를 업데이트
          if (data.token !== token) {
            setUser(data.user);
            setToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('token', data.token);
          }
          break;
        case 'LOGOUT':
          // 다른 탭에서 로그아웃한 경우, 현재 탭도 로그아웃
          setUser(null);
          setToken(null);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          navigate('/');
          break;
      }
    };

    authChannel.addEventListener('message', handleAuthMessage);

    return () => {
      authChannel.removeEventListener('message', handleAuthMessage);
      authChannel.close();
    };
  }, [navigate, token]);

  // 로그인 상태 복구
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setToken(storedToken);
          
          // 토큰 유효성 검증
          const response = await fetch('http://localhost:3000/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('토큰이 만료되었습니다.');
          }
        }
      } catch (error) {
        console.error('인증 초기화 에러:', error);
        // 자동 로그아웃하지 않고 인증 실패 상태만 표시
        setUser(null);
        setToken(null);
        // localStorage는 그대로 둠
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (userData, newToken) => {
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', newToken);
    localStorage.setItem('userid', userData.userid);
    localStorage.setItem('username', userData.username);

    // 다른 탭에 로그인 이벤트 알림
    const authChannel = new BroadcastChannel(AUTH_CHANNEL);
    authChannel.postMessage({
      type: 'LOGIN',
      data: { user: userData, token: newToken }
    });
    authChannel.close();
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userid');
    localStorage.removeItem('username');

    // 다른 탭에 로그아웃 이벤트 알림
    const authChannel = new BroadcastChannel(AUTH_CHANNEL);
    authChannel.postMessage({ type: 'LOGOUT' });
    authChannel.close();

    navigate('/');
  };

  const getAuthHeaders = () => {
    const currentToken = token || localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json'
    };
  };

  // 토큰 리프레시 함수
  const refreshToken = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/auth/refresh`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('토큰 갱신 실패');
      }

      const data = await response.json();
      setToken(data.token);
      localStorage.setItem('token', data.token);
      return data.token;
    } catch (error) {
      console.error('토큰 리프레시 에러:', error);
      logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      getAuthHeaders,
      refreshToken,
      isAuthenticated: !!user && !!token 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 