import { useNavigate } from "react-router-dom";

export default function Dashboard({ user, setUser }) {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await fetch("http://localhost:8080/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null); // Clear user state instead of reload
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (!user) {
    return <div>Loading user data...</div>;
  }

  return (
    <div style={styles.container}>
      <h2>Welcome, {user.username}</h2>
      <p>Email: {user.email}</p>

      <button onClick={logout} style={styles.logoutButton}>
        Logout
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 500,
    margin: "auto",
    padding: 20,
  },
  logoutButton: {
    marginTop: 20,
    padding: "10px 20px",
    cursor: "pointer",
  },
};
