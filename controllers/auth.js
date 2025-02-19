const con = require("../db");

const checkUserExists = async (tgId) => {
  try {
    const [rows] = await con
      .promise()
      .query("SELECT * FROM users WHERE tg_id = ?", [tgId]);

    return rows[0];
  } catch (err) {
    console.error("checkUserExists error:", err);
    return false;
  }
};

const createUser = async (user) => {
  try {
    const [res] = await con
      .promise()
      .query(
        "INSERT INTO users (tg_id, first_name, last_name, username, language_code, is_bot) VALUES (?, ?, ?, ?, ?, ?)",
        [
          user.id,
          user.first_name,
          user.last_name,
          user.username,
          user.language_code,
          user.is_bot,
        ]
      );
    const userId = console.log(res.insertId);
    return userId;
  } catch (err) {
    console.error("createUser error:", err);
  }
};

module.exports = { checkUserExists, createUser };
