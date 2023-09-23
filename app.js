const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
const isValid = require("date-fns/isValid");
const format = require("date-fns/format");
const toDate = require("date-fns/toDate");
app.use(express.json());
// const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "todoApplication.db");
// const bcrypt = require("bcrypt");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const requestQueriesCheck = async (request, response, next) => {
  const { search_q, priority, status, category, date } = request.query;
  const { todoId } = request.params;
  if (priority !== undefined) {
    const priorityArray = ["HIGH", "MEDIUM", "LOW"];
    const includePriorityValue = priorityArray.includes(priority);
    if (includePriorityValue === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (status !== undefined) {
    const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    const includeStatusValue = statusArray.includes(status);
    if (includeStatusValue === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }

  if (category !== undefined) {
    const categoryArray = ["WORK", "HOME", "LEARNING"];
    const includeCategoryValue = categoryArray.includes(category);
    if (includeCategoryValue === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (date !== undefined) {
    try {
      const myDate = new Date(date);
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      const result = toDate(
        new Date(
          `${myDate.getFullYear()}-${myDate.getMonth() + 1}-${myDate.getDate()}`
        )
      );
      const validDate = await isValid(result);
      if (validDate === true) {
        request.date = formattedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (error) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  request.todoId = todoId;
  request.search_q = search_q;
  next();
};

const requestBodyCheck = async (request, response, next) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const { todoId } = request.params;

  request.todo = todo;
  request.id = id;
  request.todoId = todoId;

  if (priority !== undefined) {
    const priorityList = ["HIGH", "MEDIUM", "LOW"];
    const priorityInclude = priorityList.includes(priority);
    if (priorityInclude === true) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }

  if (status !== undefined) {
    const statusList = ["TO DO", "IN PROGRESS", "DONE"];
    const statusInclude = statusList.includes(status);
    if (statusInclude === true) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (category !== undefined) {
    const categoryArray = ["WORK", "HOME", "LEARNING"];
    const includeCategoryValue = categoryArray.includes(category);
    if (includeCategoryValue === true) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }

  if (dueDate !== undefined) {
    try {
      const myDate = new Date(dueDate);
      const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const result = toDate(new Date(formattedDate));
      const dateValid = await isValid(result);
      if (dateValid === true) {
        request.dueDate = formattedDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (error) {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
  next();
};

app.get("/todos/", requestQueriesCheck, async (request, response) => {
  const { status = "", priority = "", category = "", search_q = "" } = request;
  const getTodoQuery = `
  SELECT
    id,
    todo,
    priority,
    status,
    category,
    due_date as dueDate
FROM
    todo
WHERE
    todo LIKE '%${search_q}%' AND priority LIKE '%${priority}%' AND
    status LIKE '%${status}%' AND category LIKE '%${category}%';`;
  const todoQuery = await db.all(getTodoQuery);
  response.send(todoQuery);
});

app.get("/todos/:todoId/", requestQueriesCheck, async (request, response) => {
  const { todoId } = request;
  const getById = `
    SELECT 
          id,
        todo,
        priority,
        status,
        category,
        due_date as dueDate
    FROM
        todo
    WHERE id = ${todoId};`;
  const getTodo = await db.get(getById);
  response.send(getTodo);
});

app.get("/agenda/", requestQueriesCheck, async (request, response) => {
  const { date } = request;
  const getByDate = `
  SELECT 
          id,
        todo,
        priority,
        status,
        category,
        due_date as dueDate
    FROM
        todo
    WHERE due_date = '${date}';`;

  const getTodoByDate = await db.all(getByDate);

  if (getTodoByDate === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    response.send(getTodoByDate);
  }
});

app.post("/todos/", requestBodyCheck, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request;
  const insertTodoQuery = `INSERT INTO todo(id, todo, priority, status, category, due_date)
  VALUES(${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;
  await db.run(insertTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", requestBodyCheck, async (request, response) => {
  const { todoId } = request;
  const { id, priority, todo, status, dueDate, category } = request;
  console.log(priority, todo, status, dueDate, category);
  switch (true) {
    case status !== undefined:
      const updateStatusQuery = `UPDATE todo SET status = '${status}' WHERE id = ${todoId};`;
      await db.run(updateStatusQuery);
      response.send("Status Updated");
      break;
    case priority !== undefined:
      const updatePriorityQuery = `UPDATE todo SET priority = '${priority}' WHERE id = ${todoId};`;
      await db.run(updatePriorityQuery);
      response.send("Priority Updated");
      break;
    case category !== undefined:
      const updateCategoryQuery = `UPDATE todo SET category = '${category}' WHERE id = ${todoId};`;
      await db.run(updateCategoryQuery);
      response.send("Category Updated");
      break;
    case todo !== undefined:
      const updateTodoQuery = `UPDATE todo SET todo = '${todo}' WHERE id = ${todoId};`;
      await db.run(updateTodoQuery);
      response.send("Todo Updated");
      break;
    case dueDate !== undefined:
      const updateDueDateQuery = `UPDATE todo SET due_date = '${dueDate}' WHERE id = ${todoId};`;
      await db.run(updateDueDateQuery);
      response.send("Due Date Updated");
      break;
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});
module.exports = app;
