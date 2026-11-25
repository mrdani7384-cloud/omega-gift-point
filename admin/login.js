
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");

function showMessage(message, type = "") {
    loginMessage.textContent = message;
    loginMessage.className = `message ${type}`;
}

async function checkAdminSession() {
    const { data: { user }, error } =
        await window.ogpSupabase.auth.getUser();

    if (error || !user) return;

    const { data: profile, error: profileError } =
        await window.ogpSupabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

    if (profileError || !profile ||
        !["owner", "staff"].includes(profile.role)) {

        await window.ogpSupabase.auth.signOut();
        showMessage("This account does not have admin access.", "error");
        return;
    }

    showMessage(
        `You're signed in as ${profile.role}. Admin dashboard will be available in the next step.`,
        "success"
    );

    logoutButton.hidden = false;
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    loginButton.disabled = true;
    loginButton.textContent = "Signing In...";
    showMessage("");

    try {
        const { data, error } =
            await window.ogpSupabase.auth.signInWithPassword({
                email,
                password
            });

        if (error) throw error;

        const { data: profile, error: profileError } =
            await window.ogpSupabase
                .from("profiles")
                .select("role")
                .eq("id", data.user.id)
                .single();

        if (profileError || !profile ||
            !["owner", "staff"].includes(profile.role)) {

            await window.ogpSupabase.auth.signOut();

            throw new Error(
                "This account is not authorized for admin access."
            );
        }

        window.location.replace("dashboard.html");
return;

    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign In";
    }
});

logoutButton.addEventListener("click", async () => {
    const { error } = await window.ogpSupabase.auth.signOut();

    if (error) {
        showMessage(error.message, "error");
        return;
    }

    logoutButton.hidden = true;
    passwordInput.value = "";
    showMessage("You have signed out successfully.", "success");
});

checkAdminSession();
