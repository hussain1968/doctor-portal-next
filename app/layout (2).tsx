export default function Home() {
  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>AI Doctor Portal</h1>
      <p>Smart Healthcare Appointment System</p>

     <a href="/register">
  <button style={{
    marginTop: "20px",
    padding: "12px 20px",
    backgroundColor: "#0070f3",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }}>
    Register Patient
  </button>
</a>
    </main>
  );
}