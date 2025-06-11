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
      - 김@@

      2. 연락처
      - 이메일: admin@healthywish.com
      - 전화: 02-123-4567
      - 운영시간: 평일 09:00 - 18:00

      3. 프로잭트 진행 소감
      네트워크 수업을 들으면서 네트워크 통신과 보안을 이렇게라도 실습할 수 있어서 좋았습니다.
      다음에는 이 사이트에 알림 기능과 몸무게 관리 기능을 추가하고 싶습니다.

      HealthyWish ヾ(≧▽≦*)o
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