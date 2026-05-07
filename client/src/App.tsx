import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import DeckLibrary from "./pages/DeckLibrary.tsx";
import DeckDetail from "./pages/DeckDetail.tsx";
import StudySession from "./pages/StudySession.tsx";
import AIImport from "./pages/AIImport.tsx";
import Settings from "./pages/Settings.tsx";
import Login from "./pages/Login.tsx";
import AuthSuccess from "./pages/AuthSuccess.tsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/success" element={<AuthSuccess />} />

      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/decks" element={<DeckLibrary />} />
        <Route path="/decks/:id" element={<DeckDetail />} />
        <Route path="/decks/:id/study" element={<StudySession />} />
        <Route path="/decks/:id/import" element={<AIImport />} />
        <Route path="/import" element={<AIImport />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
