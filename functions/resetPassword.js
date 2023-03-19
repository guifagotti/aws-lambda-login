console.log("Loading function");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
var crypto = require("crypto");
var config = require("./config.json");
var ses = new SESClient({ region: "us-east-1" });
var cryptoUtils = require("../lib/cryptoUtils");

function tokenSentDiffHours(tokenDate) {
  var diff = (new Date().getTime() - new Date(tokenDate).getTime()) / 1000;
  diff /= 60 * 60;
  return Math.abs(Math.round(diff));
}

async function changePass(client, newPass, id, fn) {
  return cryptoUtils.computeHash(newPass, async function (err, salt, hash) {
    if (err) {
      console.log("Error in hash: " + err);
    } else {
      const updatePassQuery = `UPDATE table_user SET pass = '${hash}', passwordsalt = '${salt}' WHERE "userID" = ${id}`;
      console.log('updatePassQuery',updatePassQuery)
      let result;
      try {
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

async function verifyResetToken(client, email, verifyToken, fn) {
  const searchQuery = `SELECT * FROM table_user where "mail" = '${email}'`;
  let result;
  let userID;
  try {
    result = await client.query(searchQuery);
    console.log("searchQuery", searchQuery);
    console.log("result", result.rows);
    if (result.rows.length > 0 && result.rows[0]["mailToken"] === verifyToken) {
      const tokenSentHours = tokenSentDiffHours(
        result.rows[0]["mailTokenData"]
      );
      console.log("tokenSentHours :", tokenSentHours);
      if (tokenSentHours > 6) fn(null, true, userID);
      if (tokenSentHours < 6) {
        userID = result.rows[0].userID;
        fn(null, true, userID);
      } else fn(null, false);
    } else fn("Invalid Token");
  } catch (error) {
    console.log("error search ", error);
    return fn(error);
  }
}

async function checkUser(client, email, fn) {
  const searchQuery = `
    SELECT "userID", name, active 
      FROM table_user
    where mail = '${email}'`;

  let result;
  try {
    result = await client.query(searchQuery);

    console.log("searchQuery :", searchQuery);
    console.log("search User :", result);
    if (result.rows.length > 0) {
      let userReturnData = {
        id: result.rows[0]["id"],
        user: result.rows[0]["cd_name"],
      };

      var active = result.rows[0].active;
      fn(null, active, userReturnData);
    } else fn(null, null);
  } catch (error) {
    console.log("Search user ERROR:", error);
    return fn(error);
  }
}

async function storeLostToken(client, email, fn) {
  var len = 128;
  crypto.randomBytes(len, async function (err, token) {
    if (err) return fn(err);
    token = token.toString("hex");
    const setResetPassTokenQuery = `UPDATE table_user SET "mailToken" = '${token}', "mailTokenData" = current_timestamp WHERE "mail" = '${email}'`;

    let result;
    console.log("email :", email);
    console.log("setResetPassTokenQuery :", setResetPassTokenQuery);
    try {
      result = await client.query(setResetPassTokenQuery);
      console.log("result setResetPassTokenQuery", result);
      if (result.rowCount > 0) {
        fn(null, token);
      } else fn("Error on set Reset Pass Token");
    } catch (error) {
      console.log("error storeLostToken ", error);
      return fn(error);
    }
  });
}

async function sendLostPasswordEmail(email, token, userData, fn) {
  var subject = "Redefinir senha " + config.EXTERNAL_NAME;
  var resetLink =
    config.RESET_PASS_PAGE +
    "?user=" +
    encodeURIComponent(email) +
    "&token=" +
    token;
  const htmlBody = ``;

  try {
    const sendEmailCommand = new SendEmailCommand({
      Source: `AgriCompany <${config.EMAIL_SOURCE}>`,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Html: {
            Data: htmlBody,
          },
        },
      },
    });
    await ses.send(sendEmailCommand);
    fn(null);
  } catch (e) {
    console.error(e);
    console.log("SES Error: ", e);
    fn(e);
  }
}

async function resetUserPass(pool, userData) {
  var email = userData.user;
  var resetToken = userData.token;
  var newPassword = userData.newpassword;
  const client = await pool.connect();
  return new Promise((resolve, reject) => {
    verifyResetToken(
      client,
      email,
      resetToken,
      function (err, verified, userID) {
        if (err) {
          console.log("Error in verifyUserToken: " + err);
          client.release(true);
          resolve({
            withError: true,
            resultCode: 403,
            resultData: "Error in verifyUserToken: " + err,
          });
        } else if (!verified) {
          console.log("Error token expired");
          client.release(true);
          resolve({
            withError: true,
            resultCode: 401,
            resultData: "Error token expired",
          });
        } else {
          changePass(client, newPassword, userID, function (err) {
            if (err) {
              console.log("Error in updateUser Pass: " + err);
              client.release(true);
              resolve({
                withError: true,
                resultCode: 500,
                resultData: "Error in updateUser Pass: " + err,
              });
            } else {
              client.release(true);
              resolve({
                withError: false,
                resultCode: 200,
                resultData: email,
              });
              resolve({ withError: false, resultCode: 200, email });
            }
          });
        }
      }
    );
  });
}

async function confirmResetToken(pool, userData) {
  var email = userData.user;
  var resetToken = userData.token;
  const client = await pool.connect();
  return new Promise((resolve, reject) => {
    verifyResetToken(
      client,
      email,
      resetToken,
      function (err, verified, userID) {
        if (err) {
          console.log("Error in verifyUserToken: " + err);
          client.release(true);
          resolve({
            withError: true,
            resultCode: 403,
            resultData: "Error in verifyUserToken: " + err,
          });
        } else if (!verified) {
          console.log("Error token expired");
          client.release(true);
          resolve({
            withError: true,
            resultCode: 401,
            resultData: "Error token expired",
          });
        } else {
          client.release(true);
          resolve({
            withError: false,
            resultCode: 200,
            resultData: userID,
          });
        }
      }
    );
  });
}

async function sentResetPassToken(pool, userData) {
  var email = userData.email;
  const client = await pool.connect();
  return new Promise((resolve, reject) => {
    checkUser(client, email, function (err, isActive, userData) {
      if (err) {
        console.log("Error in checkUser: " + err);
        client.release(true);
        resolve({
          withError: true,
          resultCode: 500,
          resultData: "Error in checkUser: " + err,
        });
      } else {
        if (isActive == null) {
          // User not found
          console.log("User not found: " + email);
          client.release(true);
          resolve({
            withError: true,
            resultCode: 404,
            resultData: "User not found: " + email,
          });
        } else if (isActive == false) {
          // User not verified
          console.log("User not verified: " + email);
          client.release(true);
          resolve({
            withError: true,
            resultCode: 403,
            resultData: "User not verified: " + email,
          });
        } else {
          storeLostToken(client, email, function (err, token) {
            if (err) {
              console.log("Error in storeLostToken: " + err);
              client.release(true);
              resolve({
                withError: true,
                resultCode: 500,
                resultData: "Error in storeLostToken: " + err,
              });
            } else {
              sendLostPasswordEmail(
                email,
                token,
                userData,
                function (err, data) {
                  if (err) {
                    console.log("Error in sendLostPasswordEmail: " + err);
                    client.release(true);
                    resolve({
                      withError: true,
                      resultCode: 500,
                      resultData: "Error in sendLostPasswordEmail: " + err,
                    });
                  } else {
                    console.log("Reset Pass sent");
                    client.release(true);
                    resolve({
                      withError: false,
                      resultCode: 200,
                      resultData: "Reset Pass sent",
                    });
                  }
                }
              );
            }
          });
        }
      }
    });
  });
}

module.exports = {
  sentResetPassToken,
  confirmResetToken,
  resetUserPass,
};
