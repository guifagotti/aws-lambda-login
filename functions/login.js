const {
    CognitoIdentityClient
} = require("@aws-sdk/client-cognito-identity");
const jwt = require("jsonwebtoken");
const config = require("./config.json");
const cryptoUtils = require("../lib/cryptoUtils");

const cognitoidentity = new CognitoIdentityClient();

async function checkUser(client, email) {
    const searchQuery = `
    SELECT U."userID", U."companyID", U."roleID", U."name", U.pass, U.passwordsalt, U.verified, U.mail, U.verified, U.active, U."accountStatus", C."companyName", F."farmID", F."farmName"
    FROM table_user U
    LEFT JOIN table_company C ON U."companyID" = C."companyID"
    LEFT JOIN table_farm F ON U."companyID" = F."companyID"
    WHERE U."mail" = $1`;

    const result = await client.query(searchQuery, [email]);
    if (result.rows.length > 0) {
        const userReturnData = {
            userID: result.rows[0]["userID"],
            roleID: result.rows[0]["roleID"],
            companyID: result.rows[0]["companyID"],
            companyName: result.rows[0]["companyName"],
            name: result.rows[0]["name"],
            mail: result.rows[0]["mail"],
            active: result.rows[0]["active"],
            accountStatus: result.rows[0]["accountStatus"],
            verified: result.rows[0]["verified"],
            farmList: result.rows.map((farm) => ({
                farmID: farm.farmID,
                farmName: farm.farmName,
            })),
        };

        return {
            hash: result.rows[0].pass,
            salt: result.rows[0].passwordsalt,
            verified: result.rows[0].verified,
            user: userReturnData,
        };
    }
    return null;
}

function generateToken(userData) {
    if (!userData) {
        throw new Error("Invalid userData");
    }

    return jwt.sign({
        userData
    }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
}

async function authUser(pool, {
    email,
    password
}) {
    const client = await pool.connect();
    try {
        const user = await checkUser(client, email);

        if (!user) {
            return {
                withError: true,
                resultCode: 404,
                resultData: `User not found: ${email}`
            };
        }

        if (!user.verified) {
            return {
                withError: true,
                resultCode: 403,
                resultData: `User not verified: ${email}`
            };
        }

        const {
            hash,
            salt
        } = await cryptoUtils.computeHash(password, user.salt);

        if (hash !== user.hash) {
            return {
                withError: true,
                resultCode: 401,
                resultData: `User login failed: ${email}`
            };
        }

        if (!user.user.active) {
            return {
                withError: true,
                resultCode: 402,
                resultData: `User not active: ${email}`
            };
        }

        if (user.user.accountStatus !== 0) {
            return {
                withError: true,
                resultCode: 402,
                resultData: `User account status invalid: ${email}`,
            };
        }

        const token = generateToken(user.user);

        return {
            withError: false,
            resultCode: 200,
            user: {
                login: true,
                identityId: user.user.companyID,
                userID: user.user.userID,
                user: email,
                name: user.user.name,
                farmList: user.user.farmList,
                token,
            },
        };
    } catch (error) {
        console.error("Error in authUser:", error);
        return {
            withError: true,
            resultCode: 500,
            resultData: "Internal Server Error",
        };
    } finally {
        client.release();
    }
}

module.exports = {
    authUser,
};