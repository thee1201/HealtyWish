const serverUrl = import.meta.env.VITE_SERVER_URL

import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import LogoLight from '../assets/logo-light.svg'
import Notice from '../assets/notice.svg'
import Rules from '../assets/rule.svg'
import Admin from '../assets/admin.svg'
import '../styles/Main.css'
import Modal from '../components/Modal'

function Main() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [posts, setPosts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [modalInfo, setModalInfo] = useState({ isOpen: false, message: '' })

  const menuItems = [
    { image: Notice, path: '/Notice' },
    { image: Rules, path: '/Rules' },
    { image: Admin, path: '/Admin' }
  ]

  // 게시글 목록 조회
  const fetchPosts = async (page) => {
    try {
      console.log('게시글 조회 시작 - 페이지:', page);
      setLoading(true);

      const response = await fetch(`${serverUrl}/api/posts?page=${page}`);
      console.log('서버 응답:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('서버 에러 응답:', errorData);
        throw new Error(errorData.message || '게시글을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      console.log('서버에서 받은 데이터:', data);

      if (!data.posts || !Array.isArray(data.posts)) {
        console.error('잘못된 데이터 형식:', data);
        throw new Error('서버에서 잘못된 형식의 데이터를 받았습니다.');
      }

      setPosts(data.posts);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);

      console.log('상태 업데이트 완료:', {
        postsCount: data.posts.length,
        totalPages: data.totalPages,
        currentPage: data.currentPage
      });
    } catch (error) {
      console.error('게시글 조회 에러:', error);
      setModalInfo({
        isOpen: true,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트와 페이지 변경 시 게시글 조회
  useEffect(() => {
    console.log('useEffect 실행 - 페이지 변경:', currentPage);
    fetchPosts(currentPage);
  }, [currentPage]);

  // 컴포넌트 마운트 시 한 번만 실행
  useEffect(() => {
    console.log('컴포넌트 마운트 - 초기 데이터 로드');
    fetchPosts(1);
  }, []);

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`)
  }

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeModal = () => {
    setModalInfo({ isOpen: false, message: '' });
  };

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').slice(0, -1);
  };

  return (
    <div className="main">
      <header className="main-header">
        <img src={LogoLight} alt="logo" className="main-logo" />
        <nav className="main-nav">
          <button onClick={() => navigate('/Chat')}><span className="material-symbols-outlined">forum</span></button>
          <button onClick={() => navigate('/Profile')}><span className="material-symbols-outlined">account_circle</span></button>
          <button onClick={handleLogout}><span className="material-symbols-outlined">logout</span></button>
        </nav>
      </header>

      <main className="main-content">
        <div className="menu-cards">
          {menuItems.map((item, index) => (
            <div key={index} className="menu-card" onClick={() => navigate(item.path)}>
              <img src={item.image} alt={item.title} />
              <h2>{item.title}</h2>
            </div>
          ))}
        </div>

        <div className="posts-section">
          {loading ? (
            <div className="loading">로딩중...</div>
          ) : posts.length === 0 ? (
            <div className="no-posts">게시글이 없습니다.</div>
          ) : (
            posts.map((post) => (
              <div key={post.postid} className="post-item" onClick={() => handlePostClick(post.postid)}>
                <span className="post-date">{formatDate(post.uploaddate)}</span>
                <span className="post-title">{post.title}</span>
                <div className="post-info">
                  <span className="post-author">{post.author}</span>
                  <div className="post-interactions">
                    <span className="likes">
                      <span className="material-symbols-outlined">favorite</span>
                      {post.likes}
                    </span>
                    <span className="comments">
                      <span className="material-symbols-outlined">chat_bubble</span>
                      {post.comments}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
          {posts.length > 0 && (
            <div className="pagination">
              {Array.from({ length: Math.min(4, totalPages) }, (_, i) => i + 1).map((page) => (
                <span
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{ color: page === currentPage ? '#6AC04D' : 'inherit' }}
                >
                  {page}
                </span>
              ))}
              {totalPages > 4 && (
                <span 
                  className="material-symbols-outlined"
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  chevron_right
                </span>
              )}
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={modalInfo.isOpen}
        message={modalInfo.message}
        onClose={closeModal}
      />
    </div>
  );
}

export default Main
