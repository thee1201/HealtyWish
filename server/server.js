const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const pg = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const {Server} = require('socket.io');

const CLIENT_URL = process.env.CLIENT_URL;
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;

const app = express();

const port = 3000;
const socketPort = 3001;

// CORS 설정
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 미들웨어 설정
app.use(express.json());

// 데이터베이스 연결
const client = new pg.Pool({
  host: 'localhost',
  user: 'postgres',
  password: DATABASE_PASSWORD,
  database: 'HealthyWish',
  port: 5432,
  max: 5,
  client_encoding: 'UTF8'
});

// 웹소켓 서버 생성
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  }
});

// 데이터베이스 연결
client.connect(err => {
  if (err) {
    console.error('데이터베이스 연결 실패:', {
      code: err.code,
      detail: err.detail,
      message: err.message
    });
  } else {
    console.log('데이터베이스 연결 성공!');
    
    // 테이블 생성
    const createTables = async () => {
      try {
        // 사용자 테이블
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            userid VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(100) NOT NULL,
            username VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 채팅방 테이블
        await client.query(`
          CREATE TABLE IF NOT EXISTS chat_rooms (
            roomid SERIAL PRIMARY KEY,
            groupname VARCHAR(100) NOT NULL,
            isgroup BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // 채팅방 멤버 테이블
        await client.query(`
          CREATE TABLE IF NOT EXISTS room_members (
            userid VARCHAR(50) REFERENCES users(userid),
            roomid INTEGER REFERENCES chat_rooms(roomid),
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (userid, roomid)
          )
        `);

        // 채팅 메시지 테이블
        await client.query(`
          CREATE TABLE IF NOT EXISTS chat_messages (
            messageid SERIAL PRIMARY KEY,
            roomid INTEGER REFERENCES chat_rooms(roomid),
            userid VARCHAR(50) REFERENCES users(userid),
            text TEXT NOT NULL,
            sendtime TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        console.log('모든 테이블이 성공적으로 생성되었습니다.');
      } catch (error) {
        console.error('테이블 생성 중 에러 발생:', error);
      }
    };

    createTables();
  }
});

// 회원가입 엔드포인트
app.post('/api/auth/signup', async (req, res) => {
  const { userid, password, username } = req.body;
  
  try {
    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 사용자 생성
    const result = await client.query(
      'INSERT INTO users (userid, password, username) VALUES ($1, $2, $3) RETURNING userid, password, username',
      [userid, hashedPassword, username]
    );
    
    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // unique_violation 에러 코드
      res.status(400).json({ message: '이미 존재하는 사용자명입니다.' });
    } else {
      console.error('회원가입 에러:', error);
      res.status(500).json({ message: '서버 에러가 발생했습니다.' });
    }
  }
});

// 로그인 엔드포인트
app.post('/api/auth/signin', async (req, res) => {
  const { userid, password } = req.body;
  console.log(userid, password);
  try {
    // 사용자 조회
    const result = await client.query(
      'SELECT * FROM users WHERE userid = $1',
      [userid]
    );
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 비밀번호 검증
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { userid: user.userid, username: user.username },
      'your-secret-key', // 실제 환경에서는 환경변수로 관리해야 합니다
      { expiresIn: '1h' }
    );
    
    res.json({
      message: '로그인 성공',
      token,
      user: {
        userid: user.userid,
        username: user.username
      }
    });
  } catch (error) {
    console.error('로그인 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 사용자의 게시물 목록 가져오기
app.get('/api/user/posts', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const userId = decoded.userid;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    console.log('사용자 게시글 조회 요청 - 사용자:', userId, '페이지:', page);

    // 전체 게시물 수 조회
    const countResult = await client.query(
      'SELECT COUNT(*) FROM posts WHERE userid = $1',
      [userId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // 페이지네이션된 게시물 목록 조회
    const result = await client.query(`
      SELECT 
        p.postid,
        p.title,
        p.contents,
        p.uploaddate,
        p.userid,
        (SELECT COUNT(*) FROM like_posts WHERE postid = p.postid) as like_count,
        (SELECT COUNT(*) FROM comments WHERE postid = p.postid) as comment_count
      FROM posts p
      WHERE p.userid = $1
      ORDER BY p.uploaddate DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    // console.log('조회된 게시글 수:', result.rows.length, '전체 게시글 수:', totalCount);

    res.json({
      posts: result.rows,
      total: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('게시물 목록 조회 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 사용자가 좋아요한 게시물 목록 가져오기
app.get('/api/like_posts', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const userId = decoded.userid;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    console.log('좋아요 게시글 조회 요청 - 사용자:', userId, '페이지:', page);

    // 전체 좋아요 게시물 수 조회
    const countResult = await client.query(
      'SELECT COUNT(*) FROM like_posts WHERE userid = $1',
      [userId]
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // 페이지네이션된 좋아요 게시물 목록 조회
    const result = await client.query(`
      SELECT 
        p.postid,
        p.title,
        p.contents,
        p.uploaddate,
        p.userid,
        (SELECT COUNT(*) FROM like_posts WHERE postid = p.postid) as like_count,
        (SELECT COUNT(*) FROM comments WHERE postid = p.postid) as comment_count
      FROM posts p
      INNER JOIN like_posts l ON l.postid = p.postid
      WHERE l.userid = $1
      ORDER BY p.uploaddate DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    // console.log('조회된 좋아요 게시글 수:', result.rows.length, '전체 좋아요 게시글 수:', totalCount);

    res.json({
      posts: result.rows,
      total: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('좋아요 게시물 목록 조회 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 게시물 생성 엔드포인트
app.post('/api/posts', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const userId = decoded.userid;
    const { title, content, uploaddate } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 모두 입력해주세요.' });
    }

    const result = await client.query(
      'INSERT INTO posts (userid, title, contents, uploaddate) VALUES ($1, $2, $3, $4) RETURNING userid, title, contents, uploaddate',
      [userId, title, content, uploaddate]
    );

    res.status(201).json({
      message: '게시물이 생성되었습니다.',
      post: result.rows[0]
    });
  } catch (error) {
    console.error('게시물 생성 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 특정 게시물 상세 조회
app.get('/api/posts/:postId', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const userId = decoded.userid;
    const postId = req.params.postId;

    // 게시글 상세 정보 조회
    const postResult = await client.query(`
      SELECT 
        p.postid,
        p.title,
        p.contents,
        p.uploaddate,
        p.userid,
        u.username as author,
        (SELECT COUNT(*) FROM like_posts WHERE postid = p.postid) as like_count,
        (SELECT COUNT(*) FROM comments WHERE postid = p.postid) as comment_count,
        (SELECT EXISTS(SELECT 1 FROM like_posts WHERE postid = p.postid AND userid = $2)) as is_liked
      FROM posts p
      JOIN users u ON p.userid = u.userid
      WHERE p.postid = $1
    `, [postId, userId]);

    if (postResult.rows.length === 0) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // 댓글 조회
    const commentsResult = await client.query(`
      SELECT 
        c.commentid,
        c.contents,
        c.uploaddate,
        c.userid as userid,
        u.username as author
      FROM comments c
      JOIN users u ON c.userid = u.userid
      WHERE c.postid = $1
      ORDER BY c.uploaddate DESC
    `, [postId]);

    const post = postResult.rows[0];
    const comments = commentsResult.rows;

    res.json({
      post: {
        id: post.postid,
        title: post.title,
        content: post.contents,
        uploaddate: post.uploaddate,
        author: post.author,
        like_count: post.like_count,
        comment_count: post.comment_count,
        is_liked: post.is_liked
      },
      comments: comments.map(comment => ({
        id: comment.commentid,
        content: comment.contents,
        userid: comment.userid,
        author: comment.author,
        date: comment.uploaddate
      }))
    });
  } catch (error) {
    console.error('게시물 상세 조회 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 댓글 작성
app.post('/api/comments', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const userId = decoded.userid;
    const { postId, content } = req.body;

    if (!content || !postId) {
      return res.status(400).json({ message: '댓글 내용과 게시글 ID가 필요합니다.' });
    }

    // 댓글 작성
    const result = await client.query(`
      INSERT INTO comments (postid, userid, contents, uploaddate)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      RETURNING 
        commentid,
        contents,
        uploaddate,
        (SELECT username FROM users WHERE userid = $2) as author
    `, [postId, userId, content]);

    const newComment = result.rows[0];

    res.status(201).json({
      comment: {
        id: newComment.commentid,
        content: newComment.contents,
        author: newComment.author,
        date: newComment.uploaddate
      }
    });
  } catch (error) {
    console.error('댓글 작성 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 댓글 삭제
app.delete('/api/comments/:commentId', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const userId = decoded.userid;
    const commentId = req.params.commentId;

    // 댓글 작성자 확인
    const checkResult = await client.query(
      'SELECT userid FROM comments WHERE commentid = $1',
      [commentId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    }

    if (checkResult.rows[0].userid !== userId) {
      return res.status(403).json({ message: '댓글을 삭제할 권한이 없습니다.' });
    }

    // 댓글 삭제
    await client.query('DELETE FROM comments WHERE commentid = $1', [commentId]);

    res.json({ message: '댓글이 삭제되었습니다.' });
  } catch (error) {
    console.error('댓글 삭제 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 게시글 좋아요/좋아요 취소
app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const userId = decoded.userid;
    const postId = req.params.postId;

    // 이미 좋아요를 눌렀는지 확인
    const checkResult = await client.query(
      'SELECT * FROM like_posts WHERE postid = $1 AND userid = $2',
      [postId, userId]
    );

    if (checkResult.rows.length > 0) {
      // 이미 좋아요가 있으면 취소
      await client.query(
        'DELETE FROM like_posts WHERE postid = $1 AND userid = $2',
        [postId, userId]
      );

      // 현재 좋아요 수 조회
      const likeCount = await client.query(
        'SELECT COUNT(*) FROM like_posts WHERE postid = $1',
        [postId]
      );

      res.json({
        liked: false,
        likeCount: parseInt(likeCount.rows[0].count)
      });
    } else {
      // 좋아요가 없으면 추가
      await client.query(
        'INSERT INTO like_posts (postid, userid) VALUES ($1, $2)',
        [postId, userId]
      );

      // 현재 좋아요 수 조회
      const likeCount = await client.query(
        'SELECT COUNT(*) FROM like_posts WHERE postid = $1',
        [postId]
      );

      res.json({
        liked: true,
        likeCount: parseInt(likeCount.rows[0].count)
      });
    }
  } catch (error) {
    console.error('좋아요 처리 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 전체 게시글 목록 조회 (메인 화면용)
app.get('/api/posts', async (req, res) => {
  try {
    // console.log('전체 게시글 목록 조회 요청 받음');
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // 페이지당 5개 게시글
    const offset = (page - 1) * limit;

    // console.log('페이지 정보:', { page, limit, offset });

    // 전체 게시글 수 조회
    const countResult = await client.query('SELECT COUNT(*) FROM posts');
    const totalCount = parseInt(countResult.rows[0].count);
    // console.log('전체 게시글 수:', totalCount);

    // 페이지네이션된 게시글 목록 조회
    const result = await client.query(`
      SELECT 
        p.postid,
        p.title,
        p.uploaddate,
        u.username as author,
        (SELECT COUNT(*) FROM like_posts WHERE postid = p.postid) as like_count,
        (SELECT COUNT(*) FROM comments WHERE postid = p.postid) as comment_count
      FROM posts p
      JOIN users u ON p.userid = u.userid
      ORDER BY p.uploaddate DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // console.log('조회된 게시글:', result.rows);

    const formattedPosts = result.rows.map(post => ({
      postid: post.postid,
      title: post.title,
      uploaddate: post.uploaddate,
      author: post.author,
      likes: parseInt(post.like_count),
      comments: parseInt(post.comment_count)
    }));

    const response = {
      posts: formattedPosts,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };

    // console.log('응답으로 보내는 데이터:', response);
    res.json(response);
  } catch (error) {
    console.error('게시글 목록 조회 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 사용자의 채팅방 목록 조회
app.get('/api/chat_rooms', async (req, res) => {
  try {
    console.log('채팅방 목록 조회 요청 받음');
    const token = req.headers['authorization']?.split(' ')[1];
    console.log('받은 토큰:', token);
    
    if (!token) {
      console.log('토큰 없음');
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    // console.log('디코딩된 토큰:', decoded);
    const userId = decoded.userid;
    // console.log('사용자 ID:', userId);

    // 페이지네이션 파라미터
    const page = parseInt(req.query.page) || 1;
    const limit = 8; // 페이지당 8개
    const offset = (page - 1) * limit;

    // 전체 채팅방 수 조회
    const countResult = await client.query(`
      SELECT COUNT(*)
      FROM chat_rooms cr
      INNER JOIN room_members rm ON rm.roomid = cr.roomid
      WHERE rm.userid = $1
    `, [userId]);

    const totalCount = parseInt(countResult.rows[0].count);

    // 페이지네이션된 채팅방 목록 조회
    const result = await client.query(`
      SELECT 
        cr.roomid,
        cr.groupname,
        cr.isgroup,
        (
          SELECT json_build_object(
            'text', cm.text,
            'sendtime', cm.sendtime
          )
          FROM chat_messages cm
          WHERE cm.roomid = cr.roomid
          ORDER BY cm.sendtime DESC
          LIMIT 1
        ) as last_message
      FROM chat_rooms cr
      INNER JOIN room_members rm ON rm.roomid = cr.roomid
      WHERE rm.userid = $1
      ORDER BY (
        SELECT MAX(sendtime)
        FROM chat_messages
        WHERE roomid = cr.roomid
      ) DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    // console.log('조회된 채팅방:', result.rows);
    res.json({
      chatRooms: result.rows,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount: totalCount
    });
  } catch (error) {
    console.error('채팅방 목록 조회 에러:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
    }
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 채팅방 생성
app.post('/api/chat_rooms', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const creatorId = decoded.userid;
    const { groupname, isgroup, members } = req.body;

    // 입력값 검증
    if (!groupname) {
      return res.status(400).json({ message: '채팅방 이름은 필수입니다.' });
    }

    if (isgroup && (!members || !Array.isArray(members) || members.length === 0)) {
      return res.status(400).json({ message: '그룹 채팅방은 최소 1명의 멤버가 필요합니다.' });
    }

    // 개인 채팅의 경우 상대방 한 명만 지정
    if (!isgroup && (!members || !Array.isArray(members) || members.length !== 1)) {
      return res.status(400).json({ message: '개인 채팅방은 한 명의 상대방이 필요합니다.' });
    }

    await client.query('BEGIN');

    try {
      // 1. 채팅방 생성
      const roomResult = await client.query(
        'INSERT INTO chat_rooms (groupname, isgroup) VALUES ($1, $2) RETURNING roomid',
        [groupname, isgroup]
      );
      const roomId = roomResult.rows[0].roomid;

      // 2. 채팅방 생성자를 멤버로 추가
      await client.query(
        'INSERT INTO room_members (userid, roomid) VALUES ($1, $2)',
        [creatorId, roomId]
      );

      // 3. 다른 멤버들 추가
      for (const memberId of members) {
        // 사용자 존재 여부 확인
        const userExists = await client.query(
          'SELECT userid FROM users WHERE userid = $1',
          [memberId]
        );

        if (userExists.rows.length === 0) {
          throw new Error(`사용자 ${memberId}를 찾을 수 없습니다.`);
        }

        await client.query(
          'INSERT INTO room_members (userid, roomid) VALUES ($1, $2)',
          [memberId, roomId]
        );
      }

      // 4. 시스템 메시지 추가
      await client.query(
        'INSERT INTO chat_messages (roomid, userid, text) VALUES ($1, $2, $3)',
        [roomId, creatorId, '채팅방이 생성되었습니다.']
      );

      await client.query('COMMIT');

      // 생성된 채팅방 정보 조회
      const newRoomResult = await client.query(`
        SELECT 
          cr.roomid,
          cr.groupname,
          cr.isgroup,
          (
            SELECT json_build_object(
              'text', cm.text,
              'sendtime', cm.sendtime
            )
            FROM chat_messages cm
            WHERE cm.roomid = cr.roomid
            ORDER BY cm.sendtime DESC
            LIMIT 1
          ) as last_message
        FROM chat_rooms cr
        WHERE cr.roomid = $1
      `, [roomId]);

      res.status(201).json({
        message: '채팅방이 생성되었습니다.',
        chatRoom: newRoomResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('채팅방 생성 에러:', error);
    res.status(500).json({ message: error.message || '서버 에러가 발생했습니다.' });
  }
});

// 사용자 검색 API
app.get('/api/users/search', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, 'your-secret-key');
    const currentUserId = decoded.userid;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({ users: [] });
    }

    console.log('사용자 검색:', query, '현재 사용자:', currentUserId);

    // 현재 사용자를 제외한 사용자 검색 (userid 또는 username으로 검색)
    const result = await client.query(`
      SELECT userid, username
      FROM users
      WHERE 
        userid != $1 AND
        (
          LOWER(userid) LIKE LOWER($2) OR
          LOWER(username) LIKE LOWER($2)
        )
      ORDER BY 
        CASE 
          WHEN LOWER(userid) = LOWER($3) THEN 1
          WHEN LOWER(username) = LOWER($3) THEN 1
          WHEN LOWER(userid) LIKE LOWER($3 || '%') THEN 2
          WHEN LOWER(username) LIKE LOWER($3 || '%') THEN 2
          ELSE 3
        END,
        username
      LIMIT 10
    `, [currentUserId, `%${query}%`, query]);

    console.log('검색 결과:', result.rows);

    res.json({ 
      users: result.rows.map(user => ({
        userid: user.userid,
        username: user.username
      }))
    });
  } catch (error) {
    console.error('사용자 검색 에러:', error);
    res.status(500).json({ message: '서버 에러가 발생했습니다.' });
  }
});

// 채팅방 메시지 조회 API
app.get('/api/chat_rooms/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await client.query(
      `SELECT m.messageid, m.userid, u.username, m.text, m.sendtime
       FROM chat_messages m
       JOIN "users" u ON m.userid = u.userid
       WHERE m.roomid = $1
       ORDER BY m.sendtime ASC`,
      [roomId]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error('메시지 조회 실패:', err);
    res.status(500).json({ message: '메시지 조회 실패' });
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!')
}); // 테스트용

app.get('/test-timeout', async (req, res) => {
  const start = new Date();
  try {
    await client.query('SELECT pg_sleep(3);');
    const lag = new Date() - start;
    console.log(`Lag: \t${lag} ms`);
  } catch (e) {
    const lag = new Date() - start;
    console.log(`Lag: \t${lag} ms`);
    console.error('pg error', e);
  }

  res.send('test-timeout!');
});

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행중입니다.`);
});

// web socket 연결
io.on('connection', (socket) => {
  console.log('유저 연결 성공', socket.id);
  socket.on('authenticate', async (token) => { // 소켓 연결 시 토큰 검증
    try {
      const decoded = jwt.verify(token, 'your-secret-key'); // 토큰 검증
      socket.userId = decoded.userid; // 토큰에서 사용자 ID 추출
      console.log('👤 유저:', socket.userId, '→ 소켓ID:', socket.id); // 사용자 ID와 소켓 ID 출력
    } catch (err) {
      console.error('토큰 검증 실패:', err);
    }
  });

  // 채팅방 입장
  socket.on('join', (roomId) => {
    socket.join(roomId);
    console.log(`유저 ${socket.userId}가 방 ${roomId}에 입장`);
    // console.log('👤 유저:', user.userId, '→ 소켓ID:', socket.id);
  });

  // 메시지 수신 및 전송
  socket.on('message', async (msg) => {
    console.log('받은 메시지:', msg);

    // 메시지에 userId가 없으면 저장하지 않음
    if (!msg.userId) {
      console.error('userId가 없습니다. 메시지 저장 안함:', msg);
      return;
    }

    // DB 저장
    try {
      await client.query(
        `INSERT INTO chat_messages(roomid, userid, text)
         VALUES($1, $2, $3)`,
        [msg.roomId, msg.userId, msg.text]
      );
    } catch (err) {
      console.error('메시지 저장 실패:', err);
    }

    // 같은 방에만 메시지 전송
    io.to(msg.roomId).emit('message', msg);
  });

  // 연결 끊김 이벤트
  socket.on('disconnect', () => {
    console.log('유저 연결 끊김', socket.id);
  });

});

server.listen(socketPort, () => {
  console.log(`서버가 http://localhost:${socketPort} 에서 실행중입니다.`);
});