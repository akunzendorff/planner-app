import { createMemoryRouter } from "react-router";
import Root from "./Root";
import DashboardPage from "../pages/DashboardPage";
import CalendarPage from "../pages/CalendarPage";
import GoalsPage from "../pages/GoalsPage";
import GoalDetailPage from "../pages/GoalDetailPage";
import FinancePage from "../pages/FinancePage";
import ExchangePage from "../pages/ExchangePage";
import NotFoundPage from "../pages/NotFoundPage";

export const router = createMemoryRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true,           Component: DashboardPage },
      { path: "calendar",      Component: CalendarPage },
      { path: "goals",         Component: GoalsPage },
      { path: "goals/:id",     Component: GoalDetailPage },
      { path: "finance",       Component: FinancePage },
      { path: "exchange",      Component: ExchangePage },
      { path: "*",             Component: NotFoundPage },
    ],
  },
]);
