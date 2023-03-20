const {
    getConnectionPool,
    authUser,
    updateUserPass,
    createUser,
    verifyEmail,
    sentResetPassToken,
    confirmResetToken,
    resetUserPass,
    verifyUser,
} = require("./lib/functions");

const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, PATCH, POST",
};

const handlerResponses = async (statusCode, status, data = {}) => ({
    statusCode,
    body: JSON.stringify({
        status,
        ...data
    }),
    headers,
});

exports.handler = async (event) => {
    const pool = await getConnectionPool();
    if (!pool) return handlerResponses(500, "Error", {
        message: "Database connection failed."
    });

    console.log("event", event);
    const reqBody = JSON.parse(event.body);

    try {
        switch (event.httpMethod) {
            case "GET":
                // Implement GET functionality if needed
                break;
            case "PATCH":
                switch (event.path) {
                    case "/change-pass":
                        const changePassResult = await updateUserPass(pool, reqBody);
                        return handlerResponses(changePassResult.resultCode, changePassResult.status, {
                            user: changePassResult.user,
                            message: changePassResult.message,
                        });
                    case "/reset-pass":
                        const resetUserPassResult = await resetUserPass(pool, reqBody);
                        return handlerResponses(resetUserPassResult.resultCode, resetUserPassResult.status, {
                            user: resetUserPassResult.user,
                            message: resetUserPassResult.message,
                        });
                    default:
                        throw new Error(`Unsupported path "${event.path}"`);
                }
            case "POST":
                switch (event.path) {
                    case "/login":
                        const loginResult = await authUser(pool, reqBody);
                        return handlerResponses(loginResult.resultCode, loginResult.status, {
                            user: loginResult.user
                        });
                    case "/create":
                        const registerResult = await createUser(pool, reqBody);
                        return handlerResponses(registerResult.resultCode, registerResult.status, {
                            rowsAdd: registerResult.rowsAdd,
                        });
                    case "/confirm-email":
                        const verifyUserResult = await verifyUser(pool, reqBody);
                        return handlerResponses(verifyUserResult.resultCode, verifyUserResult.status, {
                            message: verifyUserResult.message,
                        });
                    case "/check-user":
                        const checkEmailResult = await verifyEmail(pool, reqBody);
                        return handlerResponses(checkEmailResult.resultCode, checkEmailResult.status, {
                            message: checkEmailResult.message,
                        });
                    case "/reset-pass":
                        const sentResetPassTokenResult = await sentResetPassToken(pool, reqBody);
                        return handlerResponses(sentResetPassTokenResult.resultCode, sentResetPassTokenResult.status, {
                            message: sentResetPassTokenResult.message,
                        });
                    case "/check-token":
                        const checkTokenResult = await confirmResetToken(pool, reqBody);
                        return handlerResponses(checkTokenResult.resultCode, checkTokenResult.status, {
                            message: checkTokenResult.message,
                        });
                    default:
                        throw new Error(`Unsupported path "${event.path}"`);
                }
            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err) {
        return handlerResponses(400, "Error", {
            message: err.message
        });
    }
};