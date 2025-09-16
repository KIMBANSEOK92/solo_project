const express = require('express');
const cors = require('cors');
const path = require('path');
const oracledb = require('oracledb');

const app = express();
app.use(cors());

// ejs 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '.')); // .은 경로

const config = {
  user: 'SYSTEM',
  password: 'test1234',
  connectString: 'localhost:1521/xe'
};

// Oracle 데이터베이스와 연결을 유지하기 위한 전역 변수
let connection;

// 데이터베이스 연결 설정
async function initializeDatabase() {
  try {
    connection = await oracledb.getConnection(config);
    console.log('Successfully connected to Oracle database');
  } catch (err) {
    console.error('Error connecting to Oracle database', err);
  }
}

initializeDatabase();

// 엔드포인트
app.get('/', (req, res) => {
  res.send('Hello World');
});

app.get('/list', async (req, res) => {
  const { } = req.query;
  try {
    const result = await connection.execute(`SELECT * FROM STUDENT`);
    const columnNames = result.metaData.map(column => column.name);
    // 쿼리 결과를 JSON 형태로 변환
    const rows = result.rows.map(row => {
      // 각 행의 데이터를 컬럼명에 맞게 매핑하여 JSON 객체로 변환
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
    console.error('Error executing query', error);
    res.status(500).send('Error executing query');
  }
});


app.get('/search', async (req, res) => {
  const { stuNo } = req.query;
  try {
    const result = await connection.execute(`SELECT * FROM STUDENT WHERE STU_NO = ${stuNo}`);
    const columnNames = result.metaData.map(column => column.name);

    // 쿼리 결과를 JSON 형태로 변환
    const rows = result.rows.map(row => {
      // 각 행의 데이터를 컬럼명에 맞게 매핑하여 JSON 객체로 변환
      const obj = {};
      columnNames.forEach((columnName, index) => {
        obj[columnName] = row[index];
      });
      return obj;
    });
    res.json(rows);
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).send('Error executing query');
  }
});

app.get('/insert', async (req, res) => {
  const { stuNo, name, dept } = req.query;

  try {
    await connection.execute(
      `INSERT INTO STUDENT (STU_NO, STU_NAME, STU_DEPT) VALUES (:stuNo, :name, :dept)`,
      [stuNo, name, dept],
      { autoCommit: true }
    );
    res.json({
      result: "success"
    });
  } catch (error) {
    console.error('Error executing insert', error);
    res.status(500).send('Error executing insert');
  }
});


app.get('/update', async (req, res) => {
  const { stuNo, name, dept } = req.query;

  try {
    await connection.execute(
      `UPDATE STUDENT SET STU_NAME = :name, STU_DEPT = :dept WHERE STU_NO = :stuNo`,
      [name, dept, stuNo],
      { autoCommit: true }
    );
    res.json({
      result: "success"
    });
  } catch (error) {
    console.error('Error executing update', error);
    res.status(500).send('Error executing update');
  }
});


app.get('/delete', async (req, res) => {
  const { stuNo } = req.query;

  try {
    await connection.execute(
      `DELETE FROM STUDENT WHERE STU_NO = :stuNo`,
      [stuNo],
      { autoCommit: true }
    );
    res.json({
      result: "success"
    });
  } catch (error) {
    console.error('Error executing delete', error);
    res.status(500).send('Error executing delete');
  }
});

app.get('/board/list', async (req, res) => {
  const { option, keyword } = req.query;
  let subQuery = "";
  if (option == "all") {
    subQuery = `WHERE TITLE LIKE '%${keyword}%' `
  } else if (option == "title") {
    subQuery = `WHERE TITLE LIKE '%${keyword}%' `
  } else if (option == "user") {
    subQuery = `WHERE USERID LIKE '%${keyword}%' `
  }
  let query =
    `SELECT B.*, TO_CHAR(CDATETIME, 'YYYY-MM-DD') CTIME `
    + `FROM TBL_BOARD B ` + subQuery;

  try {
    const result = await connection.execute(query);
    const columnNames = result.metaData.map(column => column.name);
    // 쿼리 결과를 JSON 형태로 변환
    const rows = result.rows.map(row => {
      // 각 행의 데이터를 컬럼명에 맞게 매핑하여 JSON 객체로 변환
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
    console.error('Error executing query', error);
    res.status(500).send('Error executing query');
  }
});
app.get('/board/view', async (req, res) => {
  const { boardNo } = req.query;
  try {
    const result = await connection.execute(`SELECT B.*, TO_CHAR(CDATETIME, 'YYYY-MM-DD') CTIME FROM TBL_BOARD B WHERE BOARDNO = ${boardNo}`);
    const columnNames = result.metaData.map(column => column.name);

    // 쿼리 결과를 JSON 형태로 변환
    const rows = result.rows.map(row => {
      // 각 행의 데이터를 컬럼명에 맞게 매핑하여 JSON 객체로 변환
      const obj = {};
      columnNames.forEach((columnName, index) => {
        obj[columnName] = row[index];
      });
      return obj;
    });
    res.json(rows);
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).send('Error executing query');
  }
});
app.get('/board/delete', async (req, res) => {
  const { boardNo } = req.query;

  try {
    await connection.execute(
      `DELETE FROM TBL_BOARD WHERE BOARDNO = :boardNo`,
      [boardNo],
      { autoCommit: true }
    );
    res.json({
      result: "success"
    });
  } catch (error) {
    console.error('Error executing delete', error);
    res.status(500).send('Error executing delete');
  }
});
app.get('/board/update', async (req, res) => {
  const { title, userid, contents, kind, boardNo } = req.query;
  let query =
    `UPDATE TBL_BOARD SET `
    + ` TITLE = '${title}', `
    + ` CONTENTS = '${contents}', `
    + ` USERID = '${userid}', `
    + ` KIND = ${kind}  `
    + ` WHERE BOARDNO = ${boardNo}  `;
  console.log(query);
  try {
    await connection.execute(
      query,
      [],
      { autoCommit: true }
    );
    res.json({
      result: "success"
    });
  } catch (error) {
    console.error('Error executing update', error);
    res.status(500).send('Error executing update');
  }
});
app.get('/board/insert', async (req, res) => {
  const { title, userid, contents, kind } = req.query;
  let query =
    `INSERT INTO TBL_BOARD `
    + ` VALUES(B_SEQ.NEXTVAL, '${title}', '${contents}', '${userid}', 0, 0, ${kind}, SYSDATE, SYSDATE)`;

  try {
    await connection.execute(
      query,
      [],
      { autoCommit: true }
    );
    res.json({
      result: "success"
    });
  } catch (error) {
    console.error('Error executing insert', error);
    res.status(500).send('Error executing insert');
  }
});
app.get('/login', async (req, res) => {
  const { userId, pwd } = req.query;
  let connection;
  try {
    connection = await oracledb.getConnection(config);

    // **중요**: FROM 절의 'PLAYER'를 실제 DB의 테이블 이름으로 변경하세요.
    // (예: FROM PLAYERO 또는 FROM PLAYER)
    // 컬럼명(USERID, PASSWORD)도 정확히 일치하는지 확인하세요.
    const query = `
      SELECT USERID, NAME, GENDER 
      FROM ESERCISE
      WHERE USERID = :userId AND PASSWORD = :pwd
    `;

    // 쿼리 실행
    const result = await connection.execute(
      query,
      { userId: userId, pwd: pwd },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // 로그인 성공/실패 여부에 따라 응답
    if (result.rows.length > 0) {
      res.json(result.rows);
    } else {
      res.json([]);
    }

  } catch (error) {
    console.error('로그인 쿼리 실행 중 오류 발생:', error);
    // 디버깅을 위해 상세 오류 메시지를 포함하여 응답
    res.status(500).send('서버 오류: ' + error.message);
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
app.get('/user/info', async (req, res) => {
  const { userId } = req.query;
  let query = `SELECT * FROM TBL_USER WHERE USERID = '${userId}' `;
  try {
    const result = await connection.execute(query);
    const columnNames = result.metaData.map(column => column.name);

    // 쿼리 결과를 JSON 형태로 변환
    const rows = result.rows.map(row => {
      // 각 행의 데이터를 컬럼명에 맞게 매핑하여 JSON 객체로 변환
      const obj = {};
      columnNames.forEach((columnName, index) => {
        obj[columnName] = row[index];
      });
      return obj;
    });
    res.json(rows);
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).send('Error executing query');
  }
});


// 서버 시작
app.listen(3009, () => {
  console.log('Server is running on port 3009');
});
