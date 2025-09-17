const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb'); // OracleDB 드라이버 사용
const path = require('path');

const app = express();
const port = 3009;

// CORS 설정: 모든 출처에서의 요청을 허용합니다.
app.use(cors());
// JSON 요청 본문을 파싱하기 위한 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OracleDB 연결 설정
const dbConfig = {
  user: 'SYSTEM',           // 실제 OracleDB 사용자명으로 변경하세요.
  password: 'test1234',     // 실제 OracleDB 비밀번호로 변경하세요.
  connectString: 'localhost:1521/xe' // OracleDB SID 또는 Service Name에 맞게 변경하세요.
};

// --- API 엔드포인트 ---

/**
 * ID 중복 확인 API
 * 프론트엔드에서 입력한 아이디가 데이터베이스에 존재하는지 확인합니다.
 */
app.get('/check-id', async (req, res) => {
  let connection;
  try {
    const userId = req.query.id;
    if (!userId) {
      return res.status(400).json({ isDuplicate: true, message: '아이디를 입력해주세요.' });
    }

    connection = await oracledb.getConnection(dbConfig);
    // ESERCISE 테이블에서 해당 USERID를 가진 레코드 수를 셉니다.
    const result = await connection.execute(
      `SELECT COUNT(*) FROM ESERCISE WHERE USERID = :id`,
      { id: userId } // 바인드 변수를 사용하여 SQL Injection 방지
    );
    // 결과의 첫 번째 행, 첫 번째 열에 중복 여부 (0 또는 1 이상)가 있습니다.
    const isDuplicate = result.rows[0][0] > 0;
    res.json({ isDuplicate }); // { isDuplicate: true/false } 형태로 응답

  } catch (err) {
    console.error("ID 중복 확인 오류:", err);
    // 오류 발생 시 클라이언트에게 서버 오류 메시지 전달
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  } finally {
    // DB 연결이 있으면 반드시 종료합니다.
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("DB 연결 종료 오류:", err);
      }
    }
  }
});

/**
 * 회원가입 API
 * 프론트엔드에서 전달받은 회원 정보를 ESERCISE 테이블에 저장합니다.*/

app.get('/signup', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const { userId, password, name, gender, email, birth, phone } = req.query;

    const sql = `
    INSERT INTO ESERCISE (PLAYERNO, USERID, PASSWORD, NAME, GENDER, EMAIL, BIRTH, PHONE)
    VALUES (ESERCASE_SEQ.NEXTVAL, :userId, :password, :name, :gender, :email, TO_DATE(:birth, 'YYYY-MM-DD'), :phone)
    `;

    const binds = {
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
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다. ' + err.message });
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

// --- 기존 API 엔드포인트 (필요에 따라 유지 또는 수정) ---

// 루트 경로 ("/")
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
    const result = await connection.execute(`SELECT * FROM STUDENT WHERE STU_NO = :stuNo`, [stuNo]);
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
  try {
    connection = await oracledb.getConnection(dbConfig);
    const query = `SELECT USERID, NAME, GENDER FROM ESERCISE WHERE USERID = :userId AND PASSWORD = :pwd`;
    const result = await connection.execute(query, { userId: userId, pwd: pwd }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    if (result.rows.length > 0) {
      res.json(result.rows); // 로그인 성공 시 사용자 정보 반환
    } else {
      res.json([]); // 로그인 실패 시 빈 배열 반환
    }
  } catch (error) {
    console.error('로그인 쿼리 실행 중 오류 발생:', error);
    res.status(500).send('서버 오류: ' + error.message);
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('DB 연결 해제 중 오류 발생:', err); }
    }
  }
});
app.get('/signup1', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const { userId, password, name, gender, email, birth, phone } = req.query;

    // PLAYERNO에 시퀀스 값을 삽입하도록 쿼리 수정
    const sql = `
            INSERT INTO ESERCASE (PLAYERNO, USERID, PASSWORD, NAME, GENDER, EMAIL, BIRTH, PHONE)
            VALUES (ESERCASE_SEQ.NEXTVAL, :userId, :password, :name, :gender, :email, TO_DATE(:birth, 'YYYY-MM-DD'), :phone)
        `;

    const binds = {
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
    // ORA-01400 오류 처리 (PLAYERNO NOT NULL)
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


// --- 비밀번호 찾기 API ---
app.post('/findPassword', async (req, res) => { // POST로 변경
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const { email, phone, birth } = req.body; // POST 요청이므로 req.body 사용

    // DB 쿼리 실행 - 테이블 이름을 'exer_case'로 수정
    const sql = `
            SELECT PASSWORD
            FROM exer_case
            WHERE EMAIL = :email AND PHONE = :phone AND BIRTH = TO_DATE(:birth, 'YYYY-MM-DD')
        `;

    const binds = {
      email: email,
      phone: phone,
      birth: birth // 생년월일도 WHERE 절에 추가 (보안 강화)
    };

    const result = await connection.execute(sql, binds);
    const user = result.rows[0];

    if (user) {
      // 비밀번호를 찾았을 경우
      res.json({ success: true, message: `회원님의 비밀번호는 '${user[0]}' 입니다.` });
    } else {
      // 정보가 일치하는 회원이 없을 경우
      res.status(404).json({ success: false, message: '일치하는 회원 정보가 없습니다.' });
    }
  } catch (err) {
    console.error("비밀번호 찾기 실패:", err);
    // ORA-00942 에러 발생 시
    if (err.code === 'ORA-00942') {
      res.status(500).json({ success: false, message: '서버 오류가 발생했습니다. (테이블 접근 오류)' });
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

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});