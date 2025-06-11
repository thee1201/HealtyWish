import { useNavigate } from 'react-router-dom'
import LogoLight from '../assets/logo-light.svg'
import '../styles/Post.css'
import { useAuth } from '../context/AuthContext'

function Admin() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const adminContent = {
    title: "HealthyWish 운영진 소개",
    content: `
      안녕하세요, HealthyWish 운영진입니다.

      1. 운영진 소개
      - 대표: 김건강
        * 헬스 트레이너 10년 경력
        * 스포츠 의학 전문가
        * 건강한 라이프스타일 컨설턴트

      - 커뮤니티 매니저: 이웰빙
        * 운동 생리학 전공
        * 온라인 커뮤니티 운영 5년 경력
        * 건강 식단 전문가

      - 기술 책임자: 박테크
        * 웹 개발 전문가
        * UX/UI 디자이너
        * 시스템 보안 전문가

      2. 운영 철학
      - 사용자 중심의 서비스 제공
      - 정확하고 신뢰할 수 있는 정보 제공
      - 안전하고 건강한 커뮤니티 문화 조성

      3. 연락처
      - 이메일: admin@healthywish.com
      - 전화: 02-123-4567
      - 운영시간: 평일 09:00 - 18:00

      여러분의 건강한 삶을 응원합니다.
      HealthyWish 운영진 일동
    `
  };

  return (
    <div className="post-page">
      <header className="main-header">
        <img src={LogoLight} alt="logo" className="main-logo" />
        <nav className="main-nav">
          <button onClick={() => navigate('/Chat')}><span className="material-symbols-outlined">forum</span></button>
          <button onClick={() => navigate('/Profile')}><span className="material-symbols-outlined">account_circle</span></button>
          <button onClick={handleLogout}><span className="material-symbols-outlined">logout</span></button>
        </nav>
      </header>

      <main className="post-content">
        <div className="post-wrapper">
          <button className="back-button" onClick={() => navigate('/main')}>
            <span className="material-symbols-outlined">chevron_left</span>
            메인으로
          </button>

          <div className="post-container">
            <div className="post-header">
              <h1>{adminContent.title}</h1>
            </div>

            <div className="post-body">
              <div className="post-text">
                {adminContent.content.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Admin