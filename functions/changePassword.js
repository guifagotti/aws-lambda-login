var cryptoUtils = require("../lib/cryptoUtils");

async function getUser(client, email, fn) {
  const searchQuery = `
  SELECT "userID", name, pass, passwordsalt 
    FROM table_user
  where mail = '${email}'`;

  let result;
  try {
    result = await client.query(searchQuery);

    console.log("searchQuery :", searchQuery);
    console.log("search User :", result);
    if (result.rows.length > 0) {
      let userReturnData = {
        id: result.rows[0]["userID"],
        user: result.rows[0]["name"],
      };

      var hash = result.rows[0].pass;
      var salt = result.rows[0].passwordsalt;
      fn(null, hash, salt, userReturnData);
    } else fn(null, null);
  } catch (error) {
    console.log("Search user ERROR:", error);
    return fn(error);
  }
}

async function changePass(client, newPass, id, fn) {
  let passEnc = null;
  let saltPass = null;

  return cryptoUtils.computeHash(newPass, async function (err, salt, hash) {
    if (err) {
      console.log("Error in hash: " + err);
    } else {
      const updatePassQuery = `UPDATE table_user SET pass = '${hash}', passwordsalt = '${salt}' WHERE "userID" = ${id}`;
      let result;
      try {
        console.log("updatePassQuery", updatePassQuery);
        result = await client.query(updatePassQuery);
        console.log("result", result);
        if (result.rowCount === 1) {
          fn(null);
        } else fn("Error on update User Pass");
      } catch (error) {
        console.log("Update user pass ERROR:", error);
        return fn(error);
      }
    }
  });
}

async function updateUserPass(pool, userData) {
  var email = userData.email;
  var oldPassword = userData.oldpassword;
  var newPassword = userData.newpassword;
  const client = await pool.connect();
  return new Promise((resolve, reject) => {
    getUser(client, email, function (err, correctHash, salt, userDataGet) {
      if (err) {
        console.log("Error in getUser: " + err);
        client.release(true);
        resolve({
          withError: true,
          resultCode: 500,
          resultData: "Error in getUser: " + err,
        });
      } else {
        if (correctHash == null) {
          console.log("User not found: " + email);
          client.release(true);
          resolve({
            withError: true,
            resultCode: 404,
            resultData: "User not found: " + email,
          });
        } else {
          cryptoUtils.computeHash(
            oldPassword,
            salt,
            function (err, salt, hash) {
              if (err) {
                console.log("Error in hash: " + err);
                client.release(true);
                resolve({
                  withError: true,
                  resultCode: 401,
                  resultData: "Old password incorrect: " + err,
                });
              } else {
                console.log("correctHash: " + correctHash + " hash: " + hash);
                if (hash == correctHash) {
                  // OldPass ok
                  changePass(client, newPassword, userDataGet.id, function (err) {
                    if (err) {
                      console.log("Error in updateUser Pass: " + err);
                      resolve({
                        withError: true,
                        resultCode: 500,
                        resultData: "Error in updateUser Pass: " + err,
                      });
                    } else {
                      resolve({ withError: false, resultCode: 200, email });
                    }
                  });
                } else {
                  // Change Pass failed
                  console.log("User Change Pass failed: " + email);
                  resolve({
                    withError: true,
                    resultCode: 401,
                    resultData: "Old password incorrect for user: " + email,
                  });
                }
              }
            }
          );
        }
      }
    });
  });
}

module.exports = {
  updateUserPass,
};
