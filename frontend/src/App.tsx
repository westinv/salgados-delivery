import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { LoginScreen } from "./screens/LoginScreen";
import { AppShell } from "./AppShell";

function Gate() {
  const { authenticated } = useAuth();

  if (authenticated === null) return null; // still checking session on boot
  if (!authenticated) return <LoginScreen />;

  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;
