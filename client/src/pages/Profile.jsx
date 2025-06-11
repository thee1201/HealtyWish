const serverUrl = import.meta.env.VITE_SERVER_URL

import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import LogoLight from '../assets/logo-light.svg'
import '../styles/Profile.css'
import Modal from '../components/Modal'

function Profile() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('posts')
  const { user, logout, getAuthHeaders } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ postCount: 0, likeCount: 0 })
  const [modalInfo, setModalInfo] = useState({ isOpen: false, message: '' })

  // 사용자 통계 정보 가져오기
  const fetchUserStats = async () => {
    try {
      if (!user?.userid) {
        throw new Error('사용자 정보가 없습니다.');
      }

      // 모든 게시글 조회하여 개수 계산
      const postsResponse = await fetch(`${serverUrl}/api/user/posts`, {
        headers: getAuthHeaders()
      });

      // 좋아요한 게시글 조회
      const likesResponse = await fetch(`${serverUrl}/api/like_posts`, {
        headers: getAuthHeaders()
      });

      if (!postsResponse.ok || !likesResponse.ok) {
        throw new Error('통계 정보를 가져오는데 실패했습니다.');
      }

      const postsData = await postsResponse.json();
      const likesData = await likesResponse.json();

      console.log('게시글 데이터:', postsData);
      console.log('좋아요 데이터:', likesData);

      const postCount = postsData.posts ? postsData.posts.length : 0;
      const likeCount = likesData.posts ? likesData.posts.length : 0;

      console.log('계산된 통계:', { postCount, likeCount });

      setStats({
        postCount,
        likeCount
      });

      // 상태가 제대로 업데이트되었는지 확인
      console.log('업데이트된 stats:', { postCount, likeCount });
    } catch (error) {
      console.error('통계 조회 에러:', error);
      setModalInfo({
        isOpen: true,
        message: '통계 정보를 가져오는데 실패했습니다.'
      });
    }
  };

  const fetchPosts = async (page) => {
    setLoading(true);
    try {
      if (!user?.userid) {
        throw new Error('사용자 정보가 없습니다.');
      }

      // DB 구조에 맞는 엔드포인트
      const endpoint = activeTab === 'posts' 
        ? `/api/user/posts` 
        : `/api/like_posts`; 

      console.log('게시글 조회 요청:', {
        endpoint,
        page,
        userId: user.userid
      });

      const response = await fetch(`${serverUrl}${endpoint}?page=${page}`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('게시물을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      console.log('받은 게시글 데이터:', data);

      // 응답 데이터 처리
      const postsData = Array.isArray(data.posts) ? data.posts : [];
      
      // posts 테이블 구조에 맞게 데이터 매핑
      const formattedPosts = postsData.map(post => ({
        id: post.postid,
        title: post.title,
        content: post.contents,
        uploaddate: post.uploaddate,
        userid: post.userid,
        like_count: post.like_count,
        comment_count: post.comment_count
      }));

      setPosts(formattedPosts);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.currentPage || 1);

    } catch (error) {
      console.error('게시물 조회 에러:', error);
      setModalInfo({
        isOpen: true,
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 통계 정보 가져오기
  useEffect(() => {
    if (user?.userid) {
      console.log('통계 정보 가져오기 시작 - 사용자:', user.userid);
      fetchUserStats();
    }
  }, [user]);

  // 탭이 변경되거나 페이지가 변경될 때 게시물 목록 가져오기
  useEffect(() => {
    if (user?.userid) {
      console.log('게시물 목록 가져오기 시작 - 탭:', activeTab);
      fetchPosts(currentPage);
    }
  }, [activeTab, currentPage, user]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      fetchPosts(page);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\. /g, '.').slice(0, -1);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeModal = () => {
    setModalInfo({ isOpen: false, message: '' });
  };

  const renderPagination = () => {
    const pageGroup = Math.ceil(currentPage / 4); // 현재 페이지 그룹
    const start = (pageGroup - 1) * 4 + 1; // 현재 그룹의 시작 페이지
    const end = Math.min(pageGroup * 4, totalPages); // 현재 그룹의 마지막 페이지

    return (
      <div className="pagination">
        {pageGroup > 1 && (
          <span 
            className="material-symbols-outlined"
            onClick={() => handlePageChange(start - 1)}
          >
            chevron_left
          </span>
        )}
        {Array.from({ length: 4 }, (_, i) => start + i).map(page => {
          if (page <= end) {
            return (
              <span
                key={page}
                style={{ color: page === currentPage ? '#6AC04D' : 'inherit' }}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </span>
            );
          }
          return null;
        })}
        {end < totalPages && (
          <span 
            className="material-symbols-outlined"
            onClick={() => handlePageChange(end + 1)}
          >
            chevron_right
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="profile-page">
      <header className="main-header">
        <img src={LogoLight} alt="logo" className="main-logo" />
        <nav className="main-nav">
          <button onClick={() => navigate('/Chat')}><span className="material-symbols-outlined">forum</span></button>
          <button onClick={() => navigate('/Profile')}><span className="material-symbols-outlined" style={{ color: '#FFDF76' }}>account_circle</span></button>
          <button onClick={handleLogout}><span className="material-symbols-outlined">logout</span></button>
        </nav>
      </header>

      <main className="profile-content">
        <div className="profile-left">
          <button className="back-button" onClick={() => navigate('/main')}>
            <span className="material-symbols-outlined">chevron_left</span>
            메인으로
          </button>
          <div className="profile-info">
            <div className="profile-image">
              <span className="material-symbols-outlined">account_circle</span>
            </div>
            <h2 className="profile-name">{user?.username || '사용자'}</h2>
            <div className="profile-stats">
              <div className="stat-box">
                <span className="stat-label">my post</span>
                <span className="stat-value">{stats.postCount}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">my like</span>
                <span className="stat-value">{stats.likeCount}</span>
              </div>
            </div>
            <button className="new-post-btn" onClick={() => navigate('/new-post')}>
              new post
            </button>
          </div>
        </div>

        <div className="profile-right">
          <div className="posts-tabs">
            <button 
              className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('posts');
                setCurrentPage(1);
              }}
            >
              my post
            </button>
            <button 
              className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('likes');
                setCurrentPage(1);
              }}
            >
              my like
            </button>
          </div>

          <div className="posts-list">
            {loading ? (
              <div className="loading">로딩중...</div>
            ) : posts.length === 0 ? (
              <div className="no-posts">
                {activeTab === 'posts' ? '작성한 게시물이 없습니다.' : '좋아요한 게시물이 없습니다.'}
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="post-item" onClick={() => {
                  console.log('게시글 클릭:', post.id);  // 디버깅 로그 추가
                  navigate(`/post/${post.id}`);
                }}>
                  <span className="post-title">{post.title}</span>
                  <div className="post-interactions">
                    <span className="post-date">{formatDate(post.uploaddate)}</span>
                    <span className="likes">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        favorite
                      </span>
                      {post.like_count || 0}
                    </span>
                    <span className="comments">
                      <span className="material-symbols-outlined">chat_bubble</span>
                      {post.comment_count || 0}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {posts.length > 0 && renderPagination()}
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

export default Profile
