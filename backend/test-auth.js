
async function testAuth() {
  const email = `test${Date.now()}@example.com`;
  const password = "TestPass123";

  try {
    // Step 1: Register a customer
    console.log("Testing customer registration...");

    const registerResponse = await fetch(
      "http://localhost:5000/api/auth/register",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "Test Customer",
          email,
          password,
          role: "customer"
        })
      }
    );

    const registerText = await registerResponse.text();
    console.log("Registration status:", registerResponse.status);
    console.log("Registration response:", registerText);

    if (!registerResponse.ok) {
      console.log("Registration failed. Login test stopped.");
      return;
    }

    // Step 2: Log in using the same credentials
    console.log("\nTesting customer login...");

    const loginResponse = await fetch(
      "http://localhost:5000/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const loginText = await loginResponse.text();
    console.log("Login status:", loginResponse.status);
    console.log("Login response:", loginText);

    if (loginResponse.ok) {
      console.log("\nSUCCESS! Registration and login both work!");
    }
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testAuth();

