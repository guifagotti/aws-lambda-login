const {
    SESClient,
    SendEmailCommand
} = require("@aws-sdk/client-ses");
const crypto = require("crypto");
const cryptoUtils = require("../lib/cryptoUtils");
const config = require("./config");
const ses = new SESClient({
    region: "us-east-1"
});

async function storeUser(client, userData, password, salt) {
    const token = crypto.randomBytes(128).toString("hex");

    try {
        const insertCompanyQuery = `INSERT INTO table_company ("companyName", "editedByUserID", "mail", "phone", "createdDate", "editedDate") VALUES ($1, 0, $2, $3, current_timestamp, current_timestamp) RETURNING *`;
        const companyValues = [userData.companyName, userData.email, userData.companyPhone];
        const companyResult = await client.query(insertCompanyQuery, companyValues);

        if (companyResult.rowCount === 0) {
            throw new Error("Error on insert Company Data");
        }

        const insertUserQuery = `INSERT INTO table_user ("companyID", "roleID", "name", "mail", "phone", "pass", "passwordsalt", "verified", "createdDate", "editedDate", "mailToken", "mailTokenData", "active", "accountStatus") VALUES ($1, 2, $2, $3, $4, $5, $6, FALSE, current_timestamp, current_timestamp, $7, current_timestamp, FALSE, 1) RETURNING *`;
        const userValues = [
            companyResult.rows[0].companyID,
            userData.name,
            userData.email,
            userData.companyPhone,
            password,
            salt,
            token
        ];
        const userResult = await client.query(insertUserQuery, userValues);

        if (userResult.rowCount === 0) {
            throw new Error("Error on insert User Data");
        }

        const insertFarmQuery = `INSERT INTO table_farm ("farmName", "area", "companyID", "editedByUserID", "funRural", "createdDate", "editedDate") VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp) RETURNING *`;
        const farmValues = [
            userData.farmName,
            userData.farmArea,
            companyResult.rows[0].companyID,
            userResult.rows[0].userID,
            userData.funrural
        ];
        const farmResult = await client.query(insertFarmQuery, farmValues);

        if (farmResult.rowCount === 0) {
            throw new Error("Error on insert Farm Data");
        }

        return {
            success: true,
            token,
            userData
        };
    } catch (error) {
        console.error("Error in storeUser: ", error);
        throw error;
    }
}

async function sendVerificationEmail(email, token, userData) {
    const subject = "E-mail de verificação " + config.EXTERNAL_NAME;
    const verificationLink =
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
      </style>
   </head>
   <body style="background-color: #e9ecef;">
      <div class="preheader"
         style="display: none; max-width: 0; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
         Confirmação de E-mail AgriCompany.
      </div>
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
         <tr>
            <td align="center" bgcolor="#e9ecef">
               <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                  <tr>
                     <td align="center" valign="top" style="padding: 20px 24px;">
                        <img src="https://via.placeholder.com/150" alt="Logo" border="0" style="display: block; width: 100px; max-width: 100px; min-width: 100px;">
                     </td>
                  </tr>
               </table>
            </td>
         </tr>
         <tr>
            <td align="center" bgcolor="#e9ecef">
               <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                  <tr>
                     <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                        <p style="margin: 0;">Olá,</p>
                     </td>
                  </tr>
                  <tr>
                     <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                        <p style="margin: 0;">Obrigado por se cadastrar na AgriCompany. Estamos felizes em tê-lo conosco. Para continuar, por favor, confirme seu endereço de e-mail clicando no botão abaixo:</p>
                     </td>
                  </tr>
                  <tr>
                     <td align="center" bgcolor="#ffffff" style="padding: 24px;">
                        <table border="0" cellpadding="0" cellspacing="0">
                           <tr>
                              <td align="center" bgcolor="#1a82e2" style="border-radius: 4px;">
                                 <a href="http://link-to-confirm-email.com" target="_blank" style="display: inline-block; padding: 12px 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 4px;">Confirmar E-mail</a>
                              </td>
                           </tr>
                        </table>
                     </td>
                  </tr>
                  <tr>
                     <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                        <p style="margin: 0;">Se você não solicitou este e-mail, por favor, ignore-o.</p>
                     </td>
                  </tr>
                  <tr>
                     <td align="left" bgcolor="#ffffff" style="padding: 24px; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 24px;">
                        <p style="margin: 0;">Atenciosamente,</p>
                        <p style="margin: 0;">Equipe AgriCompany</p>
                     </td>
                  </tr>
               </table>
            </td>
         </tr>
         <tr>
            <td align="center" bgcolor="#e9ecef" style="padding: 24px;">
               <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                  <tr>
                     <td align="center" style="font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px;line-height: 20px; color: #666;">
                        <p style="margin: 0;">AgriCompany, Inc.</p>
                        <p style="margin: 0;">Rua Exemplo, 123</p>
                        <p style="margin: 0;">São Paulo, SP 00000-000</p>
                        <p style="margin: 0;">Brasil</p>
                     </td>
                  </tr>
                  <tr>
                     <td align="center" style="padding: 20px 0 0 0; font-family: 'Source Sans Pro', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: #666;">
                        <p style="margin: 0;">Para cancelar a inscrição, clique <a href="http://link-to-unsubscribe.com" target="_blank">aqui</a>.</p>
                     </td>
                  </tr>
               </table>
            </td>
         </tr>
      </table>
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

    } catch (e) {
        console.error("SES Error: ", e);
        throw e;
    }
}

async function verifyEmailDatabase(client, email) {
    const searchUserQuery = `SELECT * FROM table_user where "mail" = $1`;
    const values = [email];

    try {
        const result = await client.query(searchUserQuery, values);
        return result.rows.length === 0;
    } catch (error) {
        console.error("Error in verifyEmailDatabase: ", error);
        throw error;
    }
}

async function createUser(pool, userData) {
    const email = userData.email;
    const clearPassword = userData.password;
    const client = await pool.connect();

    try {
        const isEmailAvailable = await verifyEmailDatabase(client, email);
        if (!isEmailAvailable) {
            throw new Error("User already exists");
        }


        const {
            salt,
            hash
        } = await cryptoUtils.computeHash(clearPassword);
        const {
            token
        } = await storeUser(client, userData, hash, salt);
        await sendVerificationEmail(email, token, userData);

        return {
            withError: false,
            resultCode: 200,
            resultData: "User created",
        };

    } catch (error) {
        console.error("Error in createUser: ", error);
        const resultCode = error.message === "User already exists" ? 409 : 500;
        return {
            withError: true,
            resultCode,
            resultData: error.message,
        };
    } finally {
        client.release();
    }
}

async function verifyEmail(pool, userData) {
    const email = userData.email;
    const client = await pool.connect();

    try {
        const isEmailAvailable = await verifyEmailDatabase(client, email);

        if (!isEmailAvailable) {
            throw new Error("User already exists");
        }

        return {
            withError: false,
            resultCode: 200,
            resultData: "OK",
        };
    } catch (error) {
        console.error("Error in verifyEmail: ", error);
        return {
            withError: true,
            resultCode: 409,
            resultData: error.message,
        };
    } finally {
        client.release();
    }
}

module.exports = {
    createUser,
    verifyEmail,
};