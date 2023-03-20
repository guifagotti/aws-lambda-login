const {
    SESClient,
    SendEmailCommand
} = require("@aws-sdk/client-ses");
const crypto = require("crypto");
const config = require("./config.json");
const ses = new SESClient({
    region: "us-east-1"
});
const cryptoUtils = require("../lib/cryptoUtils");

function tokenSentDiffHours(tokenDate) {
    const diff = (Date.now() - new Date(tokenDate).getTime()) / 1000 / 60 / 60;
    return Math.abs(Math.round(diff));
}

async function changePass(client, newPass, id) {
    const {
        salt,
        hash
    } = await cryptoUtils.computeHash(newPass);
    const updatePassQuery = `UPDATE table_user SET pass = $1, passwordsalt = $2 WHERE "userID" = $3`;


    try {
        result = await client.query(updatePassQuery, [hash, salt, id]);

        if (result.rowCount !== 1) {
            throw new Error("Error on update User Pass");
        }
    } catch (error) {
        console.error("Update user pass ERROR:", error);
        throw error;
    }
}

async function verifyResetToken(client, email, verifyToken) {
    const searchQuery = `SELECT * FROM table_user where "mail" = $1`;

    result = await client.query(searchQuery, [email]);


    if (result.rows.length > 0 && result.rows[0]["mailToken"] === verifyToken) {
        const tokenSentHours = tokenSentDiffHours(result.rows[0]["mailTokenData"]);

        if (tokenSentHours <= 6) {
            return {
                verified: true,
                userID: result.rows[0].userID
            };
        }
    }

    throw new Error("Invalid Token");
}

async function checkUser(client, email) {
    const searchQuery = `
  SELECT "userID", name, active
    FROM table_user
  where mail = $1`;


    result = await client.query(searchQuery, [email]);


    if (result.rows.length > 0) {
        return {
            active: result.rows[0].active,
            userReturnData: {
                id: result.rows[0]["id"],
                user: result.rows[0]["cd_name"],
            },
        };
    }

    throw new Error("User not found");
}

async function storeLostToken(client, email) {
    const token = (await crypto.randomBytes(128)).toString("hex");
    const setResetPassTokenQuery = `UPDATE table_user SET "mailToken" = $1, "mailTokenData" = current_timestamp WHERE "mail" = $2`;


    result = await client.query(setResetPassTokenQuery, [token, email]);

    if (result.rowCount > 0) {
        return token;
    }

    throw new Error("Error on set Reset Pass Token");
}

async function sendLostPasswordEmail(email, token, userData) {
    const subject = "Redefinir senha " + config.EXTERNAL_NAME;
    const resetLink = `${config.RESET_PASS_PAGE}?user=${encodeURIComponent(email)}&token=${token}`;
    const htmlBody = `<!DOCTYPE html>
<html>
   <head>
      <meta charset="utf-8">
      <meta http-equiv="x-ua-compatible" content="ie=edge">
      <meta http-equiv="Content-Language" content="pt-br">
      <title>Confirmação de e-mail</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style type="text/css">
         @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;700&display=swap');
         body,
         table,
         td,
         a {
         -ms-text-size-adjust: 100%;
         -webkit-text-size-adjust: 100%;
         }
         table,
         td {
         mso-table-rspace: 0pt;
         mso-table-lspace: 0pt;
         }
         img {
         -ms-interpolation-mode: bicubic;
         }
         a[x-apple-data-detectors] {
         font-family: inherit !important;
         font-size: inherit !important;
         font-weight: inherit !important;
         line-height: inherit !important;
         color: inherit !important;
         text-decoration: none !important;
         }
         div[style*="margin: 16px 0;"] {
         margin: 0 !important;
         }
         body {
         width: 100% !important;
         height: 100% !important;
         padding: 0 !important;
         margin: 0 !important;
         }
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
         .button {
         background-color: #548609;
         border: none;
         color: white;
         padding: 15px 32px;
         text-align: center;
         text-decoration: none;
         display: inline-block;
         font-size: 16px;
         margin: 4px 2px;
         cursor: pointer;
         border-radius: 6px;
         font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;
         }
      </style>
   </head>
   <body style="background-color: #e9ecef; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif;">
      <div class="preheader"
         style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
         Confirmação de E-mail AgriCompany.
      </div>
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
         <tr>
            <td align="center" bgcolor="#e9ecef">
               <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                  <tr>
                     <td align="center" valign="top" style="padding: 36px 24px;">
                        <a href="https://agricompany.tech" target="_blank" style="display: inline-block;">
                        <img src="https://agricompany.s3.sa-east-1.amazonaws.com/logo.png" alt="Logo" border="0" width="48" style="display: block; width: 48px; max-width: 48px; min-width: 48px;">
                        </a>
                     </td>
                  </tr>
               </table>
            </td>
         </tr>
         <tr>
            <td align="center" bgcolor="#e9ecef">
               <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                  <tr>
                     <td align="left" bgcolor="#ffffff" style="padding: 36px 24px 0; border-top: 3px solid #d4dadf;">
                        <h1 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -1px; line-height: 48px;">
                           Confirme seu e-mail
                        </h1>
                     </td>
                  </tr>
               </table>
            </td>
         </tr>
         <tr>
            <td align="center" bgcolor="#e9ecef">
               <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                  <tr>
                     <td align="left" bgcolor="#ffffff" style="padding: 24px;">
                        <p style="margin: 0; font-size: 16px; line-height: 24px;">
                           Olá! Estamos felizes em ter você como parte da comunidade AgriCompany. Por favor, clique no botão abaixo para confirmar seu endereço de e-mail e ativar sua conta.
                        </p>
                     </td>
                  </tr>
                  <tr>
                     <td align="center" bgcolor="#ffffff" style="padding: 12px;">
                        <a href="https://agricompany.tech/confirmacao-email?codigo=123456" class="button" target="_blank">Confirmar E-mail</a>
                     </td>
                  </tr>
                  <tr>
                     <td align="left" bgcolor="#ffffff" style="padding: 24px;">
                        <p style="margin: 0; font-size: 16px; line-height: 24px;">
                           Se você não solicitou a criação de uma conta na AgriCompany, por favor, ignore este e-mail.
                        </p>
                     </td>
                  </tr>
               </table>
            </td>
         </tr>
         <tr>
            <td align="center" bgcolor="#e9ecef">
               <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                  <tr>
                     <td align="center" bgcolor="#e9ecef" valign="top" style="padding: 24px;">
                        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #666;">
                           &copy; 2023 AgriCompany. Todos os direitos reservados.
                           <br>
                           <a href="https://agricompany.tech" target="_blank" style="color: #1a82e2;">AgriCompany.tech</a>
                        </p>
                     </td>
                  </tr>
               </table>
            </td>
         </tr>
      </table>
   </body>
</html>`;

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
}

async function resetUserPass(pool, userData) {
    const {
        user: email,
        token: resetToken,
        newpassword: newPassword
    } = userData;
    const client = await pool.connect();

    try {
        const {
            verified,
            userID
        } = await verify ResetToken(client, email, resetToken);
        if (!verified) {
            throw new Error("Token expired");
        }
        await changePass(client, newPassword, userID);
        return {
            withError: false,
            resultCode: 200,
            resultData: email,
        };
    } catch (error) {
        console.error("Error in resetUserPass:", error.message);
        return {
            withError: true,
            resultCode: error instanceof Error ? 500 : 403,
            resultData: error.message,
        };
    } finally {
        client.release();
    }
}

async function confirmResetToken(pool, userData) {
    const {
        user: email,
        token: resetToken
    } = userData;
    const client = await pool.connect();

    try {
        const {
            verified,
            userID
        } = await verifyResetToken(client, email, resetToken);
        if (!verified) {
            throw new Error("Token expired");
        }
        return {
            withError: false,
            resultCode: 200,
            resultData: userID,
        };
    } catch (error) {
        console.error("Error in confirmResetToken:", error.message);
        return {
            withError: true,
            resultCode: error instanceof Error ? 500 : 403,
            resultData: error.message,
        };
    } finally {
        client.release();
    }
}

async function sentResetPassToken(pool, userData) {
    const {
        email
    } = userData;
    const client = await pool.connect();

    try {
        const {
            active,
            userReturnData
        } = await checkUser(client, email);
        if (!active) {
            throw new Error("User not verified");
        }

        const token = await storeLostToken(client, email);
        await sendLostPasswordEmail(email, token, userReturnData);
        return {
            withError: false,
            resultCode: 200,
            resultData: "Reset Pass sent",
        };
    } catch (error) {
        console.error("Error in sentResetPassToken:", error.message);
        return {
            withError: true,
            resultCode: error instanceof Error ? 500 : 403,
            resultData: error.message,
        };
    } finally {
        client.release();
    }
}

module.exports = {
    sentResetPassToken,
    confirmResetToken,
    resetUserPass,
};