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
                                Confirme seu endereço de e-mail</h1>
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
                            <p style="margin: 0;">${userData.name}, clique no botão abaixo para confirmar seu endereço de e-mail. Se você
                                não criou uma conta com a <a href="https://agricompany.tech">AgriCompany</a>, você pode
                                ignorar e excluir este email.</p>
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
                                                    <a href=${verificationLink} target="_blank"
                                                        style="display: inline-block; padding: 16px 36px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">
                                                        Confirmar E-mail</a>
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
                            <p style="margin: 0;"><a href=${verificationLink}
                                    target="_blank">https://agricompany.tech/login/confirmEmail</a></p>
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
                                ativação para sua conta. Se você não solicitou a ativação, pode
                                excluir este e-mail</p>
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
