const cryptoUtils = require("../lib/cryptoUtils");

async function getUser(client, email) {
  const searchQuery = `
    SELECT "userID", name, pass, passwordsalt 
      FROM table_user
    WHERE mail = $1`;

  const result = await client.query(searchQuery, [email]);

  if (result.rows.length > 0) {
    const user = result.rows[0];
    return {
      id: user["userID"],
      name: user["name"],
      hash: user["pass"],
      salt: user["passwordsalt"],
    };
  }
  return null;
}

async function changePass(client, newPassword, id) {
  const { salt, hash } = await cryptoUtils.computeHash(newPassword);
  const updatePassQuery = `
    UPDATE table_user
    SET pass = $1, passwordsalt = $2
    WHERE "userID" = $3`;

  const result = await client.query(updatePassQuery, [hash, salt, id]);
  return result.rowCount === 1;
}

async function updateUserPass(pool, { email, oldPassword, newPassword }) {
  const client = await pool.connect();
  try {
    const user = await getUser(client, email);

    if (!user) {
      return { withError: true, resultCode: 404, resultData: `User not found: ${email}` };
    }

    const { hash: correctHash, salt } = await cryptoUtils.computeHash(oldPassword, user.salt);

    if (correctHash !== user.hash) {
      return {
        withError: true,
        resultCode: 401,
        resultData: `Old password incorrect for user: ${email}`,
      };
    }

    const success = await changePass(client, newPassword, user.id);

    if (!success) {
      return { withError: true, resultCode: 500, resultData: "Error updating user password" };
    }

    return { withError: false, resultCode: 200, email };
  } catch (error) {
    return { withError: true, resultCode: 500, resultData: error.message };
  } finally {
    client.release();
  }
}

module.exports = {
  updateUserPass,
};
