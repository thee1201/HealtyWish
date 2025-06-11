import { useNavigate } from 'react-router-dom'
import LogoLight from '../assets/logo-light.svg'
import '../styles/Post.css'
import { useAuth } from '../context/AuthContext'

function Notice() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const noticeContent = {
    title: "HealthyWish 공지사항",
    content: `
      안녕하세요, HealthyWish 사용자 여러분!

      1. 서비스 이용 안내
      - 게시글 작성 시 건강한 커뮤니티 문화를 위해 예의를 지켜주세요.
      - 부적절한 콘텐츠는 관리자에 의해 삭제될 수 있습니다.

      2. 업데이트 소식
      - 모바일 버전 개발 중 (2024년 상반기 출시 예정)
      - 새로운 기능: 운동 기록 공유 기능 추가 예정

      3. 이용 제한 안내
      - 악의적인 댓글 작성 시 이용이 제한될 수 있습니다.
      - 광고성 게시글 작성 시 계정이 정지될 수 있습니다.

      4. 문의 안내
      - 서비스 이용 관련 문의: support@healthywish.com
      - 버그 제보: bug@healthywish.com

      감사합니다.
      HealthyWish 운영팀
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
              <h1>{noticeContent.title}</h1>
            </div>

            <div className="post-body">
              <div className="post-text">
                {noticeContent.content.split('\n').map((line, index) => (
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

export default Notice 