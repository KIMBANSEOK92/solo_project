// Node.js Express 서버를 설정합니다.
const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb');
const path = require('path');

const app = express();
const port = 3009;

// CORS 설정: 모든 출처에서의 요청을 허용합니다.
app.use(cors());
// URL-encoded 본문을 파싱하기 위한 미들웨어
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// OracleDB 연결 설정
const dbConfig = {
  user: 'SYSTEM',
  password: 'test1234',
  connectString: 'localhost:1521/xe'
};

/**
 * 회원가입 API
 * 프론트엔드에서 전달받은 회원 정보를 EXERCISE 테이블에 저장합니다.
 */

app.get('/', (req, res) => {
  res.send('Hello World from the backend!');
});

// 모든 학생 목록 조회 (STUDENT 테이블 기준)
app.get('/list', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT * FROM STUDENT`);
    // 메타데이터에서 컬럼 이름을 가져와 JSON 객체로 변환
    const columnNames = result.metaData.map(column => column.name);
    const rows = result.rows.map(row => {
      const obj = {};
      columnNames.forEach((columnName, index) => {
        obj[columnName] = row[index];
      });
      return obj;
    });
    res.json({
      result: "success",
      list: rows
    });
  } catch (error) {
    console.error('Error executing query /list', error);
    res.status(500).send('Error executing query');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 학생 정보 검색
app.get('/search', async (req, res) => {
  const { stuNo } = req.query;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT * FROM EXERCISE WHERE STU_NO = :stuNo`, [stuNo]);
    const columnNames = result.metaData.map(column => column.name);
    const rows = result.rows.map(row => {
      const obj = {};
      columnNames.forEach((columnName, index) => { obj[columnName] = row[index]; });
      return obj;
    });
    res.json(rows);
  } catch (error) {
    console.error('Error executing query /search', error);
    res.status(500).send('Error executing query');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 학생 정보 삽입
app.get('/insert', async (req, res) => {
  const { stuNo, name, dept } = req.query;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `INSERT INTO STUDENT (STU_NO, STU_NAME, STU_DEPT) VALUES (:stuNo, :name, :dept)`,
      [stuNo, name, dept],
      { autoCommit: true }
    );
    res.json({ result: "success" });
  } catch (error) {
    console.error('Error executing insert /insert', error);
    res.status(500).send('Error executing insert');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 학생 정보 수정
app.get('/update', async (req, res) => {
  const { stuNo, name, dept } = req.query;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `UPDATE STUDENT SET STU_NAME = :name, STU_DEPT = :dept WHERE STU_NO = :stuNo`,
      [name, dept, stuNo],
      { autoCommit: true }
    );
    res.json({ result: "success" });
  } catch (error) {
    console.error('Error executing update /update', error);
    res.status(500).send('Error executing update');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 학생 정보 삭제
app.get('/delete', async (req, res) => {
  const { stuNo } = req.query;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(
      `DELETE FROM STUDENT WHERE STU_NO = :stuNo`,
      [stuNo],
      { autoCommit: true }
    );
    res.json({ result: "success" });
  } catch (error) {
    console.error('Error executing delete /delete', error);
    res.status(500).send('Error executing delete');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 게시판 목록 조회
app.get('/board/list', async (req, res) => {
  const { option, keyword } = req.query;
  let subQuery = "";
  if (option == "all") {
    subQuery = `WHERE TITLE LIKE '%${keyword}%' OR CONTENT LIKE '%${keyword}%' OR USERID LIKE '%${keyword}%'`;
  } else if (option == "title") {
    subQuery = `WHERE TITLE LIKE '%${keyword}%'`;
  } else if (option == "user") {
    subQuery = `WHERE USERID LIKE '%${keyword}%'`;
  }
  let query = `SELECT B.*, TO_CHAR(CDATETIME, 'YYYY-MM-DD') CTIME FROM TBL_BOARD B ${subQuery}`;

  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(query);
    const columnNames = result.metaData.map(column => column.name);
    const rows = result.rows.map(row => {
      const obj = {};
      columnNames.forEach((columnName, index) => { obj[columnName] = row[index]; });
      return obj;
    });
    res.json({ result: "success", list: rows });
  } catch (error) {
    console.error('Error executing query /board/list', error);
    res.status(500).send('Error executing query');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 게시판 상세 보기
app.get('/board/view', async (req, res) => {
  const { boardNo } = req.query;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`SELECT B.*, TO_CHAR(CDATETIME, 'YYYY-MM-DD') CTIME FROM TBL_BOARD B WHERE BOARDNO = :boardNo`, [boardNo]);
    const columnNames = result.metaData.map(column => column.name);
    const rows = result.rows.map(row => {
      const obj = {};
      columnNames.forEach((columnName, index) => { obj[columnName] = row[index]; });
      return obj;
    });
    res.json(rows);
  } catch (error) {
    console.error('Error executing query /board/view', error);
    res.status(500).send('Error executing query');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 게시판 삭제
app.get('/board/delete', async (req, res) => {
  const { boardNo } = req.query;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    await connection.execute(`DELETE FROM TBL_BOARD WHERE BOARDNO = :boardNo`, [boardNo], { autoCommit: true });
    res.json({ result: "success" });
  } catch (error) {
    console.error('Error executing delete /board/delete', error);
    res.status(500).send('Error executing delete');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 게시판 수정
app.get('/board/update', async (req, res) => {
  const { title, userid, contents, kind, boardNo } = req.query;
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    let query = `UPDATE TBL_BOARD SET TITLE = :title, CONTENTS = :contents, USERID = :userid, KIND = :kind WHERE BOARDNO = :boardNo`;
    await connection.execute(query, { title, contents, userid, kind, boardNo }, { autoCommit: true });
    res.json({ result: "success" });
  } catch (error) {
    console.error('Error executing update /board/update', error);
    res.status(500).send('Error executing update');
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 로그인
app.get('/login', async (req, res) => {
  const { userId, pwd } = req.query;
  let connection;

  console.log(`로그인 시도: 아이디 = ${userId}`);

  try {
    // 관리자 계정 확인
    if (userId === 'buingsin13' && pwd === 'PRO!333E') {
      console.log('관리자 로그인 성공');
      return res.json([{
        isAdmin: true,
        USERID: 'buingsin13',
        NAME: '관리자',
        GENDER: 'N/A',
        message: '관리자 로그인 성공'
      }]);
    }

    // 오라클 데이터베이스에 연결
    connection = await oracledb.getConnection(dbConfig);

    // 사용자 정보 조회
    const query = `SELECT USERID, NAME, GENDER FROM EXERCISE WHERE USERID = :userId AND PASSWORD = :pwd`;
    const result = await connection.execute(
      query,
      { userId, pwd },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length > 0) {
      console.log('로그인 성공');
      res.json(result.rows); // 항상 배열 형태로 반환
    } else {
      console.log('로그인 실패');
      res.json([]); // 빈 배열 반환
    }
  } catch (error) {
    console.error('로그인 쿼리 실행 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('DB 연결 해제 중 오류 발생:', err);
      }
    }
  }
});

app.get('/check-id', async (req, res) => {
  const { id } = req.query;
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const query = `SELECT COUNT(*) AS CNT FROM EXERCISE WHERE USERID = :id`;
    const result = await connection.execute(
      query,
      { id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const isDuplicate = result.rows[0].CNT > 0;
    res.json({ isDuplicate });
  } catch (error) {
    console.error('아이디 중복 확인 오류:', error);
    res.status(500).json({ isDuplicate: true });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('DB 연결 해제 오류:', err);
      }
    }
  }
});

/**
 * 회원가입 API (PLAYERNO가 없는 경우)
 * PLAYERNO를 랜덤하게 생성하여 회원 정보를 저장합니다.
 */
app.get('/signup', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const { userId, password, name, gender, email, birth, phone } = req.query;

    const playerNo = Math.floor(100000000000 + Math.random() * 900000000000);

    const sql = `
      INSERT INTO EXERCISE (PLAYERNO, USERID, PASSWORD, NAME, GENDER, EMAIL, BIRTH, PHONE)
      VALUES (:playerNo, :userId, :password, :name, :gender, :email, TO_DATE(:birth, 'YYYY-MM-DD'), :phone)
      `;

    const binds = {
      playerNo,
      userId,
      password,
      name,
      gender,
      email,
      birth,
      phone
    };

    const result = await connection.execute(sql, binds, { autoCommit: true });

    if (result.rowsAffected === 1) {
      res.json({ success: true, message: '회원가입이 완료되었습니다.' });
    } else {
      res.status(400).json({ success: false, message: '회원가입에 실패했습니다.' });
    }

  } catch (err) {
    console.error("회원가입 실패:", err);
    if (err.code === 'ORA-01400') {
      res.status(500).json({ success: false, message: `회원가입에 실패했습니다. 필수 항목 누락: ${err.message}` });
    } else {
      res.status(500).json({ success: false, message: '서버 오류가 발생했습니다. ' + err.message });
    }
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("DB 연결 종료 오류:", err);
      }
    }
  }
});

app.get('/findPassword', async (req, res) => {
  let connection;
  try {
    const { email, phone, birth } = req.query;
    if (!email || !phone || !birth) {
      return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }
    connection = await oracledb.getConnection(dbConfig);
    const sql = `SELECT "PASSWORD" FROM "EXERCISE" WHERE "EMAIL" = :email AND "PHONE" = :phone AND "BIRTH" = TO_DATE(:birth, 'YYYY-MM-DD')`;

    const result = await connection.execute(sql, { email, phone, birth });

    if (result.rows.length > 0) {
      const userPassword = result.rows[0][0];
      return res.json({ success: true, message: `비밀번호: ${userPassword}` });
    } else {
      return res.status(404).json({ success: false, message: '일치하는 계정 정보가 없습니다.' });
    }

  } catch (err) {
    console.error('API 호출 또는 쿼리 실행 오류:', err);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다. 다시 시도해주세요.' });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('연결 해제 오류:', err);
      }
    }
  }
});

// 사용자 계정 상세 정보 가져오기 (GET)
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const sql = `SELECT ID, NAME, GENDER, BIRTH, EMAIL, PHONE FROM USER WHERE ID = ?`;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('사용자 데이터 조회 오류:', err);
      return res.status(500).json({ message: '사용자 데이터를 가져오는 중 오류가 발생했습니다.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    res.json(results[0]);
  });
});

// 사용자 계정 탈퇴 (DELETE)
app.delete('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  const { password } = req.body;

  // 실제 애플리케이션에서는 비밀번호를 먼저 확인하는 로직이 필요합니다.
  // 이 예제에서는 비밀번호가 유효하다고 가정하고 진행합니다.
  const sql = `DELETE FROM USER WHERE ID = ?`;
  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('회원 탈퇴 처리 오류:', err);
      return res.status(500).json({ message: '회원 탈퇴에 실패했습니다.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '사용자 정보가 없습니다.' });
    }
    res.status(200).json({ message: '회원 탈퇴가 완료되었습니다.' });
  });
});


// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
