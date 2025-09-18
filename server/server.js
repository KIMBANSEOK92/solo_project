const express = require('express');
const cors = require('cors');
const oracledb = require('oracledb');
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
  user: 'SYSTEM',
  password: 'test1234',
  connectString: 'localhost:1521/xe'
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
      `SELECT COUNT(*) FROM ESERCASE WHERE USERID = :id`,
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
 * 프론트엔드에서 전달받은 회원 정보를 ESERCASE 테이블에 저장합니다.
 */

app.get('/signup', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const { userId, password, name, gender, email, birth, phone } = req.query;

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
    const query = `SELECT USERID, NAME, GENDER FROM ESERCASE WHERE USERID = :userId AND PASSWORD = :pwd`;
    const result = await connection.execute(query, { userId: userId, pwd: pwd }, { outFormat: oracledbe.OUT_FORMAT_OBJECT });

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

    // PLAYERNO에 랜덤한 12자리 숫자 값을 생성
    // Math.random()을 사용하여 100000000000부터 999999999999까지의 숫자를 생성
    const playerNo = Math.floor(100000000000 + Math.random() * 900000000000);

    const sql = `
      INSERT INTO ESERCASE (PLAYERNO, USERID, PASSWORD, NAME, GENDER, EMAIL, BIRTH, PHONE)
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


app.get('/findPassword', async (req, res) => {
  let connection;
  try {
    // 요청 쿼리에서 데이터 추출
    const { email, phone, birth } = req.query;

    // 데이터 유효성 검사
    if (!email || !phone || !birth) {
      return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }

    // Oracle 데이터베이스에 연결
    connection = await oracledb.getConnection(dbConfig);

    // 데이터베이스에서 사용자 정보를 찾는 SQL 쿼리
    // 날짜 형식 불일치 오류를 해결하기 위해 TO_DATE 함수를 사용했습니다.
    const sql = `SELECT "PASSWORD" FROM "ESERCASE" WHERE "EMAIL" = :email AND "PHONE" = :phone AND "BIRTH" = TO_DATE(:birth, 'YYYY-MM-DD')`;

    // 쿼리 실행
    const result = await connection.execute(
      sql,
      { email, phone, birth }
    );

    // 쿼리 결과 확인
    if (result.rows.length > 0) {
      // 사용자를 찾았을 경우, 비밀번호를 반환
      // OracleDB는 결과를 2차원 배열로 반환합니다. (rows: [ [ 'value' ] ])
      const userPassword = result.rows[0][0];
      return res.json({ success: true, message: `비밀번호: ${userPassword}` });
    } else {
      // 사용자를 찾지 못했을 경우
      return res.status(404).json({ success: false, message: '일치하는 계정 정보가 없습니다.' });
    }

  } catch (err) {
    console.error('API 호출 또는 쿼리 실행 오류:', err);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다. 다시 시도해주세요.' });
  } finally {
    // 연결이 존재하면 해제
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('연결 해제 오류:', err);
      }
    }
  }
});

// GET endpoint to fetch user details for MyPage
// "계정 상세" (Account details) 기능
app.get('/mypage/details/:playerNo', async (req, res) => {
  let connection;
  try {
    const playerNo = req.params.playerNo;
    connection = await oracledb.getConnection(dbConfig);
    const query = `SELECT PLAYERNO, USERID, NAME, GENDER, TO_CHAR(BIRTH, 'YYYY-MM-DD') AS BIRTH, EMAIL, PHONE FROM ESERCASE WHERE PLAYERNO = :playerNo`;
    const result = await connection.execute(query, { playerNo: playerNo }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

    if (result.rows.length > 0) {
      res.json({ success: true, user: result.rows[0] });
    } else {
      res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ success: false, message: '사용자 정보를 가져오는 중 서버 오류가 발생했습니다.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// GET endpoint to handle user withdrawal (account deletion)
// NOTE: For a real-world application, a DELETE method is the correct choice for this type of action.
// "회원 탈퇴" (Account withdrawal) 기능
app.get('/mypage/withdraw/:playerNo', async (req, res) => {
  let connection;
  try {
    const playerNo = req.params.playerNo;
    connection = await oracledb.getConnection(dbConfig);
    const query = `DELETE FROM ESERCASE WHERE PLAYERNO = :playerNo`;
    const result = await connection.execute(query, { playerNo: playerNo }, { autoCommit: true });

    if (result.rowsAffected === 1) {
      res.json({ success: true, message: '회원 탈퇴가 완료되었습니다.' });
    } else {
      res.status(404).json({ success: false, message: '탈퇴할 사용자를 찾을 수 없습니다.' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: '회원 탈퇴 처리 중 서버 오류가 발생했습니다.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});


// GET endpoint for "best of the month" running shoes
app.get('/api/shoes/best', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    // LIMIT 대신 ROWNUM을 사용합니다.
    const query = 'SELECT ORDERNO, PRODUCT_NAME, PRODUCT_IMAGE, COLOR FROM RUNNING_SHOES WHERE ROWNUM <= 3 ORDER BY RECOMMEND_COUNT DESC';
    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching best shoes:', err);
    res.status(500).json({ error: 'Failed to fetch shoe data.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// GET endpoint for "most recommended" running shoes
app.get('/api/shoes/recommended', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const query = 'SELECT ORDERNO, PRODUCT_NAME, PRODUCT_IMAGE, COLOR FROM RUNNING_SHOES ORDER BY RECOMMEND_COUNT DESC';
    const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching recommended shoes:', err);
    res.status(500).json({ error: 'Failed to fetch recommended shoes.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// Endpoint to handle "추천" (recommendation)
app.post('/api/shoes/recommend/:orderNo', async (req, res) => {
  let connection;
  try {
    const orderNo = req.params.orderNo;
    connection = await oracledb.getConnection(dbConfig);
    const query = 'UPDATE RUNNING_SHOES SET RECOMMEND_COUNT = RECOMMEND_COUNT + 1 WHERE ORDERNO = :orderNo';
    const result = await connection.execute(query, { orderNo: orderNo }, { autoCommit: true });

    if (result.rowsAffected === 1) {
      res.status(200).json({ message: '추천이 완료되었습니다.' });
    } else {
      res.status(404).json({ message: '신발을 찾을 수 없습니다.' });
    }
  } catch (err) {
    console.error('Error updating recommendation count:', err);
    res.status(500).json({ error: 'Failed to recommend.' });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (err) { console.error('Error closing database connection', err); }
    }
  }
});

// 서버 시작
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
