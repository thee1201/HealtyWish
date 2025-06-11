import { useNavigate } from 'react-router-dom'
import LogoLight from '../assets/logo-light.svg'
import '../styles/Post.css'
import { useAuth } from '../context/AuthContext'

function Rules() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const rulesContent = {
    title: "HealthyWish 이용규칙",
    content: `
      HealthyWish 커뮤니티 가이드라인

      1. 게시글 작성 규칙
      - 건강과 운동에 관련된 주제로 작성해 주세요.
      - 허위 정보나 검증되지 않은 건강 정보는 게시하지 말아주세요.
      - 타인의 저작권을 침해하는 콘텐츠는 금지됩니다.

      2. 커뮤니티 예절
      - 상호 존중하는 태도로 소통해 주세요.
      - 비방, 욕설, 차별적 발언은 금지됩니다.
      - 타인의 개인정보를 공개하지 말아주세요.

      3. 금지된 행위
      - 상업적 광고 및 홍보 활동
      - 불법 정보 공유
      - 정치적/종교적 논쟁 유발
      - 타 회원 비방 및 음해

      4. 제재 사항
      - 1차 위반: 경고
      - 2차 위반: 7일 이용 정지
      - 3차 위반: 영구 이용 정지

      5. 신고하기
      - 부적절한 게시물 발견 시 신고 기능을 이용해 주세요.
      - 신고된 게시물은 24시간 내 검토됩니다.

      함께 만들어가는 건강한 커뮤니티가 되도록 협조 부탁드립니다.
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
              <h1>{rulesContent.title}</h1>
            </div>

            <div className="post-body">
              <div className="post-text">
                {rulesContent.content.split('\n').map((line, index) => (
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

export default Rules 