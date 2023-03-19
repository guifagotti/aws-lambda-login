console.log("Loading function");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
var crypto = require("crypto");
var cryptoUtils = require("../lib/cryptoUtils");
var config = require("./config");
var ses = new SESClient({ region: "us-east-1" });

async function storeUser(client, userData, password, salt, fn) {
  var len = 128;
  crypto.randomBytes(len, async function (err, token) {
    if (err) return fn(err);
    token = token.toString("hex");
    const insertCompanyQuery = `INSERT INTO table_company ("companyName","editedByUserID","mail","phone", "createdDate","editedDate") VALUES ('${userData.companyName}' , 0 ,'${userData.email}','${userData.companyPhone}',current_timestamp,current_timestamp) RETURNING *`;

    let result;
    let result2;
    let result3;

    try {
      result = await client.query(insertCompanyQuery);
      console.log("result insertCompanyQuery", result);
      if (result.rows.length > 0) {
        const insertUserQuery = `INSERT INTO table_user ("companyID","roleID","name","mail","phone","pass","passwordsalt","verified","createdDate","editedDate","mailToken","mailTokenData", "active", "accountStatus") VALUES ('${result.rows[0].companyID}' , 2 ,'${userData.name}','${userData.email}','${userData.companyPhone}','${password}','${salt}',FALSE,current_timestamp,current_timestamp,'${token}',current_timestamp, FALSE, 1) RETURNING *`;
        result2 = await client.query(insertUserQuery);
        console.log("result insertUserQuery", result2);
        if (result2.rows.length > 0) {
          const insertFarmQuery = `INSERT INTO table_farm ("farmName","area", "companyID","editedByUserID","funRural","createdDate","editedDate") VALUES ('${userData.farmName}' , '${userData.farmArea}' , '${result.rows[0].companyID}' , '${result2.rows[0].userID}','${userData.funrural}',current_timestamp,current_timestamp) RETURNING *`;
          result3 = await client.query(insertFarmQuery);
          console.log("result insertFarmQuery", result3);
          if (result3.rows.length > 0) {
            fn(null, token, userData);
          } else fn("Error on insert Farm Data");
        } else fn("Error on insert User Data");
      } else fn("Error on insert Company Data");
    } catch (error) {
      console.log("error search ", error);
      return fn(error);
    }
  });
}
async function sendVerificationEmail(email, token, userData, fn) {
  var subject = "E-mail de verificação " + config.EXTERNAL_NAME;
  var verificationLink =
    config.VERIFICATION_PAGE +
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

async function verifyEmailDatabase(client, email, fn) {
  const searchUserQuery = `SELECT * FROM table_user where "mail" = '${email}'`;
  let result;
  try {
    result = await client.query(searchUserQuery);
    console.log("searchUserQuery", searchUserQuery);
    console.log("result", result.rows);
    if (result.rows.length === 0) {
      fn(null, true);
    } else fn("User already exists", true);
  } catch (error) {
    console.log("error searchUserQuery ", error);
    return fn(error);
  }
}

async function createUser(pool, userData) {
  console.log("userData", userData);
  var email = userData.email;
  var clearPassword = userData.password;
  const client = await pool.connect();

  return new Promise((resolve, reject) => {
    cryptoUtils.computeHash(clearPassword, function (err, salt, hash) {
      if (err) {
        console.log("Error in hash: " + err);
        client.release(true);
        resolve({
          withError: true,
          resultCode: 500,
          resultData: "Error in hash: " + err,
        });
      } else {
        verifyEmailDatabase(client, email, function (err, verified) {
          if (err) {
            console.log("Error in verifyEmailDatabase: " + err);
            client.release(true);
            resolve({
              withError: true,
              resultCode: verified ? 409 : 403,
              resultData: verified
                ? "User already exists"
                : "Error in verifyEmailDatabase: " + err,
            });
          } else {
            storeUser(
              client,
              userData,
              hash,
              salt,
              function (err, token, userData) {
                if (err) {
                  if (err.code == "ConditionalCheckFailedException") {
                    console.log("ConditionalCheckFailedException");
                    client.release(true);
                    resolve({
                      withError: true,
                      resultCode: 500,
                      resultData: "ConditionalCheckFailedException",
                    });
                  } else {
                    console.log("Error in storeUser: " + err);
                    client.release(true);
                    resolve({
                      withError: true,
                      resultCode: 500,
                      resultData: "Error in storeUser: " + err,
                    });
                  }
                } else {
                  sendVerificationEmail(
                    email,
                    token,
                    userData,
                    function (err, data) {
                      if (err) {
                        console.log("Error in sendVerificationEmail: " + err);
                        client.release(true);
                        resolve({
                          withError: true,
                          resultCode: 500,
                          resultData: "Error in sendVerificationEmail: " + err,
                        });
                      } else {
                        console.log("User created");
                        client.release(true);
                        resolve({
                          withError: false,
                          resultCode: 200,
                          resultData: "User created",
                        });
                      }
                    }
                  );
                }
              }
            );
          }
        });
      }
    });
  });
}

async function verifyEmail(pool, userData) {
  var email = userData.email;
  const client = await pool.connect();
  return new Promise((resolve, reject) => {
    verifyEmailDatabase(client, email, function (err, verified) {
      if (err) {
        console.log("Error in verifyEmailDatabase: " + err);
        client.release(true);
        resolve({
          withError: true,
          resultCode: verified ? 409 : 403,
          resultData: verified
            ? "User already exists"
            : "Error in verifyEmailDatabase: " + err,
        });
      } else {
        client.release(true);
        resolve({
          withError: false,
          resultCode: 200,
          resultData: "OK",
        });
      }
    });
  });
}

module.exports = {
  createUser,
  verifyEmail,
};
