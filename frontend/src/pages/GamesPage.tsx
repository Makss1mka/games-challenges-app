import { useParams } from "react-router-dom";
import { GamesSection } from "../sections/GamesSection";
import GameDetailsPage from "./GameDetailsPage";

export default function GamesPage() {
  const { id } = useParams();
  if (id) {
    return <GameDetailsPage gameId={id} />;
  }
  return <GamesSection />;
}
