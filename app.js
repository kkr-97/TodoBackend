const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("./node_modules/date-fns/format");
const isValid = require("./node_modules/date-fns/isValid");
const toDate = require("./node_modules/date-fns/toDate");

const app = express();
let db;
const initDBServer = async () => {
  try {
    db = await open({
      filename: path.join(__dirname, "todoApplication.db"),
      driver: sqlite3.Database,
    });
    app.listen(3000);
  } catch (e) {
    console.log(e);
  }
};

initDBServer();
app.use(express.json());

const verifyQueries = (req, res, next) => {
  let {
    status = "",
    priority = "",
    category = "",
    dueDate = "",
    date = "",
  } = req.getObject;
  if (dueDate === "") {
    dueDate = date;
  }

  let flag = 0;

  if (status != "") {
    if (!(status == "TO DO" || status == "IN PROGRESS" || status == "DONE")) {
      res.status(400);
      res.send("Invalid Todo Status");
      flag++;
    }
  }
  if (priority != "") {
    if (!(priority == "HIGH" || priority == "MEDIUM" || priority == "LOW")) {
      res.status(400);
      res.send("Invalid Todo Priority");
      flag++;
    }
  }
  if (category != "") {
    if (!(category == "WORK" || category == "HOME" || category == "LEARNING")) {
      res.status(400);
      res.send("Invalid Todo Category");
      flag++;
    }
  }
  if (dueDate != "") {
    if (!isValid(new Date(dueDate))) {
      res.status(400);
      res.send("Invalid Due Date");
      flag++;
    }
  }
  if (flag === 0) {
    next();
  }
};

const verifyGet = (req, res, next) => {
  req.getObject = req.query;
  next();
};

const verifyPost = (req, res, next) => {
  req.getObject = req.body;
  next();
};

app.get("/todos/", verifyGet, verifyQueries, async (req, res) => {
  const {
    id = "",
    todo = "",
    priority = "",
    status = "",
    category = "",
    dueDate = "",
    search_q = "",
  } = req.query;
  const dbQuery = `
     SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo
     WHERE status LIKE '%${status}%' AND priority LIKE '%${priority}%' AND todo LIKE '%${search_q}%' AND category LIKE '%${category}%';
    `;
  const result = await db.all(dbQuery);
  res.send(result);
});

app.get("/todos/:todoId/", verifyGet, verifyQueries, async (req, res) => {
  const { todoId } = req.params;
  const dbQuery = `
    SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo WHERE id = ${todoId};
    `;
  const result = await db.get(dbQuery);
  res.send(result);
});

app.get("/agenda/", verifyGet, verifyQueries, async (req, res) => {
  const { date } = req.query;
  const dbQuery = `
    SELECT id, todo, priority, status, category, due_date AS dueDate FROM todo WHERE due_date = '${date}';
    `;
  const result = await db.all(dbQuery);
  res.send(result);
});

app.post("/todos/", verifyPost, verifyQueries, async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  let date = toDate(new Date(dueDate));
  date = format(date, "yyyy-LL-dd");
  console.log(typeof date);
  const dbQuery = `
  INSERT INTO todo VALUES(${id}, '${todo}', '${priority}', '${status}', '${category}', '${date}');
  `;
  await db.run(dbQuery);
  res.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", verifyPost, verifyQueries, async (req, res) => {
  const { todoId } = req.params;
  const {
    status = "",
    todo = "",
    priority = "",
    category = "",
    dueDate = "",
  } = req.body;
  let dbQuery;
  let msg = "";
  if (status != "") {
    dbQuery = `
        UPDATE todo SET status = '${status}' WHERE id = ${todoId};
      `;
    msg = "Status Updated";
  } else if (priority != "") {
    dbQuery = `
        UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};
      `;
    msg = "Priority Updated";
  } else if (category != "") {
    dbQuery = `
        UPDATE todo SET category = '${category}' WHERE id = ${todoId};
      `;
    msg = "Category Updated";
  } else if (dueDate != "") {
    let date = toDate(new Date(dueDate));
    date = format(date, "yyyy-LL-dd");
    dbQuery = `
        UPDATE todo SET due_date = '${date}' WHERE id = ${todoId};
      `;
    msg = "Due Date Updated";
  } else if (todo != "") {
    dbQuery = `
        UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};
      `;
    msg = "Todo Updated";
  }

  await db.run(dbQuery);
  res.send(msg);
});

app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const dbQuery = `
      DELETE FROM todo WHERE id = ${todoId};
    `;
  await db.run(dbQuery);
  res.send("Todo Deleted");
});

module.exports = app;
