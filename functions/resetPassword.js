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
  const htmlBody = `<!DOCTYPE html>
  <html>
  
  <head>
  
      <meta charset="utf-8">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <meta http-equiv="Content-Language" content="pt-br">
      <title>Confirmação de e-mail</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style type="text/css">
          /**
     * Google webfonts. Recommended to include the .woff version for cross-client compatibility.
     */
          @media screen {
              @font-face {
                  font-family: 'Source Sans Pro';
                  font-style: normal;
                  font-weight: 400;
                  src: local('Source Sans Pro Regular'), local('SourceSansPro-Regular'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/ODelI1aHBYDBqgeIAH2zlBM0YzuT7MdOe03otPbuUS0.woff) format('woff');
              }
  
              @font-face {
                  font-family: 'Source Sans Pro';
                  font-style: normal;
                  font-weight: 700;
                  src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(https://fonts.gstatic.com/s/sourcesanspro/v10/toadOcfmlt9b38dHJxOBGFkQc6VGVFSmCnC_l7QZG60.woff) format('woff');
              }
          }
  
          /**
     * Avoid browser level font resizing.
     * 1. Windows Mobile
     * 2. iOS / OSX
     */
          body,
          table,
          td,
          a {
              -ms-text-size-adjust: 100%;
              /* 1 */
              -webkit-text-size-adjust: 100%;
              /* 2 */
          }
  
          /**
     * Remove extra space added to tables and cells in Outlook.
     */
          table,
          td {
              mso-table-rspace: 0pt;
              mso-table-lspace: 0pt;
          }
  
          /**
     * Better fluid images in Internet Explorer.
     */
          img {
              -ms-interpolation-mode: bicubic;
          }
  
          /**
     * Remove blue links for iOS devices.
     */
          a[x-apple-data-detectors] {
              font-family: inherit !important;
              font-size: inherit !important;
              font-weight: inherit !important;
              line-height: inherit !important;
              color: inherit !important;
              text-decoration: none !important;
          }
  
          /**
     * Fix centering issues in Android 4.4.
     */
          div[style*="margin: 16px 0;"] {
              margin: 0 !important;
          }
  
          body {
              width: 100% !important;
              height: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
          }
  
          /**
     * Collapse table borders to avoid space between cells.
     */
          table {
              border-collapse: collapse !important;
          }
  
          a {
              color: #1a82e2;
          }
  
          img {
              height: auto;
              line-height: 100%;
              text-decoration: none;
              border: 0;
              outline: none;
          }
      </style>
  
  </head>
  
  <body style="background-color: #e9ecef;">
  
      <!-- start preheader -->
      <div class="preheader"
          style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
          Confirmação de E-mail AgriCompany.
      </div>
      <!-- end preheader -->
  
      <!-- start body -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
  
          <!-- start logo -->
          <tr>
              <td align="center" bgcolor="#e9ecef">
                  <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                      <tr>
                          <td align="center" valign="top" style="padding: 36px 24px;">
                              <a href="ttps://agricompany.tech" target="_blank" style="display: inline-block;">
                                  <img src="https://agricompany.s3.sa-east-1.amazonaws.com/images/logo.png"
                                      alt="Logo" border="0" width="180px"
                                      style="display: block; width: 180px; max-width: 180px; min-width: 100px;">
                              </a>
                          </td>
                      </tr>
                  </table>
                  <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
              </td>
          </tr>
          <!-- end logo -->
  
          <!-- start hero -->
          <tr>
              <td align="center" bgcolor="#e9ecef">
                  <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                      <tr>
                          <td align="left" bgcolor="#ffffff"
                              style="padding: 36px 24px 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; border-top: 3px solid #d4dadf;">
                              <h1
                                  style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">
                                  Redefinir Senha</h1>
                          </td>
                      </tr>
                  </table>
                  <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
              </td>
          </tr>
          <!-- end hero -->
  
          <!-- start copy block -->
          <tr>
              <td align="center" bgcolor="#e9ecef">
                  <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
  
                      <!-- start copy -->
                      <tr>
                          <td align="left" bgcolor="#ffffff"
                              style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                              <p style="margin: 0;">${userData.name}, clique no botão abaixo para redefinir sua senha. O link é válido por 6 horas após a solicitação, se você
                                  não solicitou a redefinição de senha com <a href="https://agricompany.tech">AgriCompany</a>, recomendamos
                                  que troque sua senha imediatamente!</p>
                          </td>
                      </tr>
                      <!-- end copy -->
  
                      <!-- start button -->
                      <tr>
                          <td align="left" bgcolor="#ffffff">
                              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                  <tr>
                                      <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                                          <table border="0" cellpadding="0" cellspacing="0">
                                              <tr>
                                                  <td align="center" bgcolor="#548609" style="border-radius: 6px;">
                                                      <a href=${resetLink} target="_blank"
                                                          style="display: inline-block; padding: 16px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">
                                                          Redefinir Senha</a>
                                                  </td>
                                              </tr>
                                          </table>
                                      </td>
                                  </tr>
                              </table>
                          </td>
                      </tr>
                      <!-- end button -->
  
                      <!-- start copy -->
                      <tr>
                          <td align="left" bgcolor="#ffffff"
                              style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                              <p style="margin: 0;">Se o botão não funcionar, copie e cole o link a seguir em seu
                                  navegador:</p>
                              <p style="margin: 0;"><a href=${resetLink}
                                      target="_blank">https://agricompany.tech/login/resetPassword</a></p>
                          </td>
                      </tr>
                      <!-- end copy -->
  
                      <!-- start copy -->
                      <tr>
                          <td align="left" bgcolor="#ffffff"
                              style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px; border-bottom: 3px solid #d4dadf">
                              <p style="margin: 0;">Obrigado,<br> AgriCompany</p>
                          </td>
                      </tr>
                      <!-- end copy -->
  
                  </table>
                  <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
              </td>
          </tr>
          <!-- end copy block -->
  
          <!-- start footer -->
          <tr>
              <td align="center" bgcolor="#e9ecef" style="padding: 24px;">
                  <!--[if (gte mso 9)|(IE)]>
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600">
          <tr>
          <td align="center" valign="top" width="600">
          <![endif]-->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
  
                      <!-- start permission -->
                      <tr>
                          <td align="center" bgcolor="#e9ecef"
                              style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                              <p style="margin: 0;">Você recebeu este e-mail porque recebemos uma solicitação de
                                  reset de senha. Se você não solicitou o reset de senha, recomendamos que troque sua senha imediatamente!</p>
                          </td>
                      </tr>
                      <!-- end permission -->
  
                      <!-- start unsubscribe -->
                      <tr>
                          <td align="center" bgcolor="#e9ecef"
                              style="padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                              <p style="margin: 0;">Para parar de receber esses e-mails, você pode <a
                                      href="https://agricompany.tech" target="_blank">cancelar a inscrição</a> a qualquer momento.</p>
                              <p style="margin: 0;">Jatai - GO</p>
                          </td>
                      </tr>
                      <!-- end unsubscribe -->
  
                  </table>
                  <!--[if (gte mso 9)|(IE)]>
          </td>
          </tr>
          </table>
          <![endif]-->
              </td>
          </tr>
          <!-- end footer -->
  
      </table>
      <!-- end body -->
  
  </body>
  
  </html>`;

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
