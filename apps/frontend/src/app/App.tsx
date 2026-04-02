import { Route, Routes } from "react-router-dom";

import { LandingPage } from "../features/room/LandingPage";
import { RoomPage } from "../features/room/RoomPage";

export const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/room/:roomCode" element={<RoomPage />} />
  </Routes>
);

