const { getConnectionPool } = require("./lib/database.js");
const { authUser } = require("./functions/login.js");
const {
  validateUserPass,
  updateUserPass,
} = require("./functions/changePassword.js");
const { createUser , verifyEmail } = require("./functions/createUser.js");
const {
  checkUser,
  storeLostToken,
  sendLostPasswordEmail,
} = require("./functions/lostPassword.js");
const {
  sentResetPassToken,
  confirmResetToken,
  resetUserPass
} = require("./functions/resetPassword.js");
const { verifyUser, setUserVerify } = require("./functions/verifyUser.js");

exports.handler = async (event, context) => {
  const pool = await getConnectionPool();

  console.log("event", event);

  if (pool === null)
    return {
      statusCode,
      body,
      headers,
    };

  let reqBody = JSON.parse(event.body); //? JSON.parse(event.body) : event.body;
  let body;
  let statusCode = "200";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*", // Allow from anywhere
    "Access-Control-Allow-Methods": "GET", // Allow only GET request
  };

  try {
    switch (event.httpMethod) {
      case "GET":
        // if (
        //   event.queryStringParameters &&
        //   "type" in event.queryStringParameters &&
        //   "farmID" in event.queryStringParameters
        // ) {
        //   const { type, farmID } = event.queryStringParameters;
        //   switch (event.requestContext.stage) {
        //     case "farm":
        //       resultData = await getFarmData(pool, type, farmID);
        //       body = {
        //         status: "Done",
        //         resultCount: resultData.rowCount,
        //         resultData: resultData.rows,
        //       };
        //       break;
        //     case "expenses":
        //       resultData = await getExpensesData(pool, type, farmID);
        //       body = {
        //         status: "Done",
        //         resultCount: resultData.rowCount,
        //         resultData: resultData.rows,
        //       };
        //       break;
        //     case "revenues":
        //       body = msg;
        //       break;
        //     case "entries":
        //       body = msg;
        //       break;
        //     case "results":
        //       body = msg;
        //       break;
        //     default:
        //       throw new Error(`Unsupported method "${event.httpMethod}"`);
        //   }
        // } else throw new Error("Missing Query Parameters");
        break;
      case "PATCH":
        switch (event.path) {
          case "/change-pass":
            let changePassResult = await updateUserPass(pool, reqBody);
            statusCode = changePassResult.resultCode;
            console.log("resultData ", changePassResult);
            body = {
              status: changePassResult.withError ? "Error" : "Done",
              user: changePassResult.user,
              message: changePassResult.resultData,
            };
            break;
          case "/reset-pass":
            let resetUserPassResult = await resetUserPass(pool, reqBody);
            statusCode = resetUserPassResult.resultCode;
            console.log("resultData ", resetUserPassResult);
            body = {
              status: resetUserPassResult.withError ? "Error" : "Done",
              user: resetUserPassResult.user,
              message: resetUserPassResult.resultData,
            };
            break;
          default:
            throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
        break;
      case "POST":
        console.log("POST ");
        console.log("reqBody ",reqBody);
        console.log("event.path ", event.path);
        switch (event.path) {
          case "/login":
            console.log("login");
            console.log("pool",pool);
            console.log("reqBody",reqBody);
            let loginResult = await authUser(pool, reqBody);
            statusCode = loginResult.resultCode;
            console.log("resultData ", loginResult);
            body = {
              status: loginResult.withError ? "Error" : "Done",
              user: loginResult.user,
            };
            break;
          case "/create":
            console.log("register");
            let registerResult = await createUser(pool, reqBody);
            statusCode = registerResult.resultCode;
            console.log("registerResult ", registerResult);
            body = {
              status: registerResult.withError ? "Error" : "Done",
              rowsAdd: registerResult.resultData,
            };
            break;
          case "/confirm-email":
            console.log("confirm-email");
            let verifyUserResult = await verifyUser(pool, reqBody);
            statusCode = verifyUserResult.resultCode;
            console.log("verifyUserResult ", verifyUserResult);
            body = {
              status: verifyUserResult.withError ? "Error" : "Done",
              message: verifyUserResult.resultData,
            };
            break;
          case "/check-user":
            let checkEmailResult = await verifyEmail(pool, reqBody);
            statusCode = checkEmailResult.resultCode;
            console.log("resultData ", checkEmailResult);
            body = {
              status: checkEmailResult.withError ? "Error" : "Done",
              message: checkEmailResult.resultData,
            };
            break;
          case "/reset-pass":
            let sentResetPassTokenResult = await sentResetPassToken(pool, reqBody);
            statusCode = sentResetPassTokenResult.resultCode;
            console.log("resultData ", sentResetPassTokenResult);
            body = {
              status: sentResetPassTokenResult.withError ? "Error" : "Done",
              message: sentResetPassTokenResult.resultData,
            };
            break;
          case "/check-token":
            let checkTokenResult = await confirmResetToken(pool, reqBody);
            statusCode = checkTokenResult.resultCode;
            console.log("resultData ", checkTokenResult);
            body = {
              status: checkTokenResult.withError ? "Error" : "Done",
              message: checkTokenResult.resultData,
            };
            break;
          //   case "register":
          //     resultData = await postExpensesData(pool, reqBody);
          //     body = {
          //       status: "Done",
          //       rowsAdd: resultData.rowCount,
          //     };
          //     break;
          //   case "register":
          //     resultData = await postExpensesData(pool, reqBody);
          //     body = {
          //       status: "Done",
          //       rowsAdd: resultData.rowCount,
          //     };

          default:
            throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
        break;
      default:
        throw new Error(`Unsupported method "${event.httpMethod}"`);
    }
  } catch (err) {
    statusCode = "400";
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
