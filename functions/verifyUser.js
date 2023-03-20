async function verifyUserToken(client, email, verifyToken) {
    const searchQuery = `SELECT * FROM table_user WHERE "mail" = $1`;
    const params = [email];

    try {
        const result = await client.query(searchQuery, params);
        console.log("searchQuery", searchQuery);
        console.log("result", result.rows);

        if (result.rows.length > 0 && result.rows[0]["mailToken"] === verifyToken) {
            const userName = result.rows[0].name;
            const userID = result.rows[0]["userID"];
            const updateUserQuery = `UPDATE table_user SET verified = true WHERE "userID" = $1`;
            const updateParams = [userID];

            const result2 = await client.query(updateUserQuery, updateParams);
            console.log("result2", result2);

            if (result2.rowCount === 1) {
                return {
                    success: true,
                    userName
                };
            } else {
                throw new Error("Error on update User");
            }
        } else {
            throw new Error("Invalid Token");
        }
    } catch (error) {
        console.log("error search ", error);
        throw error;
    }
}

async function verifyUser(pool, userData) {
    const email = userData.user;
    const verifyToken = userData.token;

    try {
        const client = await pool.connect();
        const {
            success,
            userName
        } = await verifyUserToken(client, email, verifyToken);
        client.release();

        return {
            withError: false,
            resultCode: 200,
            resultData: userName,
        };
    } catch (error) {
        console.log("Error in verifyUser: " + error);

        return {
            withError: true,
            resultCode: 403,
            resultData: "Error in verifyUser: " + error,
        };
    }
}

module.exports = {
    verifyUser,
};