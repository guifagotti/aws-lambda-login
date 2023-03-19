async function verifyUserToken(client, email, verifyToken, fn) {
  const searchQuery = `SELECT * FROM table_user where "mail" = '${email}'`;
  let result;
  let result2;
  try {
    result = await client.query(searchQuery);
    console.log("searchQuery", searchQuery);
    console.log("result", result.rows);
    if (result.rows.length > 0 && result.rows[0]["mailToken"] === verifyToken) {
      var userName = result.rows[0].name;
      var userID = result.rows[0]["userID"];
      const updateUserQuery = `UPDATE table_user SET verified = true WHERE "userID" = ${userID}`;

      result2 = await client.query(updateUserQuery);
      console.log("result2", result2);
      if (result2.rowCount === 1) {
        fn(null, true, userName);
      } else fn("Error on update User");
    } else fn("Invalid Token");
  } catch (error) {
    console.log("error search ", error);
    return fn(error);
  }
}

async function verifyUser(pool, userData) {
  var email = userData.user;
  var verifyToken = userData.token;
  const client = await pool.connect();
  return new Promise((resolve, reject) => {
    verifyUserToken(
      client,
      email,
      verifyToken,
      function (err, verified, userName) {
        if (err) {
          console.log("Error in verifyUserToken: " + err);
          client.release(true);
          resolve({
            withError: true,
            resultCode: 403,
            resultData: "Error in verifyUserToken: " + err,
          });
        } else {
          client.release(true);
          resolve({
            withError: false,
            resultCode: 200,
            resultData: userName,
          });
        }
      }
    );
  });
}

module.exports = {
  verifyUser,
};
