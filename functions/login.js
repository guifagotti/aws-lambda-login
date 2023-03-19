console.log("Login function");
const { CognitoIdentityClient } = require("@aws-sdk/client-cognito-identity");
var jwt = require("jsonwebtoken");
var config = require("./config.json");
var cryptoUtils = require("../lib/cryptoUtils");
var cognitoidentity = new CognitoIdentityClient();

async function checkUser(client, email, fn) {
  const searchQuery = `
  SELECT U."userID" ,U."companyID" , U."roleID" , U."name" , U.pass , U.passwordsalt , U.verified , U.mail, U.verified, U.active, U."accountStatus", C."companyName" , F."farmID" , F."farmName"
FROM table_user U
left join table_company C on U."companyID"  = C."companyID" 
left join table_farm F on U."companyID"  = F."companyID" 
where U."mail" = '${email}'`; // AND U."active" = TRUE`;

  let result;
  try {
    console.log("searchQuery", searchQuery);
    result = await client.query(searchQuery);
    console.log("result", result.rows);
    if (result.rows.length > 0) {
      let userReturnData = {
        userID: result.rows[0]["userID"],
        roleID: result.rows[0]["roleID"],
        companyID: result.rows[0]["companyID"],
        companyName: result.rows[0]["companyName"],
        name: result.rows[0]["name"],
        mail: result.rows[0]["mail"],
        active: result.rows[0]["active"],
        accountStatus: result.rows[0]["accountStatus"],
        verified: result.rows[0]["verified"],
        farmList: [],
      };

      result.rows.forEach(function (farm, i) {
        userReturnData.farmList.push({
          farmID: farm.farmID,
          farmName: farm.farmName,
        });
      });

      console.log("userReturnData", userReturnData);
      var hash = result.rows[0].pass;
      var salt = result.rows[0].passwordsalt;
      var verified = result.rows[0].verified;
      fn(null, hash, salt, verified, userReturnData);
    } else fn(null, null);
  } catch (error) {
    console.log("error search ", error);
    return fn(error);
  }
}

function generateToken(userData, fn) {
  if (!userData) {
    return fn("Invalid userData");
  }

  const token = jwt.sign({ userData }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
  return fn(null, userData.mail, token);
}

function getToken(email, fn) {
  var param = {
    IdentityPoolId: config.IDENTITY_POOL_ID,
    Logins: {},
  };
  param.Logins[config.DEVELOPER_PROVIDER_NAME] = email;
  cognitoidentity.getOpenIdTokenForDeveloperIdentity(
    param,
    function (err, data) {
      if (err) return fn(err);
      else fn(null, data.IdentityId, data.Token);
    }
  );
}

async function authUser(pool, userData) {
  console.log("userData", userData);
  var email = userData.email;
  var clearPassword = userData.password;
  let client = null;
  try {
    client = await pool.connect();
    console.log("client", client);
  } catch (err) {
    console.log("Pool connect Error", JSON.stringify(err));
    return {
      withError: true,
      resultCode: 500,
      resultData: "Internal Server Error",
    };
  }

  return new Promise((resolve, reject) => {
    checkUser(
      client,
      email,
      function (err, correctHash, salt, verified, userData) {
        if (err) {
          console.log("Error in getUser: " + err);
          client.release(true);
          resolve({
            withError: true,
            resultCode: 500,
            resultData: "Error in getUser: " + err,
          });
        } else {
          if (correctHash == null) {
            console.log("User not found: " + email);
            client.release(true);
            resolve({
              withError: true,
              resultCode: 404,
              resultData: "User not found: " + email,
            });
          } else if (!verified) {
            // User not verified
            console.log("User not verified: " + email);
            client.release(true);
            resolve({
              withError: true,
              resultCode: 403,
              resultData: "User not verified: " + email,
            });
          } else {
            cryptoUtils.computeHash(
              clearPassword,
              salt,
              function (err, salt, hash) {
                if (err) {
                  console.log("Error in hash: " + err);
                  client.release(true);
                  resolve({
                    withError: true,
                    resultCode: 500,
                    resultData: "Error in hash: " + err,
                  });
                } else {
                  console.log("correctHash: " + correctHash + " hash: " + hash);
                  if (hash == correctHash) {
                    if (!userData.active) {
                      // User not verified
                      console.log("User not active: " + email);
                      client.release(true);
                      resolve({
                        withError: true,
                        resultCode: 402,
                        resultData: "User not active: " + email,
                      });
                    } else if (userData.accountStatus !== 0) {
                      // User not verified
                      console.log("User account status invalid: " + email);
                      client.release(true);
                      resolve({
                        withError: true,
                        resultCode: 402,
                        resultData: "User account status invalid: " + email,
                      });
                    } else {
                      // Login ok
                      console.log("User logged in: " + email);
                      generateToken(userData, function (err, userEmail, token) {
                        if (err) {
                          console.log("Error in getToken: " + err);
                          resolve({
                            withError: true,
                            resultCode: 500,
                            resultData: "Error in getToken: " + err,
                          });
                        } else {
                          const user = {
                            login: true,
                            identityId: userData.companyID,
                            userID: userData.userID,
                            user: userEmail,
                            name: userData.name,
                            farmList: userData.farmList,
                            token: token,
                          };
                          resolve({ withError: false, resultCode: 200, user });
                        }
                      });
                    }
                  } else {
                    // Login failed
                    console.log("User login failed: " + email);
                    resolve({
                      withError: true,
                      resultCode: 401,
                      resultData: "User login failed: " + email,
                    });
                  }
                }
              }
            );
          }
        }
      }
    );
  });
}

module.exports = {
  authUser,
};
