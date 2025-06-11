const serverUrl = import.meta.env.VITE_SERVER_URL

import { useNavigate, useParams } from 'react-router-dom'
import LogoLight from '../assets/logo-light.svg'
import '../styles/Post.css'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

function Post() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { getAuthHeaders, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [modalInfo, setModalInfo] = useState({ isOpen: false, message: '' })
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, commentId: null });

  // 게시글 상세 정보 조회
  const fetchPostDetails = async () => {
    try {
      console.log('게시글 상세 정보 조회 시작:', id);

      const response = await fetch(`${serverUrl}/api/posts/${id}`, {
        headers: getAuthHeaders()
      });

      console.log('서버 응답:', response.status);

      if (!response.ok) {
        throw new Error('게시글을 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      console.log('받은 데이터:', data);

      setPost(data.post);
      setComments(data.comments);
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

  // 좋아요 처리
  const handleLike = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/posts/${id}/like`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('좋아요 처리에 실패했습니다.');
      }

      const data = await response.json();
      setPost(prev => ({
        ...prev,
        is_liked: data.liked,
        like_count: data.likeCount
      }));
    } catch (error) {
      console.error('좋아요 처리 에러:', error);
      setModalInfo({
        isOpen: true,
        message: error.message
      });
    }
  };

  // 댓글 작성
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`${serverUrl}/api/comments`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postId: id,
          content: newComment
        })
      });

      if (!response.ok) {
        throw new Error('댓글 작성에 실패했습니다.');
      }

      const data = await response.json();
      setComments(prev => [
        { ...data.comment, userid: localStorage.getItem('userid') },
        ...prev
      ]);
      setNewComment('');
    } catch (error) {
      console.error('댓글 작성 에러:', error);
      setModalInfo({
        isOpen: true,
        message: error.message
      });
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId) => {
    try {
      const response = await fetch(`${serverUrl}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('댓글 삭제에 실패했습니다.');
      }

      setComments(prev => prev.filter(comment => comment.id !== commentId));
    } catch (error) {
      console.error('댓글 삭제 에러:', error);
      setModalInfo({
        isOpen: true,
        message: error.message
      });
    }
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

  // 컴포넌트 마운트 시 게시글 정보 조회
  useEffect(() => {
    console.log('Post 컴포넌트 마운트, postId:', id);
    if (id) {
      fetchPostDetails();
    } else {
      setLoading(false);
      setModalInfo({
        isOpen: true,
        message: '게시글 ID가 없습니다.'
      });
    }
  }, [id]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeModal = () => {
    setModalInfo({ isOpen: false, message: '' });
  };

  if (loading) {
    return <div className="loading">로딩중...</div>;
  }

  if (!post) {
    return <div className="error">게시글을 찾을 수 없습니다.</div>;
  }

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
              <h1>{post.title}</h1>
              <div className="post-info">
                <span className="post-author">{post.author}</span>
                <span className="post-date">{formatDate(post.uploaddate)}</span>
              </div>
            </div>

            <div className="post-body">
              <div className="post-text">
                {post.content}
              </div>
              <div className="post-images">
                {/* 이미지 영역 */}
              </div>
            </div>

            <div className="post-footer">
              <button className="like-button" onClick={handleLike}>
                <span 
                  className="material-symbols-outlined" 
                  style={{ 
                    fontVariationSettings: `'FILL' ${post.is_liked ? 1 : 0}` 
                  }}
                >
                  favorite
                </span>
                <span>{post.like_count}</span>
              </button>
            </div>

            <div className="comments-section">
              <h2>댓글</h2>
              <form className="comment-form" onSubmit={handleSubmitComment}>
                <input 
                  type="text" 
                  placeholder="댓글을 입력하세요" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" disabled={!newComment.trim()}>
                  <span className="material-symbols-outlined">send</span>
                </button>
              </form>
              
              <div className="comments-list">
                {comments.map((comment) => (
                  console.log(comment.userid),
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <div className="comment-info">
                        <span className="comment-author">{comment.author}</span>
                        <span className="comment-date">{formatDate(comment.date)}</span>
                      </div>
                      {comment.userid === localStorage.getItem('userid') && (
                        <button 
                          className="delete-comment" 
                          onClick={() => setConfirmModal({ isOpen: true, commentId: comment.id })}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </div>
                    <p className="comment-content">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Modal
        isOpen={modalInfo.isOpen}
        message={modalInfo.message}
        onClose={closeModal}
      />
      {confirmModal.isOpen && (
        <Modal
          isOpen={true}
          message="정말 댓글을 삭제하시겠습니까?"
          onClose={() => setConfirmModal({ isOpen: false, commentId: null })}
          onConfirm={async () => {
            await handleDeleteComment(confirmModal.commentId);
            setConfirmModal({ isOpen: false, commentId: null });
          }}
          showConfirm
        />
      )}
    </div>
  )
}

export default Post
